const imageService = require('../services/image.service');
const path = require('path');

// Khởi tạo model khi server start
let modelInitialized = false;

exports.initializeModel = async (req, res) => {
  try {
    if (modelInitialized) {
      return res.json({ message: 'Model already initialized' });
    }

    const modelPath = path.join(__dirname, '../../../../plant_health_model.h5');
    const success = await imageService.loadModel(modelPath);
    
    if (success) {
      modelInitialized = true;
      res.json({ message: 'Model initialized successfully' });
    } else {
      res.status(500).json({ error: 'Failed to load model' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Nhận ảnh từ ESP32-CAM và nhận diện bệnh
exports.predictDisease = async (req, res) => {
  try {
    if (!modelInitialized) {
      // Thử khởi tạo model nếu chưa có
      const modelPath = path.join(__dirname, '../../../../plant_health_model.h5');
      await imageService.loadModel(modelPath);
      modelInitialized = true;
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const result = await imageService.predict(req.file.buffer);
    
    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Prediction error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

// Lấy trạng thái model
exports.getModelStatus = async (req, res) => {
  res.json({
    initialized: modelInitialized,
    labels: imageService.labels
  });
};