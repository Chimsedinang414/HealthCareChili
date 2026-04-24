#ifndef CONFIG_H
#define CONFIG_H

// WiFi Configuration
#define WIFI_SSID "HA"
#define WIFI_PASSWORD "23072004"

// Server Configuration
#define SERVER_HOST "192.168.209.100"
#define SERVER_PORT 3000
#define SERVER_PATH "/api/image/predict"

// Camera Configuration
#define CAMERA_MODEL_ESP32S3
#define PWDN_GPIO_NUM -1
#define RESET_GPIO_NUM -1
#define XCLK_GPIO_NUM 15
#define SIOD_GPIO_NUM 4
#define SIOC_GPIO_NUM 5

#define Y9_GPIO_NUM 16
#define Y8_GPIO_NUM 17
#define Y7_GPIO_NUM 18
#define Y6_GPIO_NUM 12
#define Y5_GPIO_NUM 10
#define Y4_GPIO_NUM 8
#define Y3_GPIO_NUM 9
#define Y2_GPIO_NUM 11
#define VSYNC_GPIO_NUM 6
#define HREF_GPIO_NUM 7
#define PCLK_GPIO_NUM 13

// Image Settings
#define JPEG_QUALITY 10          // Chất lượng ảnh (0-63, thấp hơn = chất lượng cao hơn)
#define FRAME_SIZE FRAMESIZE_VGA // VGA: 640x480

// Timing
#define UPLOAD_INTERVAL 30000 // Gửi ảnh mỗi 30 giây
#define WIFI_TIMEOUT 10000    // Timeout kết nối WiFi

#endif