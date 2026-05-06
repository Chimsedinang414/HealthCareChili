#ifndef CONFIG_H
#define CONFIG_H

// WiFi Configuration
#define WIFI_SSID "HAN"
#define WIFI_PASSWORD "23072004"

// Server Configuration
#define SERVER_HOST "192.168.1.14"
#define SERVER_PORT 3000
#define SERVER_PATH "/api/image/upload"

// Camera Configuration
#define CAMERA_MODEL_AI_THINKER
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27

#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

// Image Settings
#define JPEG_QUALITY 12         // Chất lượng ảnh (0-63, thấp hơn = chất lượng cao hơn)
#define FRAME_SIZE FRAMESIZE_QVGA // VGA: 640x480

// Timing
#define CAPTURE_INTERVAL 3600000 // Chụp ảnh mỗi 1 giờ (3600000ms)
#define UPLOAD_TIMEOUT 30000     // Timeout gửi ảnh
#define WIFI_TIMEOUT 10000       // Timeout kết nối WiFi

#endif