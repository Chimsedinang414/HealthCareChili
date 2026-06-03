const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/image.controller');

// ─── ESP32-CAM gửi ảnh raw JPEG body ────────────────────────────────────────
// Content-Type: image/jpeg, body = raw bytes
router.post('/upload',
  express.raw({ type: 'image/*', limit: '5mb' }),
  ctrl.predictDisease
);

// ─── Frontend polling ────────────────────────────────────────────────────────
// GET /api/image/latest-frame?deviceId=ESP32-CAM-01
// Trả về { image_base64, predictions, disease, confidence, alert, ... }
router.get('/latest-frame', ctrl.getLatestFrame);

// ─── Lịch sử & thống kê ─────────────────────────────────────────────────────
router.get('/history',    ctrl.getPredictionHistory);
router.get('/latest',     ctrl.getLatestPrediction);
router.get('/statistics', ctrl.getStatistics);
router.get('/status',     ctrl.getModelStatus);

// ─── Capture commands ────────────────────────────────────────────────────────
// Web gửi lệnh chụp ngay
router.post('/capture/send',  ctrl.sendCaptureCommand);
// ESP32 hỏi có lệnh chụp không (polling ~1s)
router.get('/capture/check',  ctrl.checkCaptureCommand);
// ESP32 xóa lệnh sau khi chụp xong
router.delete('/capture/clear', ctrl.clearCaptureCommand);

// ─── Stream management ───────────────────────────────────────────────────────
router.post('/stream/start',  ctrl.startStream);
router.post('/stream/stop',   ctrl.stopStream);
router.get('/stream/status',  ctrl.getStreamStatus);

module.exports = router;