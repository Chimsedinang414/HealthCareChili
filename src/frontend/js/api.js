// API communication functions
const API_BASE_URL = 'http://192.168.209.100:3000/api';

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

// Gửi ảnh để nhận diện bệnh
async function predictDisease(imageData) {
    try {
        const response = await fetch(`${API_BASE_URL}/image/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: imageData })
        });
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error predicting disease:', error);
        return { success: false, error: error.message };
    }
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