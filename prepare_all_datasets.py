import os
import urllib.request
import ssl
import pandas as pd
import numpy as np
from scipy.io import loadmat

# Disable SSL verification for university website downloads
ssl._create_default_https_context = ssl._create_unverified_context

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

CWRU_URLS = {
    "healthy": "https://engineering.case.edu/sites/default/files/97.mat",          # Normal 1797 RPM
    "bearing_fault": "https://engineering.case.edu/sites/default/files/130.mat",    # 0.007" Outer Race Defect (BPFO)
}

def generate_imbalance_data(samples=12000, fs=1000, rpm=1800):
    """Generates synthetic dataset for Rotor Imbalance (1x RPM dominant peak on 3-blade blue propeller)."""
    t = np.linspace(0, samples / fs, samples, endpoint=False)
    f_rot = rpm / 60.0  # 30 Hz
    
    # 1x RPM sinusoidal spike (eccentric mass on one of 3 wings of blue propeller)
    accel_x = 1.4 * np.sin(2 * np.pi * f_rot * t) + np.random.normal(0, 0.05, samples)
    accel_y = 1.2 * np.cos(2 * np.pi * f_rot * t) + np.random.normal(0, 0.05, samples)
    accel_z = 0.98 + np.random.normal(0, 0.03, samples)
    
    df = pd.DataFrame({
        "timestamp": pd.date_range(start="2026-08-10 10:00:00", periods=samples, freq="1ms"),
        "accel_x": accel_x,
        "accel_y": accel_y,
        "accel_z": accel_z,
        "rpm": rpm,
        "temp": 39.2 + np.random.uniform(-0.3, 0.3, samples),
        "label": "Rotor Imbalance"
    })
    return df

def generate_misalignment_data(samples=12000, fs=1000, rpm=1800):
    """Generates synthetic dataset for Shaft Misalignment (2x RPM harmonic peak + thermal rise)."""
    t = np.linspace(0, samples / fs, samples, endpoint=False)
    f_rot = rpm / 60.0  # 30 Hz
    f_2x = 2.0 * f_rot   # 60 Hz
    
    # 2x RPM harmonic peak + friction temperature rise
    accel_x = 0.9 * np.sin(2 * np.pi * f_2x * t) + 0.3 * np.sin(2 * np.pi * f_rot * t) + np.random.normal(0, 0.06, samples)
    accel_y = 0.8 * np.cos(2 * np.pi * f_2x * t) + np.random.normal(0, 0.06, samples)
    accel_z = 0.98 + np.random.normal(0, 0.04, samples)
    
    temp = np.linspace(38.0, 54.5, samples) + np.random.uniform(-0.2, 0.2, samples)
    
    df = pd.DataFrame({
        "timestamp": pd.date_range(start="2026-08-10 10:00:00", periods=samples, freq="1ms"),
        "accel_x": accel_x,
        "accel_y": accel_y,
        "accel_z": accel_z,
        "rpm": rpm,
        "temp": temp,
        "label": "Shaft Misalignment"
    })
    return df

def prepare_all_datasets():
    """Fetches real CWRU data and generates full 4-class training dataset for Domain-X."""
    os.makedirs(DATA_DIR, exist_ok=True)
    print("📁 Target Data Directory:", DATA_DIR)
    
    datasets = []
    
    # 1. Download & Extract CWRU Healthy Baseline
    healthy_mat = os.path.join(DATA_DIR, "cwru_healthy.mat")
    if not os.path.exists(healthy_mat):
        print("📥 Downloading CWRU Healthy baseline data...")
        urllib.request.urlretrieve(CWRU_URLS["healthy"], healthy_mat)
    
    mat_data_h = loadmat(healthy_mat)
    key_h = [k for k in mat_data_h.keys() if 'DE_time' in k][0]
    sig_h = mat_data_h[key_h].flatten()[:12000]
    
    df_healthy = pd.DataFrame({
        "timestamp": pd.date_range(start="2026-08-10 10:00:00", periods=len(sig_h), freq="1ms"),
        "accel_x": sig_h,
        "accel_y": np.random.normal(0, 0.02, len(sig_h)),
        "accel_z": 0.98 + np.random.normal(0, 0.02, len(sig_h)),
        "rpm": 1797.0,
        "temp": 38.0 + np.random.uniform(-0.2, 0.2, len(sig_h)),
        "label": "Healthy Baseline"
    })
    df_healthy.to_csv(os.path.join(DATA_DIR, "healthy_baseline.csv"), index=False)
    datasets.append(df_healthy)
    print("✅ Healthy Baseline dataset saved (12,000 samples)")
    
    # 2. Download & Extract CWRU Bearing Outer Race Defect (BPFO)
    bearing_mat = os.path.join(DATA_DIR, "cwru_bearing_fault.mat")
    if not os.path.exists(bearing_mat):
        print("📥 Downloading CWRU Bearing Outer Race Defect data...")
        urllib.request.urlretrieve(CWRU_URLS["bearing_fault"], bearing_mat)
        
    mat_data_b = loadmat(bearing_mat)
    key_b = [k for k in mat_data_b.keys() if 'DE_time' in k][0]
    sig_b = mat_data_b[key_b].flatten()[:12000]
    
    df_bearing = pd.DataFrame({
        "timestamp": pd.date_range(start="2026-08-10 10:00:00", periods=len(sig_b), freq="1ms"),
        "accel_x": sig_b,
        "accel_y": np.random.normal(0, 0.04, len(sig_b)),
        "accel_z": 0.98 + np.random.normal(0, 0.04, len(sig_b)),
        "rpm": 1772.0,
        "temp": 42.5 + np.random.uniform(-0.3, 0.3, len(sig_b)),
        "label": "Bearing Outer Race Fault"
    })
    df_bearing.to_csv(os.path.join(DATA_DIR, "bearing_outer_race_fault.csv"), index=False)
    datasets.append(df_bearing)
    print("✅ Bearing Outer Race Fault dataset saved (12,000 samples)")

    # 3. Generate Rotor Imbalance Dataset (3-Blade Blue Propeller)
    df_imbalance = generate_imbalance_data()
    df_imbalance.to_csv(os.path.join(DATA_DIR, "rotor_imbalance_fault.csv"), index=False)
    datasets.append(df_imbalance)
    print("✅ Rotor Imbalance Fault dataset saved (12,000 samples)")

    # 4. Generate Shaft Misalignment Dataset
    df_misalignment = generate_misalignment_data()
    df_misalignment.to_csv(os.path.join(DATA_DIR, "shaft_misalignment_fault.csv"), index=False)
    datasets.append(df_misalignment)
    print("✅ Shaft Misalignment Fault dataset saved (12,000 samples)")

    # Combine into unified dataset
    df_full = pd.concat(datasets, ignore_index=True)
    full_csv_path = os.path.join(DATA_DIR, "complete_training_dataset.csv")
    df_full.to_csv(full_csv_path, index=False)
    print(f"\n🎉 FULL DATASET READY: {full_csv_path} ({len(df_full)} total rows across 4 classes)")

if __name__ == "__main__":
    prepare_all_datasets()
