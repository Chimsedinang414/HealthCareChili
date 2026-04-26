const express = require('express');
const router = express.Router();
const imageController = require('../controllers/image.controller');
const multer = require('multer');
const path = require('path');

// Cấu hình multer để lưu tạm ảnh
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // Giới hạn 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Routes cho nhận diện bệnh cây
router.post(
  '/predict',
  express.raw({ type: 'image/jpeg', limit: '10mb' }),
  imageController.predictDisease
);
router.get('/status', imageController.getModelStatus);

// Routes lấy dữ liệu lịch sử
router.get('/history', imageController.getPredictionHistory);
router.get('/latest', imageController.getLatestPrediction);
router.get('/statistics', imageController.getStatistics);

// Routes capture on-demand
router.post('/capture-now', imageController.sendCaptureCommand);     // Web → Server
router.get('/check-capture', imageController.checkCaptureCommand);   // ESP32 → Server
router.delete('/clear-capture', imageController.clearCaptureCommand); // ESP32 → Server

// Routes stream management
router.post('/stream-start', imageController.startStream);           // Web → Server
router.delete('/stream-stop', imageController.stopStream);           // Web → Server
router.get('/stream-status', imageController.getStreamStatus);       // ESP32 → Server

module.exports = router;