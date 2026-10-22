# Local static server that mimics Cloudflare's clean URLs:
# /conditions-generales-de-vente → conditions-generales-de-vente.html
#
#   python3 _build/serve.py            # serves the repo root on 127.0.0.1:8765
#
# Plain `python3 -m http.server` 404s on extensionless links, which is how
# every page links to the others.
import http.server
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8765


class CleanURLHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def send_head(self):
        path, sep, query = self.path.partition('?')
        local = self.translate_path(path)
        if not os.path.exists(local) and os.path.isfile(local + '.html'):
            self.path = path + '.html' + sep + query
        return super().send_head()


if __name__ == '__main__':
    with http.server.ThreadingHTTPServer(('127.0.0.1', PORT), CleanURLHandler) as httpd:
        print(f'Serving {ROOT} on http://127.0.0.1:{PORT}')
        httpd.serve_forever()
