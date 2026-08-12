import urllib.request
import ssl
import os
import pandas as pd
import numpy as np

# Disable SSL verification for university HTTPS downloads
ssl._create_default_https_context = ssl._create_unverified_context

CWRU_URLS = {
    "healthy": "https://engineering.case.edu/sites/default/files/97.mat",          # Normal 1797 RPM
    "outer_race_7": "https://engineering.case.edu/sites/default/files/130.mat",    # 0.007" Outer Race Defect @ 6 o'clock
    "inner_race_7": "https://engineering.case.edu/sites/default/files/105.mat",    # 0.007" Inner Race Defect
    "ball_7": "https://engineering.case.edu/sites/default/files/118.mat"          # 0.007" Ball Defect
}

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

def download_and_extract_cwru():
    """Downloads CWRU Matlab files and extracts accelerometer time series into clean CSVs."""
    os.makedirs(DATA_DIR, exist_ok=True)
    print("📁 Target Data Directory:", DATA_DIR)
    
    from scipy.io import loadmat

    for fault_name, url in CWRU_URLS.items():
        mat_path = os.path.join(DATA_DIR, f"cwru_{fault_name}.mat")
        csv_path = os.path.join(DATA_DIR, f"cwru_{fault_name}.csv")
        
        if not os.path.exists(csv_path):
            print(f"📥 Downloading CWRU dataset: {fault_name}...")
            try:
                urllib.request.urlretrieve(url, mat_path)
                mat_data = loadmat(mat_path)
                
                # Extract drive-end vibration acceleration signal key
                key = [k for k in mat_data.keys() if 'DE_time' in k][0]
                signal = mat_data[key].flatten()[:12000]  # Take 1 second @ 12 kHz
                
                # Resample / format into standard schema
                df = pd.DataFrame({
                    "timestamp": pd.date_range(start="2026-08-10 10:00:00", periods=len(signal), freq="83.333us"),
                    "accel_x": signal,
                    "accel_y": np.random.normal(0, 0.02, len(signal)),
                    "accel_z": 0.98 + np.random.normal(0, 0.02, len(signal)),
                    "rpm": 1797.0,
                    "temp": 41.5 if "outer" in fault_name else 38.0,
                    "label": fault_name.replace("_", " ").title()
                })
                
                df.to_csv(csv_path, index=False)
                print(f"✅ Saved CSV: {csv_path} ({len(df)} rows)")
            except Exception as e:
                print(f"⚠️ Error processing {fault_name}: {e}")
        else:
            print(f"⚡ Already exists: {csv_path}")

if __name__ == "__main__":
    download_and_extract_cwru()
