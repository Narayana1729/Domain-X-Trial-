#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>

#define IR_SENSOR_PIN  18
#define SDA_PIN        21
#define SCL_PIN        22

Adafruit_MPU6050 mpu;
volatile unsigned long pulseCount = 0;

void IRAM_ATTR countPulse() {
  pulseCount++;
}

void setup() {
  Serial.begin(115200);
  delay(2000);

  Serial.println("=== SENSOR TEST ===");

  // --- MPU6050 ---
  Wire.begin(SDA_PIN, SCL_PIN);
  Wire.setClock(400000);
  delay(100);

  Serial.print("MPU6050: ");
  if (mpu.begin(0x68, &Wire)) {
    mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
    mpu.setGyroRange(MPU6050_RANGE_500_DEG);
    mpu.setFilterBandwidth(MPU6050_BAND_94_HZ);
    Serial.println("PASS");
  } else {
    Serial.println("FAIL");
  }

  // --- IR ---
  pinMode(IR_SENSOR_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(IR_SENSOR_PIN), countPulse, FALLING);
  Serial.println("IR: READY");

  Serial.println("===================");
  Serial.println();
}

void loop() {
  // MPU6050 read
  sensors_event_t a, g, t;
  mpu.getEvent(&a, &g, &t);

  float ax = a.acceleration.x / 9.80665;
  float ay = a.acceleration.y / 9.80665;
  float az = a.acceleration.z / 9.80665;

  Serial.print("X="); Serial.print(ax, 3);
  Serial.print(" Y="); Serial.print(ay, 3);
  Serial.print(" Z="); Serial.print(az, 3);
  Serial.print(" | IR pulses="); Serial.println(pulseCount);

  delay(500);
}