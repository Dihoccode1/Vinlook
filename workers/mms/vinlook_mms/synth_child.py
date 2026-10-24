"""CPU-only child. No network/worker credentials; reads exact prepared local safetensors."""
import json
import sys
import wave
from pathlib import Path
from .core import chunks, require, digest, canonical


def cache_manifest(cache, profile):
    require(Path(cache).is_absolute() and Path(cache).resolve() == Path(cache) and not Path(cache).is_symlink(), 'MODEL_CACHE_INVALID')
    folder = Path(cache) / profile['revision']
    require(folder.is_dir() and not folder.is_symlink(), 'MODEL_CACHE_MISSING')
    manifest = folder / 'manifest.json'
    require(manifest.is_file() and not manifest.is_symlink() and manifest.stat().st_size <= 131072, 'MODEL_CACHE_INVALID')
    value = json.loads(manifest.read_text())
    require(set(value) == {'model', 'revision', 'files'} and value['model'] == profile['model'] and value['revision'] == profile['revision'], 'MODEL_CACHE_INVALID')
    require(type(value['files']) is dict and 'model.safetensors' in value['files'] and 'config.json' in value['files'], 'MODEL_CACHE_INVALID')
    for name, checksum in value['files'].items():
        require(name in {'config.json', 'model.safetensors', 'tokenizer_config.json', 'special_tokens_map.json', 'vocab.json'}, 'MODEL_CACHE_INVALID')
        file = folder / name
        require(file.is_file() and not file.is_symlink() and file.resolve().parent == folder.resolve() and file.stat().st_size < 1073741824, 'MODEL_CACHE_INVALID')
        import hashlib
        h = hashlib.sha256()
        with file.open('rb') as stream:
            for block in iter(lambda: stream.read(1048576), b''):
                h.update(block)
        require(h.hexdigest() == checksum, 'MODEL_CACHE_INVALID')
    require({p.name for p in folder.iterdir()} == set(value['files']) | {'manifest.json'}, 'MODEL_CACHE_INVALID')
    return folder


def main():
    raw = sys.stdin.buffer.read(131073); require(len(raw) <= 131072)
    task = json.loads(raw)
    folder = cache_manifest(task['cache'], task['profile'])
    import numpy as np
    import torch
    from transformers import VitsModel, AutoTokenizer
    torch.set_num_threads(4); torch.manual_seed(42)
    tokenizer = AutoTokenizer.from_pretrained(folder, local_files_only=True, trust_remote_code=False)
    model = VitsModel.from_pretrained(folder, local_files_only=True, use_safetensors=True, trust_remote_code=False).cpu().eval()
    rate = model.config.sampling_rate
    require(type(rate) is int and 8000 <= rate <= 48000, 'MODEL_SAMPLE_RATE')
    parts = chunks(task['text'], lambda text: len(tokenizer(text)['input_ids']))
    total, signals = 0, []
    for part in parts:
        with torch.inference_mode():
            signal = model(**tokenizer(part, return_tensors='pt')).waveform[0].cpu().numpy()
        require(signal.ndim == 1 and signal.size and np.isfinite(signal).all(), 'MEDIA_INVALID')
        total += signal.size
        require(total / rate <= 150 and total * 2 <= 16777216, 'NARRATION_DURATION')
        signals.append(signal)
    require(90 <= total / rate <= 150, 'NARRATION_DURATION')
    signal = np.concatenate(signals); require(np.any(signal != 0), 'MEDIA_INVALID')
    pcm = (np.clip(signal, -1, 1) * 32767).astype('<i2').tobytes()
    with wave.open(task['output'], 'wb') as output:
        output.setnchannels(1); output.setsampwidth(2); output.setframerate(rate); output.writeframes(pcm)


if __name__ == '__main__':
    try:
        main()
    except Exception:
        # Never expose transcript, path, model payload or imported-library exception.
        sys.exit(2)
