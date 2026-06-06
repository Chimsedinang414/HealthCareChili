//Chụp ảnh theo nhu cầu 

async function triggerCaptureNow() {
    const btn = document.getElementById('capture-now-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Đang gửi lệnh...'; }

    try {
        const result = await sendCaptureCommand();

        if (result.success) {
            showNotification(' Lệnh chụp đã gửi! ESP32 sẽ chụp trong vài giây', 'success');

            // Sau 6 giây tự bật lại nút (ảnh sẽ hiện tự động qua polling)
            setTimeout(() => {
                if (btn) { btn.disabled = false; btn.innerHTML = ' Chụp ngay'; }
            }, 6000);
        } else {
            showNotification('❌ Gửi lệnh thất bại: ' + (result.error || 'Unknown error'), 'error');
            if (btn) { btn.disabled = false; btn.innerHTML = ' Chụp ngay'; }
        }
    } catch (error) {
        showNotification('❌ Lỗi: ' + error.message, 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = ' Chụp ngay'; }
    }
}

// ==================== STREAM CONTROL ====================

let isStreaming = false;

async function toggleStream() {
    const btn = document.getElementById('stream-btn');
    const streamBox = document.getElementById('stream-container');
    const imgEl = document.getElementById('stream-img'); // <img> hoặc <iframe> cho MJPEG

    if (!isStreaming) {
        // Bật stream
        const result = await startStream();
        if (result.success) {
            isStreaming = true;
            if (btn) { btn.innerHTML = '⏹ Dừng stream'; btn.classList.add('active'); }

            // Hiển thị MJPEG stream trực tiếp từ ESP32-CAM port 81
            if (imgEl && result.streamUrl) {
                imgEl.src = result.streamUrl;
                imgEl.style.display = 'block';
            }
            if (streamBox) streamBox.style.display = 'block';
            showNotification(' Đang stream từ ESP32-CAM', 'success');
        } else {
            showNotification(' Không thể bật stream: ' + (result.error || ''), 'error');
        }
    } else {
        // Tắt stream
        await stopStream();
        isStreaming = false;
        if (btn) { btn.innerHTML = '🎥 Xem stream'; btn.classList.remove('active'); }
        if (imgEl) { imgEl.src = ''; imgEl.style.display = 'none'; }
        if (streamBox) streamBox.style.display = 'none';
        showNotification('⏹ Đã dừng stream', 'info');
    }
}

// ==================== PERIODIC REFRESH ====================

// Refresh lịch sử + thống kê mỗi 5 phút (ảnh được poll mỗi 2s bởi api.js)
const PREDICTION_REFRESH = 300000;
let predictionRefreshTimer = null;

function startPredictionRefresh() {
    updateHistoryAndStats();
    predictionRefreshTimer = setInterval(updateHistoryAndStats, PREDICTION_REFRESH);
}

function stopPredictionRefresh() {
    if (predictionRefreshTimer) { clearInterval(predictionRefreshTimer); predictionRefreshTimer = null; }
}

// Chỉ refresh lịch sử + thống kê, KHÔNG refresh ảnh (ảnh do pollLatestFrame trong api.js đảm nhiệm)
async function updateHistoryAndStats() {
    await Promise.all([
        displayPredictionHistory(),
        displayStatistics()
    ]);
}

// Hàm này giữ để tương thích nếu có nơi khác gọi
async function updatePredictionDisplay() {
    await Promise.all([
        displayLatestPrediction(),   // = pollLatestFrame trong api.js
        displayPredictionHistory(),
        displayStatistics()
    ]);
}

// ==================== REAL-TIME ALERT CHECK ====================

// Theo dõi kết quả mới để hiển thị cảnh báo
let lastAlertTime = null;

async function checkForNewAlerts() {
    const result = await getLatestPrediction();
    if (!result.success || !result.prediction) return;

    const pred = result.prediction;
    const predTime = new Date(pred.timestamp);

    if (!lastAlertTime || predTime > lastAlertTime) {
        lastAlertTime = predTime;
        if (pred.alert) {
            showNotification(`⚠️ ${pred.alertMessage}`, 'warning');
            // Nếu muốn browser notification:
            // if (Notification.permission === 'granted') new Notification('HealthCareTree', { body: pred.alertMessage });
        }
    }
}

// Check cảnh báo mỗi 30 giây
setInterval(checkForNewAlerts, 30000);

// Helpers

function getDiseaseColorClass(disease) {
    return {
        health_chili: 'disease-healthy',
        chili_wilted: 'disease-bacterial',
        chili_whitefly: 'disease-bacterial',
        chili_yellowish: 'disease-bacterial',
        chili_leaf_curl_virus: 'disease-virus',
        chili_veino_mottle_virus: 'disease-virus',
        unknown: 'disease-unknown'
    }[disease] || 'disease-unknown';
}

function getDiseaseIcon(disease) {
    return {
        health_chili: '✓',
        chili_wilted: '🥀',
        chili_whitefly: '🪲',
        chili_yellowish: '🟡',
        chili_leaf_curl_virus: '🌿',
        chili_veino_mottle_virus: '🦠',
        unknown: '?'
    }[disease] || '?';
}

// ==================== NOTIFICATION ====================

function showNotification(message, type = 'info') {
    const el = document.createElement('div');
    el.className = `notification notification-${type}`;
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 5000);
}

// ==================== CHART ====================

async function createDiseaseChart() {
    const result = await getStatistics(undefined, 30);
    if (!result.success || !result.diseaseCounts) return;

    const ctx = document.getElementById('disease-chart');
    if (!ctx || typeof Chart === 'undefined') return;

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: result.diseaseCounts.map(d => getDiseaseName(d._id)),
            datasets: [{
                data: result.diseaseCounts.map(d => d.count),
                backgroundColor: result.diseaseCounts.map(d => getDiseaseChartColor(d._id)),
                borderColor: '#fff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

function getDiseaseChartColor(disease) {
    return {
        health_chili: '#22c55e',
        chili_wilted: '#ef4444',
        chili_whitefly: '#f97316',
        chili_yellowish: '#eab308',
        chili_leaf_curl_virus: '#a855f7',
        chili_veino_mottle_virus: '#ec4899',
        unknown: '#9ca3af'
    }[disease] || '#9ca3af';
}

// ==================== EXPORT CSV ====================

async function exportPredictionData() {
    const result = await getPredictionHistory(undefined, 100);
    if (!result.success || !result.predictions) {
        showNotification('Không thể xuất dữ liệu', 'error');
        return;
    }

    const headers = ['Thời gian', 'Bệnh', 'Độ tin cậy', 'Cảnh báo'];
    const rows = result.predictions.map(p => [
        new Date(p.timestamp).toLocaleString('vi-VN'),
        getDiseaseName(p.disease),
        (p.confidence * 100).toFixed(1) + '%',
        p.alert ? 'Có' : 'Không'
    ]);

    let csv = headers.join(',') + '\n';
    rows.forEach(r => { csv += r.map(c => `"${c}"`).join(',') + '\n'; });

    const a = Object.assign(document.createElement('a'), {
        href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
        download: `prediction_history_${Date.now()}.csv`
    });
    a.click();
    URL.revokeObjectURL(a.href);
}

// ==================== INITIALIZE ====================

document.addEventListener('DOMContentLoaded', () => {
    startPredictionRefresh();
    checkForNewAlerts();

    // Gắn sự kiện nút nếu có trong HTML
    const captureBtn = document.getElementById('capture-now-btn');
    if (captureBtn) captureBtn.addEventListener('click', triggerCaptureNow);

    const streamBtn = document.getElementById('stream-btn');
    if (streamBtn) streamBtn.addEventListener('click', toggleStream);
});

window.addEventListener('beforeunload', stopPredictionRefresh);