import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from vinlook_mms.canary_english import input_document, run
from vinlook_mms.core import Failure


class CanaryInputTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.file = Path(self.tmp.name) / 'input.json'
        self.value = {'poiId': 'POI-001', 'text': 'Approved fixture.',
                      'sourceTextSha256': hashlib.sha256(b'Approved fixture.').hexdigest()}

    def tearDown(self):
        self.tmp.cleanup()

    def test_plan_does_not_load_model_or_create_outputs(self):
        self.file.write_text(json.dumps(self.value))
        output = Path(self.tmp.name) / 'absent'
        result = run(self.file, output, output)
        self.assertEqual(result['status'], 'plan_only')
        self.assertFalse(output.exists())

    def test_edited_text_cannot_reuse_old_hash(self):
        self.value['text'] += ' Changed.'
        self.file.write_text(json.dumps(self.value))
        with self.assertRaises(Failure):
            input_document(self.file)

    def test_other_poi_or_extra_fields_rejected(self):
        for value in (dict(self.value, poiId='POI-002'), dict(self.value, model='other')):
            self.file.write_text(json.dumps(value))
            with self.assertRaises(Failure):
                input_document(self.file)
