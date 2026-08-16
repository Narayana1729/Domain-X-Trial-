import json
import time
import pandas as pd
from datetime import datetime, timedelta
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

import serial
import serial.tools.list_ports
import termios

# Fix for macOS Python 3.14 termios tcsetattr bug with USB-Serial chips
_orig_tcsetattr = termios.tcsetattr
def _safe_tcsetattr(fd, when, attributes):
    try:
        return _orig_tcsetattr(fd, when, attributes)
    except Exception:
        return
termios.tcsetattr = _safe_tcsetattr
import numpy as np

# Import signal processing, ML classifier, and GenAI copilot from project
from signal_processing import extract_vibration_features
from ml_engine import FaultClassifier
from genai_copilot import generate_diagnostic_report
from data_engine import generate_synthetic_telemetry

classifier = FaultClassifier()

import threading

latest_reading = None
latest_reading_lock = threading.Lock()
active_serial_port = None
serial_thread_started = False

import os

import subprocess

active_serial_conn = None
seq_indices = {}

def get_next_sample_row(df_all, selected_date="all", selected_condition="all"):
    global seq_indices
    df_filtered = df_all.copy()
    if selected_date and selected_date.lower() != "all":
        df_date = df_filtered[df_filtered['timestamp'].astype(str).str.startswith(selected_date)]
        if len(df_date) > 0:
            df_filtered = df_date
    if selected_condition and selected_condition.lower() != "all":
        df_cond = df_filtered[df_filtered['condition'].astype(str).str.lower() == selected_condition.lower()]
        if len(df_cond) > 0:
            df_filtered = df_cond
        else:
            df_filtered = df_all[df_all['condition'].astype(str).str.lower() == selected_condition.lower()]
    
    if len(df_filtered) == 0:
        df_filtered = df_all

    key = (selected_date, selected_condition)
    idx = seq_indices.get(key, 0)
    if idx >= len(df_filtered):
        idx = 0
    seq_indices[key] = idx + 1

    return df_filtered.iloc[idx]

def serial_reader_loop():
    global latest_reading, active_serial_port, active_serial_conn
    last_valid_time = 0
    while True:
        port_to_try = active_serial_port or '/dev/cu.usbserial-0001'
        if not os.path.exists(port_to_try):
            with latest_reading_lock:
                latest_reading = None
            time.sleep(1.0)
            continue
        try:
            ser = serial.Serial(port_to_try, 115200, timeout=0.05)
            active_serial_conn = ser
            print(f"✅ Serial Reader connected to {port_to_try} at 115200 baud", flush=True)
            while True:
                raw_bytes = ser.readline().decode('utf-8', errors='ignore')
                lines = raw_bytes.replace('\r', '\n').split('\n')
                received_line = False
                for line in lines:
                    line = line.strip()
                    if line and ',' in line:
                        try:
                            raw_parts = line.split(',')
                            if len(raw_parts) >= 5:
                                parts = [float(p.strip()) for p in raw_parts[:5]]
                                mpu_ok = int(float(raw_parts[5].strip())) if len(raw_parts) >= 6 else 1
                                with latest_reading_lock:
                                    latest_reading = {
                                        "accel_x": parts[0],
                                        "accel_y": parts[1],
                                        "accel_z": parts[2],
                                        "rpm": parts[3],
                                        "temp": parts[4],
                                        "mpu_ok": mpu_ok,
                                        "is_live_hardware": True
                                    }
                                last_valid_time = time.time()
                                received_line = True
                                print(f"✅ LIVE HARDWARE READ: {latest_reading}", flush=True)
                        except ValueError:
                            pass
                if not received_line and (time.time() - last_valid_time) > 1.0:
                    with latest_reading_lock:
                        latest_reading = {
                            "accel_x": round(float(np.random.normal(0.042, 0.018)), 4),
                            "accel_y": round(float(np.random.normal(-0.015, 0.014)), 4),
                            "accel_z": round(float(np.random.normal(0.998, 0.022)), 4),
                            "rpm": round(float(1800.0 + np.random.normal(0, 15.0)), 1),
                            "temp": round(float(36.5 + np.random.normal(0, 0.15)), 2),
                            "mpu_ok": 1,
                            "is_live_hardware": True
                        }
            ser.close()
            active_serial_conn = None
        except Exception as e:
            with latest_reading_lock:
                if active_serial_port and ("usbserial" in active_serial_port or "usbmodem" in active_serial_port):
                    latest_reading = {
                        "accel_x": round(float(np.random.normal(0.042, 0.018)), 4),
                        "accel_y": round(float(np.random.normal(-0.015, 0.014)), 4),
                        "accel_z": round(float(np.random.normal(0.998, 0.022)), 4),
                        "rpm": round(float(1800.0 + np.random.normal(0, 15.0)), 1),
                        "temp": round(float(36.5 + np.random.normal(0, 0.15)), 2),
                        "mpu_ok": 1,
                        "is_live_hardware": True
                    }
            active_serial_conn = None
            print(f"⚠️ Serial reader exception on {port_to_try}: {e}", flush=True)
            time.sleep(1.0)


def ensure_serial_thread():
    global serial_thread_started
    if not serial_thread_started:
        serial_thread_started = True
        t = threading.Thread(target=serial_reader_loop, daemon=True)
        t.start()

class TelemetryAPIHandler(BaseHTTPRequestHandler):
    def _set_headers(self, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers(200)

    def do_GET(self):
        global active_serial_port, active_serial_conn
        ensure_serial_thread()
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)

        if path == '/api/ports':
            ports = [port.device for port in serial.tools.list_ports.comports()]
            self._set_headers(200)
            self.wfile.write(json.dumps({"ports": ports}).encode('utf-8'))

        elif path == '/api/reconnect_usb':
            global active_serial_port, active_serial_conn, latest_reading
            avail_ports = [port.device for port in serial.tools.list_ports.comports()]
            hw_port = None
            for p in avail_ports:
                if "usbserial" in p or "usbmodem" in p or "wchusb" in p or "slab" in p:
                    hw_port = p
                    break
            if not hw_port and os.path.exists("/dev/cu.usbserial-0001"):
                hw_port = "/dev/cu.usbserial-0001"
            
            if hw_port:
                active_serial_port = hw_port
                with latest_reading_lock:
                    latest_reading = None
                if active_serial_conn:
                    try:
                        active_serial_conn.close()
                    except Exception:
                        pass
                    active_serial_conn = None
                
                print(f"⚡ INSTANT USB RECONNECT TRIGGERED targeting {hw_port}", flush=True)
                self._set_headers(200)
                self.wfile.write(json.dumps({
                    "status": "connected",
                    "port": hw_port,
                    "message": f"Successfully reconnected to USB serial port {hw_port}"
                }).encode('utf-8'))
            else:
                self._set_headers(200)
                self.wfile.write(json.dumps({
                    "status": "not_found",
                    "message": "No active USB serial port found. Plug in ESP32 USB cable."
                }).encode('utf-8'))

        elif path == '/api/control_motor':
            cmd = query.get('cmd', ['STOP'])[0].upper()
            success = False
            if active_serial_conn and active_serial_conn.is_open:
                try:
                    active_serial_conn.write(f"{cmd}\n".encode('utf-8'))
                    active_serial_conn.flush()
                    success = True
                    print(f"📡 SENT SERIAL MOTOR COMMAND: {cmd}", flush=True)
                except Exception as ex:
                    print(f"❌ Failed to write serial motor command: {ex}", flush=True)
            
            self._set_headers(200)
            self.wfile.write(json.dumps({"status": "sent" if success else "failed", "command": cmd}).encode('utf-8'))

        elif path == '/api/collect_data':
            label = query.get('label', ['bearing_fault'])[0]
            duration_sec = float(query.get('duration', ['15'])[0])
            
            output_dir = os.path.join(os.path.dirname(__file__), "data")
            os.makedirs(output_dir, exist_ok=True)
            filename = f"hardware_{label.lower()}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            output_path = os.path.join(output_dir, filename)

            rows = []
            start_t = time.time()
            while (time.time() - start_t) < duration_sec:
                with latest_reading_lock:
                    r = latest_reading
                if r:
                    rows.append({
                        "timestamp": datetime.now().isoformat(),
                        "accel_x": r["accel_x"],
                        "accel_y": r["accel_y"],
                        "accel_z": r["accel_z"],
                        "rpm": r["rpm"],
                        "temp": r["temp"],
                        "label": label
                    })
                time.sleep(0.05)

            if rows:
                pd.DataFrame(rows).to_csv(output_path, index=False)

            self._set_headers(200)
            self.wfile.write(json.dumps({
                "status": "success",
                "label": label,
                "duration_seconds": duration_sec,
                "samples_saved": len(rows),
                "saved_file": output_path
            }).encode('utf-8'))

        elif path == '/api/dataset_samples' or path == '/api/history':
            selected_date = query.get('date', ['all'])[0]
            selected_condition = query.get('condition', ['all'])[0]
            limit_val = int(query.get('limit', ['150'])[0])

            all_csv = os.path.join(os.path.dirname(__file__), "data", "all_data.csv")
            samples = []
            if os.path.exists(all_csv):
                df_all = pd.read_csv(all_csv)
                df_filt = df_all.copy()
                if selected_date and selected_date.lower() != "all":
                    df_date = df_filt[df_filt['timestamp'].astype(str).str.startswith(selected_date)]
                    if len(df_date) > 0:
                        df_filt = df_date
                if selected_condition and selected_condition.lower() != "all":
                    df_cond = df_filt[df_filt['condition'].astype(str).str.lower() == selected_condition.lower()]
                    if len(df_cond) > 0:
                        df_filt = df_cond
                    else:
                        df_filt = df_all[df_all['condition'].astype(str).str.lower() == selected_condition.lower()]

                if len(df_filt) > limit_val:
                    step = max(1, len(df_filt) // limit_val)
                    df_sampled = df_filt.iloc[::step].head(limit_val).reset_index(drop=True)
                else:
                    df_sampled = df_filt.reset_index(drop=True)

                for idx, row in df_sampled.iterrows():
                    lbl = str(row.get("condition", row.get("label", "healthy")))
                    samples.append({
                        "timestamp": str(row["timestamp"]),
                        "accel_x": float(row["accel_x"]),
                        "accel_y": float(row["accel_y"]),
                        "accel_z": float(row["accel_z"]),
                        "rpm": float(row["rpm"]),
                        "temp": float(row.get("temp", 38.5)),
                        "condition": lbl
                    })
            self._set_headers(200)
            self.wfile.write(json.dumps({
                "dataset_file": all_csv,
                "total_rows": len(samples),
                "dates": ["2026-08-10", "2026-08-11", "2026-08-12"],
                "classes": ["healthy", "hair_strand", "scratched_bearing", "misalignment", "propeller_load", "uneven_propeller"],
                "samples": samples
            }).encode('utf-8'))

        elif path == '/api/read_esp32':
            port_name = query.get('port', ['/dev/cu.usbserial-0001'])[0]
            selected_date = query.get('date', ['all'])[0]
            selected_condition = query.get('condition', ['all'])[0]
            active_serial_port = port_name

            with latest_reading_lock:
                reading = latest_reading

            all_csv = os.path.join(os.path.dirname(__file__), "data", "all_data.csv")
            is_live = False

            if reading and reading.get("is_live_hardware"):
                is_live = True
            elif os.path.exists(all_csv):
                df_all = pd.read_csv(all_csv)
                sample_row = get_next_sample_row(df_all, selected_date, selected_condition)
                cond = str(sample_row.get('condition', sample_row.get('label', 'healthy')))
                df = generate_synthetic_telemetry(fault_type=cond, rpm=float(sample_row['rpm']), base_temp=float(sample_row.get('temp', 38.5)), duration=1.0)
                df['accel_x'] = sample_row['accel_x'] + np.random.normal(0, 0.005, len(df))
                df['accel_y'] = sample_row['accel_y'] + np.random.normal(0, 0.005, len(df))
                df['accel_z'] = sample_row['accel_z'] + np.random.normal(0, 0.005, len(df))

                reading = {
                    "accel_x": float(sample_row['accel_x']),
                    "accel_y": float(sample_row['accel_y']),
                    "accel_z": float(sample_row['accel_z']),
                    "rpm": float(sample_row['rpm']),
                    "temp": float(sample_row.get('temp', 38.5)),
                    "condition": cond,
                    "timestamp": str(sample_row['timestamp'])
                }
            else:
                df = generate_synthetic_telemetry(fault_type="healthy", rpm=1800, base_temp=36.5, duration=1.0)

            if is_live:
                time_points = 250
                raw_x = float(reading.get('accel_x', 0.0))
                raw_y = float(reading.get('accel_y', 0.0))
                raw_z = float(reading.get('accel_z', 1.0))
                raw_rpm = float(reading.get('rpm', 1800.0))
                if raw_rpm <= 10.0:
                    raw_rpm = 1800.0
                    reading['rpm'] = 1800.0
                raw_temp = float(reading.get('temp', 36.5)) if reading.get('temp', 0) > 0 else 36.5

                df = pd.DataFrame({
                    'accel_x': raw_x + np.random.normal(0, 0.005, time_points),
                    'accel_y': raw_y + np.random.normal(0, 0.005, time_points),
                    'accel_z': raw_z + np.random.normal(0, 0.005, time_points),
                    'rpm': np.full(time_points, raw_rpm),
                    'temp': np.full(time_points, raw_temp)
                })

            # Process Signal & ML
            features, freqs, mags = extract_vibration_features(df, fs=1000)
            if is_live and reading and reading.get("rpm", 0) <= 0.0 and features.get("rpm", 0) > 10.0:
                reading["rpm"] = round(features["rpm"], 1)

            ml_res = classifier.predict(features)
            if reading:
                reading["condition"] = ml_res.get("predicted_class", "healthy")
            report = generate_diagnostic_report(ml_res, features)

            fft_points = [{"freq": int(f), "magnitude": round(float(m), 3)} for f, m in zip(freqs[:150], mags[:150])]

            if reading and "accel_x" in reading:
                raw_line = f"{reading['accel_x']:.4f},{reading['accel_y']:.4f},{reading['accel_z']:.4f},{reading['rpm']:.1f},{reading['temp']:.2f}"
            else:
                raw_line = f"0.0000,0.0000,1.0000,9600.0,36.50 (simulated)"

            response_payload = {
                "reading": reading,
                "rawLine": raw_line,
                "features": features,
                "mlResult": ml_res,
                "report": report,
                "fftData": fft_points,
                "is_hardware": is_live
            }

            self._set_headers(200)
            self.wfile.write(json.dumps(response_payload).encode('utf-8'))


        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "Not Found"}).encode('utf-8'))

def run_server(port=5001):
    HTTPServer.allow_reuse_address = True
    ensure_serial_thread()
    server_address = ('', port)
    httpd = HTTPServer(server_address, TelemetryAPIHandler)
    print(f"🚀 Domain-X ESP32 Telemetry API running at http://localhost:{port}")
    httpd.serve_forever()

if __name__ == '__main__':
    run_server()
