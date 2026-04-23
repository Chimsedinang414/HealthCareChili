# HealthCareTree - IoT Plant Health Monitoring System

A comprehensive IoT system for monitoring plant health using sensors, AI analysis, and web dashboard.

## System Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  ESP32-CAM  │────▶│  Python API  │────▶│  YOLO11     │
│  (Camera)   │     │  Server      │     │  Model      │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
┌─────────────┐           │           ┌─────────────┐
│  Sensors    │───────────┴──────────▶│  Frontend   │
│  (DHT/Soil) │                         │  Dashboard  │
└─────────────┘                         └─────────────┘
```

## Components

### 1. Firmware (Arduino/ESP32)

| File | Mô tả |
|------|-------|
| [firmware/main.ino](firmware/main.ino) | ESP32-CAM chụp ảnh → gửi lên server |
| [firmware/config.h](firmware/config.h) | Cấu hình WiFi, server, camera |
| [firmware/sensors/](firmware/sensors/) | DHT22, Soil moisture sensors |
| [firmware/network/](firmware/network/) | WiFi, MQTT communication |

### 2. Backend (Python/Flask)

| File | Mô tả |
|------|-------|
| [src/backend/server_yolo.py](src/backend/server_yolo.py) | Python API server với YOLO11 |
| [model_AI/train_yolo.py](model_AI/train_yolo.py) | Script train YOLO11 model |
| [model_AI/requirements.txt](model_AI/requirements.txt) | Python dependencies |

### 3. Frontend (HTML/CSS/JS)

| File | Mô tả |
|------|-------|
| [src/frontend/index.html](src/frontend/index.html) | Main dashboard |
| [src/frontend/js/api.js](src/frontend/js/api.js) | API communication |
| [src/frontend/js/chart.js](src/frontend/js/chart.js) | Data visualization |

### 4. AI Model (YOLO11)

| File | Mô tả |
|------|-------|
| [model_AI/train_yolo.py](model_AI/train_yolo.py) | Training script |
| [model_AI/dataset/](model_AI/dataset/) | Training dataset |
| `plant_health_model.pt` | Trained YOLO11 model |

## Setup Instructions

### Prerequisites

- Python 3.8+
- Node.js (v16+)
- Arduino IDE
- ESP32-CAM module

### 1. AI Model Setup

```bash
# Cài đặt dependencies
cd d:\Project\HealthCareTree
pip install -r model_AI/requirements.txt

# Train model YOLO11
python model_AI/train_yolo.py
```

### 2. Backend Setup (Python API)

```bash
cd src/backend
python server_yolo.py
```

Server chạy tại `http://localhost:3000`

### 3. Frontend

Open [src/frontend/index.html](src/frontend/index.html) in a web browser.

### 4. Firmware ESP32-CAM

Sửa [firmware/config.h](firmware/config.h) với WiFi credentials:
```cpp
#define WIFI_SSID "Your_WiFi_SSID"
#define WIFI_PASSWORD "Your_WiFi_Password"
#define SERVER_HOST "192.168.x.x"  // IP server
```

Upload [firmware/main.ino](firmware/main.ino) lên ESP32-CAM qua Arduino IDE.

## API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/image/predict` | Nhận ảnh → nhận diện bệnh |
| POST | `/api/image/init` | Khởi tạo YOLO model |
| GET | `/api/image/status` | Kiểm tra trạng thái model |
| GET | `/` | API status |

## Dataset Structure

```
model_AI/dataset/peppers/
├── bacterial_spot/      # Bệnh đốm vi khuẩn
│   ├── images/
│   ├── csv/
│   └── json/
├── healthy/             # Cây khỏe mạnh
├── leaf_curl_virus/     # Bệnh lá cuộn
└── labelmap.json
```

## Supported Diseases

- **bacterial_spot** - Đốm vi khuẩn
- **healthy** - Khỏe mạnh
- **leaf_curl_virus** - Virus lá cuộn

## Project Status

✅ **AI Model**: YOLO11 trained and ready
✅ **Backend**: Python Flask API operational
✅ **ESP32-CAM Firmware**: Implemented
⚠️ **Frontend**: Dashboard in progress
⚠️ **Sensor Integration**: Pending

## Hardware Architecture

### 1. ESP32-CAM System

```
┌─────────────────────────────────────────────────────────────┐
│                      ESP32-CAM                               │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐                 │
│  │ OV2640  │───▶│  ESP32  │───▶│  WiFi   │                  │
│  │ Camera  │    │  MCU    │    │ Module  │                  │
│  └─────────┘    └─────────┘    └─────────┘                 │
│       │               │               │                     │
│       │               │               │                     │
│   GPIO 0-13       GPIO 4-5        Antenna                  │
└─────────────────────────────────────────────────────────────┘
            │                    │
            ▼                    ▼
     ┌──────────┐        ┌──────────────┐
     │  5V Power │        │  Python API  │
     │  (USB)    │        │  Server      │
     └──────────┘        └──────────────┘
```

### 2. Sensor Module (Arduino Nano/Uno)

```
┌─────────────────────────────────────────────────────────────┐
│                     Arduino Nano                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    ATmega328P                        │   │
│  │  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────────┐   │   │
│  │  │DHT22│  │Soil │  │Pump │  │LED  │  │ESP8266  │   │   │
│  │  │Temp │  │Moist│  │Relay│  │Status│  │WiFi    │   │   │
│  │  └──┬──┘  └──┬──┘  └──┬──┘  └──┬──┘  └──┬────┘   │   │
│  │     │        │        │        │        │         │   │
│  │  D2 │     A0 │     D7 │     D13│     D10-D12     │   │
│  └─────┴────────┴────────┴────────┴────────┴─────────┘   │
└─────────────────────────────────────────────────────────────┘
        │            │          │         │          │
        ▼            ▼          ▼         ▼          ▼
    ┌───────┐   ┌────────┐ ┌───────┐ ┌───────┐ ┌─────────┐
    │ 5V    │   │ 3.3V   │ │ 5V    │ │ 5V    │ │ 3.3V   │
    │ Power │   │ Power  │ │ Power │ │ Power │ │ Power   │
    └───────┘   └────────┘ └───────┘ └───────┘ └─────────┘
```

### 3. Complete System Wiring

```
                    ┌─────────────────┐
                    │   Power Supply  │
                    │   5V/2A (USB)   │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
    ┌─────────┐        ┌─────────┐        ┌─────────┐
    │ ESP32-  │        │ Arduino │        │  5V     │
    │ CAM     │        │  Nano   │        │ Relay   │
    │         │        │         │        │ Module  │
    │         │        │         │        │         │
    │ CAM→IO0 │        │DHT22→D2 │        │D7→IN    │
    │ WiFi    │        │Soil→A0  │        │         │
    │ Antenna │        │LED→D13  │        │         │
    └────┬────┘        └────┬────┘        └────┬────┘
         │                   │                   │
         │         ┌────────┴────────┐          │
         │         │   Breadboard   │          │
         │         │   + Power Bus   │          │
         │         └─────────────────┘          │
         │                   │                   │
         └───────────────────┼───────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   WiFi Router   │
                    │   192.168.x.1   │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
    ┌─────────┐        ┌─────────┐        ┌─────────┐
    │  PC/    │        │  Python │        │  Phone  │
    │ Laptop  │        │  Server │        │  (App)  │
    │         │        │ :3000   │        │         │
    └─────────┘        └─────────┘        └─────────┘
```

### 4. Pin Connections Detail

| Device | Pin | Arduino Pin | Description |
|--------|-----|-------------|-------------|
| DHT22 | VCC | 5V | Temperature sensor |
| DHT22 | GND | GND | Ground |
| DHT22 | DATA | D2 | Data pin |
| Soil Sensor | VCC | 5V | Moisture sensor |
| Soil Sensor | GND | GND | Ground |
| Soil Sensor | AOUT | A0 | Analog output |
| LED | Anode | D13 | Status LED |
| LED | Cathode | GND | Ground |
| Relay Module | VCC | 5V | Water pump control |
| Relay Module | GND | GND | Ground |
| Relay Module | IN | D7 | Control signal |
| ESP8266 | VCC | 3.3V | WiFi module |
| ESP8266 | GND | GND | Ground |
| ESP8266 | TX | D10 | Serial TX |
| ESP8266 | RX | D11 | Serial RX |

## Contributing

1. Complete frontend dashboard
2. Integrate sensor data with AI predictions
3. Add real-time notifications
4. Implement historical data analysis
