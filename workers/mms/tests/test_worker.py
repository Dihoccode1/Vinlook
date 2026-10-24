import base64
import copy
import hashlib
import json
from pathlib import Path
import tempfile
import threading
import time
import unittest
import uuid
from vinlook_mms.core import Failure, config, registry, validate_job, chunks, private_path, canonical
from vinlook_mms.engine import Worker, Journal, Lease

ROOT = Path(__file__).resolve().parents[1]


def reg():
    return registry(ROOT / 'hybrid-v1.json')


def job():
    return dict(id='a' * 24, taskType='audio', languageCode='en', inputVersion=dict(sourceVersion=1, textVersion=1, targetTextVersion=None, targetSourceVersion=None), inputSnapshot=dict(text='Synthetic narration', registryVersion='vinlook-hybrid-v1', modelId=reg()['profiles']['en']['id'], execution='local_worker'), attemptId=str(uuid.uuid4()), leaseExpiresAt='2026-10-24T20:00:00.000Z', retryCount=0)


class FakeClient:
    def __init__(self):
        self.job, self.calls, self.mode, self.result_bodies = job(), [], '', []
        self.result_lost = 0

    def request(self, path, body, **options):
        self.calls.append(path)
        if path == '/claim':
            if self.mode == 'claim_lost':
                raise Failure('TRANSPORT_UNKNOWN')
            return {'job': copy.deepcopy(self.job)}
        if path.endswith('/renew'):
            if self.mode == 'lease_lost':
                raise Failure('CONTENT_REJECTED', 409)
            return {'jobId': self.job['id'], 'leaseExpiresAt': self.job['leaseExpiresAt']}
        if path.endswith('/media-intents'):
            if self.mode == 'intent_lost':
                raise Failure('TRANSPORT_UNKNOWN')
            return {'intentId': 'b' * 24, 'status': 'issued', 'expiresAt': self.job['leaseExpiresAt']}
        if path.endswith('/file'):
            if self.mode in ('upload_lost', 'upload_and_reconcile_lost'):
                raise Failure('TRANSPORT_UNKNOWN')
            return {'intentId': 'b' * 24, 'status': 'verified', 'asset': {}, 'durationSeconds': 90, 'bitrate': 64000}
        if path.endswith('/reconcile'):
            if self.mode == 'upload_and_reconcile_lost':
                raise Failure('CONTENT_REJECTED', 503)
            return {'intentId': 'b' * 24, 'status': 'verified'}
        if path.endswith('/result'):
            self.result_bodies.append(copy.deepcopy(body))
            if self.result_lost:
                self.result_lost -= 1; raise Failure('TRANSPORT_UNKNOWN')
            return {'jobId': self.job['id'], 'status': body['outcome']['status'], 'accepted': True}
        raise AssertionError(path)


class WorkerTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(); self.root = Path(self.tmp.name).resolve(); self.client = FakeClient()
        self.cfg = dict(state=str(self.root), cache=str(self.root / 'cache'), origin='https://content.example.invalid', key='synthetic', worker_id='worker', languages=['en'])
        self.synth_calls = 0

    def tearDown(self):
        self.tmp.cleanup()

    def synth(self, job, profile, cache, folder, stop):
        self.synth_calls += 1; (folder / 'audio.wav').write_bytes(b'synthetic')

    def worker(self, **args):
        return Worker(self.cfg, reg(), self.client, synth=self.synth, convert=lambda *_: b'synthetic-mp3', sleep=lambda _: None, **args)

    def test_config_and_registry(self):
        r = reg(); self.assertEqual(len([p for p in r['profiles'].values() if p['execution'] == 'local_worker']), 12)
        env = dict(VINLOOK_CONTENT_ORIGIN='https://content.example.invalid', VINLOOK_WORKER_ID='test', VINLOOK_WORKER_KEY_B64URL=base64.urlsafe_b64encode(b'a' * 32).decode().rstrip('='), VINLOOK_STATE_DIR=str(self.root), VINLOOK_MODEL_CACHE_DIR=str(self.root / 'cache'), VINLOOK_LANGUAGES='en,pcm')
        self.assertEqual(config(env, r)['languages'], ['en', 'pcm'])
        for patch in [{'VINLOOK_CONTENT_ORIGIN': 'http://localhost'}, {'VINLOOK_CONTENT_ORIGIN': 'https://host/path'}, {'VINLOOK_LANGUAGES': 'ja'}, {'VINLOOK_LANGUAGES': 'en,en'}, {'VINLOOK_WORKER_KEY_B64URL': 'unsafe'}]:
            with self.assertRaises(Failure): config({**env, **patch}, r)

    def test_job_allowlist_and_versions(self):
        value = job(); validate_job(value, reg(), ['en'])
        for patch in [dict(taskType='translation'), dict(languageCode='ja'), dict(id='../etc/passwd'), dict(extra='privilege')]:
            with self.assertRaises(Failure): validate_job({**value, **patch}, reg(), ['en'])
        value['inputVersion']['textVersion'] = True
        with self.assertRaises(Failure): validate_job(value, reg(), ['en'])

    def test_chunk_preserves_exact_text_and_bounds(self):
        text = ('A sentence with words. ' * 100).strip(); parts = chunks(text, lambda t: len(t.split()))
        self.assertEqual(''.join(parts), text); self.assertTrue(all(len(p) <= 400 for p in parts))
        with self.assertRaises(Failure): chunks('x' * 401, lambda _: 1)
        with self.assertRaises(Failure): chunks('words ' * 4000, lambda t: len(t))

    def test_paths_and_lock_reject_unsafe_state(self):
        with self.assertRaises(Failure): private_path(self.root, '../outside')
        with Journal(self.root):
            with self.assertRaises(Failure):
                with Journal(self.root): pass
        (self.root / 'audio.mp3').symlink_to(self.root / 'outside')
        with self.assertRaises(Failure): private_path(self.root, 'audio.mp3')

    def test_complete_flow_and_cleanup(self):
        self.assertEqual(self.worker().once(), 'completed'); self.assertEqual(self.synth_calls, 1)
        self.assertEqual(len([p for p in self.client.calls if p.endswith('/file')]), 1)
        self.assertFalse((self.root / 'journal.json').exists()); self.assertTrue((self.root / 'receipt.json').exists())
        self.assertNotIn(self.cfg['key'], (self.root / 'receipt.json').read_text())

    def test_upload_unknown_only_reconciles_no_second_put_or_synthesis(self):
        self.client.mode = 'upload_and_reconcile_lost'
        with self.assertRaises(Failure): self.worker().once()
        self.assertEqual(json.loads((self.root / 'journal.json').read_text())['phase'], 'upload_started')
        self.client.mode = ''; self.assertEqual(self.worker().once(), 'completed')
        self.assertEqual(self.synth_calls, 1); self.assertEqual(len([p for p in self.client.calls if p.endswith('/file')]), 1)

    def test_intent_unknown_does_not_issue_another_intent(self):
        self.client.mode = 'intent_lost'
        with self.assertRaises(Failure): self.worker().once()
        self.client.mode = ''; self.assertEqual(self.worker().once(), 'failed')
        self.assertEqual(len([p for p in self.client.calls if p.endswith('/media-intents')]), 1)
        self.assertEqual(self.client.result_bodies[-1]['outcome']['status'], 'failed')

    def test_result_unknown_replays_identical_receipt_before_renew(self):
        self.client.result_lost = 3
        with self.assertRaises(Failure): self.worker().once()
        self.client.mode = 'lease_lost'; self.assertEqual(self.worker().once(), 'completed')
        bodies = [canonical(b) for b in self.client.result_bodies]; self.assertEqual(len(set(bodies)), 1)

    def test_lost_claim_stops_subsequent_claims(self):
        self.client.mode = 'claim_lost'
        with self.assertRaises(Failure): self.worker().once()
        with self.assertRaisesRegex(Failure, 'CLAIM_ACK_UNKNOWN'): self.worker().once()
        self.assertEqual(self.client.calls.count('/claim'), 1)

    def test_renew_independent_during_synthesis(self):
        def held(job, profile, cache, folder, stop):
            time.sleep(.08); self.synth(job, profile, cache, folder, stop)
        worker = self.worker(interval=.01); worker.synth = held
        self.assertEqual(worker.once(), 'completed')
        self.assertGreater(len([p for p in self.client.calls if p.endswith('/renew')]), 2)

    def test_lost_lease_stops_child_and_prevents_upload(self):
        def held(job, profile, cache, folder, stop):
            self.client.mode = 'lease_lost'; self.assertTrue(stop.wait(.2)); raise Failure('CHILD_CANCELLED')
        worker = self.worker(interval=.01); worker.synth = held
        with self.assertRaises(Failure): worker.once()
        self.assertFalse(any(p.endswith('/file') for p in self.client.calls))

    def test_tampered_journal_never_contacts_content(self):
        (self.root / 'journal.json').write_text('{"phase":"claimed","key":"secret"}')
        with self.assertRaises(Failure): self.worker().once()
        self.assertFalse(self.client.calls)


if __name__ == '__main__': unittest.main()
