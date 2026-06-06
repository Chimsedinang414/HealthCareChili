const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// file tĩnh
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, '../frontend')));

// cors
app.use(cors());

// JSON URL
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// db mogodb
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/healthcaretree', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('✗ MongoDB connection error:', err));

// routers

app.use('/api/image', require('./routers/image.router'));

// Sensor (ESP8266 DHT22 + soil + light)
try {
  app.use('/api/sensors', require('./routers/sensor.router'));
} catch (e) {
  console.warn('sensor.router chưa implement, bỏ qua.');
}

// start
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});