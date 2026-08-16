#!/usr/bin/env python3
"""
DOMAIN-X REAL-TIME LIVE HARDWARE FAULT DIAGNOSTIC STREAMER
----------------------------------------------------------
Connects to ESP32 via USB Serial, extracts live DSP vibration features,
and runs your trained Random Forest Classifier to identify machine condition in real time.

Usage:
    python3 read_sensors.py
    python3 read_sensors.py --port /dev/cu.usbserial-0001
"""
import sys
import time
import argparse
import pandas as pd
import numpy as np
import serial
import serial.tools.list_ports
from ml_engine import FaultClassifier
from signal_processing import extract_vibration_features

def auto_detect_port():
    ports = serial.tools.list_ports.comports()
    for p in ports:
        dev = p.device.lower()
        if "usbserial" in dev or "usbmodem" in dev or "ch340" in dev or "cp210" in dev or "com" in dev:
            return p.device
    if ports:
        return ports[0].device
    return None

def main():
    parser = argparse.ArgumentParser(description="Read live ESP32 sensor values & predict machine condition.")
    parser.add_argument("--port", type=str, default=None, help="Serial port (e.g., /dev/cu.usbserial-0001 or COM3)")
    parser.add_argument("--baud", type=int, default=115200, help="Baud rate (default: 115200)")
    args = parser.parse_args()

    port = args.port or auto_detect_port()
    if not port:
        print("❌ No serial port detected! Connect your ESP32 via USB and try again.")
        sys.exit(1)

    classifier = FaultClassifier(use_ml=True)

    print("=" * 75)
    print(" 📡 DOMAIN-X LIVE REAL-TIME MACHINE FAULT DIAGNOSTIC SYSTEM")
    print("=" * 75)
    print(f"🔌 Serial Port  : {port}")
    print(f"⚡ Baud Rate    : {args.baud}")
    print(f"🧠 ML Model     : RandomForestClassifier (models/fault_classifier.pkl)")
    print(f"🏷️ 6 Classes    : Healthy | Hair Strand | Scratched Bearing | Misalignment | Propeller Load | Uneven Propeller")
    print("Press Ctrl+C to stop.\n" + "=" * 75 + "\n")

    try:
        ser = serial.Serial(port, args.baud, timeout=1.0)
        time.sleep(1.5)  # Allow serial connection stabilization

        # Send START command to motor
        ser.write(b"START\n")
        ser.flush()

        buffer = []
        last_pred_time = time.time()

        while True:
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

                        buffer.append({
                            "accel_x": ax, "accel_y": ay, "accel_z": az,
                            "rpm": rpm, "temp": temp
                        })

                        # Keep buffer size around 100 samples (~1-2 sec window)
                        if len(buffer) > 100:
                            buffer.pop(0)

                        now = time.time()
                        if (now - last_pred_time) >= 0.5 and len(buffer) >= 10:
                            last_pred_time = now
                            df_win = pd.DataFrame(buffer)
                            feats, _, _ = extract_vibration_features(df_win, fs=1000)
                            res = classifier.predict(feats)

                            pred_cls = res["predicted_class"]
                            conf_pct = max(res["confidence_dict"].values()) * 100.0 if res["confidence_dict"] else 95.0
                            ts = time.strftime("%H:%M:%S")

                            # Color & status icon mapping
                            icon = "🟢" if "Healthy" in pred_cls else "🟡" if "Hair" in pred_cls else "🔴" if "Bearing" in pred_cls else "🟠" if "Misalignment" in pred_cls else "🔵" if "Load" in pred_cls else "🟣"
                            
                            print(f"[{ts}] ⚙️ {rpm:6.1f} RPM | 📐 RMS: {feats['rms']:.3f}g | 🌡️ {temp:4.1f}°C ➔ {icon} DIAGNOSIS: {pred_cls:25s} (Conf: {conf_pct:5.1f}%)")

                    except ValueError:
                        pass
            else:
                time.sleep(0.01)

    except KeyboardInterrupt:
        print("\n🛑 Stopping motor & releasing serial port...")
        try:
            ser.write(b"STOP\n")
            ser.flush()
            ser.close()
        except Exception:
            pass
        print("✅ Live session ended safely.")
    except Exception as e:
        print(f"\n❌ Serial Port Error: {e}")

if __name__ == "__main__":
    main()

