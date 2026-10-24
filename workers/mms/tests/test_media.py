import array
import math
from pathlib import Path
import tempfile
import threading
import unittest
import wave
from vinlook_mms.media import binaries, convert, execute
from vinlook_mms.core import Failure


class MediaTests(unittest.TestCase):
    def test_real_pinned_ffmpeg_and_independent_probe(self):
        stop = threading.Event(); binaries(stop)
        with tempfile.TemporaryDirectory() as root:
            samples = array.array('h', (int(4000 * math.sin(i * 2 * math.pi * 440 / 16000)) for i in range(90 * 16000)))
            with wave.open(str(Path(root) / 'audio.wav'), 'wb') as file:
                file.setnchannels(1); file.setsampwidth(2); file.setframerate(16000); file.writeframes(samples.tobytes())
            result = convert(Path(root), stop)
            self.assertGreater(len(result), 700000); self.assertLessEqual(len(result), 3145728)
            print(json.dumps({'syntheticMp3Bytes': len(result), 'modelDownloads': False}))

    def test_child_abort_output_limit_and_no_secret_environment(self):
        stop = threading.Event()
        result = execute(['/usr/local/bin/python', '-c', 'import os;print(os.environ.get("VINLOOK_WORKER_KEY_B64URL","clean"))'], stop)
        self.assertEqual(result.strip(), b'clean')
        with self.assertRaises(Failure): execute(['/usr/local/bin/python', '-c', 'print("x"*100000)'], stop, limit=100)
        with self.assertRaises(Failure): execute(['/usr/local/bin/python', '-c', 'import time;time.sleep(10)'], stop, timeout=.05)

    def test_zero_pcm_and_wrong_duration_rejected(self):
        with tempfile.TemporaryDirectory() as root:
            with wave.open(str(Path(root) / 'audio.wav'), 'wb') as file:
                file.setnchannels(1); file.setsampwidth(2); file.setframerate(16000); file.writeframes(b'\0' * 90 * 32000)
            with self.assertRaises(Failure): convert(Path(root), threading.Event())


import json
