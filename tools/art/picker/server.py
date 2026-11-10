import json, sys, threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from functools import partial
from pathlib import Path

ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT.parent))
import process_picks  # noqa: E402

PORT, PROJECT, ART_DIR = int(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
SELECTION = PROJECT / 'source-images' / 'art-selection.json'
CROPS = PROJECT / 'source-images' / 'art-crops.json'
PROCESSED = PROJECT / 'source-images' / 'processed'
NAMES = {r.split('\t')[0]: r.split('\t')[1] for r in (ROOT / 'files.tsv').read_text().splitlines()}
lock = threading.Lock()

def read_json(path):
    return json.loads(path.read_text()) if path.exists() else {}

class Handler(SimpleHTTPRequestHandler):
    def send_json(self, data, code=200):
        body = json.dumps(data).encode()
        self.send_response(code); self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body))); self.end_headers(); self.wfile.write(body)

    def do_GET(self):
        if self.path == '/selection':
            return self.send_json(read_json(SELECTION))
        if self.path == '/crops':
            return self.send_json(read_json(CROPS))
        if self.path.startswith('/processed/'):
            name = Path(self.path.split('?')[0]).name
            file = PROCESSED / name
            if not file.exists():
                return self.send_error(404)
            data = file.read_bytes()
            self.send_response(200); self.send_header('Content-Type', 'image/webp')
            self.send_header('Cache-Control', 'no-store'); self.send_header('Content-Length', str(len(data)))
            self.end_headers(); self.wfile.write(data); return
        super().do_GET()

    def do_POST(self):
        data = json.loads(self.rfile.read(int(self.headers['Content-Length'])) or b'{}')
        if self.path == '/save':
            SELECTION.parent.mkdir(parents=True, exist_ok=True)
            SELECTION.write_text(json.dumps(data, indent=2))
            self.send_response(204); self.end_headers(); return
        if self.path == '/process':
            id_ = data['id']
            if id_ not in NAMES:
                return self.send_json({'error': 'unknown id'}, 400)
            try:
                result = process_picks.process_one(ROOT / 'full' / f'{id_}.jpg', PROCESSED, id_, data.get('corners'))
            except Exception as error:  # report back to the page instead of hanging
                return self.send_json({'error': str(error)}, 500)
            with lock:
                crops = read_json(CROPS); crops[id_] = result
                CROPS.write_text(json.dumps(crops, indent=1))
            return self.send_json(result)
        self.send_error(404)

    def log_message(self, *a):
        pass

ThreadingHTTPServer(('127.0.0.1', PORT), partial(Handler, directory=str(ROOT))).serve_forever()
