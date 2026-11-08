"""Small local HTTP adapter for the Task 5 API. Run: python3 server.py"""
import json
import os
from email.parser import BytesParser
from email.policy import default
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

from vision import DATASET, detect

MAX_UPLOAD = 10 * 1024 * 1024
SPLITS = json.loads((DATASET / 'splits.json').read_text())


class Handler(BaseHTTPRequestHandler):
    def respond(self, status, payload, content_type='application/json; charset=utf-8'):
        raw = json.dumps(payload, ensure_ascii=False).encode() if isinstance(payload, (dict, list)) else payload
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(raw)))
        self.send_header('Access-Control-Allow-Origin', 'http://127.0.0.1:5173')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(raw)

    def do_OPTIONS(self):
        self.respond(200, b'')

    def do_GET(self):
        path = urlparse(self.path).path
        if path == '/api/vision/object/samples/':
            samples = []
            for sample_id in SPLITS['sample_ids']['test']:
                metadata = json.loads((DATASET / 'samples' / sample_id / 'metadata.json').read_text())
                color_name = {'red': '红', 'yellow': '黄', 'blue': '蓝', 'green': '绿'}[metadata['color']]
                samples.append({'id': sample_id, 'name': f'{sample_id} · {color_name}',
                                'url': f'http://127.0.0.1:8000/api/vision/object/samples/{sample_id}/image/',
                                'width': 1280, 'height': 960, 'color': metadata['color']})
            return self.respond(200, samples)
        parts = path.strip('/').split('/')
        if len(parts) == 6 and parts[:4] == ['api', 'vision', 'object', 'samples'] and parts[5] == 'image' and parts[4] in SPLITS['sample_ids']['test']:
            image = (DATASET / 'samples' / parts[4] / 'rgb.png').read_bytes()
            return self.respond(200, image, 'image/png')
        if path == '/api/health/':
            return self.respond(200, {'status': 'ok'})
        self.respond(404, {'message': '接口不存在。'})

    def do_POST(self):
        if urlparse(self.path).path != '/api/vision/object/detect/':
            return self.respond(404, {'message': '接口不存在。'})
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if length < 1 or length > MAX_UPLOAD + 4096:
                return self.respond(413, {'message': '图片不能超过 10 MB。'})
            content_type = self.headers.get('Content-Type', '')
            if not content_type.startswith('multipart/form-data;'):
                return self.respond(415, {'message': '请使用 multipart/form-data 上传。'})
            raw = self.rfile.read(length)
            message = BytesParser(policy=default).parsebytes(('Content-Type: ' + content_type + '\r\nMIME-Version: 1.0\r\n\r\n').encode() + raw)
            parts = {part.get_param('name', header='content-disposition'): part for part in message.iter_parts()}
            file = parts.get('file')
            if file is None or file.get_content_type() not in ('image/png', 'image/jpeg'):
                return self.respond(400, {'message': '请选择 PNG 或 JPEG 图片。'})
            data = file.get_payload(decode=True)
            if len(data) > MAX_UPLOAD:
                return self.respond(413, {'message': '图片不能超过 10 MB。'})
            calibration = parts.get('calibration')
            calibrated = calibration is not None and calibration.get_content().strip() == 'grid36'
            return self.respond(200, detect(data, calibrated))
        except (ValueError, KeyError) as exc:
            return self.respond(400, {'message': str(exc)})


if __name__ == '__main__':
    port = int(os.getenv('VISION_PORT', '8000'))
    print(f'任务 5 API：http://127.0.0.1:{port}/api/health/', flush=True)
    ThreadingHTTPServer(('127.0.0.1', port), Handler).serve_forever()
