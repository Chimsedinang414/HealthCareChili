from flask import Flask, request, jsonify
from flask_cors import CORS
from ultralytics import YOLO
import cv2
import numpy as np
import base64
import os

app = Flask(__name__)
CORS(app)

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'plant_health_model.pt')
model = None

def load_yolo_model():
    global model
    try:
        if os.path.exists(MODEL_PATH):
            model = YOLO(MODEL_PATH)
            print(f"Loaded model: {MODEL_PATH}")
        else:
            print("Model file not found, loading base yolo11n.pt...")
            model = YOLO('yolo11n.pt')
    except Exception as e:
        print(f"Error loading model: {e}")
        model = YOLO('yolo11n.pt')

@app.route('/')
def index():
    return jsonify({'message': 'HealthCareTree YOLO11 API', 'port': 5001})

@app.route('/api/image/status', methods=['GET'])
def status():
    return jsonify({'model_loaded': model is not None, 'model_type': 'YOLO11'})

@app.route('/api/image/predict', methods=['POST'])
def predict():
    try:
        global model
        if model is None:
            load_yolo_model()

        if 'image' in request.files:
            image_bytes = request.files['image'].read()
        elif request.content_type and 'image' in request.content_type:
            image_bytes = request.data
        elif request.is_json and 'image' in request.json:
            image_bytes = base64.b64decode(request.json['image'])
        else:
            return jsonify({'success': False, 'error': 'No image provided'}), 400

        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return jsonify({'success': False, 'error': 'Cannot decode image'}), 400

        results = model(img, verbose=False)

        predictions = []
        for result in results:
            for box in result.boxes:
                predictions.append({
                    'class': result.names[int(box.cls[0])],
                    'confidence': round(float(box.conf[0]), 4),
                    'bbox': {
                        'x1': int(box.xyxy[0][0]),
                        'y1': int(box.xyxy[0][1]),
                        'x2': int(box.xyxy[0][2]),
                        'y2': int(box.xyxy[0][3])
                    }
                })

        annotated_img = results[0].plot()
        _, buffer = cv2.imencode('.jpg', annotated_img, [cv2.IMWRITE_JPEG_QUALITY, 85])
        img_base64 = base64.b64encode(buffer).decode('utf-8')

        filtered = [p for p in predictions if p['confidence'] > 0.6]

        top = max(filtered, key=lambda x: x['confidence']) if filtered else None

        return jsonify({
            'success': True,
            'predictions': predictions,
            'count': len(predictions),
            'disease': top['class'] if top else 'unknown',
            'confidence': top['confidence'] if top else 0.0,
            'image_base64': img_base64
        })

    except Exception as e:
        print(f"Prediction error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    load_yolo_model()
    app.run(host='0.0.0.0', port=5001, debug=False)