#!/usr/bin/env python3
"""
SENTINEL - Physical Hardware Telemetry Data Collector
-----------------------------------------------------
Connects to your ESP32 serial stream (MPU6050 + DS18B20 + IR Speed Sensor)
and logs timestamped CSV data to the 'data/' directory for training & analysis.

Usage:
  python3 collect_live_data.py --label healthy --duration 30
  python3 collect_live_data.py --label bearing_fault --duration 30 --port /dev/cu.usbserial-0001
"""

import os
import sys
import time
import argparse
from datetime import datetime
import serial
import serial.tools.list_ports
import pandas as pd

def list_ports():
    ports = [p.device for p in serial.tools.list_ports.comports()]
    return ports

def collect_data(label, duration, port=None, baudrate=115200):
    if not port:
        ports = list_ports()
        hw_ports = [p for p in ports if "usbserial" in p or "usbmodem" in p]
        if hw_ports:
            port = hw_ports[0]
        elif ports:
            port = ports[0]
        else:
            print("❌ No serial ports detected! Please connect your ESP32.")
            sys.exit(1)

    output_dir = os.path.join(os.path.dirname(__file__), "data")
    os.makedirs(output_dir, exist_ok=True)
    filename = f"hardware_{label.lower()}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    output_path = os.path.join(output_dir, filename)

    print("=" * 60)
    print(f"📡 SENTINEL LIVE DATA COLLECTOR")
    print("=" * 60)
    print(f"🔌 Serial Port : {port}")
    print(f"⚡ Baud Rate   : {baudrate}")
    print(f"🏷️ Class Label : {label}")
    print(f"⏱️ Duration    : {duration} seconds")
    print(f"📁 Output File : {output_path}")
    print("=" * 60)
    print("Starting in 2 seconds... Prepare your hardware condition!\n")
    time.sleep(2)

    rows = []
    start_time = time.time()
    last_print = 0

    try:
        ser = serial.Serial(port, baudrate, timeout=1.0)
        print(f"✅ Connected to {port}. Sending START command to motor...")
        ser.write(b"START\n")
        ser.flush()
        time.sleep(0.5)
        
        try:
            while (time.time() - start_time) < duration:
                elapsed = time.time() - start_time
                remaining = duration - elapsed
                
                line = ser.readline().decode('utf-8', errors='ignore').strip()
                if line and ',' in line:
                    parts = line.split(',')
                    if len(parts) >= 5:
                        try:
                            accel_x = float(parts[0].strip())
                            accel_y = float(parts[1].strip())
                            accel_z = float(parts[2].strip())
                            rpm     = float(parts[3].strip())
                            temp    = float(parts[4].strip())

                            rows.append({
                                "timestamp": datetime.now().isoformat(),
                                "accel_x": accel_x,
                                "accel_y": accel_y,
                                "accel_z": accel_z,
                                "rpm": rpm,
                                "temp": temp,
                                "label": label
                            })
                        except ValueError:
                            pass
                
                if elapsed - last_print >= 1.0:
                    print(f"⏳ Logging... [{int(elapsed)}s / {duration}s] | Samples collected: {len(rows)}", end="\r")
                    last_print = elapsed
        finally:
            print("\n🛑 Stopping motor & releasing port...")
            try:
                ser.write(b"STOP\n")
                ser.flush()
                time.sleep(0.2)
                ser.close()
            except Exception:
                pass

        print(f"✅ Data collection complete! Total samples: {len(rows)}")

        if rows:
            df = pd.DataFrame(rows)
            df.to_csv(output_path, index=False)
            print(f"💾 Saved {len(df)} samples to: {output_path}")
        else:
            print("⚠️ No valid CSV rows were captured. Check ESP32 serial output.")

    except Exception as e:
        print(f"❌ Error connecting to serial port {port}: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Gather live telemetry data from ESP32 hardware rig.")
    parser.add_argument("--label", type=str, default="healthy", help="Condition label (e.g. healthy, bearing_fault, misalignment, imbalance)")
    parser.add_argument("--duration", type=int, default=30, help="Duration to collect data in seconds (default: 30)")
    parser.add_argument("--port", type=str, default=None, help="Serial port (e.g. /dev/cu.usbserial-0001)")
    args = parser.parse_args()

    collect_data(args.label, args.duration, args.port)
