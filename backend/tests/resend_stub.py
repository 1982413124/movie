"""Local HTTP substitute for Resend; no test can send mail outside this process."""
import json
import socket
import threading
from http.client import HTTPConnection
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from unittest.mock import patch


class ResendStub:
    def __init__(self, responses=(), disconnect_after_accept=False):
        self.responses = list(responses)
        self.disconnect_after_accept = disconnect_after_accept
        self.requests = []
        self.accepted = []
        self.keys = {}
        self.lock = threading.Lock()

    def __enter__(self):
        stub = self

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *_):
                pass

            def do_POST(self):
                payload = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
                request = {'path': self.path, 'headers': dict(self.headers), 'payload': payload}
                with stub.lock:
                    stub.requests.append(request)
                    disconnect = False
                    if stub.responses:
                        status, content = stub.responses.pop(0)
                    else:
                        key = self.headers['Idempotency-Key']
                        if key not in stub.keys:
                            stub.accepted.append(payload)
                            stub.keys[key] = f'stub-email-{len(stub.accepted)}'
                        status, content = 200, {'id': stub.keys[key]}
                        disconnect = stub.disconnect_after_accept
                        stub.disconnect_after_accept = False
                if disconnect:
                    self.connection.shutdown(socket.SHUT_RDWR)
                    self.connection.close()
                    return
                data = content if isinstance(content, bytes) else json.dumps(content).encode('utf-8')
                self.send_response(status)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', str(len(data)))
                if 300 <= status < 400:
                    self.send_header('Location', 'https://example.invalid/do-not-follow')
                self.end_headers()
                self.wfile.write(data)

        self.server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        self.thread = threading.Thread(target=lambda: self.server.serve_forever(poll_interval=.05), daemon=True)
        self.thread.start()
        self.connection_patch = patch('reservation_mail.HTTPSConnection', side_effect=lambda host, **options:
            HTTPConnection('127.0.0.1', self.server.server_port, timeout=options['timeout']))
        self.connection = self.connection_patch.start()
        return self

    def __exit__(self, *_):
        self.connection_patch.stop()
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()
