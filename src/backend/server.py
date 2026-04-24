from flask import Flask, request, jsonify
from flask_cors import CORS
from ultralytics import YOLO
import cv2
import numpy as np
import base64
import io
from PIL import Image
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)

# ==================== SENSOR DATA ====================
sensor_data = {
    'temperature': 0,
    'humidity': 0,
    'soil_moisture': 0,
    'light_level': 0,
    'last_update': None
}

data_history = []

# Cấu hình ngưỡng cảnh báo
THRESHOLDS = {
    'soil_moisture_min': 30,
    'soil_moisture_max': 80,
    'temperature_min': 18,
    'temperature_max': 35,
    'humidity_min': 40,
    'humidity_max': 85,
    'light_min': 20,
}

# ==================== YOLO MODEL ====================
MODEL_PATH = os.path.join(os.path.dirname(__file__), '../../plant_health_model.pt')
model = None

def load_yolo_model():
    global model
    try:
        if os.path.exists(MODEL_PATH):
            model = YOLO(MODEL_PATH)
            print(f"Loaded YOLO model from {MODEL_PATH}")
        else:
            print("No model found, using pretrained YOLO11")
            model = YOLO('yolo11n.pt')
    except Exception as e:
        print(f"Error loading model: {e}")
        model = YOLO('yolo11n.pt')

# ==================== ROUTES ====================

@app.route('/')
def index():
    return jsonify({
        'message': 'HealthCareTree Unified API',
        'modules': ['sensors', 'image'],
        'endpoints': {
            # Sensor endpoints
            'GET /api/sensors': 'Lấy dữ liệu sensor hiện tại',
            'POST /api/sensors/data': 'Nhận dữ liệu từ Arduino',
            'GET /api/sensors/history': 'Lịch sử dữ liệu',
            'GET /api/sensors/status': 'Trạng thái hệ thống',
            # Image endpoints
            'POST /api/image/predict': 'Nhận diện bệnh cây',
            'GET /api/image/status': 'Trạng thái model',
        }
    })

# ==================== SENSOR ROUTES ====================

@app.route('/api/sensors', methods=['GET'])
def get_sensors():
    return jsonify({
        'success': True,
        'data': sensor_data,
        'thresholds': THRESHOLDS,
        'alerts': check_alerts()
    })

@app.route('/api/sensors/data', methods=['POST'])
def receive_sensor_data():
    try:
        data = request.json
        sensor_data['temperature'] = data.get('temperature', 0)
        sensor_data['humidity'] = data.get('humidity', 0)
        sensor_data['soil_moisture'] = data.get('soil_moisture', 0)
        sensor_data['light_level'] = data.get('light_level', 0)
        sensor_data['last_update'] = datetime.now().isoformat()
        
        record = {
            'timestamp': sensor_data['last_update'],
            'temperature': sensor_data['temperature'],
            'humidity': sensor_data['humidity'],
            'soil_moisture': sensor_data['soil_moisture'],
            'light_level': sensor_data['light_level']
        }
        data_history.append(record)
        
        if len(data_history) > 100:
            data_history.pop(0)
        
        action = check_and_act()
        
        return jsonify({
            'success': True,
            'action': action,
            'alerts': check_alerts()
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/sensors/history', methods=['GET'])
def get_history():
    limit = request.args.get('limit', 20, type=int)
    return jsonify({
        'success': True,
        'data': data_history[-limit:]
    })

@app.route('/api/sensors/status', methods=['GET'])
def get_status():
    alerts = check_alerts()
    return jsonify({
        'success': True,
        'system': {
            'status': 'online' if sensor_data['last_update'] else 'offline',
            'last_update': sensor_data['last_update'],
            'data_points': len(data_history)
        },
        'alerts': alerts,
        'recommendations': get_recommendations(alerts)
    })

# ==================== IMAGE ROUTES ====================

@app.route('/api/image/predict', methods=['POST'])
def predict():
    try:
        global model
        if model is None:
            load_yolo_model()

        if 'image' in request.files:
            file = request.files['image']
            image_bytes = file.read()
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        elif request.json and 'image' in request.json:
            img_data = request.json['image']
            img_bytes = base64.b64decode(img_data)
            nparr = np.frombuffer(img_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        else:
            return jsonify({'success': False, 'error': 'No image provided'}), 400

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
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/image/status', methods=['GET'])
def image_status():
    return jsonify({
        'model_loaded': model is not None,
        'model_type': 'YOLO11'
    })

# ==================== HELPER FUNCTIONS ====================

def check_alerts():
    alerts = []
    
    if sensor_data['soil_moisture'] < THRESHOLDS['soil_moisture_min']:
        alerts.append({
            'type': 'warning',
            'sensor': 'soil_moisture',
            'message': 'Độ ẩm đất thấp - Cần tưới nước',
            'value': sensor_data['soil_moisture']
        })
    elif sensor_data['soil_moisture'] > THRESHOLDS['soil_moisture_max']:
        alerts.append({
            'type': 'info',
            'sensor': 'soil_moisture',
            'message': 'Độ ẩm đất cao - Ngừng tưới',
            'value': sensor_data['soil_moisture']
        })
    
    if sensor_data['temperature'] < THRESHOLDS['temperature_min']:
        alerts.append({
            'type': 'warning',
            'sensor': 'temperature',
            'message': 'Nhiệt độ quá thấp',
            'value': sensor_data['temperature']
        })
    elif sensor_data['temperature'] > THRESHOLDS['temperature_max']:
        alerts.append({
            'type': 'error',
            'sensor': 'temperature',
            'message': 'Nhiệt độ quá cao',
            'value': sensor_data['temperature']
        })
    
    if sensor_data['humidity'] < THRESHOLDS['humidity_min']:
        alerts.append({
            'type': 'warning',
            'sensor': 'humidity',
            'message': 'Độ ẩm không khí thấp',
            'value': sensor_data['humidity']
        })
    elif sensor_data['humidity'] > THRESHOLDS['humidity_max']:
        alerts.append({
            'type': 'warning',
            'sensor': 'humidity',
            'message': 'Độ ẩm không khí cao',
            'value': sensor_data['humidity']
        })
    
    if sensor_data['light_level'] < THRESHOLDS['light_min']:
        alerts.append({
            'type': 'info',
            'sensor': 'light_level',
            'message': 'Ánh sáng thấp',
            'value': sensor_data['light_level']
        })
    
    return alerts

def check_and_act():
    if sensor_data['soil_moisture'] < THRESHOLDS['soil_moisture_min']:
        return 'pump_on'
    elif sensor_data['soil_moisture'] > THRESHOLDS['soil_moisture_max']:
        return 'pump_off'
    return 'pump_off'

def get_recommendations(alerts):
    recommendations = []
    for alert in alerts:
        if alert['sensor'] == 'soil_moisture':
            if alert['type'] == 'warning':
                recommendations.append('Bật máy bơm tưới nước')
        elif alert['sensor'] == 'temperature':
            if alert['value'] > THRESHOLDS['temperature_max']:
                recommendations.append('Bật quạt làm mát')
            elif alert['value'] < THRESHOLDS['temperature_min']:
                recommendations.append('Giữ ấm cho cây')
        elif alert['sensor'] == 'humidity':
            if alert['value'] > THRESHOLDS['humidity_max']:
                recommendations.append('Thông gió')
            else:
                recommendations.append('Phun sương tăng ẩm')
    return recommendations

if __name__ == '__main__':
    load_yolo_model()
    app.run(host='0.0.0.0', port=3000, debug=True)