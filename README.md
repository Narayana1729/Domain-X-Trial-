# Domain-X — Master Industrial IoT Predictive Maintenance System

Welcome to the **Domain-X Master Dashboard** for Industrial IoT rotating machinery predictive maintenance.

## 🚀 Master Dashboard Features

1. **Component-Based Routing Views**:
   - **`Master Dashboard` (`#viewMasterOverview`)**: Overall plant-wide metrics, KPI cards, selected machine telemetry, FFT preview, ML classification, and GenAI technician guidance.
   - **`FFT Spectrum View` (`#viewFftAnalysis`)**: High-resolution dedicated Canvas FFT analyzer ($0 - 5000\text{ Hz}$), crosshairs, live Waterfall Spectrogram, raw $a(t)$ waveform & Hilbert envelope demodulation, bearing kinematics calculator (BPFO/BPFI/BSF/FTF), acoustic stethoscope audio synthesizer, and CSV/PNG export.
   - **`GenAI Technician Guide` (`#viewTechnicianGuide`)**: Dedicated AI-assisted Standard Operating Procedures (SOP) workflow.
   - **`Fleet Asset Overview` (`#viewFleetAssets`)**: Plant-wide rotating equipment fleet overview cards.

2. **Core Machine State Simulator**:
   - **Healthy (Clean Baseline)**
   - **Bearing Outer Race Defect (BPFO)**
   - **Rotor Unbalance (1X RPM)**
   - **Shaft Misalignment (2X RPM)**

3. **Telemetry & Machine Health Metrics**:
   - Rotational Speed (**RPM**), Temperature (**°C**), Vibration RMS (**mm/s** with ISO 10816 zone classification), Peak Amplitude (**g pk**), Crest Factor (**CF**), Kurtosis (**$\beta_2$**), Peak-to-Peak (**g pk-pk**), $1\times\text{ RPM}$, $2\times\text{ RPM}$, $\text{BPFO}$, $\text{BPFI}$, $\text{BSF}$, and $\text{FTF}$ amplitudes.

4. **FFT Signal Diagnostics Suite**:
   - **Scale Mode**: Linear ($g$) and Logarithmic ($\text{dB}$) switching.
   - **Windowing Functions**: Hanning, Hamming, Flat-Top, Blackman, Uniform/Rectangular.
   - **Bandwidth Ranges**: $0-500\text{ Hz}$, $0-1000\text{ Hz}$, $0-2000\text{ Hz}$, $0-5000\text{ Hz}$.
   - **Waterfall Spectrogram**: 55-slice rolling time-frequency heatmap.
   - **Waveform & Demodulation**: Timebase controls ($20\text{ ms}, 50\text{ ms}, 100\text{ ms/div}$), Raw vs Envelope Demodulation, Freeze frame.
   - **Bearing Kinematics**: Dynamic formula calculation for SKF 6208, FAG 6310, and NSK 6205.
   - **Acoustic Stethoscope**: Real-time Web Audio API sound synthesizer with volume control.
   - **Data Export**: 1-click PNG spectrum snapshot and CSV spectral peaks download.

5. **Backend Ready (`window.DomainXAPI`)**:
   - Connect real ESP32 or backend WebSocket payloads via `DomainXAPI.connectWebSocket('ws://localhost:8080/api/telemetry')`.

---

## 🛠️ Repository Layout

```
c:\Users\siriv\domainx/
├── frontend/
│   ├── index.html     # Master dashboard layout & component views
│   ├── style.css      # Dark industrial aesthetics & view routing styles
│   └── script.js     # Component router, telemetry model, Canvas FFT & API adapter
└── README.md          # Technical documentation & backend connection guide
```

---

## 💻 Running the Dashboard

Your static HTTP server is active:
👉 **[http://localhost:8000](http://localhost:8000)**
