#include <WiFi.h>
#include <WebServer.h>
#include <DHT.h>
// #include <ESP32Servo.h> // Thư viện đúng cho ESP32
// #include <Stepper.h>
//khai bao tren cung de viet cac ham handle;
WebServer server(80);


#pragma region CAMBIEN
  //---------cam bien nhiet do& do am------------//
    //khai bao bien chan
    #define DHTPIN 14
    #define DHTTYPE DHT11
    DHT dht(DHTPIN, DHT11);
    //khai bao bien luu gia tri
    float temperature = 0;
    float air_humidity = 0;
    //setup
    void DHT_setup(){
      dht.begin();
    }
    //khai bao ham doc gia tri
    void get_temperature(){
      temperature = dht.readTemperature();
      // Serial.print("temperature:");
      // Serial.println(temperature);
    }
    void get_air_humidity() {
      air_humidity = dht.readHumidity(); // đã là %
      // Serial.print("air_humidity (%): ");
      // Serial.println(air_humidity);
    }

    //khai bao ham xu ly req
    void Handle_GET_Temperature(){
      // return temperature;
      server.sendHeader("Access-Control-Allow-Origin", "*");
      server.send(200, "text/html", String(temperature));
      // server.send(200, "text/html", String(34));
      // Serial.println("GET_Temperature");
      // Serial.print("temperature:");
      // Serial.println(temperature);
    }
    void Handle_GET_Air_humidity(){
      // return air_humidity;
      server.sendHeader("Access-Control-Allow-Origin", "*");
      server.send(200, "text/html", String(air_humidity));
      // server.send(200, "text/html", String(35));
      // Serial.println("GET_Air_humidity");
      // Serial.print("air_humidity (%): ");
      // Serial.println(air_humidity);
    }
  //--------------------------------------------//

  //-----------cam bien do am dat----------------//
    //khai bao bien chan
    int soil_moisture_PIN = 34;
    //khai bao bien luu gia tri
    float soil_moisture = 0;
    //setup
    void soil_moisture_setup(){
      // pinMode(soil_moisture_PIN, INPUT);
    }
    void get_soil_moisture() {
      int raw = analogRead(soil_moisture_PIN); // giá trị ADC 0–4095
      Serial.println(raw);
      // Chuyển đổi về % (giả sử 0 = ướt, 4095 = khô)
      soil_moisture = map(raw, 0, 4095, 100, 0); // % độ ẩm
      // Serial.print("soil_moisture (%): ");
      // Serial.println(soil_moisture);
    }

    //khai bao ham xu ly req
    void Handle_GET_Soil_moisture(){
      // return soil_moisture;
      server.sendHeader("Access-Control-Allow-Origin", "*");
      server.send(200, "text/html", String(soil_moisture));
      // server.send(200, "text/html", String(36));
      Serial.println("GET_Soil_moisture");
      Serial.print("soil_moisture (%): ");
      Serial.println(soil_moisture);
    }
  //--------------------------------------------//

  //-----------cảm biến ánh sáng----------------//
    // Khai báo chân
    int light_PIN = 35;
    // Khai báo biến lưu giá trị
    float light_intensity = 0;

    // setup
    void light_setup() {
      pinMode(light_PIN, INPUT); // ESP32 analog pin mặc định là input
    }

    // Hàm đọc giá trị ánh sáng
    void get_light_intensity() {
      int raw = analogRead(light_PIN); // giá trị ADC 0–4095

      // Nếu raw = 4095 (tối nhất) → % ánh sáng = 0
      // Nếu raw = 0 (sáng nhất) → % ánh sáng = 100
      light_intensity = map(raw, 0, 4095, 100, 0);

      // Serial.print("light_intensity (%): ");
      // Serial.println(light_intensity);
    }

    // Hàm xử lý request
    void Handle_GET_Light() {
      server.sendHeader("Access-Control-Allow-Origin", "*");
      server.send(200, "text/html", String(light_intensity));
      // Serial.println("GET_Light");
      // Serial.print("light_intensity (%): ");
      // Serial.println(light_intensity);
    }
  //--------------------------------------------//
#pragma endregion CAMBIEN

#pragma region DONGCO
  //------------------Bom nuoc-------------------//
    //khai bao bien chan
    #define EN 21    // GPIO21
    #define IN1 22   // GPIO22
    #define IN2 23   // GPIO23
    //khai bao bien luu gia tri(threshold)
    bool on = false; 
    bool user_mode = false;
    float threshold_low = 30;
    float threshold_high = 70;
    float threshold_warning = 90;
    //setup
    void pump_setup() {
      pinMode(EN, OUTPUT);
      pinMode(IN1, OUTPUT);
      pinMode(IN2, OUTPUT);

      digitalWrite(EN, HIGH); // bật kênh điều khiển
    }
    //khai bao ham dieu khien
    bool condition_turn_on(){
      //code...
      // return on;
      return soil_moisture <= threshold_low;
    }
    bool condition_turn_off(){
      //code...
      // return !on;
      return soil_moisture >= threshold_high;
    }
    ///
    void pump_on(){
      //code...
      digitalWrite(IN1, HIGH);
      digitalWrite(IN2, LOW);
      Serial.print("pump on: ");
      Serial.println(soil_moisture);
      on = true;
    }
    void pump_off(){
      //code...
      digitalWrite(IN1, LOW);
      digitalWrite(IN2, LOW);
      // Serial.println("pump off");
      on = false;
    }
    //use in lood to control pump in real time
    void control_pump(){
      if(user_mode){
        return;
      }
      if(condition_turn_on()){
        pump_on();
      }
      else if(condition_turn_off()){
        pump_off();
      }
    }
    //khai bao ham xu ly req(set cac threshold de xu li)
    // Trả về threshold_low hiện tại
    void Handle_GET_Threshold_Low() {
      server.sendHeader("Access-Control-Allow-Origin", "*");
      server.send(200, "text/html", String(threshold_low));
      // Serial.println("GET_Threshold_Low");
    }

    // Trả về threshold_high hiện tại
    void Handle_GET_Threshold_High() {
      server.sendHeader("Access-Control-Allow-Origin", "*");
      server.send(200, "text/html", String(threshold_high));
      // Serial.println("GET_Threshold_High");
    }

    void Handle_GET_PumpState() {
      String state = "";
      if(on){
        state = "on";
      }
      else{
        state = "off";
      }
      server.sendHeader("Access-Control-Allow-Origin", "*");
      server.send(200, "text/html", String(state));
      // Serial.println("GET_State");
    } 

    void Handle_GET_PumpAutoMode() {
      String state = "";
      if(user_mode){
        state = "off";
      }
      else{
        state = "on";
      }
      server.sendHeader("Access-Control-Allow-Origin", "*");
      server.send(200, "text/html", String(state));
      // Serial.println("GET_PumpAutoMode");
    } 

    // POST: set threshold_low
    void Handle_POST_Set_Threshold_Low() {
      if (server.hasArg("value")) {
        float new_threshold_low = 0;
        try{
          new_threshold_low = server.arg("value").toFloat();
        }
        catch(...){
          server.sendHeader("Access-Control-Allow-Origin", "*");
          server.send(400, "application/json", "{\"status\":\"error\",\"message\":\"invalid value\"}");
          return;
        }
        if(new_threshold_low >= threshold_high || new_threshold_low < 0 || new_threshold_low > 100){
          server.sendHeader("Access-Control-Allow-Origin", "*");
          server.send(400, "application/json", "{\"status\":\"error\",\"message\":\"invalid value\"}");
          return;
        }
        threshold_low = new_threshold_low;
        server.sendHeader("Access-Control-Allow-Origin", "*");
        server.send(200, "application/json", "{\"status\":\"ok\",\"threshold_low\": " + String(threshold_low) + "}");
        Serial.println("POST_Set_Threshold_Low: " + String(threshold_low));
      } else {
        server.sendHeader("Access-Control-Allow-Origin", "*");
        server.send(400, "application/json", "{\"status\":\"error\",\"message\":\"missing value\"}");
      }
    }

    // POST: set threshold_high
    void Handle_POST_Set_Threshold_High() {
      if (server.hasArg("value")) {
        float new_threshold_high = 0;
        try{
          new_threshold_high = server.arg("value").toFloat();
        }
        catch(...){
          server.sendHeader("Access-Control-Allow-Origin", "*");
          server.send(400, "application/json", "{\"status\":\"error\",\"message\":\"invalid value\"}");
          return;
        }
        if(new_threshold_high <= threshold_low || new_threshold_high < 0 || new_threshold_high > 100){
          server.sendHeader("Access-Control-Allow-Origin", "*");
          server.send(400, "application/json", "{\"status\":\"error\",\"message\":\"invalid value\"}");
          return;
        }
        threshold_high = new_threshold_high;
        server.sendHeader("Access-Control-Allow-Origin", "*");
        server.send(200, "application/json", "{\"status\":\"ok\",\"threshold_high\": " + String(threshold_high) + "}");
        Serial.println("POST_Set_Threshold_High: " + String(threshold_high));
      } else {
        server.sendHeader("Access-Control-Allow-Origin", "*");
        server.send(400, "application/json", "{\"status\":\"error\",\"message\":\"missing value\"}");
      }
    }

    //POST
    void Handle_POST_Control_Pump() {
      if (server.hasArg("state")) {
        String state = server.arg("state");
        user_mode = true;
        if (state == "on"){
          pump_on(); 
        }
        else if(state == "off"){
          pump_off();
        }
        else{
          server.sendHeader("Access-Control-Allow-Origin", "*");
          server.send(400, "application/json", "{\"status\":\"error\",\"message\":\"wrong state\"}");
        }
        server.sendHeader("Access-Control-Allow-Origin", "*");
        server.send(200, "application/json", "{\"status\":\"ok\"}");
      }
      else {
        server.sendHeader("Access-Control-Allow-Origin", "*");
        server.send(400, "application/json", "{\"status\":\"error\",\"message\":\"missing value\"}");
      }
    }

    void Handle_POST_PumpAutoMode() {
      user_mode = false;
      
      server.sendHeader("Access-Control-Allow-Origin", "*");
      server.send(200, "application/json", "{\"status\":\"ok\"}");
    }

  //--------------------------------------------//

  //--------------------Den---------------------//
    //khai bao bien chan
    #define light_EN 25    // GPIO24
    //khai bao bien luu gia tri(threshold)
    bool light_on = false;
    bool user_light_mode = false;
    float threshold_light_low = 30;
    float threshold_light_high = 80;
    
    //setup
    void control_light_setup() {
      pinMode(light_EN, OUTPUT);

      digitalWrite(light_EN, LOW); // bật kênh điều khiển
    }
    //khai bao ham dieu khien
    ///
    bool condition_turn_light_on(){
      //code...
      // return on;
      return light_intensity  <= threshold_light_low;
    }
    bool condition_turn_light_off(){
      return light_intensity  >= threshold_light_high;
    }
    ///
    void lightOn(){
      //code...
      digitalWrite(light_EN, HIGH);
      Serial.print("light on:");
      Serial.print(light_intensity);
      light_on = true;
    }
    void lightOff(){
      //code...
      digitalWrite(light_EN, LOW);
      // Serial.println("pump off");
      light_on = false;
    }
    //use in lood to control pump in real time
    void control_light(){
      if(user_light_mode){
        return;
      }
      if(condition_turn_light_on()){
        lightOn();
      }
      else{
        lightOff();
      }
    }
    //khai bao ham xu ly req(set cac threshold de xu li)
    void 
    
    Handle_GET_lightState() {
      String state = "";
      if(light_on){
        state = "on";
      }
      else{
        state = "off";
      }
      server.sendHeader("Access-Control-Allow-Origin", "*");
      server.send(200, "text/html", String(state));
      // Serial.println("GET_State");
    } 
    void Handle_GET_lightAutoMode() {
      String state = "";
      if( user_light_mode){
        state = "off";
      }
      else{
        state = "on";
      }
      server.sendHeader("Access-Control-Allow-Origin", "*");
      server.send(200, "text/html", String(state));
      // Serial.println("GET_State");
    } 
    //POST 
    void Handle_POST_Control_light() {
      if (server.hasArg("state")) {
        String state = server.arg("state");
        user_light_mode = true;
        if (state == "on"){
          lightOn();
        }
        else if(state == "off"){
          lightOff();
        }
        else{
          server.sendHeader("Access-Control-Allow-Origin", "*");
          server.send(400, "application/json", "{\"status\":\"error\",\"message\":\"wrong state\"}");
        }
        server.sendHeader("Access-Control-Allow-Origin", "*");
        server.send(200, "application/json", "{\"status\":\"ok\"}");
      }
      else {
        server.sendHeader("Access-Control-Allow-Origin", "*");
        server.send(400, "application/json", "{\"status\":\"error\",\"message\":\"missing value\"}");
      }
    }

    void Handle_POST_lightAutoMode() {
      user_light_mode = false;
      server.sendHeader("Access-Control-Allow-Origin", "*");
      server.send(200, "application/json", "{\"status\":\"ok\"}");
    }

  //--------------------------------------------//
#pragma endregion DONGCO

#pragma region SERVER
  String WIFI_SSID = "";
  String WIFI_PASSWORD = "";
  //khai bao tren cung de viet cac ham handle ^;
  // WebServer server(80);

  void Connect_Wifi(){
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    Serial.print("Connecting to WiFi ");
    while (WiFi.status() != WL_CONNECTED) { 
      delay(500); 
      Serial.print("."); 
    }
    Serial.println("\nConnected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
  }

  void set_URLs(){
    // Đăng ký các đường dẫn URL
    // server.on("/", handleRoot);
    server.on("/get_temperature", Handle_GET_Temperature);
    server.on("/get_air_humidity", Handle_GET_Air_humidity);
    server.on("/get_soil_moisture", Handle_GET_Soil_moisture);
    server.on("/get_light", Handle_GET_Light);

    //pump
    //Lấy threshold_low hiện tại
    server.on("/get_Threshold_Low", Handle_GET_Threshold_Low);
    //Lấy threshold_high hiện tại
    server.on("/get_Threshold_High", Handle_GET_Threshold_High);

    server.on("/get_Pump_State", Handle_GET_PumpState);
    server.on("/get_Pump_AutoMode", Handle_GET_PumpAutoMode);//new

    //Đặt threshold_low_default (POST)
    server.on("/set_Threshold_Low", HTTP_POST, Handle_POST_Set_Threshold_Low);
    //Đặt threshold_high_default (POST)
    server.on("/set_Threshold_High", HTTP_POST, Handle_POST_Set_Threshold_High);
    //control --> user_mode on
    server.on("/control_pump", HTTP_POST, Handle_POST_Control_Pump);//state(bool)
    //user_mode off
    server.on("/pump_auto_mode", HTTP_POST, Handle_POST_PumpAutoMode);//new

    //light
    server.on("/get_lightState", Handle_GET_lightState);
    server.on("/get_lightAutoMode", Handle_GET_lightAutoMode);

    server.on("/control_light", HTTP_POST, Handle_POST_Control_light);
    server.on("/light_auto_mode", HTTP_POST, Handle_POST_lightAutoMode);

  }
#pragma endregion SERVER
