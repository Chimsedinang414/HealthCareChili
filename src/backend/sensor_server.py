from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)

# In-memory storage (thay thế bằng database khi cần)
sensor_data = {
    'temperature': 0,
    'humidity': 0,
    'soil_moisture': 0,
    'light_level': 0,
    'last_update': None
}

# Cấu hình ngưỡng cảnh báo
THRESHOLDS = {
    'soil_moisture_min': 30,    # Độ ẩm đất tối thiểu (%)
    'soil_moisture_max': 80,    # Độ ẩm đất tối đa (%)
    'temperature_min': 18,     # Nhiệt độ tối thiểu (°C)
    'temperature_max': 35,     # Nhiệt độ tối đa (°C)
    'humidity_min': 40,         # Độ ẩm không khí tối thiểu (%)
    'humidity_max': 85,        # Độ ẩm không khí tối đa (%)
    'light_min': 20,           # Ánh sáng tối thiểu (%)
}

# Lịch sử dữ liệu (lưu 100 bản ghi gần nhất)
data_history = []

@app.route('/')
def index():
    return jsonify({
        'message': 'HealthCareTree Sensor API',
        'endpoints': {
            'GET /api/sensors': 'Lấy dữ liệu sensor hiện tại',
            'POST /api/sensors/data': 'Nhận dữ liệu từ Arduino',
            'GET /api/sensors/history': 'Lấy lịch sử dữ liệu',
            'GET /api/sensors/thresholds': 'Lấy cấu hình ngưỡng',
            'PUT /api/sensors/thresholds': 'Cập nhật ngưỡng',
            'GET /api/sensors/status': 'Trạng thái hệ thống'
        }
    })

# Lấy dữ liệu sensor hiện tại
@app.route('/api/sensors', methods=['GET'])
def get_sensors():
    return jsonify({
        'success': True,
        'data': sensor_data,
        'thresholds': THRESHOLDS,
        'alerts': check_alerts()
    })

# Nhận dữ liệu từ Arduino sensor node
@app.route('/api/sensors/data', methods=['POST'])
def receive_sensor_data():
    try:
        data = request.json
        
        # Cập nhật dữ liệu
        sensor_data['temperature'] = data.get('temperature', 0)
        sensor_data['humidity'] = data.get('humidity', 0)
        sensor_data['soil_moisture'] = data.get('soil_moisture', 0)
        sensor_data['light_level'] = data.get('light_level', 0)
        sensor_data['last_update'] = datetime.now().isoformat()
        
        # Lưu vào lịch sử
        record = {
            'timestamp': sensor_data['last_update'],
            **sensor_data.copy()
        }
        record.pop('last_update', None)
        data_history.append(record)
        
        # Giới hạn 100 bản ghi
        if len(data_history) > 100:
            data_history.pop(0)
        
        # Kiểm tra cảnh báo và quyết định hành động
        action = check_and_act()
        
        return jsonify({
            'success': True,
            'message': 'Data received',
            'action': action,
            'alerts': check_alerts()
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Lấy lịch sử dữ liệu
@app.route('/api/sensors/history', methods=['GET'])
def get_history():
    limit = request.args.get('limit', 20, type=int)
    return jsonify({
        'success': True,
        'count': len(data_history),
        'data': data_history[-limit:]
    })

# Lấy cấu hình ngưỡng
@app.route('/api/sensors/thresholds', methods=['GET'])
def get_thresholds():
    return jsonify({
        'success': True,
        'thresholds': THRESHOLDS
    })

# Cập nhật ngưỡng
@app.route('/api/sensors/thresholds', methods=['PUT'])
def update_thresholds():
    global THRESHOLDS
    try:
        data = request.json
        THRESHOLDS.update(data)
        return jsonify({
            'success': True,
            'message': 'Thresholds updated',
            'thresholds': THRESHOLDS
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Trạng thái hệ thống
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

# ==================== HÀM XỬ LÝ ====================

def check_alerts():
    """Kiểm tra và trả về các cảnh báo"""
    alerts = []
    
    # Kiểm tra độ ẩm đất
    if sensor_data['soil_moisture'] < THRESHOLDS['soil_moisture_min']:
        alerts.append({
            'type': 'warning',
            'sensor': 'soil_moisture',
            'message': 'Độ ẩm đất thấp - Cần tưới nước',
            'value': sensor_data['soil_moisture'],
            'threshold': THRESHOLDS['soil_moisture_min']
        })
    elif sensor_data['soil_moisture'] > THRESHOLDS['soil_moisture_max']:
        alerts.append({
            'type': 'info',
            'sensor': 'soil_moisture',
            'message': 'Độ ẩm đất cao - Ngừng tưới',
            'value': sensor_data['soil_moisture'],
            'threshold': THRESHOLDS['soil_moisture_max']
        })
    
    # Kiểm tra nhiệt độ
    if sensor_data['temperature'] < THRESHOLDS['temperature_min']:
        alerts.append({
            'type': 'warning',
            'sensor': 'temperature',
            'message': 'Nhiệt độ quá thấp',
            'value': sensor_data['temperature'],
            'threshold': THRESHOLDS['temperature_min']
        })
    elif sensor_data['temperature'] > THRESHOLDS['temperature_max']:
        alerts.append({
            'type': 'error',
            'sensor': 'temperature',
            'message': 'Nhiệt độ quá cao - Cần làm mát',
            'value': sensor_data['temperature'],
            'threshold': THRESHOLDS['temperature_max']
        })
    
    # Kiểm tra độ ẩm không khí
    if sensor_data['humidity'] < THRESHOLDS['humidity_min']:
        alerts.append({
            'type': 'warning',
            'sensor': 'humidity',
            'message': 'Độ ẩm không khí thấp',
            'value': sensor_data['humidity'],
            'threshold': THRESHOLDS['humidity_min']
        })
    elif sensor_data['humidity'] > THRESHOLDS['humidity_max']:
        alerts.append({
            'type': 'warning',
            'sensor': 'humidity',
            'message': 'Độ ẩm không khí cao - Cần thông gió',
            'value': sensor_data['humidity'],
            'threshold': THRESHOLDS['humidity_max']
        })
    
    # Kiểm tra ánh sáng
    if sensor_data['light_level'] < THRESHOLDS['light_min']:
        alerts.append({
            'type': 'info',
            'sensor': 'light_level',
            'message': 'Ánh sáng thấp - Cần bổ sung ánh sáng',
            'value': sensor_data['light_level'],
            'threshold': THRESHOLDS['light_min']
        })
    
    return alerts

def check_and_act():
    """Kiểm tra ngưỡng và quyết định hành động"""
    action = None
    
    # Quyết định bật/tắt máy bơm
    if sensor_data['soil_moisture'] < THRESHOLDS['soil_moisture_min']:
        action = 'pump_on'
    elif sensor_data['soil_moisture'] > THRESHOLDS['soil_moisture_max']:
        action = 'pump_off'
    else:
        action = 'pump_off'
    
    return action

def get_recommendations(alerts):
    """Đưa ra khuyến nghị dựa trên cảnh báo"""
    recommendations = []
    
    for alert in alerts:
        if alert['sensor'] == 'soil_moisture':
            if alert['type'] == 'warning':
                recommendations.append('Bật máy bơm tưới nước')
            else:
                recommendations.append('Tắt máy bơm, kiểm tra hệ thống thoát nước')
        
        elif alert['sensor'] == 'temperature':
            if alert['value'] > THRESHOLDS['temperature_max']:
                recommendations.append('Bật quạt làm mát hoặc phun sương')
            elif alert['value'] < THRESHOLDS['temperature_min']:
                recommendations.append('Bật đèn sưởi hoặc che phủ giữ nhiệt')
        
        elif alert['sensor'] == 'humidity':
            if alert['value'] > THRESHOLDS['humidity_max']:
                recommendations.append('Bật quạt thông gió')
            else:
                recommendations.append('Phun sương tăng độ ẩm')
        
        elif alert['sensor'] == 'light_level':
            recommendations.append('Bật đèn grow light bổ sung')
    
    return recommendations

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000, debug=True)