# 🌱 HealthCareTree - Hướng dẫn tích hợp Camera ESP32 với AI

Tài liệu này hướng dẫn cách tích hợp camera ESP32 để chụp ảnh tự động mỗi giờ và xử lý với model AI trên server.

## 📋 Mục lục

1. [Kiến trúc hệ thống](#kiến-trúc-hệ-thống)
2. [Chuẩn bị phần cứng](#chuẩn-bị-phần-cứng)
3. [Cài đặt firmware ESP32](#cài-đặt-firmware-esp32)
4. [Cài đặt Backend](#cài-đặt-backend)
5. [Cài đặt Frontend](#cài-đặt-frontend)
6. [Chạy hệ thống](#chạy-hệ-thống)
7. [Kiểm tra và gỡ lỗi](#kiểm-tra-và-gỡ-lỗi)

---

## 🏗️ Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────────────┐
│                      ESP32-CAM                              │
│  • Chụp ảnh tự động mỗi 1 giờ                             │
│  • Kết nối WiFi                                            │
│  • Gửi ảnh JPEG đến Server                               │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP POST /api/image/predict
                     │ Ảnh JPEG (multipart/form-data)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Node.js Backend Server                         │
│  • Nhận ảnh từ ESP32                                       │
│  • Gọi Python script xử lý YOLO                          │
│  • Lưu kết quả vào MongoDB                               │
│  • Gửi response về ESP32                                  │
└────────────────────┬────────────────────────────────────────┘
                     │ JSON Response
                     │ { disease, confidence, alert }
                     ▼
┌─────────────────────────────────────────────────────────────┐
│             Python YOLO Backend                             │
│  • Xử lý ảnh với model plant_health_model.pt              │
│  • Nhận diện bệnh: healthy/bacterial_spot/leaf_curl_virus │
│  • Trả về JSON kết quả                                    │
└─────────────────────────────────────────────────────────────┘

                     │ Lưu vào DB
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              MongoDB Database                              │
│  • Lưu lịch sử dự đoán                                    │
│  • Lưu thống kê                                           │
│  • Lưu cảnh báo                                           │
└─────────────────────────────────────────────────────────────┘

                     │ HTTP GET /api/image/*
                     ▼
┌─────────────────────────────────────────────────────────────┐
│           Web Browser Frontend                              │
│  • Hiển thị kết quả nhận diện mới nhất                    │
│  • Hiển thị lịch sử dự đoán                               │
│  • Hiển thị thống kê bệnh                                 │
│  • Cảnh báo thời gian thực                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Chuẩn bị phần cứng

### Yêu cầu

- **ESP32-S3 CAM** (hoặc ESP32-CAM)
- **Camera OV2640** (thường đi kèm)
- **Nguồn 5V**
- **Cáp USB-C** để lập trình
- **WiFi** (2.4GHz)

### Kết nối chân

Xem file `firmware/config.h` để biết chi tiết kết nối camera.

---

## 📱 Cài đặt firmware ESP32

### Bước 1: Chuẩn bị IDE

1. Cài đặt Arduino IDE từ https://www.arduino.cc/en/software
2. Thêm board ESP32:
   - File → Preferences
   - Thêm URL: `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
   - Tools → Board Manager → Tìm "ESP32" → Install

### Bước 2: Cài đặt thư viện

Trong Arduino IDE, cài đặt các thư viện:

- **esp32 (by Espressif Systems)** - Board support
- **Arduino HTTP Client**
- **Arduino JSON** (nếu cần)

### Bước 3: Cấu hình ESP32

Chỉnh sửa `firmware/config.h`:

```cpp
#define WIFI_SSID "HA"              // Tên WiFi của bạn
#define WIFI_PASSWORD "23072004"    // Password WiFi
#define SERVER_HOST "192.168.209.100"  // IP Server (thay đổi theo mạng của bạn)
#define SERVER_PORT 3000            // Port server
#define CAPTURE_INTERVAL 3600000    // 1 giờ (ms)
```

### Bước 4: Nạp firmware

1. Mở `firmware/main.ino` trong Arduino IDE
2. Chọn Tools → Board: "ESP32-S3-DevKitC-1"
3. Chọn Port COM
4. Click Upload

### Bước 5: Kiểm tra

- Mở Serial Monitor (9600 baud)
- Reset ESP32
- Xem log:

```
Camera initialized successfully
WiFi connected
IP Address: 192.168.x.x
[HOURLY CAPTURE] Starting automated image capture...
Image captured: XXXXX bytes
Uploading image to server...
HTTP Response code: 200
Server response: {"success":true,...}
```

---

## 🖥️ Cài đặt Backend

### Bước 1: Cài đặt Node.js

Cần Node.js v14+ từ https://nodejs.org

### Bước 2: Cài đặt dependencies

```bash
cd src/backend
npm install
```

**Packages chính:**

- `express` - Web framework
- `mongoose` - MongoDB
- `multer` - File upload
- `cors` - Cross-origin
- `python-shell` - Gọi Python từ Node.js

### Bước 3: Cấu hình MongoDB

Tạo file `.env` trong `src/backend/`:

```env
MONGODB_URI=mongodb://localhost:27017/healthcaretree
PORT=3000
```

Hoặc sử dụng MongoDB Atlas (cloud):

```env
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/healthcaretree
PORT=3000
```

### Bước 4: Cài đặt Python + YOLO

```bash
# Tạo virtual environment Python
python -m venv venv

# Kích hoạt (Windows)
venv\Scripts\activate

# Kích hoạt (Linux/Mac)
source venv/bin/activate

# Cài đặt packages
pip install ultralytics torch opencv-python
```

### Bước 5: Kiểm tra model YOLO

```bash
# Model sẽ tự động download lần đầu
python -c "from ultralytics import YOLO; model = YOLO('yolo11n.pt'); print('YOLO loaded successfully')"
```

---

## 🌐 Cài đặt Frontend

### Bước 1: Cập nhật API URL

Mở `src/frontend/js/api.js`:

```javascript
const API_BASE_URL = "http://192.168.209.100:3000/api"; // Đổi IP theo server của bạn
```

### Bước 2: Khởi động server frontend

```bash
cd src/frontend
# Dùng Python SimpleHTTPServer
python -m http.server 8000

# Hoặc dùng Live Server trong VS Code
```

### Bước 3: Truy cập

- Mở browser: `http://localhost:8000` hoặc `http://192.168.209.100:8000`

---

## 🚀 Chạy hệ thống

### Bước 1: Khởi động MongoDB

```bash
# Nếu cài đặt locally
mongod

# Hoặc sử dụng MongoDB Atlas (cloud)
```

### Bước 2: Khởi động Backend

```bash
cd src/backend
npm start
```

**Output kỳ vọng:**

```
Connected to MongoDB
Server running on port 3000
[12:30:45] GET /api/image/status
```

### Bước 3: Khởi động Frontend

```bash
cd src/frontend
python -m http.server 8000
```

### Bước 4: Kiểm tra ESP32

- Restart ESP32 hoặc chờ chu kỳ chụp tiếp theo
- Log sẽ show "Image uploaded successfully"
- Lưu ý: Chụp ảnh đầu tiên sau 2 giây boot, sau đó mỗi 1 giờ

---

## 🔍 Kiểm tra và Gỡ lỗi

### ✅ Kiểm tra kết nối ESP32

```bash
# Terminal
curl http://192.168.209.100:3000/api/image/status

# Response kỳ vọng:
# {"initialized":true,"labels":["bacterial_spot","healthy","leaf_curl_virus"],"modelType":"YOLO11"}
```

### ✅ Kiểm tra gửi ảnh

```bash
# Gửi test ảnh
curl -X POST -F "image=@test.jpg" http://192.168.209.100:3000/api/image/predict

# Response:
# {"success":true,"disease":"healthy","confidence":0.95,...}
```

### ✅ Kiểm tra lịch sử

```bash
curl http://192.168.209.100:3000/api/image/latest

curl http://192.168.209.100:3000/api/image/history?limit=10

curl http://192.168.209.100:3000/api/image/statistics?days=7
```

### 🐛 Gỡ lỗi phổ biến

| Vấn đề                   | Nguyên nhân          | Giải pháp                          |
| ------------------------ | -------------------- | ---------------------------------- |
| ESP32 không kết nối WiFi | SSID/Password sai    | Kiểm tra config.h, reset ESP32     |
| Không gửi được ảnh       | Server không chạy    | Khởi động `npm start` backend      |
| YOLO error               | Model không download | Chạy `pip install ultralytics` lại |
| Ảnh mờ                   | Camera bị mặc        | Ngoài ứng dụng, lấy lại được ảnh   |
| Dự đoán sai              | Model cần retrain    | Cần thêm dữ liệu training          |
| Không hiển thị trên web  | CORS error           | Kiểm tra server.js có `CORS()`     |

### 🔧 Kiểm tra logs

**ESP32 Serial Monitor:**

```
Baud rate: 115200
Xem log từ camera initialization
```

**Backend Console:**

```
npm start
Xem request logs, errors
```

**Browser Console:**

```
F12 → Console
Xem network requests, JavaScript errors
```

---

## 📊 API Endpoints

### Predict (nhận diện bệnh)

```
POST /api/image/predict
Content-Type: multipart/form-data
Body: image=<JPG file>
Query: ?deviceId=ESP32-CAM-01

Response:
{
  "success": true,
  "disease": "healthy",
  "confidence": 0.95,
  "alert": false,
  "alertMessage": "Cây khỏe mạnh ✓",
  "processingTime": 234,
  "timestamp": "2024-04-24T10:30:00.000Z"
}
```

### Lấy dự đoán gần nhất

```
GET /api/image/latest?deviceId=ESP32-CAM-01

Response: { prediction: {...} }
```

### Lấy lịch sử

```
GET /api/image/history?deviceId=ESP32-CAM-01&limit=50

Response: { predictions: [...] }
```

### Lấy thống kê

```
GET /api/image/statistics?deviceId=ESP32-CAM-01&days=7

Response:
{
  "totalSamples": 42,
  "diseaseCounts": [
    { "_id": "healthy", "count": 38, "avgConfidence": 0.92 },
    { "_id": "bacterial_spot", "count": 4, "avgConfidence": 0.78 }
  ],
  "alerts": 4
}
```

### Model Status

```
GET /api/image/status

Response:
{
  "initialized": true,
  "labels": ["bacterial_spot", "healthy", "leaf_curl_virus"],
  "modelType": "YOLO11"
}
```

---

## 📝 Ghi chú quan trọng

### 🎯 Tính năng

✅ Chụp ảnh tự động mỗi 1 giờ
✅ Nhận diện bệnh trong vòng 1-2 giây
✅ Lưu lịch sử → truy vấn thống kê
✅ Cảnh báo thời gian thực
✅ Giao diện web thân thiện

### ⚙️ Điều chỉnh

- **Thay đổi chu kỳ chụp:** Sửa `CAPTURE_INTERVAL` trong `config.h`
- **Thay đổi chất lượng ảnh:** Sửa `JPEG_QUALITY` (0=cao, 63=thấp)
- **Thay đổi model YOLO:** Tải model khác từ Ultralytics

### 🔐 Bảo mật (cho production)

- Thêm authentication (JWT)
- Sử dụng HTTPS
- Kiểm tra file upload size
- Rate limiting

### 📈 Tối ưu hóa

- Nén ảnh trước khi gửi
- Cache model YOLO
- Batch processing cho nhiều ảnh
- Async processing

---

## 📞 Support

Gặp vấn đề? Kiểm tra:

1. Logs (ESP32, Backend, Browser)
2. Kết nối mạng (ping server)
3. MongoDB connection
4. Model file tồn tại

---

**Chúc bạn thành công! 🌿**
