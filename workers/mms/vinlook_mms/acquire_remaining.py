"""Explicit approved TASK025 remaining-model acquisition; never a runtime downloader."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import urllib.request
from .acquire_english import AcquisitionError, need, plain_path, allowed_url, opener, verify

MANIFEST_SHA256 = 'b6e73574c526f912cfd0cd194994509c1973d2eb9c59f02ebdb44b010c5071aa'
LOCALES = {'hi','es','ar','fr','bn','id','ur','ru','de','pcm','vi'}


def specs():
    raw = Path(__file__).with_name('remaining-models.json').read_bytes().rstrip(b'\n')
    need(hashlib.sha256(raw).hexdigest() == MANIFEST_SHA256, 'MANIFEST_DIGEST_MISMATCH')
    data = json.loads(raw)
    need(len(data['models']) == 11 and {m['locale'] for m in data['models']} == LOCALES, 'MANIFEST_INVALID')
    result = {}
    for m in data['models']:
        need(m['status'] == 'metadata_verified' and m['license'] == 'cc-by-nc-4.0', 'MANIFEST_INVALID')
        need(re.fullmatch(r'facebook/mms-tts-[a-z_-]+', m['model']) and re.fullmatch(r'[a-f0-9]{40}', m['revision']), 'MANIFEST_INVALID')
        files = {f['name']: (f['bytes'], 'sha256' if f['integrityKind'] == 'sha256' else 'git', f['digest']) for f in m['files']}
        need(len(m['files']) == 5 and set(files) == {'config.json','model.safetensors','special_tokens_map.json','tokenizer_config.json','vocab.json'}, 'MANIFEST_INVALID')
        result[m['locale']] = (m['model'], m['revision'], files)
    return result


def checked_cache(folder, model, revision, files):
    need(folder.is_dir(), 'CACHE_NOT_DIRECTORY')
    need({p.name for p in folder.iterdir()} == set(files) | {'manifest.json'}, 'CACHE_INVENTORY_MISMATCH')
    manifest = folder / 'manifest.json'
    need(not manifest.is_symlink() and manifest.stat().st_size < 131072, 'MANIFEST_INVALID')
    value = json.loads(manifest.read_text(encoding='utf-8'))
    sums = {name: verify(folder / name, spec) for name, spec in files.items()}
    need(value == {'model': model, 'revision': revision, 'files': sums}, 'MANIFEST_MISMATCH')
    return sums

def acquire_one(cache, model, revision, files, apply=False, transport=None):
    cache = plain_path(cache)
    target = plain_path(cache / revision)
    plan = {'model': model, 'revision': revision, 'files': list(files),
            'transferBytes': sum(s[0] for s in files.values()), 'downloadAuthorized': apply}
    if not apply:
        return dict(plan, status='plan_only')
    cache.mkdir(parents=True, exist_ok=True, mode=0o700)
    plain_path(cache)
    lock = cache / '.model-acquire.lock'
    need(not lock.exists(), 'ACQUISITION_BUSY')
    fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    try:
        os.close(fd)
        if target.exists():
            checked_cache(target, model, revision, files)
            return dict(plan, status='verified_existing', downloadedBytes=0)
        stage = plain_path(cache / ('.' + revision + '.staging'))
        need(not stage.exists(), 'STAGING_REQUIRES_REVIEW')
        need(shutil.disk_usage(cache).free >= 512 * 1024 * 1024, 'DISK_ALLOWANCE_UNAVAILABLE')
        stage.mkdir(mode=0o700)
        client = transport or opener()
        sums = {}
        for name, spec in files.items():
            size = spec[0]
            url = f'https://huggingface.co/{model}/resolve/{revision}/{name}'
            need(allowed_url(url), 'SOURCE_REJECTED')
            request = urllib.request.Request(url, headers={'User-Agent': 'Vinlook-Model-Setup/1.0'})
            # Per-read deadline; no retries, no unreviewed resume or silent fallback.
            with client.open(request, timeout=30) as response, (stage / name).open('xb') as out:
                need(allowed_url(response.geturl()), 'RESPONSE_ORIGIN_REJECTED')
                written = 0
                while True:
                    block = response.read(min(1024 * 1024, size - written + 1))
                    if not block:
                        break
                    written += len(block)
                    need(written <= size, 'DOWNLOAD_OVERSIZE')
                    out.write(block)
                out.flush()
                os.fsync(out.fileno())
            sums[name] = verify(stage / name, spec)
        manifest = {'model': model, 'revision': revision, 'files': sums}
        with (stage / 'manifest.json').open('x', encoding='utf-8') as out:
            json.dump(manifest, out, sort_keys=True, indent=2)
            out.flush()
            os.fsync(out.fileno())
        checked_cache(stage, model, revision, files)
        need(not target.exists(), 'CACHE_TARGET_APPEARED')
        stage.rename(target)
        checked_cache(target, model, revision, files)
        return dict(plan, status='downloaded_verified', downloadedBytes=plan['transferBytes'])
    finally:
        # Never recursively remove staging or an unknown cache. Partial bytes remain for review.
        lock.unlink()


def acquire_selected(cache, languages, apply=False, transport=None):
    entries = specs()
    need(languages and len(languages) == len(set(languages)) and set(languages) <= LOCALES, 'INVALID_LANGUAGES')
    cache = plain_path(cache)
    if not apply:
        return [acquire_one(cache, *entries[l], transport=transport) for l in languages]
    cache.mkdir(parents=True, exist_ok=True, mode=0o700)
    plain_path(cache)
    fd = os.open(cache / '.remaining-acquire.lock', os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    try:
        os.close(fd)
        need(shutil.disk_usage(cache).free >= 3 * 1024**3, 'THREE_GIB_REQUIRED')
        allowed = {v[1] for v in entries.values()} | {'.remaining-acquire.lock'}
        need({p.name for p in cache.iterdir()} <= allowed, 'ROOT_INVENTORY_REQUIRES_REVIEW')
        return [acquire_one(cache, *entries[l], apply=True, transport=transport) for l in languages]
    finally:
        (cache / '.remaining-acquire.lock').unlink()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache', required=True, type=Path)
    parser.add_argument('--languages', required=True)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    try:
        print(json.dumps({'results': acquire_selected(args.cache, args.languages.split(','), args.apply)}))
    except AcquisitionError as error:
        print(json.dumps({'status': 'failed', 'code': str(error)}))
        raise SystemExit(1)
    except Exception:
        print(json.dumps({'status': 'failed', 'code': 'ACQUISITION_UNAVAILABLE'}))
        raise SystemExit(1)


if __name__ == '__main__':
    main()
