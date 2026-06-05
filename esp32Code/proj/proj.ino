#include "definition.h"

//main code
  void setup() {
    // put your setup code here, to run once:
    Serial.begin(9600);
    delay(1000);
    WIFI_SSID = "TTHocLieuT1";
    WIFI_PASSWORD = "hoclieut1";

    Serial.println("Nhap SSID:");
    while (WIFI_SSID.length() == 0) {
      if (Serial.available()) {
        WIFI_SSID = Serial.readStringUntil('\n');
        WIFI_SSID.trim();
      }
    }

    Serial.println("Nhap Password:");
    while (WIFI_PASSWORD.length() == 0) {
      if (Serial.available()) {
        WIFI_PASSWORD = Serial.readStringUntil('\n');
        WIFI_PASSWORD.trim();
      }
    }
    Serial.println("setup");

    //setup
    DHT_setup();
    soil_moisture_setup();
    light_setup();
    pump_setup();
    control_light_setup();

    //wifi
    Connect_Wifi();
    // Đăng ký các đường dẫn URL
    set_URLs();

    server.begin();
    Serial.println("HTTP server started");
  }
  unsigned long lastRead = 0;
  void loop() {
    // put your main code here, to run repeatedly:
    server.handleClient();

    if (millis() - lastRead > 1000) {
      lastRead = millis();
      get_temperature();
      get_air_humidity();
      get_soil_moisture();
      get_light_intensity();
      control_pump();
      control_light();
    }
  }
