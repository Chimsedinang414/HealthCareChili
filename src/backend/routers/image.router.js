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
router.post('/predict', upload.single('image'), imageController.predictDisease);
router.get('/status', imageController.getModelStatus);
router.post('/init-model', imageController.initializeModel);

module.exports = router;