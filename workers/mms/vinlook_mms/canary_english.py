"""Opt-in POI001 English packaging canary; no Content/provider calls or job claims."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import threading
import time
from .core import require, registry, canonical, Failure
from .synth_child import cache_manifest
from .media import binaries, convert, execute


def input_document(path):
    path = Path(path)
    require(path.is_file() and not path.is_symlink() and path.stat().st_size <= 131072, 'CANARY_INPUT_INVALID')
    value = json.loads(path.read_text(encoding='utf-8'))
    require(set(value) == {'poiId', 'text', 'sourceTextSha256'} and value['poiId'] == 'POI-001', 'CANARY_INPUT_INVALID')
    require(type(value['text']) is str and 0 < len(value['text']) <= 20000, 'CANARY_INPUT_INVALID')
    require(hashlib.sha256(value['text'].encode()).hexdigest() == value['sourceTextSha256'], 'CANARY_SOURCE_MISMATCH')
    return value


def run(input_path, cache, output, apply=False):
    value = input_document(input_path)
    result = {'scope': 'local English canary, not final batch acceptance', 'poiId': 'POI-001',
              'sourceTextSha256': value['sourceTextSha256'], 'status': 'plan_only',
              'providerCalls': 0, 'jobClaims': 0, 'published': False}
    if not apply:
        return result
    # Container-only command, expected read-only model mount and --network none.
    require(sys.platform == 'linux', 'LINUX_CANARY_REQUIRED')
    reg = registry(Path(__file__).resolve().parents[1] / 'hybrid-v1.json')
    profile = reg['profiles']['en']
    cache = Path(cache)
    cache_manifest(cache, profile)
    output = Path(output)
    require(output.is_absolute() and output.is_dir() and output.resolve() == output and not output.is_symlink(), 'CANARY_OUTPUT_INVALID')
    require(not any(output.iterdir()), 'CANARY_OUTPUT_NOT_EMPTY')
    stop = threading.Event()
    binaries(stop)
    task = {'cache': str(cache), 'profile': profile, 'text': value['text'], 'output': str(output / 'audio.wav')}
    # Optional observer only; original synthesis duration/output guards are retained.
    code = 'import json; from vinlook_mms.synth_child import main; main(report=lambda e: print(json.dumps(e), flush=True))'
    env = {'LANG': 'C', 'OMP_NUM_THREADS': '4', 'HF_HUB_OFFLINE': '1', 'TRANSFORMERS_OFFLINE': '1',
           'HF_HUB_DISABLE_TELEMETRY': '1', 'HF_HUB_DISABLE_IMPLICIT_TOKEN': '1', 'PYTHONDONTWRITEBYTECODE': '1'}
    started = time.monotonic()
    import psutil
    child = subprocess.Popen([sys.executable, '-c', code], stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                             stderr=subprocess.PIPE, env=env, shell=False)
    peak = [0]
    finished = threading.Event()
    def observe():
        while not finished.wait(.02):
            try:
                peak[0] = max(peak[0], psutil.Process(child.pid).memory_info().rss)
            except psutil.Error:
                pass
    observer = threading.Thread(target=observe)
    observer.start()
    timed_out = False
    try:
        try:
            stdout, stderr = child.communicate(canonical(task).encode(), timeout=480)
        except subprocess.TimeoutExpired:
            timed_out = True
            child.kill()
            stdout, stderr = child.communicate()
    finally:
        if child.poll() is None:
            child.kill()
        child.wait()
        finished.set()
        observer.join()
    require(len(stdout) <= 16384 and len(stderr) <= 65536, 'CANARY_CHILD_OUTPUT_LIMIT')
    records = [json.loads(line) for line in stdout.decode().splitlines() if line.strip()]
    last = records[-1] if records else None
    result.update(status='synthesis_rejected' if child.returncode else 'synthesized',
                  model=profile['model'], revision=profile['revision'], profileId=profile['id'],
                  synthesisSeconds=round(time.monotonic() - started, 3),
                  peakChildRssBytesObserved=peak[0], observation=last, childExitCode=child.returncode,
                  timedOut=timed_out)
    if child.returncode == 0:
        try:
            mp3 = convert(output, stop)  # Existing strict checks, never padding or rate changes.
            (output / 'audio.mp3').write_bytes(mp3)
            raw = execute(['/usr/bin/ffprobe', '-v', 'error', '-protocol_whitelist', 'pipe', '-f', 'mp3',
                           '-show_entries', 'packet=duration_time', '-of', 'csv=p=0', 'pipe:0'], stop, input_bytes=mp3)
            seconds = sum(float(line) for line in raw.decode().splitlines() if line.strip())
            result.update(status='generated_format_duration_pass', mp3DurationSeconds=seconds,
                          mp3Bytes=len(mp3), mp3Sha256=hashlib.sha256(mp3).hexdigest(),
                          codec='mp3', channels=1, sampleRate=24000, humanListeningReview='pending')
        except Failure as error:
            result.update(status='conversion_rejected', safeErrorCode=error.code)
    result['totalWallSeconds'] = round(time.monotonic() - started, 3)
    (output / 'canary-result.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', required=True, type=Path)
    parser.add_argument('--cache', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    try:
        value = run(args.input, args.cache, args.output, args.apply)
        print(json.dumps(value))
        if value['status'] in ('synthesis_rejected', 'conversion_rejected'):
            raise SystemExit(2)
    except Failure as error:
        print(json.dumps({'status': 'failed', 'code': error.code}))
        raise SystemExit(1)
    except Exception:
        print(json.dumps({'status': 'failed', 'code': 'CANARY_UNAVAILABLE'}))
        raise SystemExit(1)


if __name__ == '__main__':
    main()
