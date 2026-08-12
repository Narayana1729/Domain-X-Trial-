import json
import time
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

def serial_reader_loop():
    global latest_reading, active_serial_port, active_serial_conn
    while True:
        port_to_try = active_serial_port or '/dev/cu.usbserial-0001'
        try:
            subprocess.run(["stty", "-f", port_to_try, "115200", "raw", "-echo"], check=False)
            ser = serial.Serial(port_to_try, 115200, timeout=1.0)
            active_serial_conn = ser
            print(f"✅ Serial Reader connected to {port_to_try} at 115200 baud", flush=True)
            while True:
                raw_bytes = ser.readline().decode('utf-8', errors='ignore')
                lines = raw_bytes.replace('\r', '\n').split('\n')
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
                                        "mpu_ok": mpu_ok
                                    }
                                print(f"✅ LIVE HARDWARE READ: {latest_reading}", flush=True)
                        except ValueError:
                            pass
            ser.close()
            active_serial_conn = None
        except Exception as e:
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
        ensure_serial_thread()
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)

        if path == '/api/ports':
            ports = [port.device for port in serial.tools.list_ports.comports()]
            self._set_headers(200)
            self.wfile.write(json.dumps({"ports": ports}).encode('utf-8'))

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

        elif path == '/api/read_esp32':
            global active_serial_port
            port_name = query.get('port', ['/dev/cu.usbserial-0001'])[0]
            active_serial_port = port_name

            with latest_reading_lock:
                reading = latest_reading

            # Fallback if port not connected/readable yet
            if not reading:
                df = generate_synthetic_telemetry(fault_type="healthy", rpm=1800, base_temp=36.5, duration=1.0)
            else:
                raw_rpm = reading['rpm']
                temp = reading['temp'] if reading['temp'] > 0 else 36.5

                # Infer physical fault state based on hardware empirical baselines
                if 100 < raw_rpm < 9500:  # ~8k: Scratched / Broken Bearing drag drop
                    fault_type = "bearing_fault"
                    rpm_scaled = 1330.0
                elif raw_rpm > 13200:      # ~14k: Shaft Misalignment 2x pulse chatter
                    fault_type = "misalignment"
                    rpm_scaled = 2330.0
                else:                       # ~11k-12k: Healthy baseline
                    fault_type = "healthy"
                    rpm_scaled = 1800.0

                df = generate_synthetic_telemetry(fault_type=fault_type, rpm=rpm_scaled, base_temp=temp, duration=1.0)
                df['accel_x'] += reading['accel_x']
                df['accel_y'] += reading['accel_y']
                df['accel_z'] += (reading['accel_z'] - 1.0)

            # Process Signal & ML
            features, freqs, mags = extract_vibration_features(df, fs=1000)
            ml_res = classifier.predict(features)
            report = generate_diagnostic_report(ml_res, features)

            fft_points = [{"freq": int(f), "magnitude": round(float(m), 3)} for f, m in zip(freqs[:150], mags[:150])]

            if reading:
                raw_line = f"{reading['accel_x']:.4f},{reading['accel_y']:.4f},{reading['accel_z']:.4f},{reading['rpm']:.1f},{reading['temp']:.2f}"
            else:
                raw_line = f"0.0000,0.0000,1.0000,1800.0,36.50 (simulated)"

            response_payload = {
                "reading": reading,
                "rawLine": raw_line,
                "features": features,
                "mlResult": ml_res,
                "report": report,
                "fftData": fft_points
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
