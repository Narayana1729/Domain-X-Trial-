# Domain-X: Predictive Maintenance & Sensor Diagnostics System

An end-to-end IoT and Machine Learning platform for machinery health monitoring, vibration analysis, and fault diagnosis.

---

## 🔌 Hardware Sensor Setup & Wiring

| Sensor / Module | Interface / Protocol | ESP32 Pin | Purpose |
|-----------------|---------------------|-----------|---------|
| **MPU6050** | I2C (Address 0x68/0x69) | `SDA (GPIO 21)`, `SCL (GPIO 22)` | 6-Axis Accelerometer & Gyroscope (Vibration Sensing) |
| **DS18B20** | OneWire | `GPIO 4` (with 4.7kΩ pull-up) | High-precision Motor Bearing Temperature |
| **IR Speed Sensor** | Digital Interrupt | `GPIO 18` (RISING edge) | Motor Shaft RPM Tachometer |
| **Motor Driver (L298N/MOSFET)** | PWM / Digital Control | `GPIO 13` | Shaft rotation control (`START`/`STOP`) |

---

## 🧪 Testing All Sensors

### 1. Python Automated Test Runner (Hardware & Simulation)

You can run the python sensor test suite directly from your terminal:

```bash
# Test in SIMULATION mode (without physical hardware connected):
python3 test_sensors.py --simulate

# Test with physical ESP32 hardware connected via USB:
python3 test_sensors.py --port /dev/cu.usbserial-0001
```

**Test Output Example:**
```
=================================================================
 🧪  RUNNING SENSOR TEST
=================================================================
 📊 Samples Evaluated  : 50
 📐 Accelerometer Vector : 0.983 G  [PASS ✅]
 ⚙️ Optical Tachometer  : 1760.4 - 1840.3 RPM [PASS ✅]
 🌡️ Temperature Sensor  : 38.49 °C        [PASS ✅]
-----------------------------------------------------------------
 OVERALL SENSOR HEALTH : PASS ✅
=================================================================
```

---

## ⚡ ESP32 Firmware Instructions

1. Open `esp32_firmware/esp32_firmware.ino` in Arduino IDE or VS Code PlatformIO.
2. Ensure you have installed the required libraries:
   - `Adafruit MPU6050`
   - `Adafruit Unified Sensor`
   - `OneWire`
   - `DallasTemperature`
3. Flash the code to your ESP32 Dev Module.
4. Open Serial Monitor at **115200 Baud**.
5. Available Commands:
   - `TEST` : Runs an I2C scan and tests MPU6050, DS18B20, and IR sensor hardware.
   - `START`: Starts motor driver and streams telemetry CSV: `accel_x,accel_y,accel_z,rpm,temp`.
   - `STOP` : Stops motor driver and pauses telemetry output.
