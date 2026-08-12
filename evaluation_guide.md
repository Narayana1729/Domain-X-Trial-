# 🏆 SENTINEL: Complete 4-State Physical & Spectral Master Guide

---

## 📊 Master 4-State Comparison Matrix

| Feature | 🟢 1. Healthy Baseline | 🔴 2. Shaft Misalignment | 🟠 3. Rotor Imbalance | 🟡 4. Bearing Fault (BPFO) |
|---|---|---|---|---|
| **Physical Setup** | Clean bearing, aligned mount, balanced fan | 1mm shim/washer under one motor mount screw | Small clip/bolt attached to 1 fan blade | Scratched/grooved 608ZZ bearing outer race |
| **FFT Spectral Signature** | Low flat baseline noise floor | **Dominant 2× RPM Harmonic Peak** | **Massive 1× RPM Fundamental Peak** | High-frequency transient impact spikes (**BPFO**) |
| **Vibration RMS** | Low (< 0.15g) | Moderate–High (0.35g – 0.55g) | Very High (0.60g – 0.95g) | Moderate with high impact spikes |
| **2× / 1× Spectral Ratio** | Low (< 0.30) | **Very High (> 0.80)** | Low (< 0.25) | Variable |
| **Kurtosis & Crest Factor** | Kurtosis ~3.0 (Gaussian) | Kurtosis ~3.2 | Kurtosis ~3.0 | **High Kurtosis (> 4.5)** & Crest Factor (> 3.5) |
| **Temperature Trend** | Constant Nominal (~36°C) | **Steady Thermal Rise (38°C ➔ 54°C)** | Nominal to slight rise | Elevated due to internal drag |
| **Raw Telemetry RPM** | **11k – 12k** (~1,900 Actual) | **14k** (2× pulse chatter) | **11.5k** (High amplitude) | **8k** (33% friction speed drop) |

---

## 🛠️ Physical Setup & Jury Pitch for All 4 Cases

### 🟢 Case 1: Healthy Baseline
* **Physical Rig Setup**:
  - Motor mounted flat on base plate (no shims).
  - Clean 608ZZ bearings on both DE & NDE pillow blocks.
  - Balanced 3-wing propeller attached.
* **What to Point Out on Dashboard**:
  - Status badge: **GREEN 🟢 Healthy**.
  - Flat, quiet vibration FFT spectrum across all frequencies.
  - Stable 11.5k raw telemetry baseline.
* **Pitch Talking Point**:
  > *"Judges, in the healthy state, the motor rotates smoothly. Vibration RMS is under 0.15g, the FFT spectrum is flat, and operating temperature is nominal."*

---

### 🔴 Case 2: Shaft Misalignment
* **Physical Rig Setup**:
  - Place a **1mm washer/shim** under one side of the motor mount screws.
* **What to Point Out on Dashboard**:
  - Status badge: **RED 🔴 Shaft Misalignment**.
  - Dominant **2× RPM harmonic peak** on FFT chart (at double the rotational frequency).
  - **2×/1× Ratio > 0.80** and steady **temperature rise graph**.
* **Pitch Talking Point**:
  > *"Here we shim the motor mount by 1mm. Misalignment creates double-beat forces per revolution, instantly triggering a massive 2× RPM harmonic peak and friction temperature rise."*

---

### 🟠 Case 3: Rotor Imbalance
* **Physical Rig Setup**:
  - Attach a small **binder clip or M3 bolt** to one wing of the 3-blade propeller (eccentric mass).
* **What to Point Out on Dashboard**:
  - Status badge: **ORANGE 🟠 Rotor Imbalance**.
  - Massive **1× RPM fundamental frequency spike** on FFT chart (at exact rotational speed ~30 Hz).
  - Overall Vibration RMS jumps above **0.60g**.
* **Pitch Talking Point**:
  > *"By adding an eccentric mass to one propeller wing, centrifugal force creates a heavy once-per-revolution wobble, manifesting as a dominant 1× RPM peak in the FFT spectrum."*

---

### 🟡 Case 4: Bearing Outer Race Fault (BPFO)
* **Physical Rig Setup**:
  - Swap the Non-Drive End (NDE) pillow block with a **scratched/grooved 608ZZ bearing**.
* **What to Point Out on Dashboard**:
  - Status badge: **YELLOW 🟡 Bearing Outer Race Defect**.
  - High-frequency transient impact bursts (**BPFO peak** around $4.7 \times f_{\text{rot}}$).
  - **High Kurtosis (> 4.5)** indicating spiky mechanical impacts, plus raw RPM drop to **8k** due to internal race drag.
* **Pitch Talking Point**:
  > *"When the rolling ball passes over a scratch on the outer race, it generates periodic micro-shocks. Our system detects these high-kurtosis impact transients and flags a Bearing Defect long before structural collapse."*
