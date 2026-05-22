/************************************************************
 SMART BILL MONITORING SYSTEM
 NodeMCU ESP8266 + Blynk + ThingSpeak + LCD

 Features:
 - Voltage Monitoring
 - Power Calculation
 - Energy Consumption
 - Bill Estimation
 - LCD Display
 - Blynk Dashboard
 - ThingSpeak Cloud Upload
************************************************************/

// ================= BLYNK CONFIG =================

#define BLYNK_TEMPLATE_ID "TMPLxxxx"
#define BLYNK_TEMPLATE_NAME "Smart Meter"

#define BLYNK_PRINT Serial

// ================= LIBRARIES =================

#include <ESP8266WiFi.h>
#include <BlynkSimpleEsp8266.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// ================= WIFI & BLYNK =================

// Replace with your credentials

char auth[] = "YOUR_BLYNK_AUTH_TOKEN";

char ssid[] = "MakerSpace";
char pass[] = "password";

// ================= THINGSPEAK =================

// Replace with your ThingSpeak Write API Key

String thingSpeakAPI = "8KJ0ET7K5R0QICEW";

const char* host = "api.thingspeak.com";

// ================= LCD CONFIG =================

// LCD Address = 0x27
// LCD Size = 20 Columns x 4 Rows

LiquidCrystal_I2C lcd(0x27, 20, 4);

// ================= VARIABLES =================

float voltage = 0.0;
float current = 2.0;          // Simulated constant current
float power = 0.0;
float energy = 0.0;
float cost = 0.0;

float tariff = 8.0;           // Rs per kWh

unsigned long lastTime = 0;
unsigned long lastThingSpeakUpdate = 0;

// =================================================
// SETUP
// =================================================

void setup() {

  Serial.begin(115200);

  // ================= LCD START =================

  lcd.init();
  lcd.backlight();

  lcd.setCursor(2, 0);
  lcd.print("SMART METER");

  lcd.setCursor(1, 1);
  lcd.print("Initializing...");

  delay(2000);

  lcd.clear();

  // ================= WIFI + BLYNK =================

  Blynk.begin(auth, ssid, pass);

  // ================= I2C START =================

  Wire.begin(D2, D1);

  // ================= TIMER INIT =================

  lastTime = millis();

  Serial.println("System Started");
}

// =================================================
// LOOP
// =================================================

void loop() {

  // Run Blynk
  Blynk.run();

  // =================================================
  // SENSOR READING
  // =================================================

  int sensorValue = analogRead(A0);

  // Simulated Voltage Calculation
  voltage = (sensorValue * 250.0) / 1023.0;

  // Prevent Negative Values
  if (voltage < 0) {
    voltage = 0;
  }

  // =================================================
  // POWER CALCULATION
  // =================================================

  power = voltage * current;

  // =================================================
  // ENERGY CALCULATION
  // =================================================

  unsigned long currentTime = millis();

  float hours = (currentTime - lastTime) / 3600000.0;

  energy += (power * hours) / 1000.0;

  lastTime = currentTime;

  // =================================================
  // COST CALCULATION
  // =================================================

  cost = energy * tariff;

  // =================================================
  // SERIAL MONITOR OUTPUT
  // =================================================

  Serial.print("Voltage: ");
  Serial.print(voltage);

  Serial.print(" V | Power: ");
  Serial.print(power);

  Serial.print(" W | Energy: ");
  Serial.print(energy);

  Serial.print(" kWh | Cost: Rs ");
  Serial.println(cost);

  // =================================================
  // LCD DISPLAY
  // =================================================

  lcd.setCursor(0, 0);
  lcd.print("Volt : ");
  lcd.print(voltage, 1);
  lcd.print(" V   ");

  lcd.setCursor(0, 1);
  lcd.print("Power: ");
  lcd.print(power, 1);
  lcd.print(" W   ");

  lcd.setCursor(0, 2);
  lcd.print("Unit : ");
  lcd.print(energy, 3);
  lcd.print(" kWh ");

  lcd.setCursor(0, 3);
  lcd.print("Cost : Rs ");
  lcd.print(cost, 2);
  lcd.print("   ");

  // =================================================
  // BLYNK UPDATE
  // =================================================

  Blynk.virtualWrite(V0, voltage);
  Blynk.virtualWrite(V1, power);
  Blynk.virtualWrite(V2, energy);
  Blynk.virtualWrite(V3, cost);

  // =================================================
  // THINGSPEAK UPDATE (EVERY 20 SECONDS)
  // =================================================

  if (millis() - lastThingSpeakUpdate > 20000) {

    if (WiFi.status() == WL_CONNECTED) {

      WiFiClient client;
      HTTPClient http;

      String url =
        "http://" + String(host) +
        "/update?api_key=" + thingSpeakAPI +
        "&field1=" + String(voltage) +
        "&field2=" + String(current) +
        "&field3=" + String(power) +
        "&field4=" + String(energy) +
        "&field5=" + String(cost);

      Serial.println("Sending data to ThingSpeak...");
      Serial.println(url);

      http.begin(client, url);

      int httpCode = http.GET();

      if (httpCode > 0) {

        Serial.print("ThingSpeak Update Success. HTTP Code: ");
        Serial.println(httpCode);

      } else {

        Serial.print("ThingSpeak Error: ");
        Serial.println(http.errorToString(httpCode));
      }

      http.end();

    } else {

      Serial.println("WiFi Disconnected");
    }

    lastThingSpeakUpdate = millis();
  }

  delay(1000);
}