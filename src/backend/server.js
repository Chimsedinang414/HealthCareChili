const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Static files ─────────────────────────────────────────────────────────────
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors());

//  Raw body parser cho ESP32-CAM upload ảnh
// Router /api/image/upload đã có raw parser riêng, nhưng thêm ở đây để chắc chắn
app.use((req, res, next) => {
  if (
    req.path === '/api/image/upload' &&
    req.method === 'POST' &&
    req.headers['content-type'] &&
    req.headers['content-type'].startsWith('image/')
  ) {
    express.raw({ type: 'image/*', limit: '5mb' })(req, res, next);
  } else {
    next();
  }
});

// ─── JSON & URL-encoded
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Database ─────────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/healthcaretree', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✓ Connected to MongoDB'))
.catch(err => console.error('✗ MongoDB connection error:', err));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: 'HealthCareTree Backend API', version: '1.0' });
});

// Image (ESP32-CAM + nhận diện bệnh)
app.use('/api/image', require('./routers/image.router'));

// Sensor (ESP8266 DHT22 + soil + light)
try {
  app.use('/api/sensors', require('./routers/sensor.router'));
} catch (e) {
  console.warn('sensor.router chưa implement, bỏ qua.');
}

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✓ Server running on port ${PORT}`);
});