#include <ESP8266WiFi.h>
#include <DHT.h>
#include <HTTPClient.h>

// ==================== CẤU HÌNH ====================
// WiFi Configuration
#define WIFI_SSID "HA"
#define WIFI_PASSWORD "23072004"

// Server Configuration
#define SERVER_HOST "192.168.209.100"
#define SERVER_PORT 3000
#define SERVER_PATH "/api/sensors/data"

// Pin Configuration
#define DHT_PIN D2     // DHT22 data pin
#define DHT_TYPE DHT22 // DHT22 sensor type
#define SOIL_PIN A0    // Soil moisture analog pin
#define LIGHT_PIN D1   // Light sensor digital pin (optional)

// Relay Configuration
#define RELAY_PIN D7        // Water pump relay
#define LED_PIN LED_BUILTIN // Status LED

// Timing
#define UPLOAD_INTERVAL 30000  // Gửi dữ liệu mỗi 30 giây
#define DHT_READ_INTERVAL 2000 // Đọc DHT mỗi 2 giây

// ==================== BIẾN TOÀN CỤC ====================
DHT dht(DHT_PIN, DHT_TYPE);

bool wifiConnected = false;
unsigned long lastUpload = 0;
unsigned long lastDHTRead = 0;

// Biến lưu trữ sensor data
float temperature = 0;
float humidity = 0;
int soilMoisture = 0;
int lightLevel = 0;

// ==================== HÀM KHỞI TẠO ====================
void setup()
{
    Serial.begin(115200);
    delay(1000);

    Serial.println("\n=== HealthCareTree Sensor Node ===\n");

    // Cấu hình chân IO
    pinMode(LED_PIN, OUTPUT);
    pinMode(RELAY_PIN, OUTPUT);
    pinMode(LIGHT_PIN, INPUT);
    pinMode(SOIL_PIN, INPUT);

    // Tắt relay ban đầu
    digitalWrite(RELAY_PIN, LOW);
    digitalWrite(LED_PIN, LOW);

    // Khởi tạo DHT sensor
    dht.begin();
    Serial.println("DHT22 sensor initialized");

    // Kết nối WiFi
    connectWiFi();

    Serial.println("\nSetup completed!");
}

void loop()
{
    // Kiểm tra kết nối WiFi
    if (WiFi.status() != WL_CONNECTED)
    {
        Serial.println("WiFi disconnected, reconnecting...");
        digitalWrite(LED_PIN, LOW);
        connectWiFi();
    }
    else
    {
        digitalWrite(LED_PIN, HIGH); // LED on when connected
    }

    unsigned long currentMillis = millis();

    // Đọc DHT sensor
    if (currentMillis - lastDHTRead >= DHT_READ_INTERVAL)
    {
        readDHT();
        lastDHTRead = currentMillis;
    }

    // Đọc các sensor khác
    readSoilMoisture();
    readLightLevel();

    // Gửi dữ liệu lên server
    if (currentMillis - lastUpload >= UPLOAD_INTERVAL)
    {
        if (wifiConnected)
        {
            uploadSensorData();
        }
        lastUpload = currentMillis;
    }

    delay(100);
}

// ==================== HÀM ĐỌC CẢM BIẾN ====================

// Đọc nhiệt độ và độ ẩm không khí
void readDHT()
{
    float t = dht.readTemperature();
    float h = dht.readHumidity();

    if (!isnan(t) && !isnan(h))
    {
        temperature = t;
        humidity = h;
        Serial.printf("Temp: %.1f°C, Humidity: %.1f%%\n", temperature, humidity);
    }
    else
    {
        Serial.println("DHT read error!");
    }
}

// Đọc độ ẩm đất
void readSoilMoisture()
{
    int rawValue = analogRead(SOIL_PIN);
    // Chuyển đổi sang phần trăm (0-100%)
    // Giá trị analog: 0 (ướt) -> 1023 (khô)
    soilMoisture = map(rawValue, 0, 1023, 100, 0);
    soilMoisture = constrain(soilMoisture, 0, 100);

    Serial.printf("Soil Moisture: %d%% (raw: %d)\n", soilMoisture, rawValue);
}

// Đọc cường độ ánh sáng
void readLightLevel()
{
    int lightDigital = digitalRead(LIGHT_PIN);
    int lightAnalog = analogRead(A0); // Use same analog pin for light

    // Light level: 0 (dark) -> 100 (bright)
    lightLevel = map(lightAnalog, 0, 1023, 0, 100);
    lightLevel = constrain(lightLevel, 0, 100);

    Serial.printf("Light Level: %d%% (digital: %d)\n", lightLevel, lightDigital);
}

// ==================== HÀM KẾT NỐI ====================

void connectWiFi()
{
    Serial.println("Connecting to WiFi...");
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20)
    {
        delay(500);
        Serial.print(".");
        attempts++;
    }

    if (WiFi.status() == WL_CONNECTED)
    {
        wifiConnected = true;
        Serial.println("\nWiFi connected!");
        Serial.print("IP Address: ");
        Serial.println(WiFi.localIP());
    }
    else
    {
        wifiConnected = false;
        Serial.println("\nWiFi connection failed!");
    }
}

// ==================== HÀM GỬI DỮ LIỆU ====================

void uploadSensorData()
{
    HTTPClient http;
    String url = "http://" + String(SERVER_HOST) + ":" + String(SERVER_PORT) + String(SERVER_PATH);

    http.begin(url);
    http.addHeader("Content-Type", "application/json");

    // Tạo JSON payload
    String jsonData = "{";
    jsonData += "\"temperature\":" + String(temperature) + ",";
    jsonData += "\"humidity\":" + String(humidity) + ",";
    jsonData += "\"soil_moisture\":" + String(soilMoisture) + ",";
    jsonData += "\"light_level\":" + String(lightLevel);
    jsonData += "}";

    Serial.println("Sending sensor data...");
    Serial.println("URL: " + url);
    Serial.println("Data: " + jsonData);

    int httpCode = http.POST(jsonData);

    if (httpCode > 0)
    {
        String response = http.getString();
        Serial.printf("HTTP Response: %d\n", httpCode);
        Serial.println("Response: " + response);

        // Xử lý response để bật/tắt relay nếu cần
        handleServerResponse(response);
    }
    else
    {
        Serial.printf("HTTP POST failed: %s\n", http.errorToString(httpCode).c_str());
    }

    http.end();
}

// Xử lý response từ server
void handleServerResponse(String response)
{
    // Parse JSON response đơn giản
    // Format: {"action":"pump_on"} hoặc {"action":"pump_off"}
    if (response.indexOf("pump_on") != -1)
    {
        digitalWrite(RELAY_PIN, HIGH);
        Serial.println("Pump ON");
    }
    else if (response.indexOf("pump_off") != -1)
    {
        digitalWrite(RELAY_PIN, LOW);
        Serial.println("Pump OFF");
    }
}

// ==================== HÀM ĐIỀU KHIỂN ====================

// Bật máy bơm
void pumpOn()
{
    digitalWrite(RELAY_PIN, HIGH);
    Serial.println("Pump turned ON");
}

// Tắt máy bơm
void pumpOff()
{
    digitalWrite(RELAY_PIN, LOW);
    Serial.println("Pump turned OFF");
}

// Lấy trạng thái máy bơm
bool getPumpStatus()
{
    return digitalRead(RELAY_PIN) == HIGH;
}

// Logic tự động
if (soilMoisture < 30 %)
→ Bật máy bơm if (soilMoisture > 80 %)   → Tắt máy bơm if (temperature > 35°C)     → Cảnh báo nhiệt độ cao if (humidity < 40 %)        → Khuyến nghị phun sương