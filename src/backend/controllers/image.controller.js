const imageService = require('../services/image.service');

// ─── ESP32-CAM GỬI ẢNH LÊN ──────────────────────────────────────────────────

exports.predictDisease = async (req, res) => {
  const startTime = Date.now();
  try {
    // Nhận raw binary body (ESP32 gửi thẳng JPEG bytes)
    if (!req.body || req.body.length === 0) {
      return res.status(400).json({ success: false, error: 'No image provided' });
    }

    const imageBuffer = req.body;
    const deviceId = req.query.deviceId || 'ESP32-CAM-01';

    // Cập nhật IP thiết bị
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    imageService.updateDeviceIp(deviceId, clientIp);

    console.log(`[${new Date().toISOString()}] Image from ${deviceId} (${imageBuffer.length} bytes)`);

    const result = await imageService.predictWithYolo(imageBuffer, deviceId);

    const processingTime = Date.now() - startTime;

    // Trả kết quả nhỏ gọn cho ESP32 
    return res.json({
      success: true,
      disease: result.disease,
      confidence: result.confidence,
      count: result.allPredictions.length,
      alert: result.prediction.alert,
      alertMessage: result.prediction.alertMessage,
      processingTime,
      timestamp: result.prediction.timestamp
    });

  } catch (error) {
    console.error('predictDisease error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ─── FRONTEND POLLING: lấy ảnh + kết quả mới nhất ──────────────────────────

exports.getLatestFrame = async (req, res) => {
  try {
    const deviceId = req.query.deviceId || 'ESP32-CAM-01';
    const cached = imageService.getLatestResult(deviceId);

    if (!cached) {
      return res.json({ success: true, hasData: false, message: 'Chưa có ảnh nào' });
    }

    return res.json({
      success: true,
      hasData: true,
      image_base64: cached.image_base64,   // ảnh đã vẽ bbox
      predictions: cached.predictions,
      disease: cached.disease,
      confidence: cached.confidence,
      count: cached.count,
      alert: cached.alert,
      alertMessage: cached.alertMessage,
      timestamp: cached.timestamp
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ─── LỊCH SỬ & THỐNG KÊ ────────────────────────────────────────────────────

exports.getPredictionHistory = async (req, res) => {
  try {
    const deviceId = req.query.deviceId || 'ESP32-CAM-01';
    const limit = parseInt(req.query.limit) || 50;
    const result = await imageService.getPredictionHistory(deviceId, limit);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.getLatestPrediction = async (req, res) => {
  try {
    const deviceId = req.query.deviceId || 'ESP32-CAM-01';
    const result = await imageService.getLatestPrediction(deviceId);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.getStatistics = async (req, res) => {
  try {
    const deviceId = req.query.deviceId || 'ESP32-CAM-01';
    const days = parseInt(req.query.days) || 7;
    const result = await imageService.getStatistics(deviceId, days);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.getModelStatus = async (req, res) => {
  return res.json({
    initialized: true,
    labels: imageService.labels,
    version: '1.0',
    modelType: 'YOLO11'
  });
};

// ─── CAPTURE COMMANDS ───────────────────────────────────────────────────────

// Web → gửi lệnh chụp ngay
exports.sendCaptureCommand = async (req, res) => {
  try {
    const deviceId = req.query.deviceId || 'ESP32-CAM-01';
    const result = await imageService.sendCaptureCommand(deviceId);
    console.log(`📸 Capture command → ${deviceId}`);
    return res.json({ success: true, message: `Capture command sent to ${deviceId}`, ...result });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ESP32 → hỏi có lệnh chụp không
exports.checkCaptureCommand = async (req, res) => {
  try {
    const deviceId = req.query.deviceId || 'ESP32-CAM-01';
    
    // Cập nhật IP thiết bị
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    imageService.updateDeviceIp(deviceId, clientIp);

    const result = await imageService.checkCaptureCommand(deviceId);
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ESP32 → xóa lệnh sau khi thực hiện
exports.clearCaptureCommand = async (req, res) => {
  try {
    const deviceId = req.query.deviceId || 'ESP32-CAM-01';
    const commandId = req.query.commandId;
    await imageService.clearCaptureCommand(deviceId, commandId);
    return res.json({ success: true, message: 'Capture command cleared' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ─── STREAM MAN

// Web -> bật stream
exports.startStream =
async (req,res)=>{

try{

 const deviceId =
 req.query.deviceId ||
 "ESP32-CAM-01";

 const status =
 await imageService
 .getStreamStatus(
 deviceId
 );

 if(status.isStreaming){

   return res.json({

     success:true,

     message:
     "already streaming"

   });

 }

 const result =
 await imageService
 .startStream(
 deviceId
 );

 console.log(
 `STREAM ON ${deviceId}`
 );

 return res.json({

 success:true,

 ...result

 });

}catch(error){

 return res.status(500)
 .json({

 success:false,

 error:error.message

 });

}

}

// Web → tắt stream
exports.stopStream =
async (req,res)=>{

try{

 const deviceId =
 req.query.deviceId ||
 "ESP32-CAM-01";

 const status =
 await imageService
 .getStreamStatus(
 deviceId
 );

 if(!status.isStreaming){

   return res.json({

     success:true,

     message:
     "already stopped"

   });

 }

 await imageService
 .stopStream(
 deviceId
 );

 return res.json({

 success:true

 });

}catch(error){

 return res.status(500)
 .json({

 success:false,

 error:error.message

 });

}

}

// ESP32 / check stream có bật không
exports.getStreamStatus = async (req, res) => {
  try {
    const deviceId = req.query.deviceId || 'ESP32-CAM-01';
    
    // Cập nhật IP thiết bị
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    imageService.updateDeviceIp(deviceId, clientIp);

    const result = await imageService.getStreamStatus(deviceId);
    return res.json({
      success: true,
      stream: result.isStreaming,
      status: result.isStreaming ? 'active' : 'inactive',
      streamUrl: result.status ? result.status.streamUrl : null,
      timestamp: new Date()
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};