"""Synthetic-only test seam; not a production entrypoint or configuration bypass."""
import array
import json
import math
from pathlib import Path
import re
import sys
import tempfile
import wave
from vinlook_mms.core import registry, require, Failure
from vinlook_mms.engine import Worker
from vinlook_mms.transport import Client

payload = json.loads(sys.stdin.buffer.read(131073))
require(re.fullmatch(r'http://host\.docker\.internal:[0-9]+', payload['origin']))
with tempfile.TemporaryDirectory() as state:
    config = dict(origin=payload['origin'], key=payload['key'], worker_id=payload['workerId'], languages=['en'], state=state, cache=state)
    def synth(job, profile, cache, folder, stop):
        pcm = array.array('h', (int(6000 * math.sin(i * 2 * math.pi * 440 / 16000)) for i in range(90 * 16000)))
        if sys.byteorder != 'little': pcm.byteswap()
        with wave.open(str(folder / 'audio.wav'), 'wb') as output:
            output.setnchannels(1); output.setsampwidth(2); output.setframerate(16000); output.writeframes(pcm.tobytes())
    worker = Worker(config, registry('/app/hybrid-v1.json'), Client(config), synth=synth, sleep=lambda _: None)
    try:
        status = worker.once()
        print(json.dumps({'status': status, 'receiptRetained': (Path(state) / 'receipt.json').exists(), 'modelDownloads': False}))
    except Failure as error:
        print(json.dumps({'status': 'failed', 'code': error.code})); raise SystemExit(2)
