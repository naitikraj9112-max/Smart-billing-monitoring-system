# ThingSpeak API & Field Mapping Notes

This document describes the ThingSpeak API endpoints, parameter requirements, and telemetry field mappings used by the Smart Bill Monitoring System.

---

## 1. ThingSpeak Field Mappings

The data fields sent by the NodeMCU ESP8266 hardware and read by the web application are mapped as follows:

| ThingSpeak Field | Parameter | Unit | Description |
| :--- | :--- | :--- | :--- |
| **Field 1** | Voltage | Volts (V) | Simulated/Measured AC Mains RMS Voltage |
| **Field 2** | Current | Amperes (A) | Simulated/Measured AC Load Current |
| **Field 3** | Power | Watts (W) | Calculated power draw ($P = V \times I$) |
| **Field 4** | Units | Kilowatt-hours (kWh) | Cumulative energy consumption over time |
| **Field 5** | Estimated Bill | Rupees (Rs) | Estimated billing cost based on Tariff rate (Rs. 8.0/kWh) |

---

## 2. API Endpoints & Request Format

ThingSpeak provides a RESTful API over HTTP for reading and writing channel feeds.

### A. Write API (Telemetering Upload)
Used by the NodeMCU hardware to upload simulated or measured values.

- **Method:** `GET` or `POST`
- **Base URL:** `http://api.thingspeak.com/update`
- **Request Parameters:**
  - `api_key` (Required): The Channel's Write API Key.
  - `field1` (Optional): Voltage value.
  - `field2` (Optional): Current value.
  - `field3` (Optional): Power value.
  - `field4` (Optional): Units value.
  - `field5` (Optional): Estimated Bill value.

#### Example Write URL:
```http
GET http://api.thingspeak.com/update?api_key=8KJ0ET7K5R0QICEW&field1=230.45&field2=1.85&field3=426.33&field4=0.14&field5=1.12
```

#### Expected Response:
- **Success:** Returns the entry ID of the new feed entry as a plain-text integer (e.g., `12`).
- **Rate Limited:** Returns `0` (ThingSpeak enforces a 15-second minimum interval between uploads for free accounts).

---

### B. Read API (Telemetry Fetching)
Used by the web dashboard to retrieve the latest channel telemetry feed.

- **Method:** `GET`
- **Base URL:** `https://api.thingspeak.com/channels/{CHANNEL_ID}/feeds.json`
- **Request Parameters:**
  - `api_key` (Required): The Channel's Read API Key.
  - `results` (Optional): Number of entries to retrieve (use `results=1` for the latest feed).

#### Example Read URL:
```http
GET https://api.thingspeak.com/channels/3391644/feeds.json?api_key=04IU1CDM176ZZ0CT&results=1
```

#### Example Response Body (JSON):
```json
{
  "channel": {
    "id": 3391644,
    "name": "Smart Bill Monitor",
    "description": "Smart Energy Meter data monitoring channel",
    "latitude": "0.0",
    "longitude": "0.0",
    "field1": "Voltage",
    "field2": "Current",
    "field3": "Power",
    "field4": "Units",
    "field5": "Estimated Bill",
    "created_at": "2026-05-22T10:00:00Z",
    "updated_at": "2026-05-22T10:15:00Z",
    "last_entry_id": 12
  },
  "feeds": [
    {
      "created_at": "2026-05-22T10:18:00Z",
      "entry_id": 12,
      "field1": "229.80",
      "field2": "1.74",
      "field3": "399.85",
      "field4": "0.056",
      "field5": "0.45"
    }
  ]
}
```

---

## 3. Disconnection & Rate-limiting Policy
- **Minimum Upload Interval:** Free channels require at least **15 seconds** between successive writes. The NodeMCU code implements a **20-second** safety interval to ensure compliance and avoid data loss.
- **Offline Buffer:** In case of WiFi disconnection, the NodeMCU enters a reconnect retry loop and resumes streaming data once the connection is recovered.
