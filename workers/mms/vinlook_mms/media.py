import json
import os
import subprocess
import time
import threading
import wave
from .core import Failure, require, private_path


def execute(args, stop, *, limit=65536, timeout=20, input_bytes=None):
    # Binaries are fixed absolute paths; no shell, inherited secret or user-selected protocol.
    env = {'LANG': 'C', 'OMP_NUM_THREADS': '4'}
    child = subprocess.Popen(args, stdin=subprocess.PIPE if input_bytes is not None else subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=env, shell=False)
    pieces, errors = [], []
    overflow = threading.Event()
    def read(stream, target, maximum):
        size = 0
        while True:
            block = stream.read(4096)
            if not block:
                return
            size += len(block)
            if size > maximum:
                overflow.set(); child.kill(); return
            target.append(block)
    readers = [threading.Thread(target=read, args=(child.stdout, pieces, limit)), threading.Thread(target=read, args=(child.stderr, errors, 65536))]
    for reader in readers:
        reader.start()
    def write():
        try:
            if input_bytes is not None:
                child.stdin.write(input_bytes); child.stdin.close()
        except (BrokenPipeError, OSError):
            pass
        finally:
            if child.stdin and not child.stdin.closed:
                try:
                    child.stdin.close()
                except (BrokenPipeError, OSError):
                    pass
    writer = threading.Thread(target=write); writer.start()
    try:
        started = time.monotonic()
        while True:
            if stop.is_set() or time.monotonic() - started >= timeout:
                raise Failure('CHILD_CANCELLED')
            if child.poll() is not None:
                for reader in readers:
                    reader.join()
                require(child.returncode == 0 and not overflow.is_set(), 'MEDIA_INVALID')
                return b''.join(pieces)
            time.sleep(.01)
    finally:
        if child.poll() is None:
            child.kill()
        child.wait(); writer.join()
        for reader in readers:
            reader.join()
        child.stdout.close(); child.stderr.close()


def binaries(stop):
    for file in ['/usr/bin/ffmpeg', '/usr/bin/ffprobe']:
        require(b'version 7.1.5-0+deb13u1' in execute([file, '-version'], stop), 'BINARY_VERSION_MISMATCH')
    require(b'libmp3lame' in execute(['/usr/bin/ffmpeg', '-hide_banner', '-encoders'], stop), 'BINARY_ENCODER_MISSING')


def convert(root, stop):
    source, target = private_path(root, 'audio.wav'), private_path(root, 'audio.mp3')
    require(source.stat().st_size <= 16777216, 'MEDIA_INVALID')
    with wave.open(str(source), 'rb') as w:
        require(w.getnchannels() == 1 and w.getsampwidth() == 2 and 8000 <= w.getframerate() <= 48000 and 90 <= w.getnframes() / w.getframerate() <= 150, 'MEDIA_INVALID')
        pcm = w.readframes(w.getnframes())
        require(len(pcm) == w.getnframes() * 2 and any(pcm), 'MEDIA_INVALID')
    mp3 = execute(['/usr/bin/ffmpeg', '-hide_banner', '-loglevel', 'error', '-nostdin', '-threads', '1', '-protocol_whitelist', 'pipe', '-f', 'wav', '-i', 'pipe:0', '-vn', '-ac', '1', '-ar', '24000', '-c:a', 'libmp3lame', '-b:a', '64k', '-threads', '1', '-f', 'mp3', 'pipe:1'], stop, limit=3145728, input_bytes=source.read_bytes())
    require(0 < len(mp3) <= 3145728, 'MEDIA_INVALID')
    raw = execute(['/usr/bin/ffprobe', '-v', 'error', '-protocol_whitelist', 'pipe', '-f', 'mp3', '-show_entries', 'stream=codec_name,channels,sample_rate', '-of', 'json', 'pipe:0'], stop, input_bytes=mp3)
    value = json.loads(raw)
    require(len(value.get('streams', [])) == 1, 'MEDIA_INVALID')
    stream = value['streams'][0]
    require(stream.get('codec_name') == 'mp3' and stream.get('channels') == 1 and stream.get('sample_rate') == '24000', 'MEDIA_INVALID')
    durations = execute(['/usr/bin/ffprobe', '-v', 'error', '-protocol_whitelist', 'pipe', '-f', 'mp3', '-show_entries', 'packet=duration_time', '-of', 'csv=p=0', 'pipe:0'], stop, input_bytes=mp3)
    seconds = sum(float(line) for line in durations.decode().splitlines() if line.strip())
    require(90 <= seconds <= 150, 'MEDIA_INVALID')
    return mp3
