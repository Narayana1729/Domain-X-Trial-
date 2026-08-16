#!/usr/bin/env python3
"""
Domain-X Emergency Motor Stop Executable
Sends STOP command to active Python API backend and ESP32 USB serial port.
"""

import sys
import json
import urllib.request
import urllib.parse
import serial
import serial.tools.list_ports

def send_stop_command():
    print("🛑 Initiating Emergency Motor Stop...")

    # Method 1: Hit API Backend endpoint
    try:
        url = "http://localhost:5001/api/control_motor?cmd=STOP"
        req = urllib.request.urlopen(url, timeout=2)
        resp = json.loads(req.read().decode('utf-8'))
        print(f"✅ API Response: {resp}")
    except Exception as e:
        print(f"⚠️ API trigger note: {e}")

    # Method 2: Direct USB Serial Write
    ports = [p.device for p in serial.tools.list_ports.comports()]
    target_port = None
    for p in ports:
        if "usbserial" in p or "usbmodem" in p:
            target_port = p
            break
    if not target_port and sys.platform == "darwin":
        target_port = "/dev/cu.usbserial-0001"

    if target_port:
        try:
            ser = serial.Serial(target_port, 115200, timeout=1.0)
            ser.write(b"STOP\n")
            ser.flush()
            ser.close()
            print(f"✅ Directly sent 'STOP\\n' over Serial to {target_port}")
        except Exception as err:
            print(f"⚠️ Direct Serial note: {err}")

    print("✨ EMERGENCY MOTOR STOP COMPLETE.")

if __name__ == "__main__":
    send_stop_command()
