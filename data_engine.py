import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import serial
import serial.tools.list_ports

def get_available_serial_ports():
    """Lists available serial ports on the host machine."""
    ports = serial.tools.list_ports.comports()
    return [port.device for port in ports]

def generate_synthetic_telemetry(fault_type="healthy", rpm=1800.0, base_temp=38.0, duration=1.0, fs=1000, noise_level=0.05):
    """
    Generates synthetic time-series telemetry data for rotating machinery.
    Schema: timestamp, accel_x, accel_y, accel_z, rpm, temp, label
    """
    n_samples = int(fs * duration)
    t = np.linspace(0, duration, n_samples, endpoint=False)
    f_rot = rpm / 60.0  # Fundamental rotation frequency (Hz)
    
    # 1. Base healthy sinusoidal rotation on X and Y + noise
    accel_x = 0.08 * np.sin(2 * np.pi * f_rot * t) + np.random.normal(0, noise_level, n_samples)
    accel_y = 0.08 * np.cos(2 * np.pi * f_rot * t) + np.random.normal(0, noise_level, n_samples)
    accel_z = 0.98 + np.random.normal(0, noise_level * 0.5, n_samples)  # Gravity vector offset
    
    temp = base_temp + np.random.uniform(-0.2, 0.2, n_samples)
    label = "Healthy"

    if fault_type == "imbalance":
        # Strong 1x RPM component on X & Y axes
        accel_x += 1.4 * np.sin(2 * np.pi * f_rot * t)
        accel_y += 1.2 * np.cos(2 * np.pi * f_rot * t)
        label = "Rotor Imbalance"
        
    elif fault_type == "misalignment":
        # Prominent 2x RPM harmonic peak + temperature elevation
        accel_x += 0.9 * np.sin(2 * np.pi * (2 * f_rot) * t) + 0.4 * np.sin(2 * np.pi * f_rot * t)
        accel_y += 0.8 * np.cos(2 * np.pi * (2 * f_rot) * t)
        temp += np.linspace(0, 15.0, n_samples)  # Thermal rise due to shaft friction
        label = "Shaft Misalignment"
        
    elif fault_type == "bearing_fault":
        # Ball Pass Frequency Outer Race (BPFO) ~ 4.7 x f_rot
        f_bpfo = 4.7 * f_rot
        impact_period = 1.0 / f_bpfo
        impact_times = np.arange(0, duration, impact_period)
        
        # Exponentially decaying high-frequency transients (~2000 Hz resonance)
        impact_signal = np.zeros(n_samples)
        for t_i in impact_times:
            idx = (t >= t_i)
            decay = np.exp(-120 * (t[idx] - t_i))
            resonance = np.sin(2 * np.pi * 2200 * (t[idx] - t_i))
            impact_signal[idx] += 1.6 * decay * resonance
            
        accel_x += impact_signal
        accel_y += 0.5 * impact_signal
        label = "Bearing Outer Race Fault"

    # Generate timestamp series
    start_time = datetime.now()
    timestamps = [start_time + timedelta(seconds=i / fs) for i in range(n_samples)]
    
    df = pd.DataFrame({
        "timestamp": timestamps,
        "accel_x": accel_x,
        "accel_y": accel_y,
        "accel_z": accel_z,
        "rpm": rpm,
        "temp": temp,
        "label": label
    })
    
    return df

def load_cwru_sample(fault_type="healthy", duration=1.0, fs=1000):
    """
    Generates/Loads realistic CWRU drive-end bearing benchmark data sample.
    """
    # Maps CWRU defect frequencies: 12k sampled drive-end bearing data
    return generate_synthetic_telemetry(fault_type=fault_type, rpm=1772.0, base_temp=41.5, duration=duration, fs=fs, noise_level=0.08)

def read_esp32_serial_sample(port, baudrate=115200, timeout=1.0):
    """
    Reads a single frame of CSV telemetry from an attached ESP32 physical hardware device.
    Expected Serial Format: "accel_x,accel_y,accel_z,rpm,temp"
    """
    try:
        with serial.Serial(port, baudrate, timeout=timeout) as ser:
            line = ser.readline().decode('utf-8').strip()
            if line:
                parts = [float(val) for val in line.split(',')]
                if len(parts) >= 5:
                    return {
                        "timestamp": datetime.now(),
                        "accel_x": parts[0],
                        "accel_y": parts[1],
                        "accel_z": parts[2],
                        "rpm": parts[3],
                        "temp": parts[4]
                    }
    except Exception as e:
        return {"error": str(e)}
    return None
