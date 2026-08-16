# Domain-X — Master Industrial IoT Predictive Maintenance System

Welcome to the **Domain-X Master Dashboard** for Industrial IoT rotating machinery predictive maintenance.

## 🚀 Master Dashboard Features

1. **Component-Based Routing Views**:
   - **`Master Dashboard` (`#viewMasterOverview`)**: Overall plant-wide metrics, KPI cards, selected machine telemetry, FFT preview, ML classification, and GenAI technician guidance.
   - **`FFT Spectrum View` (`#viewFftAnalysis`)**: High-resolution dedicated Canvas FFT analyzer ($0 - 5000\text{ Hz}$), crosshairs, live Waterfall Spectrogram, raw $a(t)$ waveform & Hilbert envelope demodulation, bearing kinematics calculator (BPFO/BPFI/BSF/FTF), acoustic stethoscope audio synthesizer, and CSV/PNG export.
   - **`GenAI Technician Guide` (`#viewTechnicianGuide`)**: Dedicated AI-assisted Root Cause Diagnosis, 4-step interactive SOP repair checklist with live progress tracking, Gemini AI maintenance chat console, offline local template fallback, and report generator.
   - **`Multi-Machine Plant Fleet Overview` (`#viewFleetAssets`)**: Plant-wide fleet management with 4 summary KPI cards (24 Monitored, 19 Healthy, 3 Warning, 2 Critical, 48 Days Fleet Avg RUL), real-time search & filtering, 10 responsive machine cards with animated mini-sparklines, action routing ("Inspect Rig", "View FFT", "GenAI Report"), and live alert event feed.
   - **`Field Technician Interface (Mobile-First)` (`#viewFieldTechnician`)**: OLED high-contrast dark interface designed for touchscreens and technicians wearing gloves ($\ge 48\text{px}$ touch targets), top status bar (ESP32 connection, 88% battery, Machine ID RIG-04, optical QR scanner modal), prominent machine status card with radial circular health gauge (87%), 4 large high-visibility telemetry cards (RPM, Temp, Vib RMS, Dominant Peak), glove-friendly action buttons, repair progress tracker, active alert banner, and fixed mobile bottom navigation.

2. **AI Technician Copilot Drawer Modal**:
   - Slide-over drawer accessible from anywhere in the application via the top header **"AI Technician Copilot"** button.
   - Real-time incident banner, anomaly breakdown cards, synchronized 4-step checklist, and interactive assistant chat.

3. **Core Machine State Simulator**:
   - **Healthy (Clean Baseline)**
   - **Bearing Outer Race Defect (BPFO)**
   - **Rotor Unbalance (1X RPM)**
   - **Shaft Misalignment (2X RPM)**

4. **Telemetry & Machine Health Metrics**:
   - Rotational Speed (**RPM**), Temperature (**°C**), Vibration RMS (**mm/s** with ISO 10816 zone classification), Peak Amplitude (**g pk**), Crest Factor (**CF**), Kurtosis (**$\beta_2$**), Peak-to-Peak (**g pk-pk**), $1\times\text{ RPM}$, $2\times\text{ RPM}$, $\text{BPFO}$, $\text{BPFI}$, $\text{BSF}$, and $\text{FTF}$ amplitudes.

5. **FFT Signal Diagnostics Suite**:
   - **Scale Mode**: Linear ($g$) and Logarithmic ($\text{dB}$) switching.
   - **Windowing Functions**: Hanning, Hamming, Flat-Top, Blackman, Uniform/Rectangular.
   - **Bandwidth Ranges**: $0-500\text{ Hz}$, $0-1000\text{ Hz}$, $0-2000\text{ Hz}$, $0-5000\text{ Hz}$.
   - **Waterfall Spectrogram**: 55-slice rolling time-frequency heatmap.
   - **Waveform & Demodulation**: Timebase controls ($20\text{ ms}, 50\text{ ms}, 100\text{ ms/div}$), Raw vs Envelope Demodulation, Freeze frame.
   - **Bearing Kinematics**: Dynamic formula calculation for SKF 6208, FAG 6310, and NSK 6205.
   - **Acoustic Stethoscope**: Real-time Web Audio API sound synthesizer with volume control.
   - **Data Export**: 1-click PNG spectrum snapshot, CSV spectral peaks, Fleet Summary CSV, and Markdown incident reports.

6. **Backend Ready (`window.DomainXAPI`)**:
   - Connect real ESP32 or backend WebSocket payloads via `DomainXAPI.connectWebSocket('ws://localhost:8080/api/telemetry')`.
   - Update Copilot diagnostics via `DomainXAPI.updateCopilotDiagnosis(data)`.
   - Stream multi-machine fleet telemetry via `DomainXAPI.updateFleetData(fleetArray)`.

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
