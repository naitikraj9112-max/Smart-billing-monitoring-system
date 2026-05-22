/*******************************************************************************
 * SMART BILL MONITORING SYSTEM - Phase 4 Telemetry
 * NodeMCU ESP8266 + ThingSpeak Integration
 * 
 * This sketch runs on a NodeMCU (ESP-12E) to simulate electrical parameters:
 *   - Field 1: Voltage (V)
 *   - Field 2: Current (A)
 *   - Field 3: Power (W)
 *   - Field 4: Units / Energy (kWh)
 *   - Field 5: Estimated Bill (Rs)
 * 
 * Features:
 *   - Automatic & non-blocking WiFi reconnect logic.
 *   - Dynamic load simulation (randomized fluctuations for realistic telemetry).
 *   - Periodic telemetry uploads to ThingSpeak every 20 seconds.
 *   - Comprehensive Serial log feedback.
 ******************************************************************************/

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>

// ======================= CONFIGURATION =======================

// WiFi Credentials
const char* ssid     = "MakerSpace"; // Replace with your WiFi SSID
const char* password = "password";   // Replace with your WiFi Password

// ThingSpeak Configuration
const char* host            = "api.thingspeak.com";
const char* writeAPIKey     = "8KJ0ET7K5R0QICEW";
const int uploadIntervalMs  = 20000; // 20 seconds interval

// Billing Configuration
const float tariffRate      = 8.0;   // Tariff rate: Rs. 8.0 per kWh

// ==================== STATE VARIABLES ====================

unsigned long lastUploadTime = 0;
unsigned long lastEnergyCalcTime = 0;
unsigned long lastWiFiCheckTime = 0;
const unsigned long wifiCheckIntervalMs = 10000; // Check WiFi status every 10 seconds

// Telemetry values
float voltage       = 0.0;
float current       = 0.0;
float power         = 0.0;
float cumulativeKwh = 0.0;
float estimatedBill = 0.0;

// ======================== FUNCTIONS ========================

/**
 * Initializes WiFi connection.
 */
void setupWiFi() {
  Serial.println();
  Serial.print("Connecting to SSID: ");
  Serial.println(ssid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  // Initial connection attempt (blocking briefly for setup)
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 15) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected successfully!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nWiFi connection pending. Will auto-retry in the background.");
  }
}

/**
 * Checks WiFi connectivity in a non-blocking manner and attempts reconnection if offline.
 */
void handleWiFiReconnect() {
  unsigned long currentMillis = millis();
  if (currentMillis - lastWiFiCheckTime >= wifiCheckIntervalMs) {
    lastWiFiCheckTime = currentMillis;

    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("[WIFI] Disconnected! Reconnecting in background...");
      WiFi.begin(ssid, password);
    }
  }
}

/**
 * Simulates electrical sensor values (Voltage and Current) and calculates
 * derivative parameters (Power, Energy consumed, and Estimated Bill).
 */
void updateSensorSimulation() {
  unsigned long currentTime = millis();
  
  // Calculate time elapsed (in hours) since last calculation
  float elapsedHours = (float)(currentTime - lastEnergyCalcTime) / 3600000.0;
  lastEnergyCalcTime = currentTime;

  // 1. Simulate AC Mains Voltage (normally fluctuates around 220V - 240V)
  // Generates values in range [218.0, 242.0]
  voltage = 230.0 + ((float)random(-120, 120) / 10.0);

  // 2. Simulate Load Current (fluctuates between 0.5A and 5.0A)
  // Generates values in range [0.5, 5.0]
  current = 0.5 + ((float)random(0, 450) / 100.0);

  // 3. Calculate Power (P = V * I) in Watts
  power = voltage * current;

  // 4. Calculate cumulative Energy (kWh = (Power in Watts * time in Hours) / 1000)
  float sessionKwh = (power * elapsedHours) / 1000.0;
  cumulativeKwh += sessionKwh;

  // 5. Calculate Estimated Bill (Bill = Units * Tariff)
  estimatedBill = cumulativeKwh * tariffRate;

  // Log simulation outputs to Serial
  Serial.println("----------------------------------------");
  Serial.print("Voltage: "); Serial.print(voltage, 2); Serial.println(" V");
  Serial.print("Current: "); Serial.print(current, 2); Serial.println(" A");
  Serial.print("Power  : "); Serial.print(power, 2);   Serial.println(" W");
  Serial.print("Energy : "); Serial.print(cumulativeKwh, 6); Serial.println(" kWh");
  Serial.print("Bill   : Rs. "); Serial.println(estimatedBill, 4);
}

/**
 * Sends telemetry fields to ThingSpeak via HTTP GET request.
 */
void uploadToThingSpeak() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[ThingSpeak] Upload skipped: WiFi not connected.");
    return;
  }

  WiFiClient client;
  HTTPClient http;

  // Format ThingSpeak Update Request URL
  // Field 1: Voltage, Field 2: Current, Field 3: Power, Field 4: Units, Field 5: Estimated Bill
  String url = "http://" + String(host) + "/update?api_key=" + String(writeAPIKey) +
               "&field1=" + String(voltage, 2) +
               "&field2=" + String(current, 2) +
               "&field3=" + String(power, 2) +
               "&field4=" + String(cumulativeKwh, 6) +
               "&field5=" + String(estimatedBill, 4);

  Serial.println("[ThingSpeak] Uploading telemetry to channel...");
  Serial.print("[HTTP] URL: ");
  Serial.println(url);

  http.begin(client, url);
  int httpCode = http.GET();

  if (httpCode > 0) {
    Serial.print("[HTTP] Response code: ");
    Serial.println(httpCode);
    
    // ThingSpeak returns the Entry ID if write succeeds, or 0 if rate-limited
    String payload = http.getString();
    Serial.print("[HTTP] Response payload: ");
    Serial.println(payload);
    
    if (payload.toInt() > 0) {
      Serial.println("[ThingSpeak] Update SUCCESS.");
    } else {
      Serial.println("[ThingSpeak] Update FAILED (Rate-limited or Invalid API Key).");
    }
  } else {
    Serial.print("[HTTP] GET failed. Error: ");
    Serial.println(http.errorToString(httpCode));
  }

  http.end();
}

// ======================== CORE CODE ========================

void setup() {
  // Initialize Serial Monitor
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n=== Smart Bill Monitor: Phase 4 Telemetry Initializing ===");

  // Initialize random seed for simulations
  randomSeed(analogRead(A0));

  // Connect to WiFi
  setupWiFi();

  // Initialize time trackers
  unsigned long bootTime = millis();
  lastUploadTime = bootTime;
  lastEnergyCalcTime = bootTime;
}

void loop() {
  // Ensure we are connected to WiFi (non-blocking retry)
  handleWiFiReconnect();

  // Regularly update load simulation calculations (e.g., every 2 seconds)
  static unsigned long lastSimTime = 0;
  if (millis() - lastSimTime >= 2000) {
    lastSimTime = millis();
    updateSensorSimulation();
  }

  // Periodic upload to ThingSpeak
  if (millis() - lastUploadTime >= uploadIntervalMs) {
    lastUploadTime = millis();
    uploadToThingSpeak();
  }

  // Small delay to prevent CPU hogging
  delay(50);
}
