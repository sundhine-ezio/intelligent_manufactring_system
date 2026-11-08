"""Evaluate held-out x2 images; labels are read only by this script."""
import json
from statistics import mean

from vision import DATASET, detect

ids = json.loads((DATASET / 'splits.json').read_text())['sample_ids']['test']
rows = []
for sample_id in ids:
    folder = DATASET / 'samples' / sample_id
    truth = json.loads((folder / 'metadata.json').read_text())
    result = detect((folder / 'rgb.png').read_bytes(), True)
    targets = result['targets']
    if len(targets) != 1:
        rows.append({'id': sample_id, 'detected': len(targets)})
        continue
    target = targets[0]
    box = target['bbox']
    x1, y1, x2, y2 = truth['bbox_xyxy_exclusive_px']
    ix = max(0, min(box['x'] + box['w'], x2) - max(box['x'], x1))
    iy = max(0, min(box['y'] + box['h'], y2) - max(box['y'], y1))
    intersection = ix * iy
    iou = intersection / (box['w'] * box['h'] + (x2-x1) * (y2-y1) - intersection)
    position = target['position']
    xyz = truth['world_center_m']
    rows.append({'id': sample_id, 'detected': 1, 'correct_color': target['color'] == truth['color'],
                 'iou': iou, 'x_error_m': abs(position['x'] - xyz[0]),
                 'y_error_m': abs(position['y'] - xyz[1]), 'z_error_m': abs(position['z'] - xyz[2])})
valid = [r for r in rows if r['detected'] == 1]
summary = {'test_count': len(rows), 'one_target_count': len(valid),
           'color_correct_count': sum(r['correct_color'] for r in valid),
           'mean_bbox_iou': mean(r['iou'] for r in valid),
           'mean_abs_x_error_m': mean(r['x_error_m'] for r in valid),
           'mean_abs_y_error_m': mean(r['y_error_m'] for r in valid),
           'mean_abs_z_error_m': mean(r['z_error_m'] for r in valid),
           'details': rows}
print(json.dumps(summary, ensure_ascii=False, indent=2))
