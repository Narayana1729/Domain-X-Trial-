# Domain-X — Master Industrial IoT Predictive Maintenance System

Welcome to the **Domain-X Master Dashboard** for Industrial IoT rotating machinery predictive maintenance.

## 🚀 Master Dashboard Features

1. **Component-Based Routing Views**:
   - **`Master Dashboard` (`#viewMasterOverview`)**: Overall plant-wide metrics, KPI cards, selected machine telemetry, FFT preview, ML classification, and GenAI technician guidance.
   - **`FFT Spectrum View` (`#viewFftAnalysis`)**: High-resolution dedicated Canvas FFT frequency spectrum analyzer ($0 - 500\text{ Hz}$).
   - **`GenAI Technician Guide` (`#viewTechnicianGuide`)**: Dedicated AI-assisted Standard Operating Procedures (SOP) workflow.
   - **`Fleet Asset Overview` (`#viewFleetAssets`)**: Plant-wide rotating equipment fleet overview cards.

2. **Core Machine State Simulator**:
   - **Healthy**
   - **Bearing Outer Race Defect (BPFO)**
   - **Rotor Imbalance (1x RPM)**
   - **Shaft Misalignment (2x RPM)**

3. **Telemetry & Machine Health Metrics**:
   - Rotational Speed (**RPM**), Temperature (**°C**), Vibration RMS (**mm/s** with ISO 10816 zone classification), Peak Amplitude (**g pk**), $1x\text{ RPM}$, $2x\text{ RPM}$, and $\text{BPFO}$ amplitudes.

4. **Backend Ready (`window.DomainXAPI`)**:
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
