// Domain-X — Master Dashboard Component Routing & Telemetry Architecture

class DomainXAPIAdapter {
  constructor() {
    this.mode = 'MOCK_MODE';
    this.socket = null;
    this.listeners = [];
  }

  subscribe(callback) {
    this.listeners.push(callback);
  }

  notify(data) {
    this.listeners.forEach(cb => cb(data));
  }

  connectWebSocket(url) {
    try {
      this.socket = new WebSocket(url);
      this.socket.onopen = () => {
        this.mode = 'LIVE_WEBSOCKET';
        document.getElementById('apiAdapterStatus').textContent = `LIVE_WEBSOCKET (${url})`;
        document.getElementById('apiAdapterStatus').style.color = 'var(--accent-emerald)';
      };
      this.socket.onmessage = (event) => {
        const payload = JSON.parse(event.data);
        this.notify(payload);
      };
      this.socket.onerror = (err) => {
        console.warn('WebSocket error, falling back to mock mode:', err);
      };
    } catch (e) {
      console.warn('WebSocket connection failed:', e);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const apiAdapter = new DomainXAPIAdapter();

  // Active Component View ('master' | 'fft' | 'technician' | 'fleet')
  let currentView = 'master';

  // Active Simulated Machine State ('healthy' | 'bpfo' | 'imbalance' | 'misalignment')
  let currentState = 'healthy';

  // Core Telemetry State Model
  let telemetry = {
    rpm: 1785,
    temp: 64.2,
    vibRms: 1.24,
    peakAmp: 0.85,
    freq1x: 29.75,
    amp1x: 0.25,
    freq2x: 59.50,
    amp2x: 0.12,
    freqBpfo: 106.50,
    ampBpfo: 0.05,
    healthIndex: 98,
    mlDiagnostic: 'Healthy',
    mlConfidence: '99.2%',
    genAiSteps: [
      'System operating within nominal ISO 10816 baseline.',
      'Perform standard visual inspection and thermal check every 30 days.',
      'Verify grease lubrication level on SKF 6208 bearing raceway.'
    ]
  };

  // DOM Handles
  const machineStatusPill = document.getElementById('machineStatusPill');
  const machineStatusText = document.getElementById('machineStatusText');
  const liveClock = document.getElementById('liveClock');

  const valRpm = document.getElementById('valRpm');
  const rpmBar = document.getElementById('rpmBar');
  const label1xFreq = document.getElementById('label1xFreq');

  const valTemp = document.getElementById('valTemp');
  const tempBar = document.getElementById('tempBar');
  const tempStatusText = document.getElementById('tempStatusText');

  const valVibRms = document.getElementById('valVibRms');
  const rmsBar = document.getElementById('rmsBar');
  const isoZoneText = document.getElementById('isoZoneText');

  const valPeakAmp = document.getElementById('valPeakAmp');
  const peakBar = document.getElementById('peakBar');
  const label2xFreq = document.getElementById('label2xFreq');
  const labelBpfoFreq = document.getElementById('labelBpfoFreq');

  const mlDiagnosticName = document.getElementById('mlDiagnosticName');
  const mlConfidencePill = document.getElementById('mlConfidencePill');
  const valHealthIndex = document.getElementById('valHealthIndex');
  const healthBar = document.getElementById('healthBar');
  
  const genAiStepsList = document.getElementById('genAiStepsList');
  const genAiStepsListFull = document.getElementById('genAiStepsListFull');
  const kpiPlantHealth = document.getElementById('kpiPlantHealth');
  const kpiActiveAlerts = document.getElementById('kpiActiveAlerts');

  // Initialize System
  function init() {
    startClock();
    setupEventListeners();
    
    // Subscribe UI renderer to API Adapter
    apiAdapter.subscribe(renderUI);

    // Continuous telemetry update interval
    setInterval(tickTelemetry, 1000);

    // Render loop for FFT Canvas
    renderLoop();
  }

  // Live Timestamp Clock
  function startClock() {
    function tick() {
      const now = new Date();
      liveClock.textContent = now.toISOString().replace('T', ' ').substring(0, 19);
    }
    tick();
    setInterval(tick, 1000);
  }

  // Component View Switcher Engine
  function switchView(targetView) {
    currentView = targetView;

    // Update active navigation item styling
    document.querySelectorAll('.nav-item[data-view]').forEach(item => {
      if (item.getAttribute('data-view') === targetView) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Update visible page view container
    document.querySelectorAll('.page-view').forEach(page => {
      page.classList.remove('active');
    });

    if (targetView === 'master') {
      document.getElementById('viewMasterOverview').classList.add('active');
    } else if (targetView === 'fft') {
      document.getElementById('viewFftAnalysis').classList.add('active');
    } else if (targetView === 'technician') {
      document.getElementById('viewTechnicianGuide').classList.add('active');
    } else if (targetView === 'fleet') {
      document.getElementById('viewFleetAssets').classList.add('active');
    }
  }

  // Telemetry Simulation Engine
  function tickTelemetry() {
    const jitter = (min, max) => (Math.random() * (max - min) + min);

    telemetry.freq1x = parseFloat((telemetry.rpm / 60).toFixed(2));
    telemetry.freq2x = parseFloat((telemetry.freq1x * 2).toFixed(2));

    if (currentState === 'healthy') {
      telemetry.rpm = Math.round(1785 + jitter(-5, 5));
      telemetry.temp = parseFloat((64.2 + jitter(-0.3, 0.3)).toFixed(1));
      telemetry.vibRms = parseFloat((1.24 + jitter(-0.04, 0.04)).toFixed(2));
      telemetry.peakAmp = parseFloat((0.85 + jitter(-0.03, 0.03)).toFixed(2));
      telemetry.amp1x = parseFloat((0.25 + jitter(-0.02, 0.02)).toFixed(2));
      telemetry.amp2x = parseFloat((0.12 + jitter(-0.01, 0.01)).toFixed(2));
      telemetry.ampBpfo = parseFloat((0.05 + jitter(-0.01, 0.01)).toFixed(2));
      telemetry.healthIndex = 98;
      telemetry.mlDiagnostic = 'Healthy';
      telemetry.mlConfidence = '99.2%';
      telemetry.genAiSteps = [
        'System operating within nominal ISO 10816 baseline.',
        'Perform standard visual inspection and thermal check every 30 days.',
        'Verify grease lubrication level on SKF 6208 bearing raceway.'
      ];
      setStatusPill('healthy', 'Healthy');
      if (kpiPlantHealth) kpiPlantHealth.textContent = '96%';
      if (kpiActiveAlerts) kpiActiveAlerts.textContent = '0';

    } else if (currentState === 'bpfo') {
      telemetry.rpm = Math.round(1780 + jitter(-8, 8));
      telemetry.temp = parseFloat((74.8 + jitter(-0.5, 0.5)).toFixed(1));
      telemetry.vibRms = parseFloat((7.82 + jitter(-0.1, 0.1)).toFixed(2));
      telemetry.peakAmp = parseFloat((3.85 + jitter(-0.12, 0.12)).toFixed(2));
      telemetry.amp1x = parseFloat((0.40 + jitter(-0.03, 0.03)).toFixed(2));
      telemetry.amp2x = parseFloat((0.25 + jitter(-0.02, 0.02)).toFixed(2));
      telemetry.ampBpfo = parseFloat((1.65 + jitter(-0.08, 0.08)).toFixed(2));
      telemetry.healthIndex = 42;
      telemetry.mlDiagnostic = 'Bearing Outer Race Defect';
      telemetry.mlConfidence = '96.4%';
      telemetry.genAiSteps = [
        'Schedule immediate shutdown & lock-out tag-out (LOTO) procedures.',
        'Remove bearing housing end-cap and inspect SKF 6208 outer raceway for micro-spalling.',
        'Replace bearing assembly, align shaft to <0.05 mm tolerance, and apply ISO VG 220 lubricant.'
      ];
      setStatusPill('bpfo', 'Bearing Outer Race Defect');
      if (kpiPlantHealth) kpiPlantHealth.textContent = '74%';
      if (kpiActiveAlerts) kpiActiveAlerts.textContent = '1';

    } else if (currentState === 'imbalance') {
      telemetry.rpm = Math.round(1790 + jitter(-10, 10));
      telemetry.temp = parseFloat((71.0 + jitter(-0.4, 0.4)).toFixed(1));
      telemetry.vibRms = parseFloat((5.60 + jitter(-0.1, 0.1)).toFixed(2));
      telemetry.peakAmp = parseFloat((2.90 + jitter(-0.08, 0.08)).toFixed(2));
      telemetry.amp1x = parseFloat((1.85 + jitter(-0.08, 0.08)).toFixed(2));
      telemetry.amp2x = parseFloat((0.30 + jitter(-0.02, 0.02)).toFixed(2));
      telemetry.ampBpfo = parseFloat((0.08 + jitter(-0.01, 0.01)).toFixed(2));
      telemetry.healthIndex = 65;
      telemetry.mlDiagnostic = 'Rotor Imbalance';
      telemetry.mlConfidence = '91.8%';
      telemetry.genAiSteps = [
        'Inspect rotor blades and coupling for material buildup, debris, or missing balancing weights.',
        'Perform 2-plane dynamic field balancing using portable vibrometer.',
        'Re-torque motor mounting hold-down bolts to specified N-m torque.'
      ];
      setStatusPill('imbalance', 'Rotor Imbalance');
      if (kpiPlantHealth) kpiPlantHealth.textContent = '82%';
      if (kpiActiveAlerts) kpiActiveAlerts.textContent = '1';

    } else if (currentState === 'misalignment') {
      telemetry.rpm = Math.round(1775 + jitter(-7, 7));
      telemetry.temp = parseFloat((78.5 + jitter(-0.5, 0.5)).toFixed(1));
      telemetry.vibRms = parseFloat((6.45 + jitter(-0.12, 0.12)).toFixed(2));
      telemetry.peakAmp = parseFloat((3.10 + jitter(-0.1, 0.1)).toFixed(2));
      telemetry.amp1x = parseFloat((0.60 + jitter(-0.04, 0.04)).toFixed(2));
      telemetry.amp2x = parseFloat((1.75 + jitter(-0.07, 0.07)).toFixed(2));
      telemetry.ampBpfo = parseFloat((0.10 + jitter(-0.01, 0.01)).toFixed(2));
      telemetry.healthIndex = 58;
      telemetry.mlDiagnostic = 'Shaft Misalignment';
      telemetry.mlConfidence = '94.0%';
      telemetry.genAiSteps = [
        'Check coupling inserts and soft-foot conditions across all motor feet.',
        'Attach laser alignment tool to motor and driven shaft hubs.',
        'Adjust shim packs under motor feet until parallel and angular alignment are within ±0.03 mm.'
      ];
      setStatusPill('misalignment', 'Shaft Misalignment');
      if (kpiPlantHealth) kpiPlantHealth.textContent = '79%';
      if (kpiActiveAlerts) kpiActiveAlerts.textContent = '1';
    }

    // Broadcast update via API adapter
    apiAdapter.notify(telemetry);
  }

  function setStatusPill(className, text) {
    machineStatusPill.className = `status-pill ${className}`;
    machineStatusText.textContent = text;
  }

  // Render Telemetry Cards UI
  function renderUI(data) {
    if (valRpm) {
      valRpm.textContent = data.rpm.toLocaleString();
      label1xFreq.textContent = `1x = ${data.freq1x} Hz`;
      rpmBar.style.width = `${Math.min((data.rpm / 3000) * 100, 100)}%`;
    }

    if (valTemp) {
      valTemp.textContent = data.temp;
      tempBar.style.width = `${Math.min((data.temp / 100) * 100, 100)}%`;
      if (data.temp > 80) {
        tempBar.className = 'progress-bar-fill warn';
        tempStatusText.textContent = 'High Temperature Alert';
        tempStatusText.style.color = 'var(--accent-rose)';
      } else {
        tempBar.className = 'progress-bar-fill';
        tempStatusText.textContent = 'Normal';
        tempStatusText.style.color = 'var(--accent-emerald)';
      }
    }

    if (valVibRms) {
      valVibRms.textContent = data.vibRms;
      rmsBar.style.width = `${Math.min((data.vibRms / 12) * 100, 100)}%`;
      if (data.vibRms < 2.8) {
        isoZoneText.textContent = 'Zone A (Good)';
        isoZoneText.style.color = 'var(--accent-emerald)';
      } else if (data.vibRms < 6.0) {
        isoZoneText.textContent = 'Zone B/C (Unsatisfactory)';
        isoZoneText.style.color = 'var(--accent-amber)';
      } else {
        isoZoneText.textContent = 'Zone D (Unacceptable)';
        isoZoneText.style.color = 'var(--accent-rose)';
      }
    }

    if (valPeakAmp) {
      valPeakAmp.textContent = data.peakAmp;
      peakBar.style.width = `${Math.min((data.peakAmp / 6) * 100, 100)}%`;
      label2xFreq.textContent = `2x = ${data.freq2x} Hz`;
      labelBpfoFreq.textContent = `BPFO = 106.5 Hz`;
    }

    if (mlDiagnosticName) {
      mlDiagnosticName.textContent = data.mlDiagnostic;
      mlConfidencePill.textContent = `${data.mlConfidence} Confidence`;
      valHealthIndex.textContent = `${data.healthIndex}%`;
      healthBar.style.width = `${data.healthIndex}%`;
      if (data.healthIndex < 50) {
        healthBar.className = 'progress-bar-fill warn';
        valHealthIndex.style.color = 'var(--accent-rose)';
      } else {
        healthBar.className = 'progress-bar-fill';
        valHealthIndex.style.color = 'var(--accent-emerald)';
      }
    }

    // Render GenAI Technician Steps
    renderGenAiSteps(genAiStepsList, data.genAiSteps);
    renderGenAiSteps(genAiStepsListFull, data.genAiSteps);
  }

  function renderGenAiSteps(listElement, steps) {
    if (!listElement) return;
    listElement.innerHTML = '';
    steps.forEach((stepText, idx) => {
      const li = document.createElement('li');
      li.className = 'genai-step-item';
      li.innerHTML = `
        <span class="step-num">${idx + 1}</span>
        <span>${stepText}</span>
      `;
      listElement.appendChild(li);
    });
  }

  // Animation Loop for FFT Canvas
  function renderLoop() {
    drawFFTSpectrum('fftCanvas');
    drawFFTSpectrum('fftCanvasPage');
    requestAnimationFrame(renderLoop);
  }

  // Draw Dynamic FFT Frequency Spectrum Canvas
  function drawFFTSpectrum(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    if (canvas.width !== rect.width * 2) {
      canvas.width = rect.width * 2;
      canvas.height = rect.height * 2;
    }
    ctx.save();
    ctx.scale(2, 2);

    const width = rect.width;
    const height = rect.height;
    const paddingLeft = 40;
    const paddingBottom = 30;
    const paddingTop = 20;
    const paddingRight = 20;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;

    for (let i = 0; i <= 4; i++) {
      const y = paddingTop + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(width - paddingRight, y);
      ctx.stroke();

      const labelVal = (2.0 - i * 0.5).toFixed(1);
      ctx.fillStyle = '#64748b';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText(`${labelVal}g`, 8, y + 3);
    }

    const freqs = [0, 100, 200, 300, 400, 500];
    freqs.forEach(f => {
      const x = paddingLeft + (f / 500) * chartWidth;
      ctx.beginPath();
      ctx.moveTo(x, paddingTop);
      ctx.lineTo(x, height - paddingBottom);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText(`${f}Hz`, x - 12, height - 10);
    });

    const numPoints = 250;
    const points = [];

    const f1x = telemetry.freq1x;
    const f2x = telemetry.freq2x;
    const fBpfo = 106.5;

    for (let i = 0; i < numPoints; i++) {
      const freq = (i / numPoints) * 500;
      let amp = 0.02 + Math.sin(i * 0.8) * 0.01 + Math.random() * 0.02;

      if (Math.abs(freq - f1x) < 4) {
        amp += telemetry.amp1x * 1.1;
      }
      if (Math.abs(freq - f2x) < 4) {
        amp += telemetry.amp2x * 1.1;
      }
      if (Math.abs(freq - fBpfo) < 4) {
        amp += telemetry.ampBpfo * 1.1;
      }

      points.push({ freq, amp: Math.min(amp, 2.0) });
    }

    const coords = points.map(pt => {
      const x = paddingLeft + (pt.freq / 500) * chartWidth;
      const y = height - paddingBottom - (pt.amp / 2.0) * chartHeight;
      return { x, y, freq: pt.freq, amp: pt.amp };
    });

    const gradient = ctx.createLinearGradient(0, paddingTop, 0, height - paddingBottom);
    if (currentState === 'bpfo') {
      gradient.addColorStop(0, 'rgba(239, 68, 68, 0.4)');
      gradient.addColorStop(1, 'rgba(239, 68, 68, 0.0)');
    } else if (currentState === 'imbalance') {
      gradient.addColorStop(0, 'rgba(245, 158, 11, 0.4)');
      gradient.addColorStop(1, 'rgba(245, 158, 11, 0.0)');
    } else if (currentState === 'misalignment') {
      gradient.addColorStop(0, 'rgba(139, 92, 246, 0.4)');
      gradient.addColorStop(1, 'rgba(139, 92, 246, 0.0)');
    } else {
      gradient.addColorStop(0, 'rgba(6, 182, 212, 0.35)');
      gradient.addColorStop(1, 'rgba(6, 182, 212, 0.0)');
    }

    ctx.beginPath();
    ctx.moveTo(coords[0].x, coords[0].y);
    for (let i = 1; i < coords.length; i++) {
      ctx.lineTo(coords[i].x, coords[i].y);
    }
    ctx.lineTo(coords[coords.length - 1].x, height - paddingBottom);
    ctx.lineTo(coords[0].x, height - paddingBottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(coords[0].x, coords[0].y);
    for (let i = 1; i < coords.length; i++) {
      ctx.lineTo(coords[i].x, coords[i].y);
    }
    ctx.strokeStyle = currentState === 'bpfo' ? '#ef4444'
                    : currentState === 'imbalance' ? '#f59e0b'
                    : currentState === 'misalignment' ? '#8b5cf6'
                    : '#06b6d4';
    ctx.lineWidth = 2;
    ctx.stroke();

    annotatedPeak(ctx, coords, f1x, `1x (${f1x}Hz)`, '#06b6d4', height - paddingBottom);
    annotatedPeak(ctx, coords, f2x, `2x (${f2x}Hz)`, '#8b5cf6', height - paddingBottom);
    if (currentState === 'bpfo' || telemetry.ampBpfo > 0.1) {
      annotatedPeak(ctx, coords, fBpfo, `BPFO (106.5Hz)`, '#ef4444', height - paddingBottom);
    }

    ctx.restore();
  }

  function annotatedPeak(ctx, coords, targetFreq, text, color, bottomY) {
    const pt = coords.find(c => Math.abs(c.freq - targetFreq) < 5);
    if (!pt) return;

    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    ctx.lineTo(pt.x, bottomY);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    ctx.fillStyle = 'rgba(10, 15, 30, 0.85)';
    ctx.fillRect(pt.x - 40, pt.y - 22, 80, 16);
    ctx.strokeStyle = color;
    ctx.strokeRect(pt.x - 40, pt.y - 22, 80, 16);

    ctx.fillStyle = '#ffffff';
    ctx.font = '9px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, pt.x, pt.y - 10);
  }

  // Setup Event Listeners
  function setupEventListeners() {
    // Navigation Component View Switcher
    document.querySelectorAll('.nav-item[data-view]').forEach(navItem => {
      navItem.addEventListener('click', (e) => {
        e.preventDefault();
        const targetView = navItem.getAttribute('data-view');
        switchView(targetView);
      });
    });

    // Quick View Buttons on Cards
    document.querySelectorAll('.btn-switch-view[data-target-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetView = btn.getAttribute('data-target-view');
        switchView(targetView);
      });
    });

    // Machine State Switcher Buttons
    document.querySelectorAll('.btn-state[data-state]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-state[data-state]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentState = btn.getAttribute('data-state');
        tickTelemetry();
      });
    });

    // Monitored Unit Select
    document.getElementById('machineSelect').addEventListener('change', (e) => {
      const label = e.target.options[e.target.selectedIndex].text;
      document.getElementById('activeMachineLabel').textContent = label;
    });

    // Fleet Card Selection
    document.querySelectorAll('.fleet-card[data-unit]').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.fleet-card[data-unit]').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        const unit = card.getAttribute('data-unit');
        const select = document.getElementById('machineSelect');
        select.value = unit;
        document.getElementById('activeMachineLabel').textContent = select.options[select.selectedIndex].text;
        switchView('master');
      });
    });
  }

  window.DomainXAPI = apiAdapter;

  init();
});
