# HealthCareTree - IoT Plant Health Monitoring System

A comprehensive IoT system for monitoring plant health using sensors, AI analysis, and web dashboard.

## Components

### 1. Firmware (Arduino)

- Sensor data collection (DHT, soil moisture)
- WiFi connectivity
- MQTT communication with backend

### 2. Backend (Node.js/Express)

- REST API for sensor data
- MongoDB database integration
- Alert system for plant health issues

### 3. Frontend (HTML/CSS/JS)

- Real-time dashboard
- Sensor data visualization
- AI analysis results display

### 4. AI Model (Python/TensorFlow)

- Plant disease detection using MobileNetV2
- Trained on pepper plant dataset
- Real-time image analysis

## Setup Instructions

### Prerequisites

- Node.js (v16+)
- Python 3.8+
- MongoDB
- Arduino IDE

### Backend Setup

```bash
cd src/backend
npm install
npm start
```

### AI Model Setup

```bash
cd model_AI
pip install -r requirements.txt
python train_ai.py  # Train the model
python test_webcam.py  # Test predictions
```

### Frontend

Open `src/frontend/index.html` in a web browser.

### Firmware

Upload `firmware/main.ino` to Arduino board.

## API Endpoints

- `GET /` - API status
- `GET /api/sensors` - Get sensor data

## Project Status

⚠️ **Work in Progress**: Core components implemented but integration incomplete.

## Contributing

1. Implement missing firmware components
2. Complete backend API endpoints
3. Add frontend data visualization
4. Integrate AI model with backend
