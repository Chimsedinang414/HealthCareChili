from flask import Flask, request, jsonify
from flask_cors import CORS
from ultralytics import YOLO
import cv2
import numpy as np
import base64
import io
from PIL import Image
import os

app = Flask(__name__)
CORS(app)

# Cấu hình đường dẫn model
MODEL_PATH = os.path.join(os.path.dirname(__file__), '../../plant_health_model.pt')
DATASET_PATH = r'D:\Project\HealthCareTree\model_AI\dataset\peppers'

# Khởi tạo model
model = None

def load_yolo_model():
    global model
    try:
        if os.path.exists(MODEL_PATH):
            model = YOLO(MODEL_PATH)
            print(f"Loaded YOLO model from {MODEL_PATH}")
        else:
            # Train model mới nếu không có file model
            print("No model found, training new YOLO11 model...")
            model = YOLO('yolo11n.pt')  # YOLO11 nano
            model.train(
                data=DATASET_PATH,
                epochs=20,
                imgsz=640,
                batch=8,
                project=os.path.dirname(__file__),
                name='plant_disease',
                exist_ok=True
            )
            print("Model trained successfully")
    except Exception as e:
        print(f"Error loading model: {e}")
        model = YOLO('yolo11n.pt')

@app.route('/')
def index():
    return jsonify({'message': 'HealthCareTree YOLO11 API'})

@app.route('/api/image/init', methods=['POST'])
def init_model():
    try:
        load_yolo_model()
        return jsonify({'success': True, 'message': 'Model initialized'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/image/predict', methods=['POST'])
def predict():
    try:
        global model
        if model is None:
            load_yolo_model()

        # Kiểm tra file upload hoặc base64
        if 'image' in request.files:
            file = request.files['image']
            image_bytes = file.read()
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        elif 'image' in request.json:
            # Nhận ảnh dạng base64
            img_data = request.json['image']
            img_bytes = base64.b64decode(img_data)
            nparr = np.frombuffer(img_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        else:
            return jsonify({'success': False, 'error': 'No image provided'}), 400

        # Chạy inference với YOLO11
        results = model(img, verbose=False)
        
        predictions = []
        for result in results:
            boxes = result.boxes
            for box in boxes:
                pred = {
                    'class': result.names[int(box.cls[0])],
                    'confidence': float(box.conf[0]),
                    'bbox': {
                        'x1': int(box.xyxy[0][0]),
                        'y1': int(box.xyxy[0][1]),
                        'x2': int(box.xyxy[0][2]),
                        'y2': int(box.xyxy[0][3])
                    }
                }
                predictions.append(pred)

        return jsonify({
            'success': True,
            'predictions': predictions,
            'count': len(predictions)
        })

    except Exception as e:
        print(f"Prediction error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/image/status', methods=['GET'])
def status():
    return jsonify({
        'model_loaded': model is not None,
        'model_type': 'YOLO11'
    })

if __name__ == '__main__':
    load_yolo_model()
    app.run(host='0.0.0.0', port=3000, debug=True)