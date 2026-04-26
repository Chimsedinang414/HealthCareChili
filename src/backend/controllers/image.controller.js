const imageService = require('../services/image.service');
const path = require('path');

// Nhận ảnh từ ESP32-CAM và nhận diện bệnh
exports.predictDisease = async (req, res) => {
  const startTime = Date.now();
  
  try {
    if (!req.body || req.body.length === 0) {
  return res.status(400).json({
    success: false,
    error: 'No image provided'
  });
}

const imageBuffer = req.body;

    const deviceId = req.query.deviceId || 'ESP32-CAM-01';
    
    console.log(`[${new Date().toISOString()}] Received image from ${deviceId} (${imageBuffer.length} bytes)`);
    console.log('Processing with YOLO model...');

    // Xử lý ảnh với YOLO và tự động lưu kết quả
    const result = await imageService.predictWithYolo(imageBuffer, deviceId);
    console.log(`Received raw image: ${imageBuffer.length} bytes`);
    
    const processingTime = Date.now() - startTime;

    // Phản hồi ngay lập tức cho ESP32
    res.json({
      success: true,
      message: 'Image processed and saved',
      disease: result.disease,
      confidence: result.confidence,
      alert: result.prediction.alert,
      alertMessage: result.prediction.alertMessage,
      processingTime: processingTime,
      timestamp: result.prediction.timestamp
    });

    console.log(`✓ Processing complete: ${result.disease} (${(result.confidence * 100).toFixed(1)}% confidence) - ${processingTime}ms`);

  } catch (error) {
    console.error('Prediction error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

// Lấy lịch sử dự đoán
exports.getPredictionHistory = async (req, res) => {
  try {
    const deviceId = req.query.deviceId || 'ESP32-CAM-01';
    const limit = parseInt(req.query.limit) || 50;

    const result = await imageService.getPredictionHistory(deviceId, limit);
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

// Lấy dự đoán gần nhất
exports.getLatestPrediction = async (req, res) => {
  try {
    const deviceId = req.query.deviceId || 'ESP32-CAM-01';
    const result = await imageService.getLatestPrediction(deviceId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

// Lấy thống kê
exports.getStatistics = async (req, res) => {
  try {
    const deviceId = req.query.deviceId || 'ESP32-CAM-01';
    const days = parseInt(req.query.days) || 7;
    
    const result = await imageService.getStatistics(deviceId, days);
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

// Lấy trạng thái model
exports.getModelStatus = async (req, res) => {
  res.json({
    initialized: true,
    labels: imageService.labels,
    version: '1.0',
    modelType: 'YOLO11'
  });
};

// ==================== CAPTURE COMMANDS ====================

// Gửi lệnh chụp ngay (from web)
exports.sendCaptureCommand = async (req, res) => {
  try {
    const deviceId = req.query.deviceId || 'ESP32-CAM-01';
    
    const result = await imageService.sendCaptureCommand(deviceId);
    
    res.json({
      success: true,
      message: `Capture command sent to ${deviceId}`,
      commandId: result.commandId,
      timestamp: result.timestamp
    });

    console.log(`📸 Capture command sent to ${deviceId}`);
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

// Check lệnh chụp (from ESP32)
exports.checkCaptureCommand = async (req, res) => {
  try {
    const deviceId = req.query.deviceId || 'ESP32-CAM-01';
    
    const result = await imageService.checkCaptureCommand(deviceId);
    
    res.json({
      success: true,
      shouldCapture: result.shouldCapture,
      commandId: result.commandId,
      reason: result.reason // 'scheduled' hoặc 'on-demand'
    });

  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

// Xóa lệnh chụp sau khi thực hiện (from ESP32)
exports.clearCaptureCommand = async (req, res) => {
  try {
    const deviceId = req.query.deviceId || 'ESP32-CAM-01';
    const commandId = req.query.commandId;
    
    const result = await imageService.clearCaptureCommand(deviceId, commandId);
    
    res.json({
      success: true,
      message: 'Capture command cleared'
    });

    console.log(`✓ Capture command cleared for ${deviceId}`);
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

// ==================== STREAM MANAGEMENT ====================

// Bật stream (từ web)
exports.startStream = async (req, res) => {
  try {
    const deviceId = req.query.deviceId || 'ESP32-CAM-01';
    
    const result = await imageService.startStream(deviceId);
    
    res.json({
      success: true,
      message: `Stream started for ${deviceId}`,
      streamUrl: result.streamUrl,
      timestamp: new Date()
    });

    console.log(`🎥 Stream started for ${deviceId}`);
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

// Tắt stream (từ web)
exports.stopStream = async (req, res) => {
  try {
    const deviceId = req.query.deviceId || 'ESP32-CAM-01';
    
    const result = await imageService.stopStream(deviceId);
    
    res.json({
      success: true,
      message: `Stream stopped for ${deviceId}`,
      timestamp: new Date()
    });

    console.log(`⏹️ Stream stopped for ${deviceId}`);
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

// Check trạng thái stream (từ ESP32)
exports.getStreamStatus = async (req, res) => {
  try {
    const deviceId = req.query.deviceId || 'ESP32-CAM-01';
    
    const result = await imageService.getStreamStatus(deviceId);
    
    res.json({
      success: true,
      stream: result.isStreaming,
      status: result.isStreaming ? 'active' : 'inactive',
      timestamp: new Date()
    });

  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};