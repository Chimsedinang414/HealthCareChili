// ==================== CAPTURE ON-DEMAND ====================

async function triggerCaptureNow() {
    const captureBtn = document.getElementById('capture-now-btn');
    if (captureBtn) {
        captureBtn.disabled = true;
        captureBtn.innerHTML = '⏳ Đang chụp...';
    }

    try {
        const result = await sendCaptureCommand();
        
        if (result.success) {
            showNotification('📸 Lệnh chụp đã gửi! ESP32 sẽ chụp trong vòng 5 giây', 'success');
            console.log('Capture command sent:', result);
            
            // Tự động refresh dữ liệu sau 8 giây
            setTimeout(() => {
                updatePredictionDisplay();
                if (captureBtn) {
                    captureBtn.disabled = false;
                    captureBtn.innerHTML = '📸 Chụp ngay';
                }
            }, 8000);
        } else {
            showNotification('❌ Gửi lệnh thất bại: ' + (result.error || 'Unknown error'), 'error');
            if (captureBtn) {
                captureBtn.disabled = false;
                captureBtn.innerHTML = '📸 Chụp ngay';
            }
        }
    } catch (error) {
        showNotification('❌ Lỗi: ' + error.message, 'error');
        console.error('Capture error:', error);
        if (captureBtn) {
            captureBtn.disabled = false;
            captureBtn.innerHTML = '📸 Chụp ngay';
        }
    }
}

// ==================== REFRESH DISPLAY ====================

// Refresh dự đoán mỗi 5 phút
const PREDICTION_REFRESH = 300000; // 5 phút
let predictionRefreshTimer = null;

// Khởi động update dự đoán
function startPredictionRefresh() {
    // Cập nhật ngay lập tức
    updatePredictionDisplay();
    
    // Cập nhật định kỳ
    predictionRefreshTimer = setInterval(updatePredictionDisplay, PREDICTION_REFRESH);
}

// Dừng update dự đoán
function stopPredictionRefresh() {
    if (predictionRefreshTimer) {
        clearInterval(predictionRefreshTimer);
        predictionRefreshTimer = null;
    }
}

// Cập nhật toàn bộ hiển thị dự đoán
async function updatePredictionDisplay() {
    console.log('Updating prediction display...');
    await Promise.all([
        displayLatestPrediction(),
        displayPredictionHistory(),
        displayStatistics()
    ]);
}

// ==================== DISEASE COLOR SYSTEM ====================

function getDiseaseColorClass(disease) {
    const colorMap = {
        'healthy': 'disease-healthy',
        'bacterial_spot': 'disease-bacterial',
        'leaf_curl_virus': 'disease-virus',
        'unknown': 'disease-unknown'
    };
    return colorMap[disease] || 'disease-unknown';
}

function getDiseaseIcon(disease) {
    const icons = {
        'healthy': '✓',
        'bacterial_spot': '🦠',
        'leaf_curl_virus': '🦠',
        'unknown': '?'
    };
    return icons[disease] || '?';
}

// ==================== NOTIFICATION SYSTEM ====================

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Auto remove
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// ==================== REAL-TIME UPDATE CHECK ====================

let lastPredictionTime = null;

async function checkForNewPredictions() {
    const result = await getLatestPrediction();
    
    if (!result.success || !result.prediction) return;
    
    const pred = result.prediction;
    const predTime = new Date(pred.timestamp);
    
    // Nếu có dự đoán mới
    if (!lastPredictionTime || predTime > lastPredictionTime) {
        lastPredictionTime = predTime;
        
        // Cập nhật lại display
        await updatePredictionDisplay();
        
        // Thông báo nếu là bệnh nguy hiểm
        if (pred.alert) {
            showNotification(`⚠️ ${pred.alertMessage}`, 'warning');
            // Có thể thêm sound notification hoặc browser notification
        }
    }
}

// Check cho dự đoán mới mỗi 1 phút
setInterval(checkForNewPredictions, 60000);

// ==================== CHART DISPLAY ====================

async function createDiseaseChart() {
    const result = await getStatistics(undefined, 30);
    
    if (!result.success || !result.diseaseCounts) return;
    
    const ctx = document.getElementById('disease-chart');
    if (!ctx) return;
    
    const labels = result.diseaseCounts.map(d => getDiseaseName(d._id));
    const data = result.diseaseCounts.map(d => d.count);
    const colors = result.diseaseCounts.map(d => getDiseaseChartColor(d._id));
    
    // Kiểm tra Chart.js
    if (typeof Chart !== 'undefined') {
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderColor: '#fff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
}

function getDiseaseChartColor(disease) {
    const colors = {
        'healthy': '#22c55e',
        'bacterial_spot': '#ef4444',
        'leaf_curl_virus': '#f97316',
        'unknown': '#9ca3af'
    };
    return colors[disease] || '#9ca3af';
}

// ==================== EXPORT DATA ====================

async function exportPredictionData() {
    const result = await getPredictionHistory(undefined, 100);
    
    if (!result.success || !result.predictions) {
        showNotification('Không thể xuất dữ liệu', 'error');
        return;
    }
    
    // Tạo CSV
    const headers = ['Thời gian', 'Bệnh', 'Độ tin cậy', 'Cảnh báo'];
    const rows = result.predictions.map(p => [
        new Date(p.timestamp).toLocaleString('vi-VN'),
        getDiseaseName(p.disease),
        (p.confidence * 100).toFixed(1) + '%',
        p.alert ? 'Có' : 'Không'
    ]);
    
    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
        csv += row.map(cell => `"${cell}"`).join(',') + '\n';
    });
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prediction_history_${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

// ==================== INITIALIZE ====================

document.addEventListener('DOMContentLoaded', () => {
    startPredictionRefresh();
    
    // Khởi động check mới ngay lập tức
    checkForNewPredictions();
});

window.addEventListener('beforeunload', () => {
    stopPredictionRefresh();
});
