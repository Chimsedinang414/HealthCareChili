// API communication functions
// const API_BASE_URL = 'http://10.10.58.240:3000/api';
const API_BASE_URL = 'http://192.168.1.6:3000/api';

// Cấu hình refresh
const REFRESH_INTERVAL = 10000; // 10 giây
let refreshTimer = null;

// ==================== SENSOR API ====================

// Lấy dữ liệu sensor hiện tại
async function fetchSensorData() {
    try {
        const response = await fetch(`${API_BASE_URL}/sensors`);
        const result = await response.json();
        
        if (result.success) {
            displaySensorData(result.data);
            displayAlerts(result.alerts);
            updateConnectionStatus(true);
        } else {
            console.error('Error:', result.error);
            updateConnectionStatus(false);
        }
    } catch (error) {
        console.error('Error fetching sensor data:', error);
        updateConnectionStatus(false);
    }
}

// Hiển thị dữ liệu sensor
function displaySensorData(data) {
    if (!data) return;
    // Cập nhật giá trị
    document.getElementById('temperature').textContent = data.temperature || '--';
    document.getElementById('humidity').textContent = data.humidity || '--';
    document.getElementById('soil-moisture').textContent = data.soil_moisture || '--';
    document.getElementById('light-level').textContent = data.light_level || '--';
    
    // Cập nhật trạng thái
    updateSensorStatus('temp', data.temperature, data.thresholds?.temperature_min, data.thresholds?.temperature_max);
    updateSensorStatus('humidity', data.humidity, data.thresholds?.humidity_min, data.thresholds?.humidity_max);
    updateSensorStatus('soil', data.soil_moisture, data.thresholds?.soil_moisture_min, data.thresholds?.soil_moisture_max);
    updateSensorStatus('light', data.light_level, data.thresholds?.light_min, null);
    
    // Cập nhật plant card
    document.getElementById('moisture-text-1').textContent = (data.soil_moisture || '--') + '%';
    document.getElementById('temp-1').textContent = (data.temperature || '--') + '°C';
    document.getElementById('light-1').textContent = (data.light_level || '--') + '%';
    
    // Cập nhật slider
    document.getElementById('slider-1').value = data.soil_moisture || 0;
}

// Cập nhật trạng thái sensor
function updateSensorStatus(sensor, value, min, max) {
    const statusEl = document.getElementById(`${sensor}-status`);
    const cardEl = document.getElementById(`sensor-${sensor}`);
    
    if (value === undefined || value === 0) {
        statusEl.textContent = 'Chưa có dữ liệu';
        statusEl.className = 'sensor-status unknown';
        cardEl.className = 'sensor-card unknown';
        return;
    }
    
    let status = 'normal';
    let statusText = 'Bình thường';
    
    if (min && value < min) {
        status = 'warning';
        statusText = 'Thấp';
    } else if (max && value > max) {
        status = 'warning';
        statusText = 'Cao';
    }
    
    statusEl.textContent = statusText;
    statusEl.className = `sensor-status ${status}`;
    cardEl.className = `sensor-card ${status}`;
}

// Hiển thị cảnh báo
function displayAlerts(alerts) {
    const alertsSection = document.getElementById('alerts-section');
    const alertsList = document.getElementById('alerts-list');
    
    if (!alerts || alerts.length === 0) {
        alertsSection.style.display = 'none';
        return;
    }
    
    alertsSection.style.display = 'block';
    alertsList.innerHTML = '';
    
    alerts.forEach(alert => {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${alert.type}`;
        alertDiv.innerHTML = `
            <span class="alert-icon">${getAlertIcon(alert.type)}</span>
            <span class="alert-message">${alert.message}</span>
            <span class="alert-value">${alert.value}${getAlertUnit(alert.sensor)}</span>
        `;
        alertsList.appendChild(alertDiv);
    });
}

function getAlertIcon(type) {
    const icons = {
        'error': '🔴',
        'warning': '🟡',
        'info': '🔵'
    };
    return icons[type] || '⚠️';
}

function getAlertUnit(sensor) {
    const units = {
        'temperature': '°C',
        'humidity': '%',
        'soil_moisture': '%',
        'light_level': '%'
    };
    return units[sensor] || '';
}

// Cập nhật trạng thái kết nối
function updateConnectionStatus(connected) {
    const statusEl = document.getElementById('connection-status');
    const dot = statusEl.querySelector('.status-dot');
    const text = statusEl.querySelector('.status-text');
    
    if (connected) {
        dot.className = 'status-dot online';
        text.textContent = 'Online';
    } else {
        dot.className = 'status-dot offline';
        text.textContent = 'Offline';
    }
}

// ==================== IMAGE API ====================

// Lấy dự đoán gần nhất
async function getLatestPrediction(deviceId = 'ESP32-CAM-01') {
    try {
        const response = await fetch(`${API_BASE_URL}/image/latest?deviceId=${deviceId}`);
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error fetching latest prediction:', error);
        return { success: false, error: error.message };
    }
}

// Lấy lịch sử dự đoán
async function getPredictionHistory(deviceId = 'ESP32-CAM-01', limit = 20) {
    try {
        const response = await fetch(`${API_BASE_URL}/image/history?deviceId=${deviceId}&limit=${limit}`);
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error fetching prediction history:', error);
        return { success: false, error: error.message };
    }
}

// Lấy thống kê
async function getStatistics(deviceId = 'ESP32-CAM-01', days = 7) {
    try {
        const response = await fetch(`${API_BASE_URL}/image/statistics?deviceId=${deviceId}&days=${days}`);
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error fetching statistics:', error);
        return { success: false, error: error.message };
    }
}

// Lấy trạng thái model
async function getModelStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/image/status`);
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error fetching model status:', error);
        return { success: false, error: error.message };
    }
}

// Gửi lệnh chụp ngay
async function sendCaptureCommand(deviceId = 'ESP32-CAM-01') {
    try {
        const response = await fetch(`${API_BASE_URL}/image/capture-now?deviceId=${deviceId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error sending capture command:', error);
        return { success: false, error: error.message };
    }
}
async function displayLatestPrediction() {
    const result = await getLatestPrediction();
    
    if (!result.success || !result.prediction) {
        document.getElementById('disease-status').innerHTML = '<p>Chưa có dữ liệu</p>';
        return;
    }

    const pred = result.prediction;
  
    const fullImageUrl = `http://192.168.1.6:3000${pred.imageUrl}`; 

    const html = `
        <div class="prediction-card ${getDiseaseColor(pred.disease)}">
            <div class="prediction-header">
                <h3>Ảnh chụp thực tế</h3>
                <span class="timestamp">${new Date(pred.timestamp).toLocaleString('vi-VN')}</span>
            </div>
            
            <div class="prediction-image-container">
                <img src="${fullImageUrl}" alt="Ảnh cây trồng" style="width:100%; border-radius:8px; margin-bottom:10px;">
            </div>

            <div class="prediction-result">
                <div class="disease-name">${getDiseaseName(pred.disease)}</div>
                <div class="confidence-bar">
                    <div class="confidence-fill" style="width: ${pred.confidence * 100}%"></div>
                    <span class="confidence-text">${(pred.confidence * 100).toFixed(1)}%</span>
                </div>
            </div>
            ${pred.alert ? `<div class="alert-banner">⚠️ ${pred.alertMessage}</div>` : ''}
        </div>
    `;

    document.getElementById('disease-status').innerHTML = html;
}

// Hiển thị lịch sử dự đoán
async function displayPredictionHistory() {
    const result = await getPredictionHistory();
    
    if (!result.success || !result.predictions || result.predictions.length === 0) {
        document.getElementById('history-list').innerHTML = '<p>Chưa có lịch sử</p>';
        return;
    }

    const html = result.predictions.slice(0, 10).map(pred => {
        const timestamp = new Date(pred.timestamp).toLocaleString('vi-VN');
        const diseaseColor = getDiseaseColor(pred.disease);
        return `
            <div class="history-item ${diseaseColor}">
                <div class="history-disease">${getDiseaseName(pred.disease)}</div>
                <div class="history-confidence">${(pred.confidence * 100).toFixed(1)}%</div>
                <div class="history-time">${timestamp}</div>
            </div>
        `;
    }).join('');

    document.getElementById('history-list').innerHTML = html;
}

// Hiển thị thống kê
async function displayStatistics() {
    const result = await getStatistics();
    
    if (!result.success) {
        document.getElementById('stats-container').innerHTML = '<p>Không thể tải thống kê</p>';
        return;
    }

    const stats = result;
    const html = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">Tổng mẫu</div>
                <div class="stat-value">${stats.totalSamples}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Cảnh báo</div>
                <div class="stat-value alert">${stats.alerts}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Bệnh phổ biến</div>
                <div class="stat-value">${stats.diseaseCounts && stats.diseaseCounts.length > 0 ? stats.diseaseCounts[0]._id : 'N/A'}</div>
            </div>
        </div>
    `;

    document.getElementById('stats-container').innerHTML = html;
}

// Hàm helper
function getDiseaseColor(disease) {
    const colors = {
        'healthy': 'green',
        'bacterial_spot': 'red',
        'leaf_curl_virus': 'orange',
        'unknown': 'gray'
    };
    return colors[disease] || 'gray';
}

function getDiseaseName(disease) {
    const names = {
        'healthy': '✓ Cây khỏe mạnh',
        'bacterial_spot': '🦠 Đốm vi khuẩn',
        'leaf_curl_virus': '🦠 Virus cuộn lá',
        'unknown': 'Không xác định'
    };
    return names[disease] || disease;
}

// ==================== AUTO REFRESH ====================

function startAutoRefresh() {
    // Lấy dữ liệu ngay lập tức
    fetchSensorData();
    
    // Đặt timer refresh
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(fetchSensorData, REFRESH_INTERVAL);
}

function stopAutoRefresh() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
    }
}

// ==================== INITIALIZE ====================

document.addEventListener('DOMContentLoaded', () => {
    startAutoRefresh();
});

// Cleanup when leaving page
window.addEventListener('beforeunload', () => {
    stopAutoRefresh();
});