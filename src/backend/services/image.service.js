const tf = require('@tensorflow/tfjs-node');
const fs = require('fs');
const path = require('path');

class ImageProcessingService {
  constructor() {
    this.model = null;
    this.labels = ['bacterial_spot', 'healthy', 'leaf_curl_virus'];
    this.isModelLoaded = false;
  }

  async loadModel(modelPath) {
    try {
      console.log('Loading AI model...');
      this.model = await tf.loadLayersModel(`file://${modelPath}`);
      this.isModelLoaded = true;
      console.log('AI model loaded successfully');
      return true;
    } catch (error) {
      console.error('Error loading model:', error);
      return false;
    }
  }

  async preprocessImage(imageBuffer) {
    // Chuyển đổi buffer thành tensor
    const image = tf.node.decodeJpeg(imageBuffer, 3);
    
    // Resize về kích thước model (224x224)
    const resized = tf.image.resizeBilinear(image, [224, 224]);
    
    // Normalize (0-1)
    const normalized = resized.div(255.0);
    
    // Thêm batch dimension
    const expanded = normalized.expandDims(0);
    
    // Giải phóng bộ nhớ
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
      
      // Dự đoán
      const prediction = this.model.predict(tensor);
      const probabilities = await prediction.data();
      
      // Giải phóng bộ nhớ tensor
      tensor.dispose();
      prediction.dispose();

      // Tìm nhãn có xác suất cao nhất
      let maxIndex = 0;
      let maxProbability = 0;
      
      for (let i = 0; i < probabilities.length; i++) {
        if (probabilities[i] > maxProbability) {
          maxProbability = probabilities[i];
          maxIndex = i;
        }
      }

      // Tạo kết quả chi tiết
      const results = this.labels.map((label, index) => ({
        label,
        confidence: probabilities[index]
      }));

      // Sắp xếp theo confidence giảm dần
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
}

module.exports = new ImageProcessingService();