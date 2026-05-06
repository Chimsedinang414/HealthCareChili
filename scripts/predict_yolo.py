#!/usr/bin/env python3
"""
Script nhận diện bệnh ớt sử dụng YOLO (best.pt)
Nhận path ảnh, trả về JSON kết quả + ảnh annotated base64
"""

import sys
import json
import time
import base64
from pathlib import Path
import cv2
import numpy as np
from ultralytics import YOLO

# ─── Đường dẫn model ───────────────────────────────────────────────────────────
# Ưu tiên best.pt (model đã train), fallback về plant_health_model.pt
_ROOT = Path(__file__).parent.parent
MODEL_PATH = _ROOT / 'best.pt'
if not MODEL_PATH.exists():
    MODEL_PATH = _ROOT / 'plant_health_model.pt'

# ─── Mapping nhãn (phải đúng thứ tự class lúc train) ─────────────────────────
LABELS = {
    0: 'chili_wilted',
    1: 'chili_whitefly',
    2: 'chili_yellowish',
    3: 'chili_leaf_curl_virus',
    4: 'chili_veino_mottle_virus',
    5: 'health_chili'
}

HEALTHY_CLASS = 5   # index của class khỏe mạnh


class PlantDiseaseDetector:
    def __init__(self, model_path):
        try:
            if model_path.exists():
                self.model = YOLO(str(model_path))
                print(f"✓ Loaded model: {model_path.name}", file=sys.stderr)
            else:
                print(f"✗ Không tìm thấy model tại {model_path}", file=sys.stderr)
                self.model = None
        except Exception as e:
            print(f"✗ Lỗi load model: {e}", file=sys.stderr)
            self.model = None

    def predict(self, image_path):
        start_time = time.time()

        try:
            img = cv2.imread(image_path)
            if img is None:
                raise ValueError(f"Không đọc được ảnh: {image_path}")

            # ─── Inference ───────────────────────────────────────────────────
            results = self.model(image_path, verbose=False, conf=0.25)
            result  = results[0]

            # ─── Vẽ bounding box + encode ảnh annotated ───────────────────
            annotated = result.plot()   # numpy array BGR
            _, buf = cv2.imencode('.jpg', annotated, [cv2.IMWRITE_JPEG_QUALITY, 85])
            image_base64 = base64.b64encode(buf).decode('utf-8')

            # ─── Xử lý kết quả detection ─────────────────────────────────
            if len(result.boxes) > 0:
                confidences = result.boxes.conf.cpu().numpy()
                classes     = result.boxes.cls.cpu().numpy().astype(int)

                # Gom confidence theo class
                class_conf = {}
                for conf, cls in zip(confidences, classes):
                    class_conf.setdefault(cls, []).append(float(conf))

                predictions  = []
                max_conf     = 0.0
                pred_class   = HEALTHY_CLASS

                for cls in range(len(LABELS)):
                    avg = float(np.mean(class_conf[cls])) if cls in class_conf else 0.0
                    predictions.append({'label': LABELS[cls], 'confidence': avg})
                    if avg > max_conf:
                        max_conf   = avg
                        pred_class = cls
            else:
                # Không phát hiện bất thường → cây khỏe mạnh
                pred_class   = HEALTHY_CLASS
                max_conf     = 0.95
                predictions  = [
                    {'label': LABELS[i], 'confidence': 0.95 if i == HEALTHY_CLASS else 0.01}
                    for i in range(len(LABELS))
                ]

            processing_time = int((time.time() - start_time) * 1000)

            return {
                'success':        True,
                'disease':        LABELS[pred_class],
                'confidence':     float(max_conf),
                'predictions':    predictions,
                'processingTime': processing_time,
                'image_base64':   image_base64,
                'imageSize':      Path(image_path).stat().st_size
            }

        except Exception as e:
            return {
                'success':        False,
                'error':          str(e),
                'processingTime': int((time.time() - start_time) * 1000)
            }


def main():
    if len(sys.argv) < 2:
        print(json.dumps({'success': False, 'error': 'Usage: python predict_yolo.py <image_path>'}))
        sys.exit(1)

    image_path = sys.argv[1]
    detector   = PlantDiseaseDetector(MODEL_PATH)

    if detector.model is None:
        print(json.dumps({'success': False, 'error': f'Không load được model từ {MODEL_PATH}'}))
        sys.exit(1)

    result = detector.predict(image_path)
    print(json.dumps(result))


if __name__ == '__main__':
    main()
