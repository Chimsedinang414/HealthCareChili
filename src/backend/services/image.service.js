const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const Prediction = require('../models/prediction.model');

// Create uploads/images directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads/images');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

class ImageProcessingService {
  constructor() {
    this.labels = ['chili_wilted', 'chili_whitefly', 'chili_yellowish', 'chili_leaf_curl_virus', 'chili_veino_mottle_virus', 'health_chili'];

    // ==================== LATEST RESULT CACHE ====================
    // Cache ảnh + kết quả nhận diện mới nhất theo deviceId
    // Cấu trúc: { 'ESP32-CAM-01': { image_base64, predictions, disease, confidence, ... } }
    this.latestResults = {};

    // ==================== CAPTURE COMMAND MANAGEMENT ====================
    this.captureCommands = {};

    // ==================== STREAM MANAGEMENT ====================
    this.streamStatus = {};

    // ==================== DEVICE IP TRACKING ====================
    this.deviceIps = {};
  }

  // Cập nhật IP của thiết bị
  updateDeviceIp(deviceId, ip) {
    if (!ip) return;
    // Loại bỏ tiền tố IPv6 nếu có
    const cleanIp = ip.startsWith('::ffff:') ? ip.substring(7) : ip;
    if (cleanIp !== '::1' && cleanIp !== '127.0.0.1') {
      this.deviceIps[deviceId] = cleanIp;
      console.log(`[DEVICE] Updated IP for ${deviceId}: ${cleanIp}`);
    }
  }

  // Lấy IP của thiết bị
  getDeviceIp(deviceId) {
    return this.deviceIps[deviceId] || null;
  }

  // Tìm đường dẫn Python từ môi trường ảo .venv hoặc venv
  getPythonPath() {
    const rootDir = path.join(__dirname, '../../..');
    const winPaths = [
      path.join(rootDir, '.venv/Scripts/python.exe'),
      path.join(rootDir, 'venv/Scripts/python.exe')
    ];
    const unixPaths = [
      path.join(rootDir, '.venv/bin/python'),
      path.join(rootDir, 'venv/bin/python')
    ];

    const paths = process.platform === 'win32' ? winPaths : unixPaths;

    for (const p of paths) {
      if (fs.existsSync(p)) {
        console.log(`[PYTHON] Using virtual environment python: ${p}`);
        return p;
      }
    }

    console.log(`[PYTHON] Virtual environment python not found, falling back to system 'python'`);
    return 'python';
  }

  // Xử lý ảnh với YOLO Model (sử dụng Python backend)
  async predictWithYolo(imageBuffer, deviceId = 'ESP32-CAM-01') {
    return new Promise((resolve, reject) => {
      // Tạo file tạm thời
      const tempImagePath = path.join(__dirname, `../../temp_${Date.now()}.jpg`);

      fs.writeFileSync(tempImagePath, imageBuffer);

      const pythonPath = this.getPythonPath();
      // Gọi Python script để xử lý với YOLO
      const python = spawn(pythonPath, [
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
        try { fs.unlinkSync(tempImagePath); } catch (_) { }

        if (code === 0) {
          try {
            // Trích xuất JSON từ output đề phòng các cảnh báo/logs khác từ Python
            const jsonStart = output.indexOf('{');
            const jsonEnd = output.lastIndexOf('}');
            if (jsonStart === -1 || jsonEnd === -1) {
              throw new Error(`Không tìm thấy kết quả JSON hợp lệ từ Python script. Output: ${output}`);
            }
            const jsonStr = output.substring(jsonStart, jsonEnd + 1);
            const result = JSON.parse(jsonStr);

            const isHealthy = result.disease === 'health_chili';
            const alertFlag = !isHealthy && result.confidence > 0.6;
            const alertMsg = isHealthy
              ? 'Cây ớt khỏe mạnh ✓'
              : ` Phát hiện: ${result.disease} (${(result.confidence * 100).toFixed(1)}%)`;

            // Lưu ảnh vào local folder
            const fileName = `img_${Date.now()}.jpg`;
            const savePath = path.join(uploadsDir, fileName);
            const imageToSave = result.image_base64 ? Buffer.from(result.image_base64, 'base64') : imageBuffer;
            fs.writeFileSync(savePath, imageToSave);
            const imageUrl = `/uploads/images/${fileName}`;

            // Lưu vào database
            const prediction = new Prediction({
              disease: result.disease,
              confidence: result.confidence,
              predictions: result.predictions,
              deviceId: deviceId,
              alert: alertFlag,
              alertMessage: alertMsg,
              status: 'success',
              processingTime: result.processingTime,
              imageUrl: imageUrl
            });

            const saved = await prediction.save();

            // Cache kết quả + ảnh annotated (có bbox) cho frontend polling
            this.latestResults[deviceId] = {
              image_base64: result.image_base64 || imageBuffer.toString('base64'),
              predictions: result.predictions,
              disease: result.disease,
              confidence: result.confidence,
              count: result.predictions ? result.predictions.length : 0,
              alert: alertFlag,
              alertMessage: alertMsg,
              timestamp: saved.timestamp || new Date()
            };

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

  // CAPTURE COMMAND METHODS

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

  //LATEST RESULT CACHE 

  // Lấy kết quả + ảnh annotated mới nhất (dùng cho frontend polling)
  getLatestResult(deviceId = 'ESP32-CAM-01') {
    return this.latestResults[deviceId] || null;
  }

  // Xóa cache 
  clearLatestResult(deviceId = 'ESP32-CAM-01') {
    delete this.latestResults[deviceId];
  }

  // Clear all commands 
  async clearAllCommands() {
    this.captureCommands = {};
    console.log('[CAPTURE] All commands cleared');
  }

  // STREAM MANAGEMENT 

  // Bật stream
  async startStream(deviceId = 'ESP32-CAM-01') {
    const ip = this.getDeviceIp(deviceId) || deviceId;
    const streamUrl = `http://${ip}:81/stream`;

    this.streamStatus[deviceId] = {
      isStreaming: true,
      commandPending: true,
      startedAt: new Date(),
      streamUrl: streamUrl
    };

    console.log(`[STREAM] Stream started for ${deviceId} at URL: ${streamUrl}`);

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

    if (!status) {
      return {
        isStreaming: false,
        command: false
      };
    }

    const shouldStart = status.commandPending;
    status.commandPending = false;

    // Cập nhật lại streamUrl nếu IP của device đổi
    const ip = this.getDeviceIp(deviceId) || deviceId;
    status.streamUrl = `http://${ip}:81/stream`;

    return {
      isStreaming: status.isStreaming,
      command: shouldStart,
      status
    };
  }

  // Clear all streams (for maintenance)
  async clearAllStreams() {
    this.streamStatus = {};
    console.log('[STREAM] All streams cleared');
  }
}


module.exports = new ImageProcessingService();