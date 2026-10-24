import argparse
import json
import os
from pathlib import Path
import signal
import threading
from .core import Failure, config, registry
from .transport import Client
from .engine import Worker
from .synth_child import cache_manifest
from .media import binaries


def main():
    parser = argparse.ArgumentParser(description='Explicit local MMS worker; no real downloads or autostart.')
    parser.add_argument('command', choices=['check', 'run', 'prepare-models'], default='check', nargs='?')
    group = parser.add_mutually_exclusive_group()
    group.add_argument('--once', action='store_true'); group.add_argument('--loop', action='store_true')
    args = parser.parse_args()
    stop = threading.Event()
    for sig in [signal.SIGINT, signal.SIGTERM]:
        signal.signal(sig, lambda *_: stop.set())
    reg = registry(Path(__file__).resolve().parents[1] / 'hybrid-v1.json')
    cfg = config(os.environ, reg)
    if args.command == 'prepare-models':
        print(json.dumps({'status': 'plan_only', 'downloadAuthorized': False, 'models': [{k: reg['profiles'][c][k] for k in ['model', 'revision']} for c in cfg['languages']], 'nextStep': 'Review exact files, disk requirements and checksums before authorizing model downloads'}))
        return
    binaries(stop)
    for code in cfg['languages']:
        cache_manifest(cfg['cache'], reg['profiles'][code])
    if args.command == 'check':
        print(json.dumps({'status': 'configuration_and_cache_checked', 'languages': cfg['languages'], 'claimsSent': 0}))
        return
    worker = Worker(cfg, reg, Client(cfg), stop=stop)
    while not stop.is_set():
        status = worker.once()
        print(json.dumps({'status': status}))
        if not args.loop:
            return
        if status == 'idle':
            stop.wait(30)


if __name__ == '__main__':
    try:
        main()
    except Failure as error:
        print(json.dumps({'error': {'code': error.code}}))
        raise SystemExit(1)
    except Exception:
        print(json.dumps({'error': {'code': 'WORKER_UNAVAILABLE'}}))
        raise SystemExit(1)
