#include <WiFi.h>
#include <HTTPClient.h>
#include "esp_camera.h"
#include "config.h"

// ===== GLOBAL =====
bool cameraInit = false;
bool isStreaming = false;

unsigned long lastUpload = 0;
unsigned long lastCommandCheck = 0;
unsigned long lastStreamCheck = 0;

#define COMMAND_CHECK_INTERVAL 5000
#define STREAM_CHECK_INTERVAL 5000
#define MAX_RETRY 2
extern void startCameraServer();

// ===== CAMERA INIT =====
bool initCamera() {
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

  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;

  config.xclk_freq_hz = 20000000;
  config.frame_size = FRAME_SIZE;
  config.pixel_format = PIXFORMAT_JPEG;

  config.jpeg_quality = JPEG_QUALITY;
  config.fb_count = 1;

  esp_err_t err = esp_camera_init(&config);

  if (err != ESP_OK) {
    Serial.printf("Camera init failed: 0x%x\n", err);
    return false;
  }

  Serial.println("Camera OK");
  cameraInit = true;
  return true;
}

// ===== WIFI =====
bool connectWiFi() {
  Serial.println("Connecting WiFi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long start = millis();

  while (WiFi.status() != WL_CONNECTED && millis() - start < WIFI_TIMEOUT) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi OK");
    Serial.println(WiFi.localIP());
    return true;
  }

  Serial.println("\nWiFi FAIL");
  return false;
}

// ===== STREAM CONTROL =====
bool checkStreamMode() {
  if (WiFi.status() != WL_CONNECTED)
    return false;

  HTTPClient http;
  String url = "http://" + String(SERVER_HOST) + ":" + String(SERVER_PORT) + "/api/image/stream/status";

  http.begin(url);
  http.setTimeout(3000);

  int code = http.GET();

  if (code > 0) {
    String res = http.getString();
    http.end();

    return res.indexOf("\"stream\":true") >= 0;
  }

  http.end();
  return false;
}

// ===== UPLOAD =====
bool uploadImage(camera_fb_t *fb) {
  if (!fb || !fb->buf)
    return false;

  if (WiFi.status() != WL_CONNECTED)
    return false;

  HTTPClient http;

  String url = "http://" + String(SERVER_HOST) + ":" + String(SERVER_PORT) + String(SERVER_PATH) + "?deviceId=ESP32-CAM-01";

  http.begin(url);
  http.setTimeout(UPLOAD_TIMEOUT);
  http.addHeader("Content-Type", "image/jpeg");

  int code = http.POST(fb->buf, fb->len);

  http.end();

  return (code == 200);
}

// ===== COMMAND CHECK =====
bool checkForCaptureCommand() {
  if (WiFi.status() != WL_CONNECTED)
    return false;

  HTTPClient http;

  String url = "http://" + String(SERVER_HOST) + ":" + String(SERVER_PORT) + "/api/image/capture/check?deviceId=ESP32-CAM-01";

  http.begin(url);
  http.setTimeout(5000);

  int code = http.GET();

  if (code > 0) {
    String res = http.getString();
    http.end();

    return res.indexOf("\"shouldCapture\":true") >= 0;
  }

  http.end();
  return false;
}

// ===== CLEAR COMMAND =====
void clearCaptureCommand() {
  HTTPClient http;

  String url = "http://" + String(SERVER_HOST) + ":" + String(SERVER_PORT) + "/api/image/capture/clear?deviceId=ESP32-CAM-01";

  http.begin(url);
  http.setTimeout(5000);

  http.sendRequest("DELETE", "");
  http.end();
}

// ===== CAPTURE =====
void captureAndUpload() {
  if (!cameraInit)
    return;

  camera_fb_t *fb = esp_camera_fb_get();

  if (!fb) {
    Serial.println("Capture fail");
    return;
  }

  bool success = false;

  for (int i = 0; i < MAX_RETRY && !success; i++) {
    success = uploadImage(fb);
    yield();
  }

  esp_camera_fb_return(fb);

  Serial.println(success ? "Upload OK" : "Upload FAIL");
}

// ===== SETUP =====
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n=== ESP32-CAM START ===\n");

  if (!initCamera())
    return;

  if (!connectWiFi())
    return;

  delay(2000);

  captureAndUpload();
  lastUpload = millis();
}

// ===== LOOP =====
void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  // ===== CHECK STREAM MODE =====
  if (millis() - lastStreamCheck > STREAM_CHECK_INTERVAL) {
    bool streamNow = checkStreamMode();

    if (streamNow && !isStreaming) {
      Serial.println("START STREAM");
      startCameraServer();  // cần include camera_web_server nếu dùng
      isStreaming = true;
    }

    if (!streamNow && isStreaming) {
      Serial.println("STOP STREAM -> RESTART");
      ESP.restart();
    }

    lastStreamCheck = millis();
  }

  // ===== NORMAL MODE =====
  if (!isStreaming) {
    // check command
    if (millis() - lastCommandCheck > COMMAND_CHECK_INTERVAL) {
      if (checkForCaptureCommand()) {
        captureAndUpload();
        clearCaptureCommand();
        lastUpload = millis();
      }
      lastCommandCheck = millis();
    }

    // auto capture
    if (millis() - lastUpload > CAPTURE_INTERVAL) {
      Serial.println("Auto capture...");
      captureAndUpload();
      lastUpload = millis();
    }
  }

  delay(1000);
}