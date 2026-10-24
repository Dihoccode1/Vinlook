"""Convert a reviewed Linux pip dry-run report into exact hash-checked artifacts."""
import json
from pathlib import Path
import sys
report = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
rows = []
for item in report['install']:
    info, download = item['metadata'], item['download_info']
    url = download['url']
    if not url.startswith(('https://files.pythonhosted.org/', 'https://download-r2.pytorch.org/', 'https://download.pytorch.org/')) or not url.endswith('.whl'):
        raise SystemExit('Unapproved package artifact')
    digest = download['archive_info']['hashes']['sha256']
    rows.append((info['name'], f"{info['name']} @ {url} --hash=sha256:{digest}"))
Path(sys.argv[2]).write_text('\n'.join(row for _, row in sorted(rows)) + '\n', encoding='utf-8')
print(json.dumps({'lockedPackages': len(rows), 'modelDownloads': False}))
