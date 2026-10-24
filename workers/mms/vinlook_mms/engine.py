import json
import os
from pathlib import Path
import subprocess
import sys
import threading
import time
import math
from .core import Failure, require, exact, identifier, attempt, validate_job, job_hash, private_path, atomic_json, digest, canonical

PHASES = {'claimed', 'synthesizing', 'mp3_ready', 'intent_requesting', 'intent_known', 'upload_started', 'result_pending', 'completed', 'blocked'}


class Journal:
    def __init__(self, root):
        self.root = Path(root)
        require(self.root.is_absolute() and not self.root.is_symlink(), 'INVALID_STATE_PATH')
        self.root.mkdir(mode=0o700, parents=True, exist_ok=True)
        require(self.root.resolve() == self.root, 'INVALID_STATE_PATH')
        self.lock = None

    def __enter__(self):
        require(os.name == 'posix', 'LINUX_WORKER_REQUIRED')
        import fcntl
        path = private_path(self.root, 'worker.lock')
        self.lock = os.open(path, os.O_CREAT | os.O_RDWR | getattr(os, 'O_NOFOLLOW', 0), 0o600)
        try:
            fcntl.flock(self.lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError:
            os.close(self.lock); self.lock = None
            raise Failure('WORKER_ALREADY_RUNNING') from None
        return self

    def __exit__(self, *args):
        if self.lock is not None:
            os.close(self.lock); self.lock = None

    def load(self):
        # Refuse unknown/orphan files rather than silently evicting private recovery evidence.
        allowed = {'worker.lock', 'journal.json', 'journal.json.tmp', 'receipt.json', 'receipt.json.tmp'}
        total = 0
        for entry in self.root.iterdir():
            require(not entry.is_symlink(), 'INVALID_STATE_PATH')
            if entry.is_dir():
                require(__import__('re').fullmatch(r'[a-f0-9]{24}\.[a-f0-9-]{36}', entry.name), 'INVALID_STATE_PATH')
                for file in entry.iterdir():
                    require(file.name in {'audio.wav', 'audio.mp3'} and file.is_file() and not file.is_symlink(), 'INVALID_STATE_PATH')
                    total += file.stat().st_size
            else:
                require(entry.name in allowed and entry.is_file(), 'INVALID_STATE_PATH')
                total += entry.stat().st_size
        require(total <= 33554432, 'STATE_TOO_LARGE')
        path = private_path(self.root, 'journal.json')
        if not path.exists():
            return None
        require(path.stat().st_size <= 131072, 'STATE_TOO_LARGE')
        value = json.loads(path.read_text())
        if value.get('phase') == 'claim_unknown':
            exact(value, ['phase', 'retryAfter'])
            require(type(value['retryAfter']) in (float, int) and math.isfinite(value['retryAfter']), 'INVALID_STATE')
            return value
        exact(value, ['phase', 'job', 'inputHash', 'mediaIntentId', 'mp3Sha256', 'result'])
        require(value['phase'] in PHASES and type(value['job']) is dict, 'INVALID_STATE')
        require(set(value['job']) == {'id', 'taskType', 'languageCode', 'inputVersion', 'inputSnapshot', 'attemptId', 'leaseExpiresAt', 'retryCount'}, 'INVALID_STATE')
        require(value['inputHash'] == job_hash(value['job']), 'INVALID_STATE')
        if value['mediaIntentId'] is not None:
            identifier(value['mediaIntentId'])
        require(value['mp3Sha256'] is None or type(value['mp3Sha256']) is str and len(value['mp3Sha256']) == 64, 'INVALID_STATE')
        return value

    def save(self, value):
        atomic_json(self.root, 'journal.json', value)

    def attempt_dir(self, job):
        name = identifier(job['id']) + '.' + attempt(job['attemptId'])
        folder = private_path(self.root, name)
        folder.mkdir(mode=0o700, exist_ok=True)
        require(folder.resolve().parent == self.root and not folder.is_symlink(), 'INVALID_STATE_PATH')
        return folder

    def finish(self, value):
        folder = self.attempt_dir(value['job'])
        for child in folder.iterdir():
            require(child.name in {'audio.wav', 'audio.mp3'} and child.is_file() and not child.is_symlink(), 'INVALID_STATE_PATH')
        for name in ['audio.wav', 'audio.mp3']:
            private_path(folder, name).unlink(missing_ok=True)
        folder.rmdir()
        atomic_json(self.root, 'receipt.json', {'jobId': value['job']['id'], 'attemptId': value['job']['attemptId'], 'inputHash': value['inputHash'], 'status': 'completed'})
        private_path(self.root, 'journal.json').unlink()


class Lease:
    def __init__(self, client, job, stop, interval=60):
        self.client, self.job, self.stop, self.interval = client, job, stop, interval
        self.done, self.lost = threading.Event(), False
        self.thread = threading.Thread(target=self.loop, daemon=True)

    def renew(self):
        data = self.client.request('/' + self.job['id'] + '/renew', {'attemptId': self.job['attemptId']})
        exact(data, ['jobId', 'leaseExpiresAt'])
        require(data['jobId'] == self.job['id'] and type(data['leaseExpiresAt']) is str, 'INVALID_RESPONSE')

    def loop(self):
        while not self.done.wait(self.interval):
            try:
                self.renew()
            except Exception:
                self.lost = True; self.stop.set(); return

    def __enter__(self):
        self.renew(); self.thread.start(); return self

    def __exit__(self, *args):
        self.done.set()
        if self.thread.ident:
            self.thread.join(16)


def synthesize(job, profile, cache, folder, stop):
    import psutil
    output = private_path(folder, 'audio.wav')
    task = {'text': job['inputSnapshot']['text'], 'profile': profile, 'cache': cache, 'output': str(output)}
    environment = {'LANG': 'C.UTF-8', 'OMP_NUM_THREADS': '4', 'HF_HUB_OFFLINE': '1', 'TRANSFORMERS_OFFLINE': '1', 'HF_HUB_DISABLE_TELEMETRY': '1', 'HF_HUB_DISABLE_IMPLICIT_TOKEN': '1', 'TOKENIZERS_PARALLELISM': 'false'}
    child = subprocess.Popen([sys.executable, '-m', 'vinlook_mms.synth_child'], cwd=Path(__file__).resolve().parents[1], env=environment, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, shell=False)
    peak = 0
    try:
        child.stdin.write(canonical(task).encode()); child.stdin.close()
        started = time.monotonic()
        while child.poll() is None:
            try:
                peak = max(peak, psutil.Process(child.pid).memory_info().rss)
            except psutil.Error:
                pass
            if stop.wait(.05) or time.monotonic() - started >= 480:
                raise Failure('SYNTHESIS_CANCELLED')
            if output.exists() and output.stat().st_size > 16777216:
                raise Failure('STATE_TOO_LARGE')
        require(child.returncode == 0 and output.is_file() and not output.is_symlink(), 'SYNTHESIS_FAILED')
        print(json.dumps({'event': 'local_synthesis_resource', 'peakChildRssBytes': peak, 'wallSeconds': round(time.monotonic() - started, 3)}), flush=True)
    finally:
        if child.poll() is None:
            child.kill()
        child.wait()
        if child.stdin and not child.stdin.closed:
            child.stdin.close()


class Worker:
    def __init__(self, config, reg, client, *, synth=synthesize, convert=None, stop=None, interval=60, sleep=None):
        from .media import convert as converter
        self.config, self.reg, self.client = config, reg, client
        self.synth, self.convert = synth, convert or converter
        self.stop, self.interval = stop or threading.Event(), interval
        self.sleep = sleep or self.stop.wait

    def result(self, record):
        body = record['result']
        exact(body, ['attemptId', 'inputVersion', 'outcome'])
        require(body['attemptId'] == record['job']['attemptId'] and body['inputVersion'] == record['job']['inputVersion'], 'INVALID_STATE')
        outcome = body['outcome']
        if outcome.get('status') == 'succeeded':
            exact(outcome, ['status', 'mediaIntentId']); require(outcome['mediaIntentId'] == record['mediaIntentId'], 'INVALID_STATE')
        else:
            require(outcome == {'status': 'failed', 'errorCode': 'PROVIDER_FAILED'}, 'INVALID_STATE')
        for count in range(3):
            try:
                result = self.client.request('/' + record['job']['id'] + '/result', body)
                exact(result, ['jobId', 'status', 'accepted'])
                require(result['accepted'] is True and result['jobId'] == record['job']['id'] and result['status'] == outcome['status'], 'INVALID_RESPONSE')
                return
            except Failure as error:
                if error.status in (401, 403, 404, 409, 422) or count == 2:
                    raise
                self.sleep((1, 3)[count])

    def reconcile(self, record):
        path = '/' + record['job']['id'] + '/media-intents/' + record['mediaIntentId'] + '/reconcile'
        for delay in [5, 15, 30]:
            require(not self.stop.is_set(), 'WORKER_STOPPED')
            try:
                data = self.client.request(path, {})
                exact(data, ['intentId', 'status'])
                require(data['intentId'] == record['mediaIntentId'] and data['status'] == 'verified', 'MEDIA_UNVERIFIED')
                return
            except Failure as error:
                if error.status in (401, 403, 404, 422):
                    raise
                self.sleep(delay)
        raise Failure('UPLOAD_RECONCILIATION_REQUIRED')

    def once(self):
        with Journal(self.config['state']) as journal:
            record = journal.load()
            if record and record['phase'] == 'claim_unknown':
                require(time.time() >= record['retryAfter'], 'CLAIM_ACK_UNKNOWN')
                private_path(journal.root, 'journal.json').unlink(); record = None
            if record and record['phase'] == 'completed':
                journal.finish(record); return 'completed'
            if not record:
                # Marker precedes claim; crash/lost response must not immediately acquire more work.
                journal.save({'phase': 'claim_unknown', 'retryAfter': time.time() + 315})
                data = self.client.request('/claim', {'workerId': self.config['worker_id'], 'capabilities': self.config['languages']})
                exact(data, ['job'])
                if data['job'] is None:
                    private_path(journal.root, 'journal.json').unlink(); return 'idle'
                job = validate_job(data['job'], self.reg, self.config['languages'])
                record = dict(phase='claimed', job=job, inputHash=job_hash(job), mediaIntentId=None, mp3Sha256=None, result=None)
                journal.save(record)
            job = validate_job(record['job'], self.reg, self.config['languages'])
            if record['phase'] == 'blocked':
                raise Failure('MANUAL_RECOVERY_REQUIRED')
            if record['phase'] == 'result_pending':
                self.result(record); record['phase'] = 'completed'; journal.save(record); journal.finish(record); return 'completed'
            total = threading.Timer(600, self.stop.set); total.start()
            try:
                with Lease(self.client, job, self.stop, self.interval) as lease:
                    root = journal.attempt_dir(job)
                    if record['phase'] in ('claimed', 'synthesizing'):
                        record['phase'] = 'synthesizing'; journal.save(record)
                        self.synth(job, self.reg['profiles'][job['languageCode']], self.config['cache'], root, self.stop)
                        require(not self.stop.is_set(), 'WORKER_STOPPED')
                        mp3 = self.convert(root, self.stop)
                        require(isinstance(mp3, bytes) and 0 < len(mp3) <= 3145728, 'MEDIA_INVALID')
                        target = private_path(root, 'audio.mp3')
                        with target.open('wb') as file:
                            file.write(mp3); file.flush(); os.fsync(file.fileno())
                        record['mp3Sha256'] = digest(mp3); record['phase'] = 'mp3_ready'; journal.save(record)
                    if record['phase'] == 'intent_requesting':
                        record['result'] = {'attemptId': job['attemptId'], 'inputVersion': job['inputVersion'], 'outcome': {'status': 'failed', 'errorCode': 'PROVIDER_FAILED'}}
                        record['phase'] = 'result_pending'; journal.save(record); self.result(record)
                        record['phase'] = 'completed'; journal.save(record); journal.finish(record); return 'failed'
                    if record['phase'] == 'mp3_ready':
                        record['phase'] = 'intent_requesting'; journal.save(record)
                        data = self.client.request('/' + job['id'] + '/media-intents', {'attemptId': job['attemptId']})
                        exact(data, ['intentId', 'status', 'expiresAt']); identifier(data['intentId']); require(data['status'] == 'issued', 'INVALID_RESPONSE')
                        record['mediaIntentId'] = data['intentId']; record['phase'] = 'intent_known'; journal.save(record)
                    if record['phase'] == 'intent_known':
                        file = private_path(root, 'audio.mp3'); require(file.stat().st_size <= 3145728, 'MEDIA_INVALID')
                        mp3 = file.read_bytes(); require(digest(mp3) == record['mp3Sha256'], 'LOCAL_DIGEST_MISMATCH')
                        require(not self.stop.is_set(), 'WORKER_STOPPED')
                        record['phase'] = 'upload_started'; journal.save(record)
                        try:
                            data = self.client.request('/' + job['id'] + '/media-intents/' + record['mediaIntentId'] + '/file', mp3, method='PUT', upload=True)
                            require(data.get('intentId') == record['mediaIntentId'] and data.get('status') == 'verified' and not(set(data) - {'intentId', 'status', 'asset', 'durationSeconds', 'bitrate'}), 'INVALID_RESPONSE')
                        except Failure:
                            self.reconcile(record)
                    elif record['phase'] == 'upload_started':
                        self.reconcile(record)
                    require(not self.stop.is_set() and not lease.lost, 'LEASE_LOST')
                    record['result'] = {'attemptId': job['attemptId'], 'inputVersion': job['inputVersion'], 'outcome': {'status': 'succeeded', 'mediaIntentId': record['mediaIntentId']}}
                    record['phase'] = 'result_pending'; journal.save(record); self.result(record)
                    record['phase'] = 'completed'; journal.save(record); journal.finish(record); return 'completed'
            except Failure as error:
                # Preserve unresolved upload/result/intent phases. Local synthesis errors can safely report failure.
                if record['phase'] in ('claimed', 'synthesizing', 'mp3_ready') and not self.stop.is_set():
                    record['result'] = {'attemptId': job['attemptId'], 'inputVersion': job['inputVersion'], 'outcome': {'status': 'failed', 'errorCode': 'PROVIDER_FAILED'}}
                    record['phase'] = 'result_pending'; journal.save(record)
                    try:
                        self.result(record); record['phase'] = 'completed'; journal.save(record); journal.finish(record)
                    except Failure:
                        pass
                raise error
            finally:
                total.cancel()
