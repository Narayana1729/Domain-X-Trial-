# CONCEPT NOTE (PROPOSAL & ARCHITECTURE)

## Project Title
**End-to-End Industrial IoT & AI Platform for Real-Time Machine Health Monitoring, Fault Diagnosis, and GenAI Technician Coaching**

---

## 1. Executive Summary & Proposed Solution

Unplanned machinery downtime costs global industrial manufacturing over **$50 billion annually** *(Source: ISA / Deloitte Industry 4.0 Studies)*. Rotating machinery components—such as bearings, drive shafts, impellers, and motors—frequently fail due to progressive mechanical wear, rotor imbalance, and shaft misalignment. Traditional maintenance relies either on reactive repairs after a breakdown occurs or rigid schedule-based servicing, both of which are inefficient and costly.

This project delivers a complete **Predictive Maintenance (PdM) Solution** built on a physical desktop test rig integrated with edge sensing, Fast Fourier Transform (FFT) signal processing, Machine Learning fault classification, and a hybrid Generative AI Technician Coaching Agent. 

The system continuously monitors machine health via a **200 Hz telemetry pipeline** (MPU6050 3-axis acceleration & gyroscopic angular velocity, DS18B20 surface temperature, and optical tachometry). Raw vibration data is transformed into frequency spectrum features to detect micro-impact shocks and harmonic peaks. An **XGBoost classifier** evaluates machine health state (**GREEN 🟢 Healthy ➔ YELLOW 🟡 Minor Fault ➔ RED 🔴 Critical Fault**), while an integrated **Gemini GenAI Agent** (with a local template engine fallback) translates spectral anomalies into plain-language root-cause diagnostics and actionable repair guides for field technicians.

---

## 2. Methodology & System Workflow

```
[ Physical Hardware Rig ]
  ├── 12V DC Motor + 8mm Axle + 608ZZ Bearings + 3-Blade Blue Propeller
  ├── MPU6050 (3-Axis Accel + Gyro)
  ├── DS18B20 (1-Wire Temperature Probe)
  └── IR Optical Tachometer (RPM Interrupt)
            │
            ▼
[ ESP32 Microcontroller Edge Firmware ]
  ├── 200 Hz I2C Sampling (400kHz Fast Bus, 5ms Interval)
  ├── Non-Blocking Asynchronous 1-Wire Temp Conversion
  ├── Hardware Interrupt RPM Counting & Thread-Safe ISR
  └── 115,200 Baud USB Serial CSV Telemetry Stream
            │
            ▼
[ Python Signal Processing & ML Engine ]
  ├── Real-Time Hanning Windowed FFT (scipy.signal)
  ├── Time & Frequency Feature Extraction (RMS, Peak, Kurtosis, 1x/2x/BPFO Peaks)
  └── XGBoost / Random Forest Multi-Class Fault Classifier
            │
            ├─────────────────────────────────────────┐
            ▼                                         ▼
[ Hybrid GenAI Agent (Gemini API + Local Templates) ] [ Real-Time Web Dashboard ]
  ├── Contextual Prompt Synthesis                       ├── Live FFT Spectrum Analyzer
  ├── Root Cause Analysis                               ├── Digital Gauges (RPM, Temp)
  └── Step-by-Step Repair Guide                         └── Incident Log & Status Badges
```

### Key Workflow Stages:
1. **High-Frequency Edge Acquisition:** ESP32 DevKit V1 samples MPU6050 6-axis motion data at 200 Hz (5ms interval via `micros()`), reads DS18B20 temperature asynchronously, counts RPM via hardware interrupts, and streams CSV packets over USB Serial.
2. **Spectral Signal Processing:** Python backend applies Hanning windowing and Fast Fourier Transform (FFT) to convert time-series vibration into frequency spectrums, extracting spectral power at fundamental (1× RPM = ~30 Hz @ 1800 RPM), harmonic (2× RPM = ~60 Hz), and bearing defect frequencies (BPFO).
3. **ML Fault Diagnosis:** An XGBoost classifier categorizes machine condition into 4 states: *Healthy*, *Bearing Outer Race Defect*, *Rotor Imbalance*, or *Shaft Misalignment*.
4. **GenAI Technician Report & Demo Resilience:** When anomalies trigger, the Gemini API synthesizes real-time metrics into a technician report. If venue network connectivity is unavailable, the system falls back to a **local rule-based diagnostic template engine**.

---

## 3. Technology Stack & Tools

| Component Layer | Technologies & Tools |
|---|---|
| **Hardware & Rig** | ESP32 DevKit V1 (240MHz Dual-Core MCU), MPU6050 (6-axis IMU), DS18B20 (1-Wire Temp Probe), IR Speed Sensor (FC-03), L298N Motor Driver, 12V 775 Motor, 608ZZ Bearings, 8mm Steel Shaft |
| **Firmware & Embedded** | C++ / Arduino IDE Framework, `Wire.h` (400kHz I2C), `DallasTemperature`, `OneWire`, Hardware Interrupts |
| **Data & Signal Processing** | Python 3.10+, `pyserial` (Serial Ingestion), `NumPy`, `SciPy.signal` (FFT, Hanning Window, Filtering), `Pandas` |
| **Machine Learning & AI** | `XGBoost`, `scikit-learn` (Random Forest, Group K-Fold CV), `google-generativeai` (Gemini API LLM Agent with Local Template Fallback) |
| **Frontend Dashboard** | `Streamlit`, `Plotly.js` (Real-Time Live Interactive Charts), `HTML5/CSS3` |

---

## 4. Datasets & Generalization Protocol

* **Multi-Trial Variable Labeled Rig Dataset (Primary Dataset):**
  To ensure physical generalization rather than session memorization, data is gathered across **multiple randomized trials per fault class** across parameter variations:
  1. *Healthy Baseline:* Clean 608ZZ bearing, balanced fan, aligned motor mount across 1000–3000 RPM range.
  2. *Bearing Defect (BPFO):* Scored 608ZZ outer race bearing tested across variable speeds and load conditions.
  3. *Rotor Imbalance:* Tested across 3 distinct eccentric mass variations (2g, 5g, 10g weights) on fan blades.
  4. *Shaft Misalignment & Overheating:* Tested across 3 offset shim thickness variations (0.5mm, 1.0mm, 1.5mm) and thermal rise.
* **Validation & Splitting Protocol:** Models are evaluated using **Group K-Fold Cross-Validation** (splitting by distinct trial recording sessions rather than random frame slicing) to prevent data leakage and guarantee physical generalization.
* **Reference Domain Benchmark:** CWRU Bearing Dataset reviewed for signal processing design and feature engineering methodology reference.

---

## 5. Target Performance Metrics & Expected Outcomes

1. **Target Fault Detection Latency:** Sub-second anomaly detection (<100ms pipeline execution) to catch mechanical wear long before structural failure.
2. **Target Diagnostic Accuracy:** **>95% target multi-class accuracy** across randomized trial splits on our 200 Hz variable dataset using XGBoost on FFT spectral features.
3. **High Offline Presentation Resilience:** Hybrid architecture incorporates a local rule-based fallback template engine to maintain live UI functionality even under zero-connectivity environment conditions.
4. **Low-Cost Desktop Prototype:** Proves that an industrial-grade PdM pipeline can be prototyped for under **₹2,500 INR** using standard microcontrollers and sensors.
