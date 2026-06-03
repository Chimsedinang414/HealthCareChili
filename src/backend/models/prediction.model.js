const mongoose = require('mongoose');

const predictionSchema = new mongoose.Schema({
  // Thông tin dự đoán
  disease: {
    type: String,
    enum: ['chili_wilted', 'chili_whitefly', 'chili_yellowish', 'chili_leaf_curl_virus', 'chili_veino_mottle_virus', 'health_chili', 'unknown'],
    required: true
  },
  
  // Độ tin cậy (confidence scores)
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    required: true
  },
  
  // Tất cả các nhãn và xác suất
  predictions: [{
    label: String,
    confidence: Number
  }],
  
  // Thông tin ảnh
  imageUrl: {
    type: String,
    default: null
  },
  
  imageSize: {
    type: Number,
    default: null
  },
  
  // Thông tin ESP32
  deviceId: {
    type: String,
    default: 'ESP32-CAM-01'
  },
  
  // Trạng thái cảnh báo
  alert: {
    type: Boolean,
    default: false
  },
  
  alertMessage: {
    type: String,
    default: null
  },
  
  // Metadata
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  processingTime: {
    type: Number,
    default: null // ms
  },
  
  status: {
    type: String,
    enum: ['success', 'failed', 'pending'],
    default: 'pending'
  },
  
  errorMessage: {
    type: String,
    default: null
  }
});

// Index để tìm kiếm nhanh
predictionSchema.index({ timestamp: -1, deviceId: 1 });
predictionSchema.index({ disease: 1, timestamp: -1 });
predictionSchema.index({ alert: 1, timestamp: -1 });

module.exports = mongoose.model('Prediction', predictionSchema);
