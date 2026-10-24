import http.server
import json
import threading
import unittest
import uuid
from vinlook_mms.transport import Client
from vinlook_mms.core import Failure


class TransportTests(unittest.TestCase):
    def setUp(self):
        owner = self
        self.mode, self.calls = 'normal', 0
        class Handler(http.server.BaseHTTPRequestHandler):
            def do_POST(self):
                owner.calls += 1
                self.rfile.read(int(self.headers.get('content-length', '0')))
                if owner.mode == 'redirect':
                    self.send_response(302); self.send_header('Location', 'http://127.0.0.1:1/forbidden'); self.end_headers(); return
                self.send_response(403 if owner.mode == 'denied' else 200)
                self.send_header('Content-Type', 'application/json')
                body = {'data': {'job': None}, 'requestId': str(uuid.uuid4())}
                if owner.mode == 'extra': body['secret'] = 'provider-private'
                raw = b'x' * 131073 if owner.mode == 'oversized' else json.dumps(body).encode()
                self.send_header('Content-Length', str(len(raw))); self.end_headers()
                self.wfile.write(raw)
            def log_message(self, *args): pass
        self.server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        self.thread = threading.Thread(target=self.server.serve_forever); self.thread.start()
        self.client = Client({'origin': 'http://127.0.0.1:' + str(self.server.server_port), 'worker_id': 'fixture', 'key': 'synthetic-private'})

    def tearDown(self):
        self.server.shutdown(); self.server.server_close(); self.thread.join()

    def test_bounded_exact_response(self):
        self.assertEqual(self.client.request('/claim', {}), {'job': None})
        for mode in ['extra', 'oversized', 'denied', 'redirect']:
            self.mode = mode
            with self.assertRaises(Failure) as context: self.client.request('/claim', {})
            self.assertNotIn('private', str(context.exception))
        self.assertEqual(self.calls, 5)

    def test_path_cannot_expand_scope_or_inject_host(self):
        for path in ['/admin/pois', 'https://evil.invalid', '/claim?scope=all', '/../result']:
            with self.assertRaises(Failure): self.client.request(path, {})
        self.assertEqual(self.calls, 0)
