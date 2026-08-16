#include <Wire.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>

// ============================================================
// PIN DEFINITIONS
// ============================================================

// MPU6050 I2C
#define SDA_PIN        25
#define SCL_PIN        26

// DS18B20
#define ONE_WIRE_BUS   4

// IR RPM sensor
#define IR_SENSOR_PIN  18

// Motor driver
#define MOTOR_IN1      13
#define MOTOR_IN2      12

// ============================================================
// SENSOR OBJECTS
// ============================================================

Adafruit_MPU6050 mpu;

OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature tempSensor(&oneWire);

// ============================================================
// SYSTEM STATE
// ============================================================

bool mpuOK = false;
uint8_t mpuAddress = 0;
bool useRawI2C = false;

bool tempOK = false;
bool motorState = true;

// ============================================================
// RPM VARIABLES
// ============================================================

volatile unsigned long pulseCount = 0;
volatile unsigned long lastPulseMicros = 0;

unsigned long lastTime = 0;

// ============================================================
// IR INTERRUPT
// ============================================================

void IRAM_ATTR countPulse()
{
    unsigned long nowMicros = micros();

    // 1.5 ms debounce
    if (nowMicros - lastPulseMicros > 1500)
    {
        pulseCount++;
        lastPulseMicros = nowMicros;
    }
}

// ============================================================
// I2C CHECK
// ============================================================

bool checkI2C(uint8_t address)
{
    Wire.beginTransmission(address);

    return Wire.endTransmission() == 0;
}

// ============================================================
// MOTOR CONTROL
// ============================================================

void startMotor()
{
    pinMode(MOTOR_IN1, OUTPUT);
    pinMode(MOTOR_IN2, OUTPUT);

    digitalWrite(MOTOR_IN1, HIGH);
    digitalWrite(MOTOR_IN2, LOW);

    motorState = true;
}

void stopMotor()
{
    pinMode(MOTOR_IN1, OUTPUT);
    pinMode(MOTOR_IN2, OUTPUT);

    digitalWrite(MOTOR_IN1, LOW);
    digitalWrite(MOTOR_IN2, LOW);

    motorState = false;
}

// ============================================================
// RAW MPU6050 WAKEUP
// ============================================================

bool wakeUpRawMPU(uint8_t addr)
{
    // --------------------------------------------------------
    // Wake MPU6050
    // Register: PWR_MGMT_1 = 0x6B
    // Value:    0x00
    // --------------------------------------------------------

    Wire.beginTransmission(addr);

    Wire.write(0x6B);
    Wire.write(0x00);

    if (Wire.endTransmission() != 0)
    {
        return false;
    }

    // --------------------------------------------------------
    // Accelerometer range = ±8G
    // Register: ACCEL_CONFIG = 0x1C
    // Value:    0x10
    // --------------------------------------------------------

    Wire.beginTransmission(addr);

    Wire.write(0x1C);
    Wire.write(0x10);

    if (Wire.endTransmission() != 0)
    {
        return false;
    }

    return true;
}

// ============================================================
// MPU6050 INITIALIZATION
// ============================================================

void initializeMPU()
{
    mpuOK = false;
    useRawI2C = false;

    Serial.println();
    Serial.println("[MPU] Scanning I2C bus...");
    Serial.println("[MPU] SDA = GPIO 25");
    Serial.println("[MPU] SCL = GPIO 26");

    uint8_t targetAddr = 0;

    // --------------------------------------------------------
    // Try 0x68
    // --------------------------------------------------------

    if (checkI2C(0x68))
    {
        targetAddr = 0x68;
    }

    // --------------------------------------------------------
    // Try 0x69
    // --------------------------------------------------------

    else if (checkI2C(0x69))
    {
        targetAddr = 0x69;
    }

    // --------------------------------------------------------
    // Nothing found
    // --------------------------------------------------------

    if (targetAddr == 0)
    {
        Serial.println(
            "[MPU ERROR] No I2C device found!"
        );

        Serial.println(
            "Check MPU6050:"
        );

        Serial.println(
            "VCC -> 3.3V"
        );

        Serial.println(
            "GND -> GND"
        );

        Serial.println(
            "SDA -> GPIO 25"
        );

        Serial.println(
            "SCL -> GPIO 26"
        );

        return;
    }

    // --------------------------------------------------------
    // Device found
    // --------------------------------------------------------

    mpuAddress = targetAddr;

    Serial.print(
        "[MPU] I2C device found at 0x"
    );

    Serial.println(
        targetAddr,
        HEX
    );

    // --------------------------------------------------------
    // Try Adafruit library
    // --------------------------------------------------------

    if (mpu.begin(targetAddr, &Wire))
    {
        mpuOK = true;
        useRawI2C = false;

        mpu.setAccelerometerRange(
            MPU6050_RANGE_8_G
        );

        mpu.setGyroRange(
            MPU6050_RANGE_500_DEG
        );

        mpu.setFilterBandwidth(
            MPU6050_BAND_94_HZ
        );

        Serial.println(
            "[MPU] Connected using Adafruit library"
        );

        return;
    }

    // --------------------------------------------------------
    // Raw I2C fallback
    // --------------------------------------------------------

    Serial.println(
        "[MPU] Adafruit initialization failed"
    );

    Serial.println(
        "[MPU] Trying RAW I2C..."
    );

    if (wakeUpRawMPU(targetAddr))
    {
        mpuOK = true;
        useRawI2C = true;

        Serial.println(
            "[MPU] Connected using RAW I2C"
        );
    }
    else
    {
        Serial.println(
            "[MPU ERROR] RAW I2C failed"
        );
    }
}

// ============================================================
// RAW MPU6050 ACCELEROMETER READ
// ============================================================

bool readRawMPUAccel(
    float &ax,
    float &ay,
    float &az
)
{
    // --------------------------------------------------------
    // Start reading from ACCEL_XOUT_H
    // --------------------------------------------------------

    Wire.beginTransmission(mpuAddress);

    Wire.write(0x3B);

    if (Wire.endTransmission(false) != 0)
    {
        return false;
    }

    // --------------------------------------------------------
    // Read 6 bytes
    // --------------------------------------------------------

    if (Wire.requestFrom(
            (int)mpuAddress,
            6
        ) != 6)
    {
        return false;
    }

    int16_t rawAX =
        (Wire.read() << 8) |
        Wire.read();

    int16_t rawAY =
        (Wire.read() << 8) |
        Wire.read();

    int16_t rawAZ =
        (Wire.read() << 8) |
        Wire.read();

    // --------------------------------------------------------
    // ±8G = 4096 LSB/G
    // --------------------------------------------------------

    ax = rawAX / 4096.0;

    ay = rawAY / 4096.0;

    az = rawAZ / 4096.0;

    return true;
}

// ============================================================
// TEMPERATURE INITIALIZATION
// ============================================================

bool initializeTemperature()
{
    tempSensor.begin();

    int devices =
        tempSensor.getDeviceCount();

    if (devices == 0)
    {
        tempOK = false;

        Serial.println(
            "[TEMP] DS18B20 NOT FOUND"
        );

        return false;
    }

    tempSensor.setResolution(12);

    tempSensor.setWaitForConversion(false);

    tempSensor.requestTemperatures();

    tempOK = true;

    Serial.println(
        "[TEMP] DS18B20 OK"
    );

    return true;
}

// ============================================================
// IR INITIALIZATION
// ============================================================

void initializeIR()
{
    pinMode(
        IR_SENSOR_PIN,
        INPUT_PULLUP
    );

    pulseCount = 0;

    lastPulseMicros = 0;

    attachInterrupt(
        digitalPinToInterrupt(
            IR_SENSOR_PIN
        ),
        countPulse,
        FALLING
    );

    Serial.println(
        "[IR] Sensor READY on GPIO 18"
    );
}

// ============================================================
// SERIAL COMMANDS
// ============================================================

void processSerialCommands()
{
    if (Serial.available())
    {
        String cmd =
            Serial.readStringUntil('\n');

        cmd.trim();

        cmd.toUpperCase();

        // ----------------------------------------------------
        // START
        // ----------------------------------------------------

        if (cmd == "START")
        {
            startMotor();

            Serial.println(
                "OK: MOTOR STARTED"
            );
        }

        // ----------------------------------------------------
        // STOP
        // ----------------------------------------------------

        else if (cmd == "STOP")
        {
            stopMotor();

            Serial.println(
                "OK: MOTOR STOPPED"
            );
        }

        // ----------------------------------------------------
        // TEST
        // ----------------------------------------------------

        else if (cmd == "TEST")
        {
            initializeMPU();

            Serial.print(
                "DIAGNOSTIC: MPU="
            );

            if (mpuOK)
            {
                if (useRawI2C)
                    Serial.print(
                        "OK (RAW I2C)"
                    );
                else
                    Serial.print(
                        "OK (ADAFRUIT)"
                    );
            }
            else
            {
                Serial.print(
                    "FAIL"
                );
            }

            Serial.print(
                ", TEMP="
            );

            Serial.print(
                tempOK ? "OK" : "FAIL"
            );

            Serial.print(
                ", MOTOR="
            );

            Serial.println(
                motorState ? "ON" : "OFF"
            );
        }
    }
}

// ============================================================
// SETUP
// ============================================================

void setup()
{
    Serial.begin(115200);

    delay(1000);

    Serial.println();
    Serial.println(
        "=========================================="
    );

    Serial.println(
        " ESP32 MOTOR + MPU6050 SENSOR SYSTEM"
    );

    Serial.println(
        "=========================================="
    );

    // --------------------------------------------------------
    // MOTOR
    // --------------------------------------------------------

    startMotor();

    Serial.println(
        "[MOTOR] ON"
    );

    // --------------------------------------------------------
    // I2C
    // --------------------------------------------------------

    Wire.begin(
        SDA_PIN,
        SCL_PIN
    );

    Wire.setClock(100000);

    Wire.setTimeOut(50);

    delay(100);

    // --------------------------------------------------------
    // MPU
    // --------------------------------------------------------

    initializeMPU();

    // --------------------------------------------------------
    // TEMPERATURE
    // --------------------------------------------------------

    initializeTemperature();

    // --------------------------------------------------------
    // IR
    // --------------------------------------------------------

    initializeIR();

    // --------------------------------------------------------
    // TIMER
    // --------------------------------------------------------

    lastTime = millis();

    Serial.println();
    Serial.println(
        "=========================================="
    );

    Serial.println(
        "CONTINUOUS SENSOR STREAM STARTED"
    );

    Serial.println(
        "=========================================="
    );
}

// ============================================================
// LOOP
// ============================================================

void loop()
{
    // --------------------------------------------------------
    // Serial commands
    // --------------------------------------------------------

    processSerialCommands();

    // --------------------------------------------------------
    // Keep motor ON
    // --------------------------------------------------------

    if (motorState)
    {
        digitalWrite(
            MOTOR_IN1,
            HIGH
        );

        digitalWrite(
            MOTOR_IN2,
            LOW
        );
    }
    else
    {
        digitalWrite(
            MOTOR_IN1,
            LOW
        );

        digitalWrite(
            MOTOR_IN2,
            LOW
        );
    }

    // --------------------------------------------------------
    // Timing
    // --------------------------------------------------------

    unsigned long now =
        millis();

    // 100 ms = 10 readings/sec
    if (now - lastTime >= 100)
    {
        float elapsedTime =
            (now - lastTime) / 1000.0;

        lastTime = now;

        // ====================================================
        // RPM
        // ====================================================

        noInterrupts();

        unsigned long pulses =
            pulseCount;

        pulseCount = 0;

        interrupts();

        // 1 pulse = 1 revolution

        float rpm =
            (pulses * 60.0) /
            elapsedTime;

        // ====================================================
        // MPU
        // ====================================================

        float ax = 0.0;
        float ay = 0.0;
        float az = 1.0;

        bool accelReadOK = false;

        if (mpuOK)
        {
            if (useRawI2C)
            {
                accelReadOK =
                    readRawMPUAccel(
                        ax,
                        ay,
                        az
                    );
            }
            else
            {
                sensors_event_t a;
                sensors_event_t g;
                sensors_event_t t;

                mpu.getEvent(
                    &a,
                    &g,
                    &t
                );

                ax =
                    a.acceleration.x /
                    9.80665;

                ay =
                    a.acceleration.y /
                    9.80665;

                az =
                    a.acceleration.z /
                    9.80665;

                accelReadOK = true;
            }
        }

        // ====================================================
        // TEMPERATURE
        // ====================================================

        float tempC =
            tempSensor.getTempCByIndex(0);

        bool tempValid =
            (
                tempC != DEVICE_DISCONNECTED_C &&
                tempC > -55.0 &&
                tempC < 125.0
            );

        tempSensor.requestTemperatures();

        // ====================================================
        // CSV OUTPUT
        // ====================================================
        //
        // accel_x,accel_y,accel_z,rpm,temp,mpu_ok
        //
        // ====================================================

        Serial.print(
            ax,
            4
        );

        Serial.print(",");

        Serial.print(
            ay,
            4
        );

        Serial.print(",");

        Serial.print(
            az,
            4
        );

        Serial.print(",");

        Serial.print(
            rpm,
            1
        );

        Serial.print(",");

        if (tempValid)
        {
            Serial.print(
                tempC,
                2
            );
        }
        else
        {
            Serial.print(
                "ERROR"
            );
        }

        Serial.print(",");

        if (mpuOK && accelReadOK)
        {
            Serial.println("1");
        }
        else
        {
            Serial.println("0");
        }
    }

    delay(5);
}