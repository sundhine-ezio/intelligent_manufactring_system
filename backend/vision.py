"""Task 5: HSV segmentation and calibrated cube-center estimate.

Inference only reads RGB bytes. Segmentation labels are used by evaluate.py, never here.
"""
import json
from pathlib import Path

import cv2
import numpy as np

DATASET = Path(__file__).resolve().parents[2] / 'cube_blenderproc/data/grid36'
CONFIG = json.loads((DATASET / 'dataset.json').read_text())
CAMERA = CONFIG['camera']
COLOR_RANGES = {
    'red': ((0, 9), (170, 179)),
    'yellow': ((18, 38),),
    'green': ((43, 82),),
    'blue': ((100, 135),),
}
MIN_AREA = 100


def decode_image(data):
    image = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError('图片无法解码，请上传 PNG 或 JPEG。')
    h, w = image.shape[:2]
    if h * w > 25_000_000:
        raise ValueError('图片不能超过 2500 万像素。')
    return image


def estimate_position(box, image_size):
    """Approximate world center using projected 0.5 m vertical face height.

    Fixed camera, axis-aligned cube, and original 1280x960 geometry are required.
    Bounding-box center is only a proxy for projected 3D center.
    """
    w, h = image_size
    if [w, h] != CAMERA['image_size_wh']:
        return None
    fx, fy = CAMERA['K'][0][0], CAMERA['K'][1][1]
    cx = CAMERA['K'][0][2]
    cube_side = CONFIG['cube_dimensions_m'][2]
    front_depth = fy * cube_side / box['h']
    center_depth = front_depth + cube_side / 2
    u = box['x'] + box['w'] / 2
    world_x = (u - cx) * center_depth / fx
    return {'x': round(world_x, 4), 'y': round(CAMERA['position_world_m'][1] + center_depth, 4),
            'z': 3.0, 'unit': 'm', 'frame': 'Blender world', 'method': 'known_cube_size_estimate'}


def detect(data, calibrated=False):
    image = decode_image(data)
    h, w = image.shape[:2]
    calibration_valid = calibrated and [w, h] == CAMERA['image_size_wh']
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    targets = []
    for color, intervals in COLOR_RANGES.items():
        mask = np.zeros((h, w), np.uint8)
        for lo, hi in intervals:
            mask |= cv2.inRange(hsv, (lo, 80, 55), (hi, 255, 255))
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for contour in contours:
            area = cv2.contourArea(contour)
            if area < MIN_AREA:
                continue
            x, y, bw, bh = cv2.boundingRect(contour)
            if bw < 8 or bh < 8:
                continue
            box = {'x': int(x), 'y': int(y), 'w': int(bw), 'h': int(bh)}
            moments = cv2.moments(contour)
            u = moments['m10'] / moments['m00'] if moments['m00'] else x + bw / 2
            v = moments['m01'] / moments['m00'] if moments['m00'] else y + bh / 2
            targets.append({
                'objectId': '', 'className': 'cube_candidate', 'color': color,
                'confidence': None, 'bbox': box,
                'center': {'x': round(u, 2), 'y': round(v, 2)},
                'centerNormalized': {'x': round(u / w, 5), 'y': round(v / h, 5)},
                'position': estimate_position(box, (w, h)) if calibration_valid else None,
            })
    targets.sort(key=lambda item: (item['bbox']['x'], item['bbox']['y']))
    for i, target in enumerate(targets, 1):
        target['objectId'] = f'cube-{i:02d}'
    return {
        'width': w, 'height': h, 'targets': targets,
        'source': 'OpenCV HSV + contour',
        'calibration': 'grid36_estimate' if calibration_valid else None,
        'note': ('已按 BlenderProc 固定相机与 0.5 m 立方体条件估算 XYZ；结果不依赖图片是否属于旧数据集。'
                 if calibration_valid else
                 '已选择 BlenderProc 条件，但图片不是 1280×960；无法按当前相机参数估算 XYZ。'
                 if calibrated else
                 '未选择 BlenderProc 相机条件，仅输出颜色和像素位置。'),
    }
