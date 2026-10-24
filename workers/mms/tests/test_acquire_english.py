import hashlib
import io
import json
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch
from vinlook_mms import acquire_english as a


class Reply(io.BytesIO):
    def geturl(self):
        return 'https://huggingface.co/test'


class Transport:
    def __init__(self, data):
        self.data = data
        self.calls = 0

    def open(self, request, timeout):
        self.calls += 1
        return Reply(self.data)


class AcquisitionTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.cache = Path(self.tmp.name).resolve() / 'cache'
        self.data = b'fixture-only-not-a-model'
        self.spec = {'model.safetensors': (len(self.data), 'sha256', hashlib.sha256(self.data).hexdigest())}
        self.patch = patch.object(a, 'FILES', self.spec)
        self.patch.start()

    def tearDown(self):
        self.patch.stop()
        self.tmp.cleanup()

    def test_plan_has_no_side_effect_or_transport(self):
        tr = Transport(self.data)
        self.assertEqual(a.acquire(self.cache, transport=tr)['status'], 'plan_only')
        self.assertFalse(self.cache.exists())
        self.assertEqual(tr.calls, 0)

    def test_promotion_and_verified_reuse_do_not_redownload(self):
        tr = Transport(self.data)
        self.assertEqual(a.acquire(self.cache, True, tr)['status'], 'downloaded_verified')
        self.assertEqual(a.acquire(self.cache, True, tr)['status'], 'verified_existing')
        self.assertEqual(tr.calls, 1)
        self.assertFalse((self.cache / ('.' + a.REVISION + '.staging')).exists())

    def test_same_size_corruption_never_promotes(self):
        with self.assertRaisesRegex(a.AcquisitionError, 'DIGEST_MISMATCH'):
            a.acquire(self.cache, True, Transport(b'X' * len(self.data)))
        self.assertFalse((self.cache / a.REVISION).exists())
        with self.assertRaisesRegex(a.AcquisitionError, 'STAGING_REQUIRES_REVIEW'):
            a.acquire(self.cache, True, Transport(self.data))

    def test_oversize_stops_and_does_not_promote(self):
        with self.assertRaisesRegex(a.AcquisitionError, 'DOWNLOAD_OVERSIZE'):
            a.acquire(self.cache, True, Transport(self.data + b'x'))
        self.assertFalse((self.cache / a.REVISION).exists())

    def test_existing_tampered_cache_never_fetches(self):
        tr = Transport(self.data)
        a.acquire(self.cache, True, tr)
        (self.cache / a.REVISION / 'model.safetensors').write_bytes(b'X' * len(self.data))
        with self.assertRaisesRegex(a.AcquisitionError, 'DIGEST_MISMATCH'):
            a.acquire(self.cache, True, tr)
        self.assertEqual(tr.calls, 1)

    def test_unknown_cache_file_is_not_deleted(self):
        a.acquire(self.cache, True, Transport(self.data))
        stray = self.cache / a.REVISION / 'unknown'
        stray.write_text('retain')
        with self.assertRaisesRegex(a.AcquisitionError, 'CACHE_INVENTORY_MISMATCH'):
            a.acquire(self.cache, True)
        self.assertEqual(stray.read_text(), 'retain')

    def test_lock_excludes_parallel_acquisition(self):
        self.cache.mkdir()
        (self.cache / '.english-acquire.lock').write_text('other')
        with self.assertRaisesRegex(a.AcquisitionError, 'ACQUISITION_BUSY'):
            a.acquire(self.cache, True)

    def test_git_blob_verification(self):
        file = Path(self.tmp.name) / 'config.json'
        file.write_bytes(b'{}')
        blob = hashlib.sha1(b'blob 2\0{}').hexdigest()
        self.assertEqual(a.verify(file, (2, 'git', blob)), hashlib.sha256(b'{}').hexdigest())

    def test_redirect_origin_and_credentials(self):
        for url in ('http://huggingface.co/x', 'https://huggingface.co.evil.test/x', 'https://user:pass@huggingface.co/x', 'https://127.0.0.1/x'):
            self.assertFalse(a.allowed_url(url))
        self.assertTrue(a.allowed_url('https://cas-bridge.xethub.hf.co/public-signed-path'))

    def test_untrusted_redirect_is_rejected_before_request(self):
        with self.assertRaisesRegex(a.AcquisitionError, 'REDIRECT_REJECTED'):
            a.Redirects().redirect_request(a.urllib.request.Request('https://huggingface.co/test'), None, 302, '', {}, 'https://evil.test/file')

    def test_low_disk_does_not_download(self):
        tr = Transport(self.data)
        with patch.object(a.shutil, 'disk_usage', return_value=SimpleNamespace(free=100)):
            with self.assertRaisesRegex(a.AcquisitionError, 'DISK_ALLOWANCE_UNAVAILABLE'):
                a.acquire(self.cache, True, tr)
        self.assertEqual(tr.calls, 0)

    def test_relative_path_and_symlink_rejected(self):
        with self.assertRaisesRegex(a.AcquisitionError, 'ABSOLUTE_CACHE_REQUIRED'):
            a.acquire(Path('relative'))
        link = Path(self.tmp.name) / 'link'
        try:
            link.symlink_to(self.tmp.name, target_is_directory=True)
        except OSError:
            return  # Windows privilege may deny making test symlinks; Linux covers it.
        with self.assertRaisesRegex(a.AcquisitionError, 'LINK_PATH_REJECTED'):
            a.acquire(link / 'cache')
