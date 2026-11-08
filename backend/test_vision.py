"""Calibration checks for new images made with the same BlenderProc setup."""
import unittest

import cv2
import numpy as np

from vision import DATASET, detect


class CalibrationTests(unittest.TestCase):
    def setUp(self):
        self.original = (DATASET / 'samples/000008/rgb.png').read_bytes()

    def test_modified_image_gets_xyz_when_scene_parameters_selected(self):
        image = cv2.imdecode(np.frombuffer(self.original, np.uint8), cv2.IMREAD_COLOR)
        image[0, 0] = (255, 255, 255)
        ok, encoded = cv2.imencode('.png', image)
        self.assertTrue(ok)
        changed = encoded.tobytes()
        self.assertNotEqual(changed, self.original)
        result = detect(changed, calibrated=True)
        self.assertEqual(result['calibration'], 'grid36_estimate')
        self.assertEqual(result['targets'][0]['color'], 'red')
        self.assertIsNotNone(result['targets'][0]['position'])

    def test_calibration_is_explicit_not_based_on_known_file(self):
        result = detect(self.original)
        self.assertIsNone(result['calibration'])
        self.assertIsNone(result['targets'][0]['position'])

    def test_wrong_resolution_does_not_return_xyz(self):
        image = cv2.imdecode(np.frombuffer(self.original, np.uint8), cv2.IMREAD_COLOR)
        resized = cv2.resize(image, (640, 480))
        ok, encoded = cv2.imencode('.png', resized)
        self.assertTrue(ok)
        result = detect(encoded.tobytes(), calibrated=True)
        self.assertIsNone(result['calibration'])
        self.assertIsNone(result['targets'][0]['position'])


if __name__ == '__main__':
    unittest.main()
