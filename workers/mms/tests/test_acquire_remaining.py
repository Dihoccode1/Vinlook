import hashlib
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch
from vinlook_mms import acquire_remaining as r
from tests.test_acquire_english import Transport


class RemainingTests(unittest.TestCase):
    def test_manifest_exact_scope_and_total(self):
        entries = r.specs()
        self.assertEqual(set(entries), r.LOCALES)
        self.assertEqual(sum(s[0] for _, _, f in entries.values() for s in f.values()), 1597661068)

    def test_default_plan_has_no_io(self):
        with tempfile.TemporaryDirectory() as tmp:
            cache = Path(tmp).resolve() / 'absent'
            tr = Transport(b'')
            result = r.acquire_selected(cache, ['hi', 'vi'], transport=tr)
            self.assertEqual(len(result), 2)
            self.assertFalse(cache.exists())
            self.assertEqual(tr.calls, 0)

    def test_reject_unapproved_or_duplicate_languages(self):
        for languages in ([], ['en'], ['hi', 'hi'], ['xx']):
            with self.assertRaises(r.AcquisitionError):
                r.acquire_selected(Path('/models'), languages)

    def test_three_gib_guard_precedes_transport(self):
        with tempfile.TemporaryDirectory() as tmp:
            tr = Transport(b'')
            with patch.object(r.shutil, 'disk_usage', return_value=SimpleNamespace(free=3*1024**3-1)):
                with self.assertRaisesRegex(r.AcquisitionError, 'THREE_GIB_REQUIRED'):
                    r.acquire_selected(Path(tmp).resolve(), ['hi'], True, tr)
            self.assertEqual(tr.calls, 0)

    def test_sequential_install_reuse_and_tamper(self):
        data = b'fixture'
        spec = {'model.safetensors': (len(data), 'sha256', hashlib.sha256(data).hexdigest())}
        entries = {'hi': ('facebook/mms-tts-hin', 'a'*40, spec), 'vi': ('facebook/mms-tts-vie', 'b'*40, spec)}
        with tempfile.TemporaryDirectory() as tmp, patch.object(r, 'specs', return_value=entries), patch.object(r.shutil, 'disk_usage', return_value=SimpleNamespace(free=4*1024**3)):
            root = Path(tmp).resolve()
            tr = Transport(data)
            self.assertEqual(len(r.acquire_selected(root, ['hi', 'vi'], True, tr)), 2)
            r.acquire_selected(root, ['hi', 'vi'], True, tr)
            self.assertEqual(tr.calls, 2)
            (root / ('b'*40) / 'model.safetensors').write_bytes(b'corrupt')
            with self.assertRaisesRegex(r.AcquisitionError, 'DIGEST_MISMATCH'):
                r.acquire_selected(root, ['vi'], True, tr)
            self.assertEqual(tr.calls, 2)

    def test_unknown_root_and_partial_stage_block_without_deletion(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(r.shutil, 'disk_usage', return_value=SimpleNamespace(free=4*1024**3)):
            root = Path(tmp).resolve()
            stray = root / 'unknown'
            stray.write_text('retain')
            with self.assertRaisesRegex(r.AcquisitionError, 'ROOT_INVENTORY_REQUIRES_REVIEW'):
                r.acquire_selected(root, ['hi'], True)
            self.assertEqual(stray.read_text(), 'retain')

    def test_outer_lock_is_not_removed_on_conflict(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp).resolve()
            lock = root / '.remaining-acquire.lock'
            lock.write_text('other')
            with self.assertRaises(FileExistsError):
                r.acquire_selected(root, ['hi'], True)
            self.assertEqual(lock.read_text(), 'other')

    def test_manifest_tamper_rejected(self):
        with patch.object(r.Path, 'read_bytes', return_value=b'{}'):
            with self.assertRaisesRegex(r.AcquisitionError, 'MANIFEST_DIGEST_MISMATCH'):
                r.specs()
