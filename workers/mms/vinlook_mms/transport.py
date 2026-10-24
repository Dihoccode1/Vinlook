import json
import re
import ssl
import urllib.error
import urllib.request
import uuid
import time
from .core import Failure, require, canonical


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        raise Failure('REDIRECT_DENIED')


class Client:
    def __init__(self, config, *, opener=None):
        self.config = config
        # opener injection is a test seam, not an environment-controlled HTTP/TLS bypass.
        self.opener = opener or urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect(), urllib.request.HTTPSHandler(context=ssl.create_default_context()))

    def request(self, suffix, body, *, method='POST', upload=False):
        require(re.fullmatch(r'(?:/claim|/[a-f0-9]{24}/(?:renew|result|media-intents)|/[a-f0-9]{24}/media-intents/[a-f0-9]{24}/(?:file|reconcile))', suffix))
        headers = {'X-Vinlook-Worker-Id': self.config['worker_id'], 'X-Vinlook-Worker-Key': self.config['key'], 'Content-Type': 'application/json'}
        if upload:
            require(method == 'PUT' and isinstance(body, bytes) and 0 < len(body) <= 3145728)
            boundary = 'vinlook-' + uuid.uuid4().hex
            payload = ('--' + boundary + '\r\nContent-Disposition: form-data; name="file"; filename="audio.mp3"\r\nContent-Type: audio/mpeg\r\n\r\n').encode() + body + ('\r\n--' + boundary + '--\r\n').encode()
            headers['Content-Type'] = 'multipart/form-data; boundary=' + boundary
        else:
            payload = canonical(body).encode(); require(len(payload) <= 131072)
        request = urllib.request.Request(self.config['origin'] + '/api/v1/internal/jobs' + suffix, data=payload, headers=headers, method=method)
        budget = 100 if upload else 15
        deadline = time.monotonic() + budget
        try:
            with self.opener.open(request, timeout=budget) as response:
                require(response.status in (200, 201), 'HTTP_UNAVAILABLE')
                require(response.headers.get_content_type() == 'application/json', 'INVALID_RESPONSE')
                blocks, size = [], 0
                while True:
                    remaining = deadline - time.monotonic()
                    require(remaining > 0, 'TRANSPORT_UNKNOWN')
                    sock = response.fp.raw._sock
                    sock.settimeout(remaining)
                    block = response.read1(min(4096, 131073 - size))
                    if not block:
                        break
                    blocks.append(block); size += len(block)
                    require(size <= 131072, 'INVALID_RESPONSE')
                    if response.isclosed():
                        break
                raw = b''.join(blocks)
                data = json.loads(raw)
                require(type(data) is dict and set(data) == {'data', 'requestId'} and type(data['requestId']) is str, 'INVALID_RESPONSE')
                require(str(uuid.UUID(data['requestId'])) == data['requestId'], 'INVALID_RESPONSE')
                require(type(data['data']) is dict, 'INVALID_RESPONSE')
                return data['data']
        except urllib.error.HTTPError as error:
            status = error.code; error.close()
            raise Failure('CONTENT_REJECTED', status) from None
        except Failure:
            raise
        except Exception:
            raise Failure('TRANSPORT_UNKNOWN') from None
