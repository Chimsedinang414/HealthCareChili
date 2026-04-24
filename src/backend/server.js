const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Connect to MongoDB (placeholder)
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/healthcaretree', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Basic routes
app.get('/', (req, res) => {
  res.json({ message: 'HealthCareTree Backend API' });
});

app.get('/api/sensors', (req, res) => {
  // Placeholder for sensor data
  res.json({ sensors: [] });
});

// Image recognition routes
const imageRouter = require('./routers/image.router');
app.use('/api/image', imageRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});