#!/usr/bin/env python3
"""
DOMAIN-X SENSOR DIAGNOSTIC TEST RUNNER
--------------------------------------
Automated test suite to verify physical & simulated sensors:
 - MPU6050 Accelerometer & Gyroscope
 - DS18B20 Temperature Sensor
 - IR Speed Sensor / Optical Tachometer (RPM)

Usage:
  python3 test_sensors.py                     # Auto-detect serial port
  python3 test_sensors.py --port /dev/cu.usbserial-0001
  python3 test_sensors.py --simulate          # Hardware simulation test mode
"""

import sys
import time
import math
import argparse
from datetime import datetime
import pandas as pd
import numpy as np

try:
    import serial
    import serial.tools.list_ports
    HAS_SERIAL = True
except ImportError:
    HAS_SERIAL = False

def print_header(title):
    print("\n" + "=" * 65)
    print(f" 🧪  {title.upper()}")
    print("=" * 65)

def list_available_ports():
    if not HAS_SERIAL:
        return []
    ports = serial.tools.list_ports.comports()
    return [p.device for p in ports]

def validate_sensor_telemetry(samples):
    """
    Validates sensor samples against expected physical limits.
    Returns diagnostic dict with status for each sensor.
    """
    if not samples:
        return {
            "status": "FAIL",
            "reason": "No data samples received"
        }

    df = pd.DataFrame(samples)
    
    # 1. Accelerometer Validation
    df['accel_mag'] = np.sqrt(df['accel_x']**2 + df['accel_y']**2 + df['accel_z']**2)
    avg_mag = df['accel_mag'].mean()
    accel_ok = (0.5 <= avg_mag <= 2.5) and not (df['accel_x'].std() == 0 and df['accel_y'].std() == 0)

    # 2. RPM Sensor Validation
    min_rpm = df['rpm'].min()
    max_rpm = df['rpm'].max()
    rpm_ok = (min_rpm >= 0.0) and (max_rpm <= 10000.0)

    # 3. Temperature Sensor Validation
    avg_temp = df['temp'].mean()
    temp_ok = (5.0 <= avg_temp <= 100.0)

    return {
        "sample_count": len(df),
        "accel_avg_mag": round(avg_mag, 3),
        "accel_status": "PASS ✅" if accel_ok else "FAIL ❌",
        "rpm_range": f"{min_rpm:.1f} - {max_rpm:.1f} RPM",
        "rpm_status": "PASS ✅" if rpm_ok else "FAIL ❌",
        "temp_avg": f"{avg_temp:.2f} °C",
        "temp_status": "PASS ✅" if temp_ok else "FAIL ❌",
        "overall": "PASS ✅" if (accel_ok and rpm_ok and temp_ok) else "WARN ⚠️"
    }

def run_simulated_test():
    print_header("Running Sensor Test in SIMULATION Mode")
    print("Simulating 5 seconds of telemetry data generation...")
    
    time.sleep(1)
    samples = []
    for _ in range(50):
        samples.append({
            "accel_x": 0.05 + np.random.normal(0, 0.02),
            "accel_y": 0.03 + np.random.normal(0, 0.02),
            "accel_z": 0.98 + np.random.normal(0, 0.01),
            "rpm": 1800.0 + np.random.normal(0, 15.0),
            "temp": 38.5 + np.random.normal(0, 0.1)
        })
        time.sleep(0.02)

    results = validate_sensor_telemetry(samples)

    print("\n-----------------------------------------------------------------")
    print(" SENSOR TEST RESULTS (SIMULATED):")
    print("-----------------------------------------------------------------")
    print(f" 📊 Samples Evaluated  : {results['sample_count']}")
    print(f" 📐 Accelerometer Vector : {results['accel_avg_mag']} G  [{results['accel_status']}]")
    print(f" ⚙️ Optical Tachometer  : {results['rpm_range']} [{results['rpm_status']}]")
    print(f" 🌡️ Temperature Sensor  : {results['temp_avg']}        [{results['temp_status']}]")
    print("-----------------------------------------------------------------")
    print(f" OVERALL SENSOR HEALTH : {results['overall']}")
    print("=================================================================\n")

def run_hardware_test(port, baudrate=115200, duration=5):
    print_header(f"Connecting to ESP32 on {port}")
    try:
        ser = serial.Serial(port, baudrate, timeout=1.0)
        time.sleep(2) # Wait for serial connection to stabilize

        print("📡 Step 1: Sending 'TEST' command for hardware bus diagnostics...")
        ser.write(b"TEST\n")
        ser.flush()
        
        # Read test report from ESP32
        start_wait = time.time()
        while time.time() - start_wait < 3.0:
            if ser.in_waiting:
                line = ser.readline().decode('utf-8', errors='ignore').strip()
                if line:
                    print(f"   [ESP32] {line}")
        
        print("\n📡 Step 2: Sending 'START' command & collecting telemetry samples...")
        ser.write(b"START\n")
        ser.flush()

        samples = []
        start_time = time.time()
        while time.time() - start_time < duration:
            line = ser.readline().decode('utf-8', errors='ignore').strip()
            if line and ',' in line:
                parts = line.split(',')
                if len(parts) >= 5:
                    try:
                        ax = float(parts[0].strip())
                        ay = float(parts[1].strip())
                        az = float(parts[2].strip())
                        rpm = float(parts[3].strip())
                        temp = float(parts[4].strip())

                        samples.append({
                            "accel_x": ax, "accel_y": ay, "accel_z": az,
                            "rpm": rpm, "temp": temp
                        })
                    except ValueError:
                        pass
        
        # Stop motor
        print("\n🛑 Step 3: Sending 'STOP' command to pause motor & telemetry...")
        ser.write(b"STOP\n")
        ser.flush()
        ser.close()

        # Validate samples
        results = validate_sensor_telemetry(samples)

        print("\n-----------------------------------------------------------------")
        print(" SENSOR TEST RESULTS (HARDWARE):")
        print("-----------------------------------------------------------------")
        print(f" 📊 Samples Collected  : {results['sample_count']}")
        print(f" 📐 Accelerometer Vector : {results['accel_avg_mag']} G  [{results['accel_status']}]")
        print(f" ⚙️ Optical Tachometer  : {results['rpm_range']} [{results['rpm_status']}]")
        print(f" 🌡️ Temperature Sensor  : {results['temp_avg']}        [{results['temp_status']}]")
        print("-----------------------------------------------------------------")
        print(f" OVERALL SENSOR HEALTH : {results['overall']}")
        print("=================================================================\n")

    except Exception as e:
        print(f"\n❌ Serial Communication Error: {e}")
        print("💡 Tip: Use --simulate flag to run a simulated sensor test.")
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description="Test and validate all physical/simulated sensors.")
    parser.add_argument("--port", type=str, default=None, help="Serial port (e.g. /dev/cu.usbserial-0001 or COM3)")
    parser.add_argument("--baud", type=int, default=115200, help="Baud rate (default: 115200)")
    parser.add_argument("--duration", type=int, default=5, help="Telemetry capture test duration in seconds (default: 5)")
    parser.add_argument("--simulate", action="store_true", help="Run simulated sensor test without hardware")
    args = parser.parse_args()

    if args.simulate:
        run_simulated_test()
        return

    ports = list_available_ports()
    if not args.port:
        hw_ports = [p for p in ports if "usbserial" in p or "usbmodem" in p]
        if hw_ports:
            args.port = hw_ports[0]
        elif ports:
            args.port = ports[0]
        else:
            print("⚠️ No physical serial ports detected. Switching to SIMULATION test mode...")
            run_simulated_test()
            return

    run_hardware_test(args.port, args.baud, args.duration)

if __name__ == "__main__":
    main()
