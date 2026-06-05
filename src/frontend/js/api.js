//config

const API_BASE_URL = 'http://10.10.59.77:3000/api';// ip máy tính
// const API_BASE_URL = 'http://localhost:3000/api';

const DEVICE_ID = 'ESP32-CAM-01';

const SENSOR_REFRESH_INTERVAL = 10000;  // 10 giây
const FRAME_POLL_INTERVAL = 2000;   // 2 giây — polling ảnh mới từ ESP32

let refreshTimer = null;
let frameTimer = null;



// async function fetchSensorData() {
//     try {
//         const response = await fetch(`${API_BASE_URL}/sensors`);
//         const result = await response.json();
//         if (result.success) {
//             displaySensorData(result.data);
//             displayAlerts(result.alerts);
//             updateConnectionStatus(true);
//         } else {
//             updateConnectionStatus(false);
//         }
//     } catch (error) {
//         console.error('fetchSensorData:', error);
//         updateConnectionStatus(false);
//     }
// }

// function displaySensorData(data) {
//     if (!data) return;
//     document.getElementById('temperature').textContent = data.temperature || '--';
//     document.getElementById('humidity').textContent = data.humidity || '--';
//     document.getElementById('soil-moisture').textContent = data.soil_moisture || '--';
//     document.getElementById('light-level').textContent = data.light_level || '--';

//     updateSensorStatus('temp', data.temperature, data.thresholds?.temperature_min, data.thresholds?.temperature_max);
//     updateSensorStatus('humidity', data.humidity, data.thresholds?.humidity_min, data.thresholds?.humidity_max);
//     updateSensorStatus('soil', data.soil_moisture, data.thresholds?.soil_moisture_min, data.thresholds?.soil_moisture_max);
//     updateSensorStatus('light', data.light_level, data.thresholds?.light_min, null);

//     const safe = v => (v || '--');
//     document.getElementById('moisture-text-1').textContent = safe(data.soil_moisture) + '%';
//     document.getElementById('temp-1').textContent = safe(data.temperature) + '°C';
//     document.getElementById('light-1').textContent = safe(data.light_level) + '%';
//     document.getElementById('slider-1').value = data.soil_moisture || 0;
// }

// function updateSensorStatus(sensor, value, min, max) {
//     const statusEl = document.getElementById(`${sensor}-status`);
//     const cardEl = document.getElementById(`sensor-${sensor}`);
//     if (!statusEl || !cardEl) return;

//     if (!value) {
//         statusEl.textContent = 'Chưa có dữ liệu';
//         statusEl.className = 'sensor-status unknown';
//         cardEl.className = 'sensor-card unknown';
//         return;
//     }

//     let status = 'normal', statusText = 'Bình thường';
//     if (min && value < min) { status = 'warning'; statusText = 'Thấp'; }
//     else if (max && value > max) { status = 'warning'; statusText = 'Cao'; }

//     statusEl.textContent = statusText;
//     statusEl.className = `sensor-status ${status}`;
//     cardEl.className = `sensor-card ${status}`;
// }

// function displayAlerts(alerts) {
//     const section = document.getElementById('alerts-section');
//     const list = document.getElementById('alerts-list');
//     if (!section || !list) return;

//     if (!alerts || alerts.length === 0) { section.style.display = 'none'; return; }

//     section.style.display = 'block';
//     list.innerHTML = alerts.map(a => `
//         <div class="alert alert-${a.type}">
//             <span class="alert-icon">${getAlertIcon(a.type)}</span>
//             <span class="alert-message">${a.message}</span>
//             <span class="alert-value">${a.value}${getAlertUnit(a.sensor)}</span>
//         </div>
//     `).join('');
// }

// function getAlertIcon(type) { return { error: '🔴', warning: '🟡', info: '🔵' }[type] || '⚠️'; }
// function getAlertUnit(sensor) { return { temperature: '°C', humidity: '%', soil_moisture: '%', light_level: '%' }[sensor] || ''; }

// function updateConnectionStatus(connected) {
//     const el = document.getElementById('connection-status');
//     if (!el) return;
//     el.querySelector('.status-dot').className = `status-dot ${connected ? 'online' : 'offline'}`;
//     el.querySelector('.status-text').textContent = connected ? 'Online' : 'Offline';
// }



// ==================== IMAGE API ====================

// Lấy frame mới nhất (ảnh base64 + kết quả nhận diện)
async function getLatestFrame(deviceId = DEVICE_ID) {
    try {
        const res = await fetch(`${API_BASE_URL}/image/latest-frame?deviceId=${deviceId}`);
        return await res.json();
    } catch (e) {
        return { success: false, hasData: false, error: e.message };
    }
}

// Lấy dự đoán gần nhất từ DB (dùng cho lịch sử)
async function getLatestPrediction(deviceId = DEVICE_ID) {
    try {
        const res = await fetch(`${API_BASE_URL}/image/latest?deviceId=${deviceId}`);
        return await res.json();
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function getPredictionHistory(deviceId = DEVICE_ID, limit = 20) {
    try {
        const res = await fetch(`${API_BASE_URL}/image/history?deviceId=${deviceId}&limit=${limit}`);
        return await res.json();
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function getStatistics(deviceId = DEVICE_ID, days = 7) {
    try {
        const res = await fetch(`${API_BASE_URL}/image/statistics?deviceId=${deviceId}&days=${days}`);
        return await res.json();
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function getModelStatus() {
    try {
        const res = await fetch(`${API_BASE_URL}/image/status`);
        return await res.json();
    } catch (e) {
        return { success: false, error: e.message };
    }
}

// Gửi lệnh chụp ngay — route: POST /api/image/capture/send
async function sendCaptureCommand(deviceId = DEVICE_ID) {
    try {
        const res = await fetch(`${API_BASE_URL}/image/capture/send?deviceId=${deviceId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        return await res.json();
    } catch (e) {
        console.error('sendCaptureCommand:', e);
        return { success: false, error: e.message };
    }
}

// ==================== STREAM API ====================

async function startStream(deviceId = DEVICE_ID) {
    try {
        const res = await fetch(`${API_BASE_URL}/image/stream/start?deviceId=${deviceId}`, { method: 'POST' });
        return await res.json();
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function stopStream(deviceId = DEVICE_ID) {
    try {
        const res = await fetch(`${API_BASE_URL}/image/stream/stop?deviceId=${deviceId}`, { method: 'POST' });
        return await res.json();
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function getStreamStatus(deviceId = DEVICE_ID) {
    try {
        const res = await fetch(`${API_BASE_URL}/image/stream/status?deviceId=${deviceId}`);
        return await res.json();
    } catch (e) {
        return { success: false, error: e.message };
    }
}

// ==================== DISPLAY: LATEST FRAME (polling) ====================

// Cập nhật ảnh + kết quả nhận diện liên tục từ cache backend
async function pollLatestFrame() {
    const result = await getLatestFrame();

    const imgEl = document.getElementById('cam-feed');          // Cập nhật thẻ cam-feed thay vì cam-image
    const camStatus = document.getElementById('cam-status');
    const statusEl = document.getElementById('disease-status');

    if (!result.success || !result.hasData) {
        if (statusEl) statusEl.innerHTML = '<p class="no-data">⏳ Chờ ảnh từ ESP32-CAM...</p>';
        return;
    }

    // Cập nhật ảnh base64 vào camera display nếu user đang chọn "Xem ảnh mới nhất"
    if (imgEl && result.image_base64) {
        if (window.currentCameraMode === 'image') {
            imgEl.src = 'data:image/jpeg;base64,' + result.image_base64;
            imgEl.style.display = 'block';
            if (camStatus) camStatus.style.display = 'none';
        }
    }

    // Cập nhật kết quả nhận diện (sẽ kèm luôn ảnh vào AI section)
    if (statusEl) {
        statusEl.innerHTML = buildPredictionCard(result);
    }

    // Lưu timestamp để check mới
    window._lastFrameTime = result.timestamp;
}

function buildPredictionCard(data) {
    const time = data.timestamp ? new Date(data.timestamp).toLocaleString('vi-VN') : '--';
    const confidencePct = ((data.confidence || 0) * 100).toFixed(1);
    const colorClass = getDiseaseColor(data.disease);

    const detectionsHtml = (data.predictions && data.predictions.length > 0)
        ? data.predictions.map(p => `
            <div class="detection-item">
                <span class="det-class">${getDiseaseName(p.class)}</span>
                <span class="det-conf">${(p.confidence * 100).toFixed(1)}%</span>
            </div>`).join('')
        : '<div class="detection-item">Không phát hiện đối tượng</div>';

    const imageHtml = data.image_base64
        ? `<img src="data:image/jpeg;base64,${data.image_base64}" style="width: 100%; border-radius: 8px; margin-bottom: 10px;" alt="AI Detection Image"/>`
        : '';

    return `
        <div class="prediction-card ${colorClass}">
            ${imageHtml}
            <div class="prediction-header">
                <h3>${getDiseaseName(data.disease)}</h3>
                <span class="timestamp">${time}</span>
            </div>
            <div class="confidence-bar">
                <div class="confidence-fill" style="width:${confidencePct}%"></div>
                <span class="confidence-text">${confidencePct}%</span>
            </div>
            <div class="detections-list">${detectionsHtml}</div>
            ${data.alert ? `<div class="alert-banner">⚠️ ${data.alertMessage}</div>` : ''}
        </div>
    `;
}

// ==================== DISPLAY: HISTORY ====================

async function displayLatestPrediction() {
    // Dùng pollLatestFrame thay — giữ hàm này để tương thích với prediction.js
    await pollLatestFrame();
}

async function displayPredictionHistory() {
    const result = await getPredictionHistory();
    const el = document.getElementById('history-list');
    if (!el) return;

    if (!result.success || !result.predictions?.length) {
        el.innerHTML = '<p>Chưa có lịch sử</p>';
        return;
    }

    const baseUrl = API_BASE_URL.replace(/\/api$/, '');

    el.innerHTML = result.predictions.slice(0, 10).map(pred => `
        <div class="history-item ${getDiseaseColor(pred.disease)}">
            ${pred.imageUrl ? `<img src="${baseUrl}${pred.imageUrl}" alt="Lịch sử chụp" class="history-img" loading="lazy">` : ''}
            <div class="history-info">
                <div class="history-disease">${getDiseaseName(pred.disease)}</div>
                <div class="history-confidence">${(pred.confidence * 100).toFixed(1)}%</div>
                <div class="history-time">${new Date(pred.timestamp).toLocaleString('vi-VN')}</div>
            </div>
        </div>
    `).join('');
}

async function displayStatistics() {
    const result = await getStatistics();
    const el = document.getElementById('stats-container');
    if (!el) return;

    if (!result.success) { el.innerHTML = '<p>Không thể tải thống kê</p>'; return; }

    const top = result.diseaseCounts?.[0]?._id || 'N/A';
    el.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">Tổng mẫu</div>
                <div class="stat-value">${result.totalSamples || 0}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Cảnh báo</div>
                <div class="stat-value alert">${result.alerts || 0}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Trạng thái phổ biến</div>
                <div class="stat-value">${top}</div>
            </div>
        </div>
    `;
}

// ==================== HELPERS ====================

function getDiseaseColor(disease) {
    return {
        health_chili: 'green',
        chili_wilted: 'red',
        chili_whitefly: 'orange',
        chili_yellowish: 'yellow',
        chili_leaf_curl_virus: 'blue',
        chili_veino_mottle_virus: 'purple',
        unknown: 'gray'
    }[disease] || 'gray';
}

function getDiseaseName(disease) {
    return {
        health_chili: '✓ Ớt khỏe mạnh',
        chili_wilted: '🥀 Ớt héo rũ',
        chili_whitefly: '🪲 Bọ phấn trắng',
        chili_yellowish: '🟡 Bệnh vàng lá',
        chili_leaf_curl_virus: '🌿 Virus cuộn lá',
        chili_veino_mottle_virus: '🦠 Virus đốm vàng gân lá',
        unknown: 'Không xác định'
    }[disease] || disease;
}

// ==================== AUTO REFRESH ====================

function startAutoRefresh() {
    // fetchSensorData();
    // if (refreshTimer) clearInterval(refreshTimer);
    // refreshTimer = setInterval(fetchSensorData, SENSOR_REFRESH_INTERVAL);

    // Polling ảnh mới nhất từ ESP32-CAM mỗi 2 giây
    pollLatestFrame();
    if (frameTimer) clearInterval(frameTimer);
    frameTimer = setInterval(pollLatestFrame, FRAME_POLL_INTERVAL);
}

function stopAutoRefresh() {
    if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }
    if (frameTimer) { clearInterval(frameTimer); frameTimer = null; }
}

document.addEventListener('DOMContentLoaded', startAutoRefresh);
window.addEventListener('beforeunload', stopAutoRefresh);