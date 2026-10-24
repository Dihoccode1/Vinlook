"""Explicit TASK025 English-only setup; never invoked by worker check/run."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import urllib.parse
import urllib.request

MODEL = 'facebook/mms-tts-eng'
REVISION = 'c71de0fe7204c83f1c10820a7d696d0b450048ba'
# Provider revision metadata read 25 October 2026. JSON files use Git blob IDs.
FILES = {
    'config.json': (1641, 'git', '5f06bace91bc2be88912491d4575ddef044cb273'),
    'model.safetensors': (145227512, 'sha256', '69cf8b651c1493f1801dfd2311c298d694a38357bc9a1e41f410491ea6f0e1be'),
    'special_tokens_map.json': (47, 'git', '106a9a4c07ec6f37211ce6032423f67e6ed7af16'),
    'tokenizer_config.json': (287, 'git', 'b6ca2175b8c7e731f3840b9e23018aa393cdb9c6'),
    'vocab.json': (413, 'git', '30097ea3f9c56d26292cab7ef5fc56feaa370131'),
}


class AcquisitionError(Exception):
    pass


def need(ok, code):
    if not ok:
        raise AcquisitionError(code)


def plain_path(path):
    path = Path(path)
    need(path.is_absolute(), 'ABSOLUTE_CACHE_REQUIRED')
    for part in (path, *path.parents):
        need(not part.is_symlink() and not getattr(part, 'is_junction', lambda: False)(), 'LINK_PATH_REJECTED')
    need(path.resolve() == path, 'NONCANONICAL_CACHE')
    return path


def allowed_url(url):
    parsed = urllib.parse.urlsplit(url)
    host = (parsed.hostname or '').lower()
    return (parsed.scheme == 'https' and not parsed.username and not parsed.password
            and parsed.port in (None, 443)
            and (host == 'huggingface.co' or host.endswith('.huggingface.co') or host.endswith('.hf.co')))


class Redirects(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        need(allowed_url(newurl), 'REDIRECT_REJECTED')
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def opener():
    # No inherited proxy, HF token, API key or Authorization header.
    return urllib.request.build_opener(urllib.request.ProxyHandler({}), Redirects())


def verify(path, spec):
    size, kind, expected = spec
    need(path.is_file() and not path.is_symlink() and not getattr(path, 'is_junction', lambda: False)(), 'CACHE_FILE_INVALID')
    need(path.stat().st_size == size, 'SIZE_MISMATCH')
    sha = hashlib.sha256()
    git = hashlib.sha1(b'blob ' + str(size).encode() + b'\0')
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            sha.update(block)
            git.update(block)
    need((sha.hexdigest() if kind == 'sha256' else git.hexdigest()) == expected, 'DIGEST_MISMATCH')
    return sha.hexdigest()


def checked_cache(folder):
    need(folder.is_dir(), 'CACHE_NOT_DIRECTORY')
    need({p.name for p in folder.iterdir()} == set(FILES) | {'manifest.json'}, 'CACHE_INVENTORY_MISMATCH')
    manifest = folder / 'manifest.json'
    need(not manifest.is_symlink() and manifest.stat().st_size < 131072, 'MANIFEST_INVALID')
    value = json.loads(manifest.read_text(encoding='utf-8'))
    sums = {name: verify(folder / name, spec) for name, spec in FILES.items()}
    need(value == {'model': MODEL, 'revision': REVISION, 'files': sums}, 'MANIFEST_MISMATCH')
    return sums


def acquire(cache, apply=False, transport=None):
    cache = plain_path(cache)
    target = plain_path(cache / REVISION)
    plan = {'model': MODEL, 'revision': REVISION, 'files': list(FILES),
            'transferBytes': sum(s[0] for s in FILES.values()), 'downloadAuthorized': apply}
    if not apply:
        return dict(plan, status='plan_only')
    cache.mkdir(parents=True, exist_ok=True, mode=0o700)
    plain_path(cache)
    lock = cache / '.english-acquire.lock'
    need(not lock.exists(), 'ACQUISITION_BUSY')
    fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    try:
        os.close(fd)
        if target.exists():
            checked_cache(target)
            return dict(plan, status='verified_existing', downloadedBytes=0)
        stage = plain_path(cache / ('.' + REVISION + '.staging'))
        need(not stage.exists(), 'STAGING_REQUIRES_REVIEW')
        need(shutil.disk_usage(cache).free >= 512 * 1024 * 1024, 'DISK_ALLOWANCE_UNAVAILABLE')
        stage.mkdir(mode=0o700)
        client = transport or opener()
        sums = {}
        for name, spec in FILES.items():
            size = spec[0]
            url = f'https://huggingface.co/{MODEL}/resolve/{REVISION}/{name}'
            need(allowed_url(url), 'SOURCE_REJECTED')
            request = urllib.request.Request(url, headers={'User-Agent': 'Vinlook-English-Canary/1.0'})
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
        manifest = {'model': MODEL, 'revision': REVISION, 'files': sums}
        with (stage / 'manifest.json').open('x', encoding='utf-8') as out:
            json.dump(manifest, out, sort_keys=True, indent=2)
            out.flush()
            os.fsync(out.fileno())
        checked_cache(stage)
        need(not target.exists(), 'CACHE_TARGET_APPEARED')
        stage.rename(target)
        checked_cache(target)
        return dict(plan, status='downloaded_verified', downloadedBytes=plan['transferBytes'])
    finally:
        # Never recursively remove staging or an unknown cache. Partial bytes remain for review.
        lock.unlink()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache', required=True, type=Path)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    try:
        print(json.dumps(acquire(args.cache, args.apply)))
    except AcquisitionError as error:
        print(json.dumps({'status': 'failed', 'code': str(error)}))
        raise SystemExit(1)
    except Exception:
        # Do not print signed CDN URLs or raw network exception bodies.
        print(json.dumps({'status': 'failed', 'code': 'ACQUISITION_UNAVAILABLE'}))
        raise SystemExit(1)


if __name__ == '__main__':
    main()
