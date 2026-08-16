import os
import numpy as np
import pandas as pd

# ============================================================
# SETTINGS
# ============================================================

SAMPLES_PER_CLASS = 10000
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "data")
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "all_data.csv")

rng = np.random.default_rng(42)

# ============================================================
# REAL OBSERVED RPM PATTERNS (6 CLASSES)
# ============================================================

RPM_PATTERNS = {
    "healthy": [
        9600, 9600, 9600, 9600,
        10200,
        14400, 14400,
        15000,
        19200, 19200, 19200,
        17400,
        9600,
        7200,
        18000
    ],

    "hair_strand": [
        6000, 6600, 6600,
        6000, 6600, 6600,
        6000, 6600, 6600,
        6000, 6600,
        7200,
        6000, 6000
    ],

    "scratched_bearing": [
        9600, 9600,
        10200, 10200,
        9600, 9600,
        9600, 9600,
        10200, 10200
    ],

    "misalignment": [
        9600, 8400,
        9000, 9000,
        9000, 9000,
        9600, 8400,
        9600, 9000,
        9000, 9600,
        8400, 9600,
        9000, 9000
    ],

    "propeller_load": [
        4800, 5400, 5400,
        4800, 6000,
        4800, 5400, 5400,
        4800, 6000,
        4800, 6000,
        4800, 6000,
        4800, 6000
    ],

    "uneven_propeller": [
        1200, 3600, 4200,
        1200, 3600, 4200,
        4200, 8400,
        7800, 7200,
        9000, 9000,
        7800
    ]
}

# ============================================================
# VIBRATION PROFILES & TEMPERATURE PROFILES
# ============================================================

PROFILES = {
    "healthy": {
        "x_noise": 0.015, "y_noise": 0.015, "z_noise": 0.015,
        "x_vibration": 0.015, "y_vibration": 0.015, "z_vibration": 0.015,
        "temp_base": 36.5, "temp_std": 0.3
    },
    "hair_strand": {
        "x_noise": 0.035, "y_noise": 0.040, "z_noise": 0.030,
        "x_vibration": 0.060, "y_vibration": 0.070, "z_vibration": 0.050,
        "temp_base": 38.0, "temp_std": 0.5
    },
    "scratched_bearing": {
        "x_noise": 0.050, "y_noise": 0.055, "z_noise": 0.045,
        "x_vibration": 0.090, "y_vibration": 0.100, "z_vibration": 0.080,
        "temp_base": 44.5, "temp_std": 0.8
    },
    "misalignment": {
        "x_noise": 0.045, "y_noise": 0.050, "z_noise": 0.025,
        "x_vibration": 0.080, "y_vibration": 0.095, "z_vibration": 0.035,
        "temp_base": 49.0, "temp_std": 1.0
    },
    "propeller_load": {
        "x_noise": 0.030, "y_noise": 0.035, "z_noise": 0.030,
        "x_vibration": 0.045, "y_vibration": 0.055, "z_vibration": 0.045,
        "temp_base": 41.0, "temp_std": 0.6
    },
    "uneven_propeller": {
        "x_noise": 0.080, "y_noise": 0.090, "z_noise": 0.070,
        "x_vibration": 0.140, "y_vibration": 0.160, "z_vibration": 0.120,
        "temp_base": 43.0, "temp_std": 0.9
    }
}

def generate_rpm(condition, count):
    pattern = np.array(RPM_PATTERNS[condition], dtype=float)
    rpm = rng.choice(pattern, size=count)
    rpm += rng.normal(0, 80, count)
    rpm = np.maximum(rpm, 500)
    return np.round(rpm, 1)

def generate_mpu(condition, rpm):
    profile = PROFILES[condition]
    n = len(rpm)
    rpm_factor = np.sqrt(rpm / 10000.0)

    x = rng.normal(0, profile["x_noise"], n)
    y = rng.normal(0, profile["y_noise"], n)
    z = rng.normal(1.0, profile["z_noise"], n)

    x += rng.normal(0, profile["x_vibration"] * rpm_factor, n)
    y += rng.normal(0, profile["y_vibration"] * rpm_factor, n)
    z += rng.normal(0, profile["z_vibration"] * rpm_factor, n)

    if condition == "hair_strand":
        events = rng.random(n) < 0.15
        x[events] += rng.normal(0, 0.10, events.sum())
        y[events] += rng.normal(0, 0.12, events.sum())
        z[events] += rng.normal(0, 0.08, events.sum())

    elif condition == "scratched_bearing":
        events = rng.random(n) < 0.25
        x[events] += rng.normal(0, 0.15, events.sum())
        y[events] += rng.normal(0, 0.17, events.sum())
        z[events] += rng.normal(0, 0.12, events.sum())

    elif condition == "misalignment":
        x += rng.normal(0, 0.04, n)
        y += rng.normal(0, 0.05, n)

    elif condition == "propeller_load":
        load_variation = rng.normal(1.0, 0.20, n)
        x *= load_variation
        y *= load_variation
        z = 1.0 + (z - 1.0) * load_variation

    elif condition == "uneven_propeller":
        spikes = rng.random(n) < 0.25
        x[spikes] += rng.normal(0, 0.30, spikes.sum())
        y[spikes] += rng.normal(0, 0.35, spikes.sum())
        z[spikes] += rng.normal(0, 0.25, spikes.sum())

    temp = rng.normal(profile["temp_base"], profile["temp_std"], n)

    return x, y, z, temp

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    all_data = []

    # Target Dates: Aug 10, Aug 11, Aug 12, 2026
    start_dates = [
        "2026-08-10 08:00:00",
        "2026-08-10 14:30:00",
        "2026-08-11 09:15:00",
        "2026-08-11 16:00:00",
        "2026-08-12 10:00:00",
        "2026-08-12 17:45:00"
    ]

    conditions = list(RPM_PATTERNS.keys())

    for idx, condition in enumerate(conditions):
        print(f"⚙️ Generating {SAMPLES_PER_CLASS:,} {condition} samples...")
        rpm = generate_rpm(condition, SAMPLES_PER_CLASS)
        x, y, z, temp = generate_mpu(condition, rpm)

        # Distribute timestamps across Aug 10, 11, 12
        base_time = pd.Timestamp(start_dates[idx % len(start_dates)])
        # 10ms sampling interval with small random microsecond jitter
        offsets = np.cumsum(rng.uniform(0.008, 0.012, SAMPLES_PER_CLASS))
        timestamps = [base_time + pd.Timedelta(seconds=s) for s in offsets]

        df = pd.DataFrame({
            "timestamp": timestamps,
            "accel_x": np.round(x, 4),
            "accel_y": np.round(y, 4),
            "accel_z": np.round(z, 4),
            "rpm": rpm,
            "temp": np.round(temp, 2),
            "condition": condition,
            "label": condition
        })
        all_data.append(df)

    dataset = pd.concat(all_data, ignore_index=True)

    # Sort dataset chronologically by timestamp ascending
    print("⏳ Sorting dataset chronologically by timestamp (Aug 10 ➔ Aug 11 ➔ Aug 12)...")
    dataset = dataset.sort_values(by="timestamp").reset_index(drop=True)

    # Format timestamp string cleanly
    dataset["timestamp"] = dataset["timestamp"].dt.strftime("%Y-%m-%d %H:%M:%S.%f").str[:-3]

    dataset.to_csv(OUTPUT_FILE, index=False)

    print("\n" + "=" * 60)
    print("✨ SYNTHETIC 6-CLASS MOTOR DATASET GENERATED & SORTED")
    print("=" * 60)
    print(f"📊 Total samples  : {len(dataset):,}")
    print(f"🏷️ Classes (6)   : {list(RPM_PATTERNS.keys())}")
    print(f"📅 Date Range     : {dataset['timestamp'].min()} ➔ {dataset['timestamp'].max()}")
    print(f"📁 Output CSV     : {OUTPUT_FILE}")
    print("=" * 60)
    print("\nClass distribution:")
    print(dataset["condition"].value_counts())
    print("\nChronologically Sorted Dataset Sample (First 15 rows):")
    print(dataset.head(15).to_string(index=False))

if __name__ == "__main__":
    main()

