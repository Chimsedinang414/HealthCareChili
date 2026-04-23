#include <WiFi.h>
#include <HTTPClient.h>
#include <esp32-camera.h>
#include "config.h"

// Biến toàn cục
bool cameraInit = false;
unsigned long lastUpload = 0;

// Khởi tạo camera
bool initCamera()
{
    camera_config_t config;
    config.ledc_channel = LEDC_CHANNEL_0;
    config.ledc_timer = LEDC_TIMER_0;
    config.pin_d0 = Y2_GPIO_NUM;
    config.pin_d1 = Y3_GPIO_NUM;
    config.pin_d2 = Y4_GPIO_NUM;
    config.pin_d3 = Y5_GPIO_NUM;
    config.pin_d4 = Y6_GPIO_NUM;
    config.pin_d5 = Y7_GPIO_NUM;
    config.pin_d6 = Y8_GPIO_NUM;
    config.pin_d7 = Y9_GPIO_NUM;
    config.pin_xclk = XCLK_GPIO_NUM;
    config.pin_pclk = PCLK_GPIO_NUM;
    config.pin_vsync = VSYNC_GPIO_NUM;
    config.pin_href = HREF_GPIO_NUM;
    config.pin_sscb_sda = SIOD_GPIO_NUM;
    config.pin_sscb_scl = SIOC_GPIO_NUM;
    config.pin_reset = RESET_GPIO_NUM;
    config.pin_pwdn = PWDN_GPIO_NUM;
    config.xclk_freq = 20000000;
    config.frame_size = FRAME_SIZE;
    config.jpeg_quality = JPEG_QUALITY;
    config.fb_count = 2;

    esp_err_t err = esp_camera_init(&config);
    if (err != ESP_OK)
    {
        Serial.printf("Camera init failed with error 0x%x\n", err);
        return false;
    }

    cameraInit = true;
    Serial.println("Camera initialized successfully");
    return true;
}

// Kết nối WiFi
bool connectWiFi()
{
    Serial.println("Connecting to WiFi...");
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    unsigned long startAttempt = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - startAttempt < WIFI_TIMEOUT)
    {
        delay(500);
        Serial.print(".");
    }

    if (WiFi.status() == WL_CONNECTED)
    {
        Serial.println("\nWiFi connected");
        Serial.print("IP Address: ");
        Serial.println(WiFi.localIP());
        return true;
    }
    else
    {
        Serial.println("\nWiFi connection failed");
        return false;
    }
}

// Gửi ảnh lên server
bool uploadImage(camera_fb_t *fb)
{
    if (fb == nullptr || fb->buf == nullptr)
    {
        Serial.println("No image to upload");
        return false;
    }

    HTTPClient http;
    String url = "http://" + String(SERVER_HOST) + ":" + String(SERVER_PORT) + String(SERVER_PATH);

    http.begin(url);
    http.addHeader("Content-Type", "image/jpeg");

    Serial.println("Uploading image to server...");
    Serial.println("URL: " + url);

    int httpCode = http.POST(fb->buf, fb->len);

    if (httpCode > 0)
    {
        String response = http.getString();
        Serial.printf("HTTP Response code: %d\n", httpCode);
        Serial.println("Server response: " + response);

        http.end();
        return httpCode == 200;
    }
    else
    {
        Serial.printf("HTTP POST failed, error: %s\n", http.errorToString(httpCode).c_str());
        http.end();
        return false;
    }
}

// Chụp và gửi ảnh
void captureAndUpload()
{
    if (!cameraInit)
    {
        Serial.println("Camera not initialized");
        return;
    }

    // Chụp ảnh
    camera_fb_t *fb = esp_camera_fb_get();
    if (!fb)
    {
        Serial.println("Camera capture failed");
        return;
    }

    Serial.printf("Image captured: %d bytes\n", fb->len);

    // Gửi ảnh lên server
    bool success = uploadImage(fb);

    // Trả ảnh về buffer
    esp_camera_fb_return(fb);

    if (success)
    {
        Serial.println("Image uploaded successfully");
    }
    else
    {
        Serial.println("Image upload failed");
    }
}

void setup()
{
    Serial.begin(115200);
    delay(1000);

    Serial.println("\n=== ESP32-CAM Plant Disease Detection ===\n");

    // Khởi tạo camera
    if (!initCamera())
    {
        Serial.println("Failed to initialize camera");
        return;
    }

    // Kết nối WiFi
    if (!connectWiFi())
    {
        Serial.println("Failed to connect to WiFi");
        return;
    }

    // Gửi ảnh đầu tiên sau khi khởi động
    delay(2000);
    captureAndUpload();

    lastUpload = millis();
}

void loop()
{
    // Kiểm tra kết nối WiFi
    if (WiFi.status() != WL_CONNECTED)
    {
        Serial.println("WiFi disconnected, reconnecting...");
        connectWiFi();
    }

    // Gửi ảnh theo chu kỳ
    if (millis() - lastUpload > UPLOAD_INTERVAL)
    {
        captureAndUpload();
        lastUpload = millis();
    }

    delay(1000);
}