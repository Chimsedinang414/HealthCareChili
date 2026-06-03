#!/usr/bin/env python3
"""
Script nhận diện bệnh ớt sử dụng YOLO (best.pt)
Cập nhật: Thêm chức năng báo "Unknown" khi độ tự tin thấp hoặc gặp vật thể lạ.
"""

import sys
import json
import time
import base64
from pathlib import Path
import cv2
import numpy as np
from ultralytics import YOLO

# ─── Cấu hình ngưỡng ──────────────────────────────────────────────────────────
# Nếu AI đoán với độ tin cậy thấp hơn mức này, nó sẽ báo là Unknown.
# Bạn có thể điều chỉnh từ 0.5 đến 0.7 tùy vào độ khắt khe mong muốn.
CONF_THRESHOLD = 0.6 

# ─── Đường dẫn model ──────────────────────────────────────────────────────────
_ROOT = Path(__file__).parent.parent
MODEL_PATH = _ROOT / 'best.pt'
if not MODEL_PATH.exists():
    MODEL_PATH = _ROOT / 'plant_health_model.pt'

# ─── Mapping nhãn ────────────────────────────────────────────────────────────
LABELS = {
    0: 'chili_leaf_curl_virus',
    1: 'chili_veino_mottle_virus',
    2: 'chili_whitefly',
    3: 'chili_wilted',
    4: 'chili_yellowish',
    5: 'health_chili'
}

HEALTHY_CLASS = 5

class PlantDiseaseDetector:
    def __init__(self, model_path):
        try:
            if model_path.exists():
                self.model = YOLO(str(model_path))
                print(f"✓ Loaded model: {model_path.name}", file=sys.stderr)
            else:
                self.model = None
        except Exception as e:
            self.model = None

    def predict(self, image_path):
        start_time = time.time()
        try:
            img = cv2.imread(image_path)
            if img is None:
                raise ValueError(f"Không đọc được ảnh: {image_path}")

            # Chạy AI với ngưỡng conf mặc định của YOLO (0.25)
            results = self.model(image_path, verbose=False, conf=0.25)
            result = results[0]

            annotated = result.plot()
            _, buf = cv2.imencode('.jpg', annotated, [cv2.IMWRITE_JPEG_QUALITY, 85])
            image_base64 = base64.b64encode(buf).decode('utf-8')

            final_label = "unknown"
            final_conf = 0.0
            predictions = []

            if len(result.boxes) > 0:
                confidences = result.boxes.conf.cpu().numpy()
                classes = result.boxes.cls.cpu().numpy().astype(int)

                # Tìm kết quả có độ tin cậy cao nhất trong các box phát hiện được
                idx_max = np.argmax(confidences)
                max_val = float(confidences[idx_max])
                max_cls = int(classes[idx_max])

                # KIỂM TRA NGƯỠNG (LOGIC QUAN TRỌNG)
                if max_val >= CONF_THRESHOLD:
                    final_label = LABELS.get(max_cls, "Unknown")
                    final_conf = max_val
                else:
                    # Nếu tìm thấy nhưng "nghi ngờ" (conf thấp), báo Unknown
                    final_label = "unknown"
                    final_conf = max_val

                # Tạo danh sách dự đoán chi tiết cho Dashboard
                for cls_idx, label_name in LABELS.items():
                    # Lấy confidence cao nhất của class đó nếu có
                    mask = (classes == cls_idx)
                    val = float(np.max(confidences[mask])) if np.any(mask) else 0.0
                    predictions.append({'label': label_name, 'confidence': val})
            else:
                # Không phát hiện thấy bất cứ class nào đã học (lá, bệnh...)
                final_label = "unknown"
                final_conf = 0.0
                predictions = [{'label': LABELS[i], 'confidence': 0.0} for i in range(len(LABELS))]

            processing_time = int((time.time() - start_time) * 1000)

            return {
                'success': True,
                'disease': final_label, # Sẽ trả về tên bệnh hoặc "unknown"
                'confidence': final_conf,
                'predictions': predictions,
                'processingTime': processing_time,
                'image_base64': image_base64
            }

        except Exception as e:
            return {'success': False, 'error': str(e)}

def main():
    if len(sys.argv) < 2:
        sys.exit(1)
    image_path = sys.argv[1]
    detector = PlantDiseaseDetector(MODEL_PATH)
    if detector.model is None:
        sys.exit(1)
    print(json.dumps(detector.predict(image_path)))

if __name__ == '__main__':
    main()