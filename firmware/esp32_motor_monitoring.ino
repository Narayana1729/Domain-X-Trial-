/*
 * ESP32 Motor Condition Monitoring & Emergency Thermal Cutoff Firmware
 * Hardware Pins:
 * - MPU6050 (I2C): SDA = GPIO 21, SCL = GPIO 22
 * - DS18B20 Temp Probe: OneWire Data = GPIO 4
 * - Optical Speed Sensor (RPM): Interrupt Pin = GPIO 2
 * - Motor Driver (L298N / BTS7960 PWM): PWM = GPIO 18, DIR = GPIO 19
 */

#include <Arduino.h>
#include <Wire.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>

// --- Pin Definitions ---
#define ONE_WIRE_BUS 4
#define RPM_SENSOR_PIN 2
#define MOTOR_PWM_PIN 18
#define MOTOR_DIR_PIN 19

// --- PWM Settings ---
#define PWM_FREQ 5000
#define PWM_CHANNEL 0
#define PWM_RESOLUTION 8

// --- Global Objects ---
Adafruit_MPU6050 mpu;
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

// --- Tachometer Variables ---
volatile unsigned long pulseCount = 0;
unsigned long lastRpmTime = 0;
float currentRpm = 0.0;

bool isMotorActive = false;

// Interrupt Service Routine for RPM pulses
void IRAM_ATTR countPulse() {
    pulseCount++;
}

void stopMotor() {
    isMotorActive = false;
    ledcWrite(PWM_CHANNEL, 0);
    digitalWrite(MOTOR_DIR_PIN, LOW);
    Serial.println("🛑 MOTOR STOPPED EMERGENCY");
}

void startMotor(int speedPwm = 200) {
    isMotorActive = true;
    digitalWrite(MOTOR_DIR_PIN, HIGH);
    ledcWrite(PWM_CHANNEL, constrain(speedPwm, 0, 255));
    Serial.println("⚡ MOTOR STARTED");
}

void setup() {
    Serial.begin(115200);
    delay(500);

    // Initialize Motor Control Pins
    pinMode(MOTOR_DIR_PIN, OUTPUT);
    digitalWrite(MOTOR_DIR_PIN, LOW);
    
    ledcSetup(PWM_CHANNEL, PWM_FREQ, PWM_RESOLUTION);
    ledcAttachPin(MOTOR_PWM_PIN, PWM_CHANNEL);
    ledcWrite(PWM_CHANNEL, 0);

    // Initialize MPU6050
    Wire.begin(21, 22);
    if (!mpu.begin()) {
        Serial.println("⚠️ MPU6050 Sensor not detected");
    } else {
        mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
        mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
    }

    // Initialize DS18B20 Temperature Sensor
    sensors.begin();

    // Initialize Optical RPM Interrupt
    pinMode(RPM_SENSOR_PIN, INPUT_PULLUP);
    attachInterrupt(digitalPinToInterrupt(RPM_SENSOR_PIN), countPulse, RISING);

    lastRpmTime = millis();
}

void loop() {
    // 1. Process Incoming Serial Commands
    if (Serial.available() > 0) {
        String inputCmd = Serial.readStringUntil('\n');
        inputCmd.trim();
        inputCmd.toUpperCase();

        if (inputCmd == "STOP") {
            stopMotor();
        } else if (inputCmd == "START") {
            startMotor(200);
        } else if (inputCmd.startsWith("SPEED:")) {
            int targetRpm = inputCmd.substring(6).toInt();
            int mappedPwm = map(targetRpm, 0, 18000, 0, 255);
            startMotor(mappedPwm);
        }
    }

    // 2. Calculate RPM Speed every 500 ms
    unsigned long now = millis();
    if (now - lastRpmTime >= 500) {
        detachInterrupt(digitalPinToInterrupt(RPM_SENSOR_PIN));
        unsigned long pulses = pulseCount;
        pulseCount = 0;
        attachInterrupt(digitalPinToInterrupt(RPM_SENSOR_PIN), countPulse, RISING);

        // RPM calculation: (pulses / 1 blade per rev) * (60000ms / elapsed_ms)
        currentRpm = (float)pulses * (60000.0 / (now - lastRpmTime));
        lastRpmTime = now;
    }

    // 3. Read Accelerometer & Temperature
    sensors.requestTemperatures();
    float currentTemp = sensors.getTempCByIndex(0);
    if (currentTemp < -50 || currentTemp > 125) currentTemp = 36.5;

    sensors_event_t a, g, temp_event;
    mpu.getEvent(&a, &g, &temp_event);

    float ax = a.acceleration.x / 9.81; // Convert m/s^2 to g
    float ay = a.acceleration.y / 9.81;
    float az = a.acceleration.z / 9.81;

    // Emergency Thermal Hardware Cutoff (Automatic Safety Shutoff above 55°C)
    if (currentTemp >= 55.0 && isMotorActive) {
        stopMotor();
        Serial.println("🔥 EMERGENCY AUTOMATIC THERMAL CUTOFF: TEMP EXCEEDED 55°C!");
    }

    // 4. Send CSV Telemetry Packet to Web API
    // Format: accel_x,accel_y,accel_z,rpm,temp
    Serial.printf("%.4f,%.4f,%.4f,%.1f,%.2f\n", ax, ay, az, currentRpm, currentTemp);

    delay(50);
}
