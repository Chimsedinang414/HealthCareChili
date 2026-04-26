const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const Prediction = require('../models/prediction.model');

class ImageProcessingService {
  constructor() {
    this.model = null;
    this.labels = ['bacterial_spot', 'healthy', 'leaf_curl_virus'];
    this.isModelLoaded = false;
    
    // ==================== CAPTURE COMMAND MANAGEMENT ====================
    // Lưu lệnh chụp cho từng device
    // Cấu trúc: { 'ESP32-CAM-01': { commandId, timestamp, reason, executed } }
    this.captureCommands = {};
    
    // ==================== STREAM MANAGEMENT ====================
    // Lưu trạng thái stream cho từng device
    // Cấu trúc: { 'ESP32-CAM-01': { isStreaming, startedAt, streamUrl } }
    this.streamStatus = {};
  }

  // Xử lý ảnh với YOLO Model (sử dụng Python backend)
  async predictWithYolo(imageBuffer, deviceId = 'ESP32-CAM-01') {
    return new Promise((resolve, reject) => {
      // Tạo file tạm thời
      const tempImagePath = path.join(__dirname, `../../temp_${Date.now()}.jpg`);
      
      fs.writeFileSync(tempImagePath, imageBuffer);

      // Gọi Python script để xử lý với YOLO
      const python = spawn('python', [
        path.join(__dirname, '../../../scripts/predict_yolo.py'),
        tempImagePath
      ]);

      let output = '';
      let error = '';

      python.stdout.on('data', (data) => {
        output += data.toString();
      });

      python.stderr.on('data', (data) => {
        error += data.toString();
      });

      python.on('close', async (code) => {
        // Xóa file tạm
        fs.unlinkSync(tempImagePath);

        if (code === 0) {
          try {
            const result = JSON.parse(output);
            
            // Lưu vào database
            const prediction = new Prediction({
              disease: result.disease,
              confidence: result.confidence,
              predictions: result.predictions,
              deviceId: deviceId,
              alert: result.disease !== 'healthy' && result.confidence > 0.6,
              alertMessage: result.disease !== 'healthy' 
                ? `⚠️ Phát hiện: ${result.disease} (${(result.confidence * 100).toFixed(1)}%)`
                : 'Cây khỏe mạnh ✓',
              status: 'success',
              processingTime: result.processingTime
            });

            const saved = await prediction.save();
            resolve({
              success: true,
              prediction: saved.toObject(),
              disease: result.disease,
              confidence: result.confidence,
              allPredictions: result.predictions
            });
          } catch (err) {
            reject(err);
          }
        } else {
          reject(new Error(`Python script error: ${error}`));
        }
      });
    });
  }

  // Lấy lịch sử dự đoán
  async getPredictionHistory(deviceId = 'ESP32-CAM-01', limit = 50) {
    try {
      const predictions = await Prediction.find({ deviceId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .exec();
      
      return {
        success: true,
        total: predictions.length,
        predictions: predictions.map(p => p.toObject())
      };
    } catch (error) {
      throw error;
    }
  }

  // Lấy dự đoán gần nhất
  async getLatestPrediction(deviceId = 'ESP32-CAM-01') {
    try {
      const prediction = await Prediction.findOne({ deviceId })
        .sort({ timestamp: -1 })
        .exec();
      
      return {
        success: true,
        prediction: prediction ? prediction.toObject() : null
      };
    } catch (error) {
      throw error;
    }
  }

  // Lấy thống kê
  async getStatistics(deviceId = 'ESP32-CAM-01', days = 7) {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const stats = await Prediction.aggregate([
        {
          $match: {
            deviceId: deviceId,
            timestamp: { $gte: since },
            status: 'success'
          }
        },
        {
          $group: {
            _id: '$disease',
            count: { $sum: 1 },
            avgConfidence: { $avg: '$confidence' }
          }
        },
        { $sort: { count: -1 } }
      ]);

      const alerts = await Prediction.countDocuments({
        deviceId: deviceId,
        timestamp: { $gte: since },
        alert: true
      });

      return {
        success: true,
        period: `${days} days`,
        totalSamples: stats.reduce((sum, s) => sum + s.count, 0),
        diseaseCounts: stats,
        alerts: alerts
      };
    } catch (error) {
      throw error;
    }
  }

  // Phương thức cũ (TensorFlow - nếu cần fallback)
  async loadModel(modelPath) {
    try {
      console.log('Loading TensorFlow model...');
      this.model = await tf.loadLayersModel(`file://${modelPath}`);
      this.isModelLoaded = true;
      console.log('TensorFlow model loaded successfully');
      return true;
    } catch (error) {
      console.error('Error loading TensorFlow model:', error);
      return false;
    }
  }

  async preprocessImage(imageBuffer) {
    const image = tf.node.decodeJpeg(imageBuffer, 3);
    const resized = tf.image.resizeBilinear(image, [224, 224]);
    const normalized = resized.div(255.0);
    const expanded = normalized.expandDims(0);
    
    image.dispose();
    resized.dispose();
    
    return expanded;
  }

  async predict(imageBuffer) {
    if (!this.isModelLoaded) {
      throw new Error('Model not loaded');
    }

    try {
      const tensor = await this.preprocessImage(imageBuffer);
      const prediction = this.model.predict(tensor);
      const probabilities = await prediction.data();
      
      tensor.dispose();
      prediction.dispose();

      let maxIndex = 0;
      let maxProbability = 0;
      
      for (let i = 0; i < probabilities.length; i++) {
        if (probabilities[i] > maxProbability) {
          maxProbability = probabilities[i];
          maxIndex = i;
        }
      }

      const results = this.labels.map((label, index) => ({
        label,
        confidence: probabilities[index]
      }));

      results.sort((a, b) => b.confidence - a.confidence);

      return {
        disease: this.labels[maxIndex],
        confidence: maxProbability,
        allPredictions: results
      };
    } catch (error) {
      console.error('Prediction error:', error);
      throw error;
    }
  }

  // ==================== CAPTURE COMMAND METHODS ====================

  // Gửi lệnh chụp ngay từ web
  async sendCaptureCommand(deviceId = 'ESP32-CAM-01') {
    const commandId = `CMD-${Date.now()}`;
    const timestamp = new Date();

    this.captureCommands[deviceId] = {
      commandId: commandId,
      timestamp: timestamp,
      reason: 'on-demand',      // Chụp theo yêu cầu (không phải theo chu kỳ)
      executed: false,
      expiresAt: new Date(timestamp.getTime() + 60000) // Hết hiệu lực sau 60s
    };

    console.log(`[CAPTURE] On-demand command ${commandId} sent to ${deviceId}`);

    return {
      commandId: commandId,
      timestamp: timestamp
    };
  }

  // ESP32 check xem có lệnh chụp không
  async checkCaptureCommand(deviceId = 'ESP32-CAM-01') {
    const command = this.captureCommands[deviceId];

    // Kiểm tra có lệnh chưa thực hiện không
    if (command && !command.executed) {
      // Kiểm tra hết hạn không
      if (new Date() < command.expiresAt) {
        return {
          shouldCapture: true,
          commandId: command.commandId,
          reason: command.reason
        };
      } else {
        // Lệnh hết hạn, xóa
        delete this.captureCommands[deviceId];
      }
    }

    // Không có lệnh
    return {
      shouldCapture: false,
      commandId: null,
      reason: 'none'
    };
  }

  // Xóa lệnh chụp sau khi thực hiện
  async clearCaptureCommand(deviceId = 'ESP32-CAM-01', commandId) {
    if (this.captureCommands[deviceId]) {
      if (!commandId || this.captureCommands[deviceId].commandId === commandId) {
        delete this.captureCommands[deviceId];
        console.log(`[CAPTURE] Command cleared for ${deviceId}`);
      }
    }

    return { success: true };
  }

  // Lấy trạng thái commands
  async getCommandStatus(deviceId = 'ESP32-CAM-01') {
    const command = this.captureCommands[deviceId];
    
    return {
      hasPendingCommand: command && !command.executed ? true : false,
      command: command || null
    };
  }

  // Clear all commands (for maintenance)
  async clearAllCommands() {
    this.captureCommands = {};
    console.log('[CAPTURE] All commands cleared');
  }

  // ==================== STREAM MANAGEMENT ====================

  // Bật stream
  async startStream(deviceId = 'ESP32-CAM-01') {
    const streamUrl = `http://${deviceId}:81/stream`;
    
    this.streamStatus[deviceId] = {
      isStreaming: true,
      startedAt: new Date(),
      streamUrl: streamUrl
    };

    console.log(`[STREAM] Stream started for ${deviceId}`);

    return {
      success: true,
      streamUrl: streamUrl,
      startedAt: new Date()
    };
  }

  // Tắt stream
  async stopStream(deviceId = 'ESP32-CAM-01') {
    if (this.streamStatus[deviceId]) {
      delete this.streamStatus[deviceId];
    }

    console.log(`[STREAM] Stream stopped for ${deviceId}`);

    return { success: true };
  }

  // Check trạng thái stream
  async getStreamStatus(deviceId = 'ESP32-CAM-01') {
    const status = this.streamStatus[deviceId];

    return {
      isStreaming: status ? true : false,
      status: status || null,
      startedAt: status ? status.startedAt : null
    };
  }

  // Clear all streams (for maintenance)
  async clearAllStreams() {
    this.streamStatus = {};
    console.log('[STREAM] All streams cleared');
  }
}


module.exports = new ImageProcessingService();