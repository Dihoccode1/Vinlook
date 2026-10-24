import hashlib
import json
import os
from pathlib import Path
import re
from urllib.parse import urlsplit
import uuid


class Failure(Exception):
    def __init__(self, code='WORKER_UNAVAILABLE', status=None):
        super().__init__(code)
        self.code, self.status = code, status


def require(ok, code='INVALID_INPUT'):
    if not ok:
        raise Failure(code)


def exact(value, keys):
    require(type(value) is dict and set(value) == set(keys))
    return value


def identifier(value):
    require(type(value) is str and re.fullmatch(r'[a-f0-9]{24}', value))
    return value


def attempt(value):
    require(type(value) is str)
    try:
        require(str(uuid.UUID(value)) == value)
    except (ValueError, AttributeError):
        raise Failure('INVALID_INPUT') from None
    return value


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'), allow_nan=False)


def digest(value):
    return hashlib.sha256(value).hexdigest()


def job_hash(job):
    return digest(canonical({k: job[k] for k in ('taskType', 'languageCode', 'inputVersion', 'inputSnapshot')}).encode())


def registry(path):
    raw = Path(path).read_bytes()
    require(len(raw) <= 32768, 'INVALID_REGISTRY')
    recorded = Path(str(path) + '.sha256').read_text().strip()
    data = json.loads(raw)
    # Canonical JSON content hash is independent of Windows/Linux checkout line endings.
    require(digest(canonical(data).encode()) == recorded, 'INVALID_REGISTRY')
    exact(data, ['registryVersion', 'translationModel', 'profiles'])
    require(data['registryVersion'] == 'vinlook-hybrid-v1', 'INVALID_REGISTRY')
    codes = {'en', 'hi', 'es', 'ar', 'fr', 'bn', 'id', 'ur', 'ru', 'de', 'pcm', 'vi'}
    require(set(data['profiles']) == codes | {'zh-Hant', 'ja', 'ar-EG', 'pt-PT'}, 'INVALID_REGISTRY')
    for code in codes:
        p = exact(data['profiles'][code], ['id', 'execution', 'model', 'revision', 'license', 'conversion'])
        require(p['execution'] == 'local_worker' and re.fullmatch(r'facebook/mms-tts-[a-z_-]+', p['model']) and re.fullmatch(r'[a-f0-9]{40}', p['revision']), 'INVALID_REGISTRY')
        require(p['id'] == p['model'] + '@' + p['revision'] and p['license'] == 'cc-by-nc-4.0' and p['conversion'] == 'mp3-mono-24k-64k-v1', 'INVALID_REGISTRY')
    return data


def validate_job(job, reg, languages):
    exact(job, ['id', 'taskType', 'languageCode', 'inputVersion', 'inputSnapshot', 'attemptId', 'leaseExpiresAt', 'retryCount'])
    identifier(job['id']); attempt(job['attemptId'])
    require(job['taskType'] == 'audio' and job['languageCode'] in languages)
    require(type(job['retryCount']) is int and 0 <= job['retryCount'] <= 9007199254740991)
    v = exact(job['inputVersion'], ['sourceVersion', 'textVersion', 'targetTextVersion', 'targetSourceVersion'])
    require(all(type(v[k]) is int and 1 <= v[k] <= 9007199254740991 for k in ['sourceVersion', 'textVersion']) and v['targetTextVersion'] is None and v['targetSourceVersion'] is None)
    s = exact(job['inputSnapshot'], ['text', 'registryVersion', 'modelId', 'execution'])
    require(type(s['text']) is str and s['text'].strip() == s['text'] and 0 < len(s['text'].encode('utf-16-le')) // 2 <= 20000)
    require(s['registryVersion'] == reg['registryVersion'] and s['modelId'] == reg['profiles'][job['languageCode']]['id'] and s['execution'] == 'local_worker')
    require(type(job['leaseExpiresAt']) is str and re.fullmatch(r'\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z', job['leaseExpiresAt']))
    return job


def config(env, reg):
    import base64
    names = ['VINLOOK_CONTENT_ORIGIN', 'VINLOOK_WORKER_ID', 'VINLOOK_WORKER_KEY_B64URL', 'VINLOOK_STATE_DIR', 'VINLOOK_MODEL_CACHE_DIR', 'VINLOOK_LANGUAGES']
    require(all(type(env.get(k)) is str and env[k] for k in names), 'INVALID_CONFIGURATION')
    origin = env[names[0]]
    u = urlsplit(origin)
    require(u.scheme == 'https' and u.hostname and not u.username and not u.password and not u.path and not u.query and not u.fragment and u.netloc == origin[8:] and not re.search(r'[\s\x00-\x1f\x7f]', origin), 'INVALID_CONFIGURATION')
    require(re.fullmatch(r'[A-Za-z0-9._-]{1,64}', env[names[1]]), 'INVALID_CONFIGURATION')
    key = env[names[2]]
    try:
        raw = base64.urlsafe_b64decode(key + '=')
        require(len(raw) == 32 and base64.urlsafe_b64encode(raw).decode().rstrip('=') == key, 'INVALID_CONFIGURATION')
    except (ValueError, TypeError):
        raise Failure('INVALID_CONFIGURATION') from None
    languages = env[names[5]].split(',')
    require(len(languages) == len(set(languages)) and all(c in reg['profiles'] and reg['profiles'][c]['execution'] == 'local_worker' for c in languages), 'INVALID_CONFIGURATION')
    for name in names[3:5]:
        require(Path(env[name]).is_absolute(), 'INVALID_CONFIGURATION')
    return dict(origin=origin, worker_id=env[names[1]], key=key, state=env[names[3]], cache=env[names[4]], languages=languages)


def private_path(root, name):
    root = Path(root)
    require(root.is_absolute() and root.exists() and not root.is_symlink(), 'INVALID_STATE_PATH')
    require(root.resolve() == root, 'INVALID_STATE_PATH')
    require(re.fullmatch(r'[a-z0-9.-]{1,100}', name), 'INVALID_STATE_PATH')
    target = root / name
    require(not target.is_symlink() and target.resolve().parent == root, 'INVALID_STATE_PATH')
    return target


def atomic_json(root, name, value):
    path = private_path(root, name)
    temp = private_path(root, name + '.tmp')
    payload = canonical(value).encode()
    require(len(payload) <= 131072, 'STATE_TOO_LARGE')
    fd = os.open(temp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC | getattr(os, 'O_NOFOLLOW', 0), 0o600)
    with os.fdopen(fd, 'wb') as file:
        file.write(payload); file.flush(); os.fsync(file.fileno())
    os.replace(temp, path)
    if os.name != 'nt':
        fd = os.open(root, os.O_RDONLY)
        try:
            os.fsync(fd)
        finally:
            os.close(fd)


def chunks(text, token_count):
    require(type(text) is str and text.strip())
    output = []
    remaining = text
    while remaining:
        if len(remaining) <= 400 and token_count(remaining) <= 256:
            output.append(remaining); break
        sentences = [m.end() for m in re.finditer(r'[.!?。！？۔।][ \t\r\n]+', remaining[:401])]
        spaces = [m.end() for m in re.finditer(r'\s+', remaining[:401])]
        cut = None
        for candidates in (sentences, spaces):
            cut = next((n for n in sorted(set(candidates), reverse=True) if n <= 400 and remaining[:n].strip() and token_count(remaining[:n]) <= 256), None)
            if cut is not None:
                break
        require(cut is not None, 'TEXT_CHUNK_LIMIT')
        output.append(remaining[:cut]); remaining = remaining[cut:]
        require(len(output) < 64, 'TEXT_CHUNK_LIMIT')
    require(len(output) <= 64 and ''.join(output) == text, 'TEXT_CHUNK_LIMIT')
    return output
