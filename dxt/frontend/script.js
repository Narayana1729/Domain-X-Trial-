// Domain-X — Master Operational Dashboard, FFT Spectrum, GenAI Copilot, Plant Fleet & Field Technician Engine

class DomainXAPIAdapter {
  constructor() {
    this.mode = 'MOCK_MODE';
    this.socket = null;
    this.listeners = [];
    this.copilotListeners = [];
    this.fleetListeners = [];
  }

  subscribe(callback) {
    this.listeners.push(callback);
  }

  notify(data) {
    this.listeners.forEach(cb => cb(data));
  }

  subscribeCopilot(callback) {
    this.copilotListeners.push(callback);
  }

  updateCopilotDiagnosis(payload) {
    this.copilotListeners.forEach(cb => cb(payload));
  }

  subscribeFleet(callback) {
    this.fleetListeners.push(callback);
  }

  updateFleetData(fleetArray) {
    this.fleetListeners.forEach(cb => cb(fleetArray));
  }

  connectWebSocket(url) {
    try {
      this.socket = new WebSocket(url);
      this.socket.onopen = () => {
        this.mode = 'LIVE_WEBSOCKET';
        const el = document.getElementById('apiAdapterStatus');
        if (el) {
          el.textContent = `LIVE_WEBSOCKET (${url})`;
          el.style.color = 'var(--accent-emerald)';
        }
      };
      this.socket.onmessage = (event) => {
        const payload = JSON.parse(event.data);
        if (payload.type === 'copilot_diagnosis') {
          this.updateCopilotDiagnosis(payload.data);
        } else if (payload.type === 'fleet_data') {
          this.updateFleetData(payload.data);
        } else {
          this.notify(payload);
        }
      };
      this.socket.onerror = (err) => {
        console.warn('WebSocket error, fallback to simulated telemetry:', err);
      };
    } catch (e) {
      console.warn('WebSocket connection failed:', e);
    }
  }
}

// Acoustic Stethoscope Sound Synthesizer (Web Audio API)
class AcousticStethoscope {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.volume = 0.35;
    this.masterGain = null;
    this.carrierOsc = null;
    this.harmonicOsc = null;
    this.intervalId = null;
  }

  initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
  }

  start(telemetry, currentState) {
    this.initContext();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.isPlaying = true;

    // Carrier hum (1X speed tone)
    const baseFreq = Math.max(telemetry.freq1x || 29.8, 20);
    this.carrierOsc = this.ctx.createOscillator();
    this.carrierOsc.type = 'sawtooth';
    this.carrierOsc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);

    // 2X Harmonic tone
    this.harmonicOsc = this.ctx.createOscillator();
    this.harmonicOsc.type = 'sine';
    this.harmonicOsc.frequency.setValueAtTime(baseFreq * 2, this.ctx.currentTime);

    const humFilter = this.ctx.createBiquadFilter();
    humFilter.type = 'lowpass';
    humFilter.frequency.setValueAtTime(320, this.ctx.currentTime);

    const humGain = this.ctx.createGain();
    humGain.gain.setValueAtTime(0.2, this.ctx.currentTime);

    this.carrierOsc.connect(humFilter);
    this.harmonicOsc.connect(humFilter);
    humFilter.connect(humGain);
    humGain.connect(this.masterGain);

    this.carrierOsc.start();
    this.harmonicOsc.start();

    this.scheduleFaultClicks(currentState, telemetry);
  }

  scheduleFaultClicks(currentState, telemetry) {
    if (this.intervalId) clearInterval(this.intervalId);

    if (currentState === 'bpfo' || currentState === 'bpfi') {
      const clickRate = currentState === 'bpfo' ? 106.5 : 161.4;
      const intervalMs = Math.max(1000 / clickRate, 8);

      this.intervalId = setInterval(() => {
        if (!this.isPlaying || !this.ctx) return;
        this.triggerClick(currentState === 'bpfo' ? 2200 : 3400);
      }, intervalMs);
    }
  }

  triggerClick(resonanceFreq) {
    if (!this.ctx || !this.isPlaying) return;
    try {
      const osc = this.ctx.createOscillator();
      const clickGain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(resonanceFreq, now);

      clickGain.gain.setValueAtTime(0.4 * this.volume, now);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

      osc.connect(clickGain);
      clickGain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.018);
    } catch (e) {
      // Audio transient catch
    }
  }

  setVolume(val) {
    this.volume = val;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  stop() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.carrierOsc) {
      try { this.carrierOsc.stop(); } catch(e) {}
      this.carrierOsc = null;
    }
    if (this.harmonicOsc) {
      try { this.harmonicOsc.stop(); } catch(e) {}
      this.harmonicOsc = null;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const apiAdapter = new DomainXAPIAdapter();
  const audioStethoscope = new AcousticStethoscope();

  // Active View & Machine State
  let currentView = 'master';
  if (window.location.hash) {
    const hash = window.location.hash.replace('#', '');
    if (['master', 'fft', 'technician', 'fleet', 'field'].includes(hash)) {
      currentView = hash;
    }
  }

  let currentState = 'healthy';
  let currentFftRange = 500; // 500 | 1000 | 2000 | 5000 Hz
  let currentScaleMode = 'lin'; // 'lin' | 'db'
  let currentWindowing = 'hanning';
  let currentWaveformTrace = 'raw'; // 'raw' | 'envelope'
  let currentTimebaseMs = 20; // 20 | 50 | 100 ms/div
  let isWaveformFrozen = false;
  let currentTableFilter = 'all'; // 'all' | 'faults' | 'harmonics'
  let activeBearingModel = 'skf6208';
  let isOfflineFallbackActive = false;
  let isAlertAcknowledged = false;

  // Fleet View State
  let currentFleetFilter = 'all'; // 'all' | 'healthy' | 'warning' | 'critical'
  let currentFleetSearch = '';
  let currentFleetSort = 'health-asc';

  // Active Marker Visibility
  const activeMarkers = {
    '1x': true,
    '2x': true,
    'bpfo': true,
    'bpfi': true,
    'bsf': true
  };

  // Bearing Specifications Database
  const bearingDatabase = {
    skf6208: { name: 'SKF 6208 Deep Groove', nb: 8, dp: 60, d: 12, alpha: 0 },
    fag6310: { name: 'FAG 6310 Heavy Duty', nb: 8, dp: 80, d: 19, alpha: 0 },
    nsk6205: { name: 'NSK 6205 Standard', nb: 9, dp: 38.5, d: 7.94, alpha: 0 }
  };

  // 10 Realistic Multi-Machine Plant Fleet Dataset
  let fleetMachines = [
    {
      id: 'm1',
      name: 'Pump Rig #01',
      location: 'Conveyor Line A',
      model: 'SKF 6208 2Z',
      rpm: 1750,
      temp: 38.2,
      vibRms: 1.2,
      peakAmp: 0.85,
      health: 98,
      rul: 120,
      status: 'healthy',
      statusText: 'HEALTHY',
      faultType: 'Normal Baseline',
      sparklineType: 'healthy'
    },
    {
      id: 'm2',
      name: 'Pump Rig #02',
      location: 'Conveyor Line B',
      model: 'SKF 6208 BPFO',
      rpm: 1820,
      temp: 43.5,
      vibRms: 1.8,
      peakAmp: 1.68,
      health: 42,
      rul: 14,
      status: 'critical',
      statusText: 'BEARING FAULT',
      faultType: 'BPFO Outer Race Defect',
      sparklineType: 'bearing'
    },
    {
      id: 'm3',
      name: 'Motor Rig #03',
      location: 'Assembly Line A',
      model: 'FAG 6310',
      rpm: 1650,
      temp: 40.1,
      vibRms: 1.4,
      peakAmp: 1.45,
      health: 68,
      rul: 35,
      status: 'warning',
      statusText: 'IMBALANCE',
      faultType: '1X Dynamic Unbalance',
      sparklineType: 'imbalance'
    },
    {
      id: 'm4',
      name: 'Pump Rig #04',
      location: 'Conveyor Line B',
      model: '775 DC Rig',
      rpm: 1750,
      temp: 48.0,
      vibRms: 2.4,
      peakAmp: 1.75,
      health: 54,
      rul: 21,
      status: 'critical',
      statusText: 'MISALIGNMENT',
      faultType: '2X Angular Misalignment',
      sparklineType: 'misalignment'
    },
    {
      id: 'm5',
      name: 'Turbine Blower #05',
      location: 'Boiler House',
      model: 'NSK 6205 Heavy',
      rpm: 3600,
      temp: 68.4,
      vibRms: 2.1,
      peakAmp: 1.10,
      health: 94,
      rul: 95,
      status: 'healthy',
      statusText: 'HEALTHY',
      faultType: 'Nominal Aero Load',
      sparklineType: 'healthy'
    },
    {
      id: 'm6',
      name: 'CNC Spindle Drive #06',
      location: 'Machining Cell 2',
      model: 'FAG 6310 High Precision',
      rpm: 2950,
      temp: 42.0,
      vibRms: 1.1,
      peakAmp: 0.75,
      health: 97,
      rul: 110,
      status: 'healthy',
      statusText: 'HEALTHY',
      faultType: 'Precision Balanced',
      sparklineType: 'healthy'
    },
    {
      id: 'm7',
      name: 'Cooling Tower Fan #07',
      location: 'HVAC Plant Roof',
      model: 'SKF 6208 Sealed',
      rpm: 1200,
      temp: 52.0,
      vibRms: 2.9,
      peakAmp: 2.20,
      health: 31,
      rul: 6,
      status: 'critical',
      statusText: 'CRITICAL FAULT',
      faultType: 'Extreme Bearing Friction',
      sparklineType: 'bearing'
    },
    {
      id: 'm8',
      name: 'Compressor Rig #08',
      location: 'Utility Substation',
      model: 'NSK 6205 Standard',
      rpm: 2400,
      temp: 46.0,
      vibRms: 1.6,
      peakAmp: 1.30,
      health: 74,
      rul: 42,
      status: 'warning',
      statusText: 'WARNING',
      faultType: 'Vibration Resonance',
      sparklineType: 'imbalance'
    },
    {
      id: 'm9',
      name: 'Exhaust Blower #09',
      location: 'Paint Shop Line',
      model: 'SKF 6208',
      rpm: 1800,
      temp: 36.5,
      vibRms: 1.0,
      peakAmp: 0.70,
      health: 99,
      rul: 140,
      status: 'healthy',
      statusText: 'HEALTHY',
      faultType: 'Nominal Baseline',
      sparklineType: 'healthy'
    },
    {
      id: 'm10',
      name: 'Feedwater Pump #10',
      location: 'Boiler Feed Room',
      model: 'FAG 6310',
      rpm: 3500,
      temp: 62.0,
      vibRms: 2.0,
      peakAmp: 1.50,
      health: 71,
      rul: 28,
      status: 'warning',
      statusText: 'WARNING',
      faultType: 'Cavitation Turbulence',
      sparklineType: 'imbalance'
    }
  ];

  // Rolling Waterfall Spectrogram Buffer (55 time slices)
  const waterfallHistory = [];
  const MAX_WATERFALL_SLICES = 55;

  // 4-Step Checklist States
  const checklistState = {
    step1: false,
    step2: false,
    step3: false,
    step4: false
  };

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
    freqBpfi: 161.40,
    ampBpfi: 0.04,
    freqBsf: 71.20,
    ampBsf: 0.03,
    freqFtf: 11.90,
    ampFtf: 0.02,
    healthIndex: 87,
    crestFactor: 3.42,
    kurtosis: 2.95,
    peakToPeak: 2.48,
    dominantPeakFreq: 142.0,
    energy1x: 18,
    energy2x: 12,
    energyBearing: 8,
    energyNoise: 6,
    mlDiagnostic: 'Bearing Outer Race Defect',
    mlConfidence: '96.4%',
    genAiSteps: [
      'System operating within nominal ISO 10816 baseline.',
      'Perform standard visual inspection and thermal check every 30 days.',
      'Verify grease lubrication level on SKF 6208 bearing raceway.'
    ]
  };

  // DOM Elements - Master Dashboard
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

  // DOM Elements - FFT Spectrum & Signal Diagnostics
  const valCrestFactor = document.getElementById('valCrestFactor');
  const crestFactorStatus = document.getElementById('crestFactorStatus');
  const valKurtosis = document.getElementById('valKurtosis');
  const kurtosisStatus = document.getElementById('kurtosisStatus');
  const valSignalVibRms = document.getElementById('valSignalVibRms');
  const signalIsoZone = document.getElementById('signalIsoZone');
  const valPkToPkG = document.getElementById('valPkToPkG');
  const labelPkAmp = document.getElementById('labelPkAmp');
  const valDominantPeakFreq = document.getElementById('valDominantPeakFreq');
  const dominantPeakFaultLabel = document.getElementById('dominantPeakFaultLabel');
  const spectrumHud = document.getElementById('spectrumHud');
  const canvasCrosshairTooltip = document.getElementById('canvasCrosshairTooltip');
  const fftCanvasWrapper = document.getElementById('fftCanvasWrapper');
  const valPeakToPeak = document.getElementById('valPeakToPeak');
  const wfImpactPeriod = document.getElementById('wfImpactPeriod');
  const peakDataTableBody = document.getElementById('peakDataTableBody');
  const peakCountSummary = document.getElementById('peakCountSummary');

  // Bearing Kinematics DOM Handles
  const valCalcBpfo = document.getElementById('valCalcBpfo');
  const orderBpfo = document.getElementById('orderBpfo');
  const badgeBpfoStatus = document.getElementById('badgeBpfoStatus');
  const valCalcBpfi = document.getElementById('valCalcBpfi');
  const orderBpfi = document.getElementById('orderBpfi');
  const badgeBpfiStatus = document.getElementById('badgeBpfiStatus');
  const valCalcBsf = document.getElementById('valCalcBsf');
  const orderBsf = document.getElementById('orderBsf');
  const badgeBsfStatus = document.getElementById('badgeBsfStatus');
  const valCalcFtf = document.getElementById('valCalcFtf');
  const orderFtf = document.getElementById('orderFtf');
  const badgeFtfStatus = document.getElementById('badgeFtfStatus');

  // Energy Distribution DOM Handles
  const energy1xVal = document.getElementById('energy1xVal');
  const energy1xBar = document.getElementById('energy1xBar');
  const energy2xVal = document.getElementById('energy2xVal');
  const energy2xBar = document.getElementById('energy2xBar');
  const energyBearingVal = document.getElementById('energyBearingVal');
  const energyBearingBar = document.getElementById('energyBearingBar');
  const energyNoiseVal = document.getElementById('energyNoiseVal');
  const energyNoiseBar = document.getElementById('energyNoiseBar');

  // Audio DOM Handles
  const btnAudioToggle = document.getElementById('btnAudioToggle');
  const audioBtnText = document.getElementById('audioBtnText');
  const audioVolumeSlider = document.getElementById('audioVolumeSlider');
  const audioPulseIndicator = document.getElementById('audioPulseIndicator');

  // Copilot DOM Handles
  const offlineFallbackToggle = document.getElementById('offlineFallbackToggle');
  const copilotModeStatusBadge = document.getElementById('copilotModeStatusBadge');
  const copilotModeStatusText = document.getElementById('copilotModeStatusText');
  const checklistProgressBadge = document.getElementById('checklistProgressBadge');
  const checklistProgressBar = document.getElementById('checklistProgressBar');
  const btnResetChecklist = document.getElementById('btnResetChecklist');
  const chatMessageStream = document.getElementById('chatMessageStream');
  const chatInputForm = document.getElementById('chatInputForm');
  const chatInputText = document.getElementById('chatInputText');
  const btnAcknowledgeAlert = document.getElementById('btnAcknowledgeAlert');
  const btnGenSopReport = document.getElementById('btnGenSopReport');
  const btnExportAiReport = document.getElementById('btnExportAiReport');
  const incidentTimestamp = document.getElementById('incidentTimestamp');

  // Fleet View DOM Handles
  const fleetCardsGrid = document.getElementById('fleetCardsGrid');
  const fleetSearchInput = document.getElementById('fleetSearchInput');
  const selectFleetSort = document.getElementById('selectFleetSort');
  const btnExportFleetCsv = document.getElementById('btnExportFleetCsv');
  const alertFeedList = document.getElementById('alertFeedList');
  const btnClearAlertFeed = document.getElementById('btnClearAlertFeed');

  // Field Technician DOM Handles
  const fieldQrModalOverlay = document.getElementById('fieldQrModalOverlay');
  const btnFieldQrScan = document.getElementById('btnFieldQrScan');
  const btnCloseQrModal = document.getElementById('btnCloseQrModal');
  const btnConfirmQrInspection = document.getElementById('btnConfirmQrInspection');
  const btnToggleFieldMode = document.getElementById('btnToggleFieldMode');
  const btnFieldVoiceAi = document.getElementById('btnFieldVoiceAi');
  const btnFieldStartRepair = document.getElementById('btnFieldStartRepair');
  const btnFieldViewWaveform = document.getElementById('btnFieldViewWaveform');
  const btnFieldViewFft = document.getElementById('btnFieldViewFft');

  // Drawer Modal DOM Handles
  const btnOpenCopilotModal = document.getElementById('btnOpenCopilotModal');
  const copilotDrawerOverlay = document.getElementById('copilotDrawerOverlay');
  const btnCloseCopilotDrawer = document.getElementById('btnCloseCopilotDrawer');
  const btnDrawerOpenFullView = document.getElementById('btnDrawerOpenFullView');
  const drawerProgressText = document.getElementById('drawerProgressText');
  const drawerChecklistContainer = document.getElementById('drawerChecklistContainer');
  const drawerChatStream = document.getElementById('drawerChatStream');
  const drawerChatForm = document.getElementById('drawerChatForm');
  const drawerChatInput = document.getElementById('drawerChatInput');

  // Mouse hover crosshair state
  let hoverMouse = { active: false, x: 0, y: 0, chartX: 0, chartY: 0 };

  // Initialize System
  function init() {
    startClock();
    setupEventListeners();
    recalculateBearingKinematics();
    renderDrawerChecklist();
    updateChecklistProgress();
    renderFleetCardsGrid();
    switchView(currentView);

    apiAdapter.subscribe(renderUI);
    apiAdapter.subscribeCopilot(handleCopilotDiagnosisUpdate);
    apiAdapter.subscribeFleet(handleFleetDataUpdate);

    setInterval(tickTelemetry, 1000);
    renderLoop();
  }

  // Live Timestamp Clock
  function startClock() {
    function tick() {
      const now = new Date();
      const timeStr = now.toISOString().replace('T', ' ').substring(0, 19);
      if (liveClock) liveClock.textContent = timeStr;
      if (incidentTimestamp) incidentTimestamp.textContent = `${timeStr} UTC`;
    }
    tick();
    setInterval(tick, 1000);
  }

  // Component View Router
  function switchView(targetView) {
    currentView = targetView;

    document.querySelectorAll('.nav-item[data-view]').forEach(item => {
      if (item.getAttribute('data-view') === targetView) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    document.querySelectorAll('.mobile-nav-item[data-mobile-nav]').forEach(btn => {
      if (btn.getAttribute('data-mobile-nav') === targetView) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    document.querySelectorAll('.page-view').forEach(page => {
      page.classList.remove('active');
    });

    if (targetView === 'master') {
      const v = document.getElementById('viewMasterOverview');
      if (v) v.classList.add('active');
    } else if (targetView === 'fft') {
      const v = document.getElementById('viewFftAnalysis');
      if (v) v.classList.add('active');
    } else if (targetView === 'technician') {
      const v = document.getElementById('viewTechnicianGuide');
      if (v) v.classList.add('active');
    } else if (targetView === 'fleet') {
      const v = document.getElementById('viewFleetAssets');
      if (v) v.classList.add('active');
      renderFleetCardsGrid();
    } else if (targetView === 'field') {
      const v = document.getElementById('viewFieldTechnician');
      if (v) v.classList.add('active');
    }

    window.history.replaceState(null, '', `#${targetView}`);
  }

  // Calculate Bearing Characteristic Defect Frequencies
  function recalculateBearingKinematics() {
    const bearing = bearingDatabase[activeBearingModel] || bearingDatabase.skf6208;
    const fr = telemetry.rpm / 60;
    const cosA = Math.cos((bearing.alpha * Math.PI) / 180);
    const dOverDp = (bearing.d / bearing.dp) * cosA;

    telemetry.freq1x = parseFloat(fr.toFixed(2));
    telemetry.freq2x = parseFloat((fr * 2).toFixed(2));
    telemetry.freqBpfo = parseFloat(((bearing.nb / 2) * fr * (1 - dOverDp)).toFixed(2));
    telemetry.freqBpfi = parseFloat(((bearing.nb / 2) * fr * (1 + dOverDp)).toFixed(2));
    telemetry.freqBsf = parseFloat(((bearing.dp / (2 * bearing.d)) * fr * (1 - Math.pow(dOverDp, 2))).toFixed(2));
    telemetry.freqFtf = parseFloat((0.5 * fr * (1 - dOverDp)).toFixed(2));

    if (valCalcBpfo) valCalcBpfo.textContent = `${telemetry.freqBpfo} Hz`;
    if (orderBpfo) orderBpfo.textContent = `${(telemetry.freqBpfo / fr).toFixed(2)}X RPM`;
    if (valCalcBpfi) valCalcBpfi.textContent = `${telemetry.freqBpfi} Hz`;
    if (orderBpfi) orderBpfi.textContent = `${(telemetry.freqBpfi / fr).toFixed(2)}X RPM`;
    if (valCalcBsf) valCalcBsf.textContent = `${telemetry.freqBsf} Hz`;
    if (orderBsf) orderBsf.textContent = `${(telemetry.freqBsf / fr).toFixed(2)}X RPM`;
    if (valCalcFtf) valCalcFtf.textContent = `${telemetry.freqFtf} Hz`;
    if (orderFtf) orderFtf.textContent = `${(telemetry.freqFtf / fr).toFixed(2)}X RPM`;

    const legend1x = document.getElementById('legend1xText');
    if (legend1x) legend1x.textContent = `1X Running Speed (${telemetry.freq1x} Hz)`;
    const legend2x = document.getElementById('legend2xText');
    if (legend2x) legend2x.textContent = `2X Harmonics (${telemetry.freq2x} Hz)`;
    const legendBpfo = document.getElementById('legendBpfoText');
    if (legendBpfo) legendBpfo.textContent = `BPFO Outer Race (${telemetry.freqBpfo} Hz)`;
    const legendBpfi = document.getElementById('legendBpfiText');
    if (legendBpfi) legendBpfi.textContent = `BPFI Inner Race (${telemetry.freqBpfi} Hz)`;
    const legendBsf = document.getElementById('legendBsfText');
    if (legendBsf) legendBsf.textContent = `BSF Ball Spin (${telemetry.freqBsf} Hz)`;

    if (wfImpactPeriod) {
      const tMs = (1000 / telemetry.freqBpfo).toFixed(2);
      wfImpactPeriod.textContent = `T_bpfo = ${tMs} ms (${telemetry.freqBpfo} Hz)`;
    }
  }

  // Telemetry Simulation Engine
  function tickTelemetry() {
    const jitter = (min, max) => (Math.random() * (max - min) + min);

    recalculateBearingKinematics();

    if (currentState === 'healthy') {
      telemetry.rpm = Math.round(1785 + jitter(-4, 4));
      telemetry.temp = parseFloat((64.2 + jitter(-0.2, 0.2)).toFixed(1));
      telemetry.vibRms = parseFloat((1.24 + jitter(-0.03, 0.03)).toFixed(2));
      telemetry.peakAmp = parseFloat((0.85 + jitter(-0.02, 0.02)).toFixed(2));
      telemetry.amp1x = parseFloat((0.25 + jitter(-0.02, 0.02)).toFixed(2));
      telemetry.amp2x = parseFloat((0.12 + jitter(-0.01, 0.01)).toFixed(2));
      telemetry.ampBpfo = parseFloat((0.05 + jitter(-0.01, 0.01)).toFixed(2));
      telemetry.ampBpfi = parseFloat((0.04 + jitter(-0.01, 0.01)).toFixed(2));
      telemetry.ampBsf = parseFloat((0.03 + jitter(-0.01, 0.01)).toFixed(2));
      telemetry.ampFtf = parseFloat((0.02 + jitter(-0.01, 0.01)).toFixed(2));
      telemetry.crestFactor = parseFloat((3.42 + jitter(-0.05, 0.05)).toFixed(2));
      telemetry.kurtosis = parseFloat((2.95 + jitter(-0.04, 0.04)).toFixed(2));
      telemetry.peakToPeak = parseFloat((2.48 + jitter(-0.04, 0.04)).toFixed(2));
      telemetry.dominantPeakFreq = telemetry.freq1x;
      telemetry.energy1x = 22;
      telemetry.energy2x = 10;
      telemetry.energyBearing = 6;
      telemetry.energyNoise = 62;
      telemetry.healthIndex = 98;
      telemetry.mlDiagnostic = 'Healthy';
      telemetry.mlConfidence = '99.2%';
      telemetry.genAiSteps = [
        'System operating within nominal ISO 10816 baseline.',
        'Perform standard visual inspection and thermal check every 30 days.',
        'Verify grease lubrication level on SKF 6208 bearing raceway.'
      ];
      setStatusPill('healthy', 'Healthy');
      setBearingStatusBadges('healthy', 'healthy', 'healthy', 'healthy');

    } else if (currentState === 'bpfo') {
      telemetry.rpm = Math.round(1780 + jitter(-6, 6));
      telemetry.temp = parseFloat((74.8 + jitter(-0.4, 0.4)).toFixed(1));
      telemetry.vibRms = parseFloat((7.82 + jitter(-0.08, 0.08)).toFixed(2));
      telemetry.peakAmp = parseFloat((3.85 + jitter(-0.1, 0.1)).toFixed(2));
      telemetry.amp1x = parseFloat((0.40 + jitter(-0.03, 0.03)).toFixed(2));
      telemetry.amp2x = parseFloat((0.25 + jitter(-0.02, 0.02)).toFixed(2));
      telemetry.ampBpfo = parseFloat((1.68 + jitter(-0.06, 0.06)).toFixed(2));
      telemetry.ampBpfi = parseFloat((0.15 + jitter(-0.02, 0.02)).toFixed(2));
      telemetry.ampBsf = parseFloat((0.08 + jitter(-0.01, 0.01)).toFixed(2));
      telemetry.ampFtf = parseFloat((0.04 + jitter(-0.01, 0.01)).toFixed(2));
      telemetry.crestFactor = parseFloat((5.85 + jitter(-0.08, 0.08)).toFixed(2));
      telemetry.kurtosis = parseFloat((6.42 + jitter(-0.15, 0.15)).toFixed(2));
      telemetry.peakToPeak = parseFloat((9.12 + jitter(-0.12, 0.12)).toFixed(2));
      telemetry.dominantPeakFreq = 142.0;
      telemetry.energy1x = 12;
      telemetry.energy2x = 8;
      telemetry.energyBearing = 72;
      telemetry.energyNoise = 8;
      telemetry.healthIndex = 87;
      telemetry.mlDiagnostic = 'Bearing Outer Race Defect';
      telemetry.mlConfidence = '96.4%';
      telemetry.genAiSteps = [
        'Schedule immediate shutdown & lock-out tag-out (LOTO) procedures.',
        'Remove bearing housing end-cap and inspect SKF 6208 outer raceway for micro-spalling.',
        'Replace bearing assembly, align shaft to <0.05 mm tolerance, and apply ISO VG 220 lubricant.'
      ];
      setStatusPill('bpfo', 'Bearing Outer Race Defect');
      setBearingStatusBadges('fault', 'healthy', 'healthy', 'healthy');

    } else if (currentState === 'imbalance') {
      telemetry.rpm = Math.round(1790 + jitter(-8, 8));
      telemetry.temp = parseFloat((71.0 + jitter(-0.3, 0.3)).toFixed(1));
      telemetry.vibRms = parseFloat((5.60 + jitter(-0.08, 0.08)).toFixed(2));
      telemetry.peakAmp = parseFloat((2.90 + jitter(-0.06, 0.06)).toFixed(2));
      telemetry.amp1x = parseFloat((1.85 + jitter(-0.06, 0.06)).toFixed(2));
      telemetry.amp2x = parseFloat((0.30 + jitter(-0.02, 0.02)).toFixed(2));
      telemetry.ampBpfo = parseFloat((0.08 + jitter(-0.01, 0.01)).toFixed(2));
      telemetry.ampBpfi = parseFloat((0.05 + jitter(-0.01, 0.01)).toFixed(2));
      telemetry.ampBsf = parseFloat((0.04 + jitter(-0.01, 0.01)).toFixed(2));
      telemetry.ampFtf = parseFloat((0.03 + jitter(-0.01, 0.01)).toFixed(2));
      telemetry.crestFactor = parseFloat((3.82 + jitter(-0.05, 0.05)).toFixed(2));
      telemetry.kurtosis = parseFloat((3.15 + jitter(-0.05, 0.05)).toFixed(2));
      telemetry.peakToPeak = parseFloat((6.40 + jitter(-0.08, 0.08)).toFixed(2));
      telemetry.dominantPeakFreq = telemetry.freq1x;
      telemetry.energy1x = 76;
      telemetry.energy2x = 12;
      telemetry.energyBearing = 4;
      telemetry.energyNoise = 8;
      telemetry.healthIndex = 65;
      telemetry.mlDiagnostic = 'Rotor Unbalance';
      telemetry.mlConfidence = '91.8%';
      telemetry.genAiSteps = [
        'Inspect rotor blades and coupling for material buildup, debris, or missing balancing weights.',
        'Perform 2-plane dynamic field balancing using portable vibrometer.',
        'Re-torque motor mounting hold-down bolts to specified N-m torque.'
      ];
      setStatusPill('imbalance', 'Rotor Unbalance');
      setBearingStatusBadges('healthy', 'healthy', 'healthy', 'healthy');

    } else if (currentState === 'misalignment') {
      telemetry.rpm = Math.round(1775 + jitter(-6, 6));
      telemetry.temp = parseFloat((78.5 + jitter(-0.4, 0.4)).toFixed(1));
      telemetry.vibRms = parseFloat((6.45 + jitter(-0.09, 0.09)).toFixed(2));
      telemetry.peakAmp = parseFloat((3.10 + jitter(-0.08, 0.08)).toFixed(2));
      telemetry.amp1x = parseFloat((0.60 + jitter(-0.03, 0.03)).toFixed(2));
      telemetry.amp2x = parseFloat((1.75 + jitter(-0.06, 0.06)).toFixed(2));
      telemetry.ampBpfo = parseFloat((0.10 + jitter(-0.01, 0.01)).toFixed(2));
      telemetry.ampBpfi = parseFloat((0.06 + jitter(-0.01, 0.01)).toFixed(2));
      telemetry.ampBsf = parseFloat((0.04 + jitter(-0.01, 0.01)).toFixed(2));
      telemetry.ampFtf = parseFloat((0.03 + jitter(-0.01, 0.01)).toFixed(2));
      telemetry.crestFactor = parseFloat((4.15 + jitter(-0.06, 0.06)).toFixed(2));
      telemetry.kurtosis = parseFloat((3.35 + jitter(-0.06, 0.06)).toFixed(2));
      telemetry.peakToPeak = parseFloat((7.20 + jitter(-0.1, 0.1)).toFixed(2));
      telemetry.dominantPeakFreq = telemetry.freq2x;
      telemetry.energy1x = 18;
      telemetry.energy2x = 68;
      telemetry.energyBearing = 6;
      telemetry.energyNoise = 8;
      telemetry.healthIndex = 58;
      telemetry.mlDiagnostic = 'Shaft Misalignment';
      telemetry.mlConfidence = '94.0%';
      telemetry.genAiSteps = [
        'Check coupling inserts and soft-foot conditions across all motor feet.',
        'Attach laser alignment tool to motor and driven shaft hubs.',
        'Adjust shim packs under motor feet until parallel and angular alignment are within ±0.03 mm.'
      ];
      setStatusPill('misalignment', 'Shaft Misalignment');
      setBearingStatusBadges('healthy', 'healthy', 'healthy', 'healthy');
    }

    captureWaterfallSlice();

    if (audioStethoscope.isPlaying) {
      audioStethoscope.scheduleFaultClicks(currentState, telemetry);
    }

    apiAdapter.notify(telemetry);
  }

  function setStatusPill(className, text) {
    if (machineStatusPill) machineStatusPill.className = `status-pill ${className}`;
    if (machineStatusText) machineStatusText.textContent = text;
  }

  function setBearingStatusBadges(bpfo, bpfi, bsf, ftf) {
    if (badgeBpfoStatus) {
      badgeBpfoStatus.className = `status-pill-mini ${bpfo}`;
      badgeBpfoStatus.textContent = bpfo === 'fault' ? 'ALERT FAULT' : 'NOMINAL';
    }
    if (badgeBpfiStatus) {
      badgeBpfiStatus.className = `status-pill-mini ${bpfi}`;
      badgeBpfiStatus.textContent = bpfi === 'fault' ? 'ALERT FAULT' : 'NOMINAL';
    }
    if (badgeBsfStatus) {
      badgeBsfStatus.className = `status-pill-mini ${bsf}`;
      badgeBsfStatus.textContent = 'NOMINAL';
    }
    if (badgeFtfStatus) {
      badgeFtfStatus.className = `status-pill-mini ${ftf}`;
      badgeFtfStatus.textContent = 'NOMINAL';
    }
  }

  function captureWaterfallSlice() {
    const numBins = 120;
    const slice = new Float32Array(numBins);
    const maxFreqBand = currentFftRange;

    const f1x = telemetry.freq1x;
    const f2x = telemetry.freq2x;
    const fBpfo = telemetry.freqBpfo;

    for (let i = 0; i < numBins; i++) {
      const f = (i / numBins) * maxFreqBand;
      let amp = 0.03 + Math.random() * 0.03;

      if (Math.abs(f - f1x) < maxFreqBand * 0.015) amp += telemetry.amp1x;
      if (Math.abs(f - f2x) < maxFreqBand * 0.015) amp += telemetry.amp2x;
      if (Math.abs(f - fBpfo) < maxFreqBand * 0.015) amp += telemetry.ampBpfo;

      slice[i] = Math.min(amp / 2.0, 1.0);
    }

    waterfallHistory.unshift(slice);
    if (waterfallHistory.length > MAX_WATERFALL_SLICES) {
      waterfallHistory.pop();
    }
  }

  // Render Telemetry UI Components
  function renderUI(data) {
    if (valRpm) {
      valRpm.textContent = data.rpm.toLocaleString();
      if (label1xFreq) label1xFreq.textContent = `1x = ${data.freq1x} Hz`;
      if (rpmBar) rpmBar.style.width = `${Math.min((data.rpm / 3000) * 100, 100)}%`;
    }

    if (valTemp) {
      valTemp.textContent = data.temp;
      if (tempBar) {
        tempBar.style.width = `${Math.min((data.temp / 100) * 100, 100)}%`;
        if (data.temp > 80) {
          tempBar.className = 'progress-bar-fill warn';
          if (tempStatusText) {
            tempStatusText.textContent = 'High Temp Alert';
            tempStatusText.style.color = 'var(--accent-rose)';
          }
        } else {
          tempBar.className = 'progress-bar-fill';
          if (tempStatusText) {
            tempStatusText.textContent = 'Normal';
            tempStatusText.style.color = 'var(--accent-emerald)';
          }
        }
      }
    }

    if (valVibRms) {
      valVibRms.textContent = data.vibRms;
      if (rmsBar) rmsBar.style.width = `${Math.min((data.vibRms / 12) * 100, 100)}%`;
      if (isoZoneText) {
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
    }

    if (valPeakAmp) {
      valPeakAmp.textContent = data.peakAmp;
      if (peakBar) peakBar.style.width = `${Math.min((data.peakAmp / 6) * 100, 100)}%`;
      if (label2xFreq) label2xFreq.textContent = `2x = ${data.freq2x} Hz`;
      if (labelBpfoFreq) labelBpfoFreq.textContent = `BPFO = ${data.freqBpfo} Hz`;
    }

    if (valCrestFactor) {
      valCrestFactor.textContent = data.crestFactor;
      if (crestFactorStatus) {
        if (data.crestFactor < 3.5) {
          crestFactorStatus.textContent = 'Nominal < 3.5';
          crestFactorStatus.style.color = 'var(--accent-emerald)';
        } else if (data.crestFactor < 5.0) {
          crestFactorStatus.textContent = 'Elevated 3.5 - 5.0';
          crestFactorStatus.style.color = 'var(--accent-amber)';
        } else {
          crestFactorStatus.textContent = 'Severe Impulsive > 5.0';
          crestFactorStatus.style.color = 'var(--accent-rose)';
        }
      }
    }

    if (valKurtosis) {
      valKurtosis.textContent = data.kurtosis;
      if (kurtosisStatus) {
        if (data.kurtosis < 3.5) {
          kurtosisStatus.textContent = 'Gaussian / Normal';
          kurtosisStatus.style.color = 'var(--accent-emerald)';
        } else if (data.kurtosis < 5.5) {
          kurtosisStatus.textContent = 'Incipient Flaw';
          kurtosisStatus.style.color = 'var(--accent-amber)';
        } else {
          kurtosisStatus.textContent = 'Severe Impact Shocks';
          kurtosisStatus.style.color = 'var(--accent-rose)';
        }
      }
    }

    if (valSignalVibRms) {
      valSignalVibRms.textContent = data.vibRms;
      if (signalIsoZone) {
        if (data.vibRms < 2.8) {
          signalIsoZone.textContent = 'ISO 10816 Zone A (Good)';
          signalIsoZone.style.color = 'var(--accent-emerald)';
        } else if (data.vibRms < 6.0) {
          signalIsoZone.textContent = 'ISO 10816 Zone B/C (Caution)';
          signalIsoZone.style.color = 'var(--accent-amber)';
        } else {
          signalIsoZone.textContent = 'ISO 10816 Zone D (Critical)';
          signalIsoZone.style.color = 'var(--accent-rose)';
        }
      }
    }

    if (valPkToPkG) valPkToPkG.textContent = data.peakToPeak;
    if (labelPkAmp) labelPkAmp.textContent = `Peak: ${data.peakAmp} g`;

    if (valDominantPeakFreq) {
      valDominantPeakFreq.textContent = data.dominantPeakFreq;
      if (dominantPeakFaultLabel) {
        if (Math.abs(data.dominantPeakFreq - data.freq1x) < 2) {
          dominantPeakFaultLabel.textContent = '1X Running Speed';
          dominantPeakFaultLabel.style.color = 'var(--accent-cyan)';
        } else if (Math.abs(data.dominantPeakFreq - data.freq2x) < 2) {
          dominantPeakFaultLabel.textContent = '2X Misalignment';
          dominantPeakFaultLabel.style.color = 'var(--accent-purple)';
        } else if (Math.abs(data.dominantPeakFreq - data.freqBpfo) < 2) {
          dominantPeakFaultLabel.textContent = 'BPFO Outer Race Defect';
          dominantPeakFaultLabel.style.color = 'var(--accent-rose)';
        } else {
          dominantPeakFaultLabel.textContent = 'Spectral Peak';
          dominantPeakFaultLabel.style.color = 'var(--accent-cyan)';
        }
      }
    }

    if (valPeakToPeak) {
      valPeakToPeak.textContent = `Pk-Pk: ${data.peakToPeak} g | RMS: ${data.peakAmp} g`;
    }

    if (energy1xVal) energy1xVal.textContent = `${data.energy1x}%`;
    if (energy1xBar) energy1xBar.style.width = `${data.energy1x}%`;

    if (energy2xVal) energy2xVal.textContent = `${data.energy2x}%`;
    if (energy2xBar) energy2xBar.style.width = `${data.energy2x}%`;

    if (energyBearingVal) energyBearingVal.textContent = `${data.energyBearing}%`;
    if (energyBearingBar) energyBearingBar.style.width = `${data.energyBearing}%`;

    if (energyNoiseVal) energyNoiseVal.textContent = `${data.energyNoise}%`;
    if (energyNoiseBar) energyNoiseBar.style.width = `${data.energyNoise}%`;

    if (mlDiagnosticName) {
      mlDiagnosticName.textContent = data.mlDiagnostic;
      if (mlConfidencePill) mlConfidencePill.textContent = `${data.mlConfidence} Confidence`;
      if (valHealthIndex) valHealthIndex.textContent = `${data.healthIndex}%`;
      if (healthBar) {
        healthBar.style.width = `${data.healthIndex}%`;
        if (data.healthIndex < 50) {
          healthBar.className = 'progress-bar-fill warn';
          valHealthIndex.style.color = 'var(--accent-rose)';
        } else {
          healthBar.className = 'progress-bar-fill';
          valHealthIndex.style.color = 'var(--accent-emerald)';
        }
      }
    }

    // Field Technician Mobile Mode Live Values
    const fieldValRpm = document.getElementById('fieldValRpm');
    if (fieldValRpm) fieldValRpm.innerHTML = `${data.rpm.toLocaleString()} <span class="field-telemetry-unit">RPM</span>`;

    const fieldValTemp = document.getElementById('fieldValTemp');
    if (fieldValTemp) fieldValTemp.innerHTML = `${data.temp} <span class="field-telemetry-unit">°C</span>`;

    const fieldValVibRms = document.getElementById('fieldValVibRms');
    if (fieldValVibRms) fieldValVibRms.innerHTML = `${data.vibRms} <span class="field-telemetry-unit">g</span>`;

    const fieldValDominantPeak = document.getElementById('fieldValDominantPeak');
    if (fieldValDominantPeak) fieldValDominantPeak.innerHTML = `${Math.round(data.dominantPeakFreq)} <span class="field-telemetry-unit">Hz</span>`;

    const fieldRadialScoreVal = document.getElementById('fieldRadialScoreVal');
    if (fieldRadialScoreVal) fieldRadialScoreVal.textContent = `${data.healthIndex}%`;

    const fieldRadialProgress = document.getElementById('fieldRadialProgress');
    if (fieldRadialProgress) {
      const c = 263.89;
      const offset = c * (1 - data.healthIndex / 100);
      fieldRadialProgress.style.strokeDashoffset = offset;
      fieldRadialProgress.style.stroke = data.healthIndex > 80 ? 'var(--accent-emerald)' : data.healthIndex > 50 ? 'var(--accent-amber)' : 'var(--accent-rose)';
    }

    renderGenAiSteps(genAiStepsList, data.genAiSteps);
    renderPeakDataTable(data);
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

  // Populate Spectral Peak Table
  function renderPeakDataTable(data) {
    if (!peakDataTableBody) return;

    const peaks = [
      {
        freq: `${data.freq1x} Hz`,
        amp: `${data.amp1x} g`,
        velocity: `${(data.amp1x * 2.8).toFixed(2)} mm/s`,
        harmonic: '1X RPM',
        fault: 'Rotor Mass Unbalance',
        severity: data.amp1x > 1.0 ? '<span class="badge-sev-warn">WARNING</span>' : '<span class="badge-sev-normal">NOMINAL</span>',
        confidence: '98.4%',
        action: data.amp1x > 1.0 ? 'Schedule 2-Plane Rotor Dynamic Balancing' : 'Continue Periodic Monitoring',
        isFault: data.amp1x > 1.0,
        isHarmonic: true
      },
      {
        freq: `${data.freq2x} Hz`,
        amp: `${data.amp2x} g`,
        velocity: `${(data.amp2x * 2.6).toFixed(2)} mm/s`,
        harmonic: '2X RPM',
        fault: 'Shaft Misalignment / Coupling Strain',
        severity: data.amp2x > 1.0 ? '<span class="badge-sev-warn">WARNING</span>' : '<span class="badge-sev-normal">NOMINAL</span>',
        confidence: '95.2%',
        action: data.amp2x > 1.0 ? 'Perform Laser Hub Alignment (<0.03 mm offset)' : 'Coupling Tolerance In Specification',
        isFault: data.amp2x > 1.0,
        isHarmonic: true
      },
      {
        freq: `${data.freqBpfo} Hz`,
        amp: `${data.ampBpfo} g`,
        velocity: `${(data.ampBpfo * 3.4).toFixed(2)} mm/s`,
        harmonic: 'BPFO',
        fault: 'Outer Race Surface Micro-Spalling',
        severity: data.ampBpfo > 0.5 ? '<span class="badge-sev-crit">CRITICAL FAULT</span>' : '<span class="badge-sev-normal">NOMINAL</span>',
        confidence: '96.8%',
        action: data.ampBpfo > 0.5 ? 'Replace Bearing Unit & Check Housing Bore' : 'Lubrication Film Optimal',
        isFault: data.ampBpfo > 0.5,
        isHarmonic: false
      },
      {
        freq: `${data.freqBpfi} Hz`,
        amp: `${data.ampBpfi} g`,
        velocity: `${(data.ampBpfi * 2.2).toFixed(2)} mm/s`,
        harmonic: 'BPFI',
        fault: 'Inner Race Raceway Indentation',
        severity: data.ampBpfi > 0.5 ? '<span class="badge-sev-warn">WARNING</span>' : '<span class="badge-sev-normal">NOMINAL</span>',
        confidence: '92.1%',
        action: data.ampBpfi > 0.5 ? 'Inspect Shaft Interference Fit' : 'Inner Raceway Clear',
        isFault: data.ampBpfi > 0.5,
        isHarmonic: false
      },
      {
        freq: `${data.freqBsf} Hz`,
        amp: `${data.ampBsf} g`,
        velocity: `${(data.ampBsf * 1.8).toFixed(2)} mm/s`,
        harmonic: 'BSF',
        fault: 'Rolling Element Ball Defect',
        severity: '<span class="badge-sev-normal">NOMINAL</span>',
        confidence: '89.5%',
        action: 'No Ball Surface Flaws Detected',
        isFault: false,
        isHarmonic: false
      }
    ];

    let filtered = peaks;
    if (currentTableFilter === 'faults') {
      filtered = peaks.filter(p => p.isFault);
    } else if (currentTableFilter === 'harmonics') {
      filtered = peaks.filter(p => p.isHarmonic);
    }

    if (peakCountSummary) {
      peakCountSummary.textContent = `${filtered.length} Active Peaks Listed`;
    }

    peakDataTableBody.innerHTML = '';
    if (filtered.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="8" style="text-align:center; color:var(--text-dim); padding:20px;">No spectral peaks match active filter criteria.</td>`;
      peakDataTableBody.appendChild(tr);
      return;
    }

    filtered.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${p.freq}</strong></td>
        <td>${p.amp}</td>
        <td>${p.velocity}</td>
        <td><span class="brand-tag">${p.harmonic}</span></td>
        <td style="color:var(--text-main);">${p.fault}</td>
        <td>${p.severity}</td>
        <td style="color:var(--accent-cyan);">${p.confidence}</td>
        <td style="font-size:0.75rem; color:var(--text-muted);">${p.action}</td>
      `;
      peakDataTableBody.appendChild(tr);
    });
  }

  // Animation Loop for Canvases
  function renderLoop() {
    drawFFTSpectrum('fftCanvas');
    drawFFTSpectrum('fftCanvasPage');
    drawWaterfallSpectrogram('waterfallCanvasPage');
    if (!isWaveformFrozen) {
      drawTimeDomainWaveform('waveformCanvasPage');
    }

    if (currentView === 'fleet') {
      drawAllFleetSparklines();
    }

    requestAnimationFrame(renderLoop);
  }

  // Draw Dynamic FFT Spectrum with Crosshairs & Markers
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
    const isPageChart = (canvasId === 'fftCanvasPage');
    const paddingLeft = isPageChart ? 48 : 40;
    const paddingBottom = 32;
    const paddingTop = 22;
    const paddingRight = 24;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;
    const maxFreqBand = isPageChart ? currentFftRange : 500;
    const isDbScale = isPageChart && currentScaleMode === 'db';

    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.lineWidth = 1;

    const ySteps = 4;
    for (let i = 0; i <= ySteps; i++) {
      const y = paddingTop + (chartHeight / ySteps) * i;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(width - paddingRight, y);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';

      if (isDbScale) {
        const dbVal = Math.round(10 - i * 15);
        ctx.fillText(`${dbVal}dB`, paddingLeft - 8, y + 3);
      } else {
        const labelVal = (2.0 - i * 0.5).toFixed(1);
        ctx.fillText(`${labelVal}g`, paddingLeft - 8, y + 3);
      }
    }

    const xSteps = 5;
    for (let i = 0; i <= xSteps; i++) {
      const f = (maxFreqBand / xSteps) * i;
      const x = paddingLeft + (i / xSteps) * chartWidth;

      ctx.beginPath();
      ctx.moveTo(x, paddingTop);
      ctx.lineTo(x, height - paddingBottom);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(f)}Hz`, x, height - 12);
    }

    if (isPageChart) {
      const warnY = isDbScale
        ? paddingTop + (1 - (-2 - -50) / 60) * chartHeight
        : height - paddingBottom - (0.8 / 2.0) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, warnY);
      ctx.lineTo(width - paddingRight, warnY);
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(245, 158, 11, 0.8)';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText('ISO 10816 WARNING (0.8g)', paddingLeft + 6, warnY - 4);

      const critY = isDbScale
        ? paddingTop + (1 - (6 - -50) / 60) * chartHeight
        : height - paddingBottom - (1.5 / 2.0) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, critY);
      ctx.lineTo(width - paddingRight, critY);
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
      ctx.fillText('ISO 10816 CRITICAL ALARM (1.5g)', paddingLeft + 6, critY - 4);
    }

    const numPoints = 280;
    const points = [];
    const f1x = telemetry.freq1x;
    const f2x = telemetry.freq2x;
    const fBpfo = telemetry.freqBpfo;
    const fBpfi = telemetry.freqBpfi;

    let winWidthMult = 0.012;
    if (currentWindowing === 'flattop') winWidthMult = 0.022;
    else if (currentWindowing === 'rectangular') winWidthMult = 0.006;
    else if (currentWindowing === 'blackman') winWidthMult = 0.016;

    for (let i = 0; i < numPoints; i++) {
      const freq = (i / numPoints) * maxFreqBand;
      let amp = 0.02 + Math.sin(i * 0.9) * 0.008 + Math.random() * 0.018;

      if (activeMarkers['1x'] && Math.abs(freq - f1x) < (maxFreqBand * winWidthMult)) {
        amp += telemetry.amp1x * (1 - Math.abs(freq - f1x) / (maxFreqBand * winWidthMult));
      }
      if (activeMarkers['2x'] && Math.abs(freq - f2x) < (maxFreqBand * winWidthMult)) {
        amp += telemetry.amp2x * (1 - Math.abs(freq - f2x) / (maxFreqBand * winWidthMult));
      }
      if (activeMarkers['bpfo'] && Math.abs(freq - fBpfo) < (maxFreqBand * winWidthMult)) {
        amp += telemetry.ampBpfo * (1 - Math.abs(freq - fBpfo) / (maxFreqBand * winWidthMult));
      }
      if (activeMarkers['bpfi'] && Math.abs(freq - fBpfi) < (maxFreqBand * winWidthMult)) {
        amp += telemetry.ampBpfi * (1 - Math.abs(freq - fBpfi) / (maxFreqBand * winWidthMult));
      }

      if (currentState === 'bpfo' && Math.abs(freq - (fBpfo - f1x)) < (maxFreqBand * winWidthMult)) {
        amp += telemetry.ampBpfo * 0.28;
      }
      if (currentState === 'bpfo' && Math.abs(freq - (fBpfo + f1x)) < (maxFreqBand * winWidthMult)) {
        amp += telemetry.ampBpfo * 0.28;
      }

      points.push({ freq, amp });
    }

    const coords = points.map(pt => {
      const x = paddingLeft + (pt.freq / maxFreqBand) * chartWidth;
      let y;
      if (isDbScale) {
        const db = 20 * Math.log10(Math.max(pt.amp, 0.001) / 0.001) - 50;
        y = height - paddingBottom - ((db + 50) / 60) * chartHeight;
      } else {
        y = height - paddingBottom - (Math.min(pt.amp, 2.0) / 2.0) * chartHeight;
      }
      return { x, y, freq: pt.freq, amp: pt.amp };
    });

    const gradient = ctx.createLinearGradient(0, paddingTop, 0, height - paddingBottom);
    if (currentState === 'bpfo') {
      gradient.addColorStop(0, 'rgba(239, 68, 68, 0.45)');
      gradient.addColorStop(1, 'rgba(239, 68, 68, 0.0)');
    } else if (currentState === 'imbalance') {
      gradient.addColorStop(0, 'rgba(245, 158, 11, 0.45)');
      gradient.addColorStop(1, 'rgba(245, 158, 11, 0.0)');
    } else if (currentState === 'misalignment') {
      gradient.addColorStop(0, 'rgba(139, 92, 246, 0.45)');
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

    if (activeMarkers['1x']) {
      annotatedPeak(ctx, coords, f1x, `1X (${f1x}Hz)`, '#06b6d4', height - paddingBottom);
    }
    if (activeMarkers['2x']) {
      annotatedPeak(ctx, coords, f2x, `2X (${f2x}Hz)`, '#8b5cf6', height - paddingBottom);
    }
    if (activeMarkers['bpfo'] && (currentState === 'bpfo' || telemetry.ampBpfo > 0.1)) {
      annotatedPeak(ctx, coords, fBpfo, `BPFO (${fBpfo}Hz)`, '#ef4444', height - paddingBottom);
    }
    if (activeMarkers['bpfi'] && telemetry.ampBpfi > 0.1) {
      annotatedPeak(ctx, coords, fBpfi, `BPFI (${fBpfi}Hz)`, '#f59e0b', height - paddingBottom);
    }

    if (isPageChart && hoverMouse.active) {
      const hX = hoverMouse.chartX;
      const hY = hoverMouse.chartY;

      if (hX >= paddingLeft && hX <= width - paddingRight && hY >= paddingTop && hY <= height - paddingBottom) {
        ctx.beginPath();
        ctx.moveTo(hX, paddingTop);
        ctx.lineTo(hX, height - paddingBottom);
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.7)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(paddingLeft, hY);
        ctx.lineTo(width - paddingRight, hY);
        ctx.stroke();
        ctx.setLineDash([]);

        const cursorFreq = ((hX - paddingLeft) / chartWidth) * maxFreqBand;
        let cursorAmp;
        if (isDbScale) {
          const dbVal = 10 - ((hY - paddingTop) / chartHeight) * 60;
          cursorAmp = `${dbVal.toFixed(1)} dB`;
        } else {
          const gVal = 2.0 * (1 - (hY - paddingTop) / chartHeight);
          cursorAmp = `${gVal.toFixed(2)} g`;
        }

        let faultTag = 'Noise Band';
        if (Math.abs(cursorFreq - f1x) < 8) faultTag = '1X Running Speed Harmonic';
        else if (Math.abs(cursorFreq - f2x) < 8) faultTag = '2X Misalignment Harmonic';
        else if (Math.abs(cursorFreq - fBpfo) < 8) faultTag = 'BPFO Bearing Outer Race';
        else if (Math.abs(cursorFreq - fBpfi) < 8) faultTag = 'BPFI Bearing Inner Race';

        if (spectrumHud) {
          spectrumHud.textContent = `Telemetry: ${cursorFreq.toFixed(1)} Hz | ${cursorAmp} | ${faultTag}`;
        }
      }
    }

    ctx.restore();
  }

  // Draw Waterfall Spectrogram Heatmap
  function drawWaterfallSpectrogram(canvasId) {
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
    ctx.clearRect(0, 0, width, height);

    const numSlices = waterfallHistory.length;
    if (numSlices === 0) {
      ctx.restore();
      return;
    }

    const sliceHeight = height / MAX_WATERFALL_SLICES;

    for (let s = 0; s < numSlices; s++) {
      const slice = waterfallHistory[s];
      const y = s * sliceHeight;
      const numBins = slice.length;
      const binWidth = width / numBins;

      for (let b = 0; b < numBins; b++) {
        const val = slice[b];
        const x = b * binWidth;

        let color = '#050814';
        if (val > 0.65) color = '#ef4444';
        else if (val > 0.45) color = '#f59e0b';
        else if (val > 0.25) color = '#10b981';
        else if (val > 0.10) color = '#06b6d4';
        else if (val > 0.03) color = '#1e293b';

        ctx.fillStyle = color;
        ctx.fillRect(x, y, binWidth + 0.5, sliceHeight + 0.5);
      }
    }

    ctx.restore();
  }

  // Draw Raw Time-Domain Acceleration Waveform a(t) & Envelope Demodulation
  function drawTimeDomainWaveform(canvasId) {
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
    const centerY = height / 2;

    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    for (let i = 1; i < 10; i++) {
      const gx = (width / 10) * i;
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, height);
      ctx.stroke();
    }

    const tOffset = Date.now() * 0.006;
    const points = [];
    const numPts = 240;
    const timeScaleFactor = 20 / currentTimebaseMs;

    for (let i = 0; i < numPts; i++) {
      const t = (i * 0.04 * timeScaleFactor) + tOffset;
      let val = Math.sin(t * 3.5) * telemetry.amp1x + Math.sin(t * 7.0) * telemetry.amp2x * 0.6;

      if (currentState === 'bpfo') {
        const pulseCycle = (i + Math.round(tOffset * 30)) % 32;
        if (pulseCycle < 6) {
          const decay = Math.exp(-pulseCycle * 0.6);
          val += Math.sin(pulseCycle * 4.5) * telemetry.ampBpfo * 1.5 * decay;
        }
      }

      val += (Math.random() - 0.5) * 0.12;

      if (currentWaveformTrace === 'envelope') {
        val = Math.abs(val) * 1.3;
        points.push({ x: (i / numPts) * width, y: height - 20 - val * 26 });
      } else {
        points.push({ x: (i / numPts) * width, y: centerY - val * 24 });
      }
    }

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }

    if (currentWaveformTrace === 'envelope') {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
    } else {
      ctx.strokeStyle = currentState === 'bpfo' ? '#ef4444' : '#8b5cf6';
      ctx.lineWidth = 1.6;
    }
    ctx.stroke();

    ctx.restore();
  }

  function annotatedPeak(ctx, coords, targetFreq, text, color, bottomY) {
    const pt = coords.find(c => Math.abs(c.freq - targetFreq) < 12);
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

    ctx.fillStyle = 'rgba(10, 15, 30, 0.9)';
    ctx.fillRect(pt.x - 42, pt.y - 22, 84, 16);
    ctx.strokeStyle = color;
    ctx.strokeRect(pt.x - 42, pt.y - 22, 84, 16);

    ctx.fillStyle = '#ffffff';
    ctx.font = '9px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, pt.x, pt.y - 10);
  }

  // Draw Real-Time Animated Mini-Sparklines for Fleet Machine Cards
  function drawAllFleetSparklines() {
    const canvases = document.querySelectorAll('.sparkline-canvas');
    const tNow = Date.now() * 0.005;

    canvases.forEach(cvs => {
      const machineId = cvs.getAttribute('data-machine-id');
      const machine = fleetMachines.find(m => m.id === machineId);
      if (!machine) return;

      const rect = cvs.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      if (cvs.width !== rect.width * 2) {
        cvs.width = rect.width * 2;
        cvs.height = rect.height * 2;
      }
      const ctx = cvs.getContext('2d');
      ctx.save();
      ctx.scale(2, 2);

      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);

      const centerY = h / 2;
      ctx.beginPath();
      const numPts = 40;

      for (let i = 0; i <= numPts; i++) {
        const x = (i / numPts) * w;
        let y = centerY;
        const phase = i * 0.35 + tNow;

        if (machine.sparklineType === 'bearing') {
          const click = (i + Math.round(tNow * 10)) % 10;
          y = centerY + Math.sin(phase) * 3 + (click < 2 ? (Math.random() - 0.5) * 22 : (Math.random() - 0.5) * 4);
        } else if (machine.sparklineType === 'misalignment') {
          y = centerY + Math.sin(phase) * 6 + Math.sin(phase * 2) * 10 + (Math.random() - 0.5) * 3;
        } else if (machine.sparklineType === 'imbalance') {
          y = centerY + Math.sin(phase) * 12 + (Math.random() - 0.5) * 2;
        } else {
          y = centerY + Math.sin(phase) * 4 + (Math.random() - 0.5) * 2;
        }

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.strokeStyle = machine.status === 'critical' ? '#ef4444'
                      : machine.status === 'warning' ? '#f59e0b'
                      : '#10b981';
      ctx.lineWidth = 1.4;
      ctx.stroke();

      ctx.restore();
    });
  }

  // Render Machine Cards Grid in Fleet Overview
  function renderFleetCardsGrid() {
    if (!fleetCardsGrid) return;

    let filtered = fleetMachines.filter(m => {
      // Status Filter
      if (currentFleetFilter === 'healthy' && m.status !== 'healthy') return false;
      if (currentFleetFilter === 'warning' && m.status !== 'warning') return false;
      if (currentFleetFilter === 'critical' && m.status !== 'critical') return false;

      // Search query
      if (currentFleetSearch) {
        const q = currentFleetSearch.toLowerCase();
        const match = m.name.toLowerCase().includes(q) ||
                      m.location.toLowerCase().includes(q) ||
                      m.statusText.toLowerCase().includes(q) ||
                      m.faultType.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });

    // Sorting
    if (currentFleetSort === 'health-asc') {
      filtered.sort((a, b) => a.health - b.health);
    } else if (currentFleetSort === 'health-desc') {
      filtered.sort((a, b) => b.health - a.health);
    } else if (currentFleetSort === 'rul-asc') {
      filtered.sort((a, b) => a.rul - b.rul);
    } else if (currentFleetSort === 'vib-desc') {
      filtered.sort((a, b) => b.vibRms - a.vibRms);
    } else if (currentFleetSort === 'name-asc') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    fleetCardsGrid.innerHTML = '';

    if (filtered.length === 0) {
      fleetCardsGrid.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 40px; text-align: center; color: var(--text-dim); background: rgba(10,15,30,0.7); border-radius: var(--radius-md); border: 1px dashed var(--border-color);">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:8px;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <div style="font-size:0.95rem; font-weight:700; color:#ffffff;">No machines found</div>
          <div style="font-size:0.8rem; margin-top:4px;">Try searching for a different keyword or resetting filters.</div>
        </div>
      `;
      return;
    }

    filtered.forEach(m => {
      const card = document.createElement('div');
      card.className = `fleet-machine-card status-${m.status}`;
      card.setAttribute('data-machine-id', m.id);

      const statusBadgeHtml = m.status === 'healthy'
        ? `<span class="status-pill healthy" style="padding:3px 10px; font-size:0.7rem;">HEALTHY</span>`
        : m.status === 'warning'
        ? `<span class="status-pill imbalance" style="padding:3px 10px; font-size:0.7rem;">${m.statusText}</span>`
        : `<span class="status-pill bpfo" style="padding:3px 10px; font-size:0.7rem;">${m.statusText}</span>`;

      const healthColor = m.health > 80 ? 'var(--accent-emerald)' : m.health > 50 ? 'var(--accent-amber)' : 'var(--accent-rose)';
      const vibColor = m.vibRms > 2.0 ? 'var(--accent-rose)' : m.vibRms > 1.5 ? 'var(--accent-amber)' : 'var(--text-main)';

      card.innerHTML = `
        <div class="machine-card-header">
          <div class="machine-name-group">
            <span class="machine-title">${m.name}</span>
            <span class="machine-location">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              ${m.location} (${m.model})
            </span>
          </div>
          ${statusBadgeHtml}
        </div>

        <div class="machine-metrics-grid">
          <div class="machine-metric-item">
            <span class="metric-lbl">Speed</span>
            <span class="metric-val">${m.rpm.toLocaleString()} <span style="font-size:0.65rem; color:var(--text-dim);">RPM</span></span>
          </div>
          <div class="machine-metric-item">
            <span class="metric-lbl">Temp</span>
            <span class="metric-val">${m.temp}°C</span>
          </div>
          <div class="machine-metric-item">
            <span class="metric-lbl">Vibration</span>
            <span class="metric-val" style="color:${vibColor};">${m.vibRms} <span style="font-size:0.65rem; color:var(--text-dim);">g</span></span>
          </div>
        </div>

        <div class="machine-sparkline-wrap">
          <canvas class="sparkline-canvas" data-machine-id="${m.id}"></canvas>
          <span class="sparkline-label">${m.faultType}</span>
        </div>

        <div class="machine-health-row">
          <div class="health-indicator">
            <span style="font-size:0.725rem; font-weight:700; color:var(--text-dim);">Health:</span>
            <div class="progress-bar-bg" style="height:6px; flex:1;">
              <div class="progress-bar-fill" style="width:${m.health}%; background:${healthColor};"></div>
            </div>
            <strong style="font-family:'JetBrains Mono', monospace; color:${healthColor};">${m.health}%</strong>
          </div>
          <span class="rul-badge ${m.rul <= 14 ? 'urgent' : ''}">RUL: ${m.rul} Days</span>
        </div>

        <div class="machine-card-actions">
          <button class="btn-card-action btn-inspect-rig" data-machine-id="${m.id}">Inspect Rig</button>
          <button class="btn-card-action btn-view-fft" data-machine-id="${m.id}">View FFT</button>
          <button class="btn-card-action btn-genai-report" data-machine-id="${m.id}">GenAI Report</button>
        </div>
      `;

      fleetCardsGrid.appendChild(card);
    });

    attachFleetCardActionListeners();
  }

  // Card Action Button Handlers
  function attachFleetCardActionListeners() {
    document.querySelectorAll('.btn-inspect-rig[data-machine-id]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-machine-id');
        selectFleetMachine(id);
        switchView('master');
      });
    });

    document.querySelectorAll('.btn-view-fft[data-machine-id]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-machine-id');
        selectFleetMachine(id);
        switchView('fft');
      });
    });

    document.querySelectorAll('.btn-genai-report[data-machine-id]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-machine-id');
        selectFleetMachine(id);
        switchView('technician');
      });
    });
  }

  // Select Machine and set active state
  function selectFleetMachine(machineId) {
    const machine = fleetMachines.find(m => m.id === machineId);
    if (!machine) return;

    const activeMachineLabel = document.getElementById('activeMachineLabel');
    if (activeMachineLabel) {
      activeMachineLabel.textContent = `${machine.name} — ${machine.model}`;
    }

    const fieldRigIdPill = document.getElementById('fieldRigIdPill');
    if (fieldRigIdPill) {
      fieldRigIdPill.textContent = machine.name.replace('Pump Rig #', 'RIG-').replace('Motor Rig #', 'RIG-').replace('Turbine Blower #', 'RIG-').replace('CNC Spindle Drive #', 'RIG-').replace('Cooling Tower Fan #', 'RIG-').replace('Compressor Rig #', 'RIG-').replace('Exhaust Blower #', 'RIG-').replace('Feedwater Pump #', 'RIG-');
    }

    const machineSelect = document.getElementById('machineSelect');
    if (machineSelect) {
      machineSelect.value = machineId;
    }

    if (machine.statusText.includes('BEARING') || machine.statusText.includes('BPFO')) {
      setSimulatorState('bpfo');
    } else if (machine.statusText.includes('IMBALANCE')) {
      setSimulatorState('imbalance');
    } else if (machine.statusText.includes('MISALIGNMENT')) {
      setSimulatorState('misalignment');
    } else {
      setSimulatorState('healthy');
    }
  }

  function setSimulatorState(targetState) {
    currentState = targetState;
    document.querySelectorAll('.btn-state[data-state]').forEach(b => {
      if (b.getAttribute('data-state') === targetState) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });
    tickTelemetry();
  }

  // Export Fleet Summary CSV
  function exportFleetSummaryCsv() {
    const rows = [
      ['Machine ID', 'Machine Name', 'Location', 'Bearing Model', 'RPM', 'Temperature (C)', 'Vibration RMS (g)', 'Health Index (%)', 'RUL (Days)', 'Status', 'Fault Association']
    ];

    fleetMachines.forEach(m => {
      rows.push([
        m.id,
        `"${m.name}"`,
        `"${m.location}"`,
        `"${m.model}"`,
        m.rpm,
        m.temp,
        m.vibRms,
        m.health,
        m.rul,
        m.statusText,
        `"${m.faultType}"`
      ]);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DomainX_Plant_Fleet_Summary_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Export Spectrum Canvas as PNG
  function exportSpectrumPng() {
    const canvas = document.getElementById('fftCanvasPage');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `DomainX_FFT_Spectrum_${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  // Export Detected Peaks as CSV
  function exportPeaksCsv() {
    const rows = [
      ['Frequency (Hz)', 'Amplitude (g pk)', 'Harmonic Order', 'Fault Association', 'ISO Zone', 'Status'],
      [telemetry.freq1x, telemetry.amp1x, '1X RPM', 'Rotor Mass Unbalance', 'Zone A', telemetry.amp1x > 1.0 ? 'WARNING' : 'NOMINAL'],
      [telemetry.freq2x, telemetry.amp2x, '2X RPM', 'Shaft Misalignment', 'Zone A', telemetry.amp2x > 1.0 ? 'WARNING' : 'NOMINAL'],
      [telemetry.freqBpfo, telemetry.ampBpfo, 'BPFO', 'Outer Race Spall', 'Zone D', telemetry.ampBpfo > 0.5 ? 'CRITICAL FAULT' : 'NOMINAL'],
      [telemetry.freqBpfi, telemetry.ampBpfi, 'BPFI', 'Inner Race Defect', 'Zone B', 'NOMINAL'],
      [telemetry.freqBsf, telemetry.ampBsf, 'BSF', 'Ball Flaw', 'Zone A', 'NOMINAL']
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DomainX_Spectral_Peaks_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Export GenAI Maintenance Report as Markdown
  function exportAiReport() {
    const completedCount = Object.values(checklistState).filter(Boolean).length;
    const md = `# Domain-X Predictive Maintenance & GenAI Technician Report
Generated: ${new Date().toISOString()}

## 1. Incident Overview
- **Incident Status**: ${isAlertAcknowledged ? 'ACKNOWLEDGED' : 'CRITICAL ACTIVE'}
- **Severity**: RED / HIGH ALERT
- **Affected Component**: 775 DC Motor Coupling & 608ZZ Bearing Housing
- **Diagnosis Classification**: Angular Shaft Misalignment & Bearing Thermal Gradient
- **ML Model**: XGBoost Ensemble (Confidence: 96.4%)
- **Validation**: Gemini AI Verified

## 2. Telemetry & Detected Anomalies
- 2x RPM Harmonic Peak: 60.0 Hz (1.75 g pk)
- Temperature Rise Velocity: +12°C / 3 min
- Bearing Thermal State: High (78.5°C)
- Vibration RMS: 6.45 mm/s (ISO 10816 Zone D)
- Crest Factor: 4.15 Ratio

## 3. Root-Cause Analysis
High 2x RPM harmonic vibration peak (60 Hz) combined with a rapid temperature rise of +12°C in 3 minutes indicates structural angular misalignment between the motor shaft and 8mm axle.

## 4. Standard Operating Procedure (SOP) Status (${completedCount}/4 Completed)
- [${checklistState.step1 ? 'x' : ' '}] Step 1: Power Down & Lockout/Tagout (LOTO) 12V L298N Motor Driver
- [${checklistState.step2 ? 'x' : ' '}] Step 2: Inspect 5mm-to-8mm rigid coupling for loose set screws
- [${checklistState.step3 ? 'x' : ' '}] Step 3: Remove base plate mounting bolts and insert 0.5mm alignment shims under front motor bracket
- [${checklistState.step4 ? 'x' : ' '}] Step 4: Re-torque bolts to specification and perform manual rotor spin test

## 5. Maintenance Recommendation
All shimming must meet <0.03 mm radial/angular tolerance before re-energizing the 12V bus.
`;

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DomainX_GenAI_Incident_Report_${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Render Drawer Checklist
  function renderDrawerChecklist() {
    if (!drawerChecklistContainer) return;
    drawerChecklistContainer.innerHTML = '';

    const steps = [
      { id: 1, title: 'Step 1: Power Down & LOTO 12V L298N Motor Driver' },
      { id: 2, title: 'Step 2: Inspect 5mm-to-8mm rigid coupling set screws' },
      { id: 3, title: 'Step 3: Insert 0.5mm alignment shims under front bracket' },
      { id: 4, title: 'Step 4: Re-torque bolts & manual rotor spin test' }
    ];

    steps.forEach(s => {
      const div = document.createElement('div');
      div.className = `checklist-step-item ${checklistState[`step${s.id}`] ? 'completed' : ''}`;
      div.style.padding = '8px 10px';
      div.innerHTML = `
        <div class="step-checkbox-wrap">
          <input type="checkbox" id="drawerChkStep${s.id}" class="step-checkbox" data-step="${s.id}" ${checklistState[`step${s.id}`] ? 'checked' : ''}>
        </div>
        <div class="step-content">
          <label for="drawerChkStep${s.id}" class="step-title-text" style="font-size:0.8rem;">${s.title}</label>
        </div>
      `;
      drawerChecklistContainer.appendChild(div);
    });
  }

  // Update Checklist Progress
  function updateChecklistProgress() {
    const totalSteps = 4;
    const completedCount = Object.values(checklistState).filter(Boolean).length;
    const pct = Math.round((completedCount / totalSteps) * 100);

    if (checklistProgressBadge) {
      checklistProgressBadge.textContent = `Progress: ${completedCount} / ${totalSteps} completed (${pct}%)`;
    }
    if (checklistProgressBar) {
      checklistProgressBar.style.width = `${pct}%`;
    }
    if (drawerProgressText) {
      drawerProgressText.textContent = `${completedCount} / ${totalSteps} Completed (${pct}%)`;
    }

    const fieldRepairCounterText = document.getElementById('fieldRepairCounterText');
    if (fieldRepairCounterText) {
      fieldRepairCounterText.textContent = `${completedCount} / ${totalSteps} steps completed (${pct}%)`;
    }

    const fieldRepairProgressBar = document.getElementById('fieldRepairProgressBar');
    if (fieldRepairProgressBar) {
      fieldRepairProgressBar.style.width = `${pct}%`;
    }

    for (let i = 1; i <= totalSteps; i++) {
      const isChecked = checklistState[`step${i}`];
      const mainChk = document.getElementById(`chkStep1`.replace('1', i));
      const mainItem = document.getElementById(`stepItem1`.replace('1', i));
      const drawerChk = document.getElementById(`drawerChkStep${i}`);

      if (mainChk) mainChk.checked = isChecked;
      if (mainItem) {
        if (isChecked) mainItem.classList.add('completed');
        else mainItem.classList.remove('completed');
      }
      if (drawerChk) drawerChk.checked = isChecked;
    }
  }

  // Handle Copilot AI Chat Message Submit
  function handleChatSubmit(queryText, targetStream) {
    if (!queryText || !queryText.trim()) return;
    const q = queryText.trim();

    appendChatBubble('user', q, chatMessageStream);
    appendChatBubble('user', q, drawerChatStream);

    let responseText = '';
    const qLower = q.toLowerCase();

    if (qLower.includes('explain') || qLower.includes('fault') || qLower.includes('why')) {
      responseText = `<strong>Root Cause Breakdown:</strong><br>The dominant 2X RPM harmonic peak (60.0 Hz at 1.75g pk) combined with a rapid +12°C/3min bearing temperature rise is the hallmark indicator of <strong>Angular Shaft Misalignment</strong>. When the 775 DC motor shaft and 8mm driven axle are out of collinear alignment, the rigid coupling generates cyclical bending stresses twice per revolution, overloading the 608ZZ bearing raceway.`;
    } else if (qLower.includes('inspect') || qLower.includes('first') || qLower.includes('start')) {
      responseText = `<strong>Priority Inspection Sequence:</strong><br>1. <strong>LOTO Isolation:</strong> Disconnect the 12V L298N driver power supply.<br>2. <strong>Coupling Integrity:</strong> Check M4 grub set screws on the 5mm-to-8mm coupling for micro-slippage.<br>3. <strong>Angular Offset:</strong> Measure gap with a feeler gauge to assess vertical angularity.`;
    } else if (qLower.includes('procedure') || qLower.includes('repair') || qLower.includes('how to') || qLower.includes('shim')) {
      responseText = `<strong>Step-by-Step SOP Workflow:</strong><br>1. Power down & lockout 12V DC bus.<br>2. Loosen 4x M3 motor bracket base fasteners.<br>3. Insert <strong>0.5mm precision brass shims</strong> beneath front bracket feet.<br>4. Re-tighten bolts to <strong>1.8 N·m</strong> in cross-pattern.<br>5. Spin rotor manually to verify free, uninhibited rotation.`;
    } else {
      if (isOfflineFallbackActive) {
        responseText = `<strong>[Offline Template Response]:</strong> Verified telemetry indicates 2X harmonic 60 Hz on 775 Motor. Perform standard alignment check using 0.5mm shims and verify 608ZZ bearing free spin.`;
      } else {
        responseText = `<strong>Gemini 1.5 Pro Analysis:</strong> Based on the live telemetry (${telemetry.rpm} RPM, ${telemetry.vibRms} mm/s RMS), the primary corrective action is mechanical alignment correction on the 775 motor base bracket. Complete Steps 1 through 4 in the Interactive Repair Checklist to resolve.`;
      }
    }

    setTimeout(() => {
      appendChatBubble('assistant', responseText, chatMessageStream);
      appendChatBubble('assistant', responseText, drawerChatStream);
    }, 350);
  }

  function appendChatBubble(role, contentHtml, streamElement) {
    if (!streamElement) return;
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${role}`;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    bubble.innerHTML = `
      <div class="bubble-header">
        <span class="bubble-sender">${role === 'user' ? 'Technician' : (isOfflineFallbackActive ? 'Local Template Engine' : 'Gemini Copilot')}</span>
        <span class="bubble-time">${timeStr}</span>
      </div>
      <div class="bubble-body">${contentHtml}</div>
    `;
    streamElement.appendChild(bubble);
    streamElement.scrollTop = streamElement.scrollHeight;
  }

  // Handle Backend Copilot Diagnosis Updates
  function handleCopilotDiagnosisUpdate(data) {
    if (!data) return;
    const titleEl = document.getElementById('incidentTitleText');
    const compEl = document.getElementById('incidentComponentText');
    const confEl = document.getElementById('incidentConfidenceText');
    const expEl = document.getElementById('rootCauseExplanationText');

    if (titleEl && data.title) titleEl.textContent = data.title;
    if (compEl && data.component) compEl.textContent = data.component;
    if (confEl && data.confidence) confEl.textContent = `Confidence: ${data.confidence}`;
    if (expEl && data.explanation) expEl.textContent = data.explanation;
  }

  // Handle Backend Fleet Data Updates
  function handleFleetDataUpdate(fleetArray) {
    if (Array.isArray(fleetArray) && fleetArray.length > 0) {
      fleetMachines = fleetArray;
      renderFleetCardsGrid();
    }
  }

  // Setup Event Listeners
  function setupEventListeners() {
    // Navigation routing (Sidebar & Hash)
    document.querySelectorAll('.nav-item[data-view]').forEach(navItem => {
      navItem.addEventListener('click', (e) => {
        e.preventDefault();
        const targetView = navItem.getAttribute('data-view');
        switchView(targetView);
      });
    });

    document.querySelectorAll('.btn-switch-view[data-target-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetView = btn.getAttribute('data-target-view');
        switchView(targetView);
      });
    });

    // Mobile Bottom Navigation
    document.querySelectorAll('.mobile-nav-item[data-mobile-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        const navTarget = btn.getAttribute('data-mobile-nav');
        if (navTarget === 'field') {
          switchView('field');
        } else if (navTarget === 'fleet') {
          switchView('fleet');
        } else if (navTarget === 'fft') {
          switchView('fft');
        } else if (navTarget === 'copilot') {
          if (copilotDrawerOverlay) {
            copilotDrawerOverlay.classList.add('active');
            renderDrawerChecklist();
            updateChecklistProgress();
          }
        } else if (navTarget === 'alerts') {
          switchView('fleet');
          const feed = document.querySelector('.alert-feed-card');
          if (feed) feed.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });

    // Field Mode Toggle in Header
    if (btnToggleFieldMode) {
      btnToggleFieldMode.addEventListener('click', () => {
        if (currentView === 'field') switchView('master');
        else switchView('field');
      });
    }

    // QR Code Scanner Modal
    if (btnFieldQrScan) {
      btnFieldQrScan.addEventListener('click', () => {
        if (fieldQrModalOverlay) fieldQrModalOverlay.classList.add('active');
      });
    }

    if (btnCloseQrModal) {
      btnCloseQrModal.addEventListener('click', () => {
        if (fieldQrModalOverlay) fieldQrModalOverlay.classList.remove('active');
      });
    }

    if (fieldQrModalOverlay) {
      fieldQrModalOverlay.addEventListener('click', (e) => {
        if (e.target === fieldQrModalOverlay) {
          fieldQrModalOverlay.classList.remove('active');
        }
      });
    }

    if (btnConfirmQrInspection) {
      btnConfirmQrInspection.addEventListener('click', () => {
        if (fieldQrModalOverlay) fieldQrModalOverlay.classList.remove('active');
        selectFleetMachine('m4');
        switchView('field');
      });
    }

    // Field Large Action Buttons
    if (btnFieldVoiceAi) {
      btnFieldVoiceAi.addEventListener('click', () => {
        if (copilotDrawerOverlay) {
          copilotDrawerOverlay.classList.add('active');
          renderDrawerChecklist();
          updateChecklistProgress();
        }
      });
    }

    if (btnFieldStartRepair) {
      btnFieldStartRepair.addEventListener('click', () => {
        switchView('technician');
      });
    }

    if (btnFieldViewWaveform) {
      btnFieldViewWaveform.addEventListener('click', () => {
        switchView('fft');
        const wf = document.getElementById('waveformCanvasPage');
        if (wf) wf.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }

    if (btnFieldViewFft) {
      btnFieldViewFft.addEventListener('click', () => {
        switchView('fft');
      });
    }

    // Machine State Simulator Switcher
    document.querySelectorAll('.btn-state[data-state]').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetState = btn.getAttribute('data-state');
        setSimulatorState(targetState);
      });
    });

    // Frequency Bandwidth Selectors
    document.querySelectorAll('.range-pill[data-range]').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.range-pill[data-range]').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        currentFftRange = parseInt(pill.getAttribute('data-range'));
      });
    });

    // Linear vs dB Scale Toggles
    const btnScaleLin = document.getElementById('btnScaleLin');
    const btnScaleDb = document.getElementById('btnScaleDb');
    if (btnScaleLin && btnScaleDb) {
      btnScaleLin.addEventListener('click', () => {
        btnScaleLin.classList.add('active');
        btnScaleDb.classList.remove('active');
        currentScaleMode = 'lin';
      });
      btnScaleDb.addEventListener('click', () => {
        btnScaleDb.classList.add('active');
        btnScaleLin.classList.remove('active');
        currentScaleMode = 'db';
      });
    }

    // Windowing Selector
    const selectWindowing = document.getElementById('selectWindowing');
    if (selectWindowing) {
      selectWindowing.addEventListener('change', (e) => {
        currentWindowing = e.target.value;
      });
    }

    // Waveform Raw vs Envelope Demodulation Toggle
    const btnWaveformRaw = document.getElementById('btnWaveformRaw');
    const btnWaveformEnv = document.getElementById('btnWaveformEnv');
    if (btnWaveformRaw && btnWaveformEnv) {
      btnWaveformRaw.addEventListener('click', () => {
        btnWaveformRaw.classList.add('active');
        btnWaveformEnv.classList.remove('active');
        currentWaveformTrace = 'raw';
      });
      btnWaveformEnv.addEventListener('click', () => {
        btnWaveformEnv.classList.add('active');
        btnWaveformRaw.classList.remove('active');
        currentWaveformTrace = 'envelope';
      });
    }

    // Waveform Timebase Controls
    document.querySelectorAll('.timebase-pill[data-timebase]').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.timebase-pill[data-timebase]').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        currentTimebaseMs = parseInt(pill.getAttribute('data-timebase'));
      });
    });

    // Waveform Freeze / Pause Button
    const btnFreezeWaveform = document.getElementById('btnFreezeWaveform');
    const freezeBtnText = document.getElementById('freezeBtnText');
    if (btnFreezeWaveform && freezeBtnText) {
      btnFreezeWaveform.addEventListener('click', () => {
        isWaveformFrozen = !isWaveformFrozen;
        if (isWaveformFrozen) {
          btnFreezeWaveform.classList.add('frozen');
          freezeBtnText.textContent = 'Resume';
        } else {
          btnFreezeWaveform.classList.remove('frozen');
          freezeBtnText.textContent = 'Freeze';
        }
      });
    }

    // Bearing Model Selector
    const selectBearingModel = document.getElementById('selectBearingModel');
    if (selectBearingModel) {
      selectBearingModel.addEventListener('change', (e) => {
        activeBearingModel = e.target.value;
        recalculateBearingKinematics();
      });
    }

    // Harmonic / Fault Marker Filter Legend Tags
    document.querySelectorAll('.legend-tag[data-marker]').forEach(tag => {
      tag.addEventListener('click', () => {
        const marker = tag.getAttribute('data-marker');
        activeMarkers[marker] = !activeMarkers[marker];
        tag.style.opacity = activeMarkers[marker] ? '1' : '0.35';
      });
    });

    // Peak Table Filters
    document.querySelectorAll('.table-filter-btn[data-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.table-filter-btn[data-filter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTableFilter = btn.getAttribute('data-filter');
        renderPeakDataTable(telemetry);
      });
    });

    // Acoustic Stethoscope Controls
    if (btnAudioToggle) {
      btnAudioToggle.addEventListener('click', () => {
        if (!audioStethoscope.isPlaying) {
          audioStethoscope.start(telemetry, currentState);
          btnAudioToggle.classList.add('active');
          if (audioBtnText) audioBtnText.textContent = 'Stethoscope Live';
          if (audioPulseIndicator) audioPulseIndicator.classList.add('active');
        } else {
          audioStethoscope.stop();
          btnAudioToggle.classList.remove('active');
          if (audioBtnText) audioBtnText.textContent = 'Acoustic Stethoscope';
          if (audioPulseIndicator) audioPulseIndicator.classList.remove('active');
        }
      });
    }

    if (audioVolumeSlider) {
      audioVolumeSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value) / 100;
        audioStethoscope.setVolume(val);
      });
    }

    // Export Buttons
    const btnExportSpectrumPng = document.getElementById('btnExportSpectrumPng');
    if (btnExportSpectrumPng) {
      btnExportSpectrumPng.addEventListener('click', exportSpectrumPng);
    }

    const btnExportPeakCsv = document.getElementById('btnExportPeakCsv');
    if (btnExportPeakCsv) {
      btnExportPeakCsv.addEventListener('click', exportPeaksCsv);
    }

    // Fleet Filter Pill Listeners
    document.querySelectorAll('.fleet-filter-pill[data-fleet-filter]').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.fleet-filter-pill[data-fleet-filter]').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        currentFleetFilter = pill.getAttribute('data-fleet-filter');
        renderFleetCardsGrid();
      });
    });

    // Fleet Search Input Listener
    if (fleetSearchInput) {
      fleetSearchInput.addEventListener('input', (e) => {
        currentFleetSearch = e.target.value.trim();
        renderFleetCardsGrid();
      });
    }

    // Fleet Sorting Selector
    if (selectFleetSort) {
      selectFleetSort.addEventListener('change', (e) => {
        currentFleetSort = e.target.value;
        renderFleetCardsGrid();
      });
    }

    // Export Fleet CSV
    if (btnExportFleetCsv) {
      btnExportFleetCsv.addEventListener('click', exportFleetSummaryCsv);
    }

    // Clear Alert Log Feed
    if (btnClearAlertFeed) {
      btnClearAlertFeed.addEventListener('click', () => {
        if (alertFeedList) {
          alertFeedList.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-dim); font-size:0.8rem;">Alert log cleared. Waiting for new events...</div>`;
        }
      });
    }

    // Interactive Checklist Checkbox Listeners (Main View & Drawer)
    document.addEventListener('change', (e) => {
      if (e.target && e.target.classList.contains('step-checkbox')) {
        const stepNum = e.target.getAttribute('data-step');
        checklistState[`step${stepNum}`] = e.target.checked;
        updateChecklistProgress();
      }
    });

    // Reset Checklist
    if (btnResetChecklist) {
      btnResetChecklist.addEventListener('click', () => {
        checklistState.step1 = false;
        checklistState.step2 = false;
        checklistState.step3 = false;
        checklistState.step4 = false;
        updateChecklistProgress();
      });
    }

    // Offline Local Template Fallback Toggle
    if (offlineFallbackToggle) {
      offlineFallbackToggle.addEventListener('change', (e) => {
        isOfflineFallbackActive = e.target.checked;
        if (isOfflineFallbackActive) {
          if (copilotModeStatusBadge) copilotModeStatusBadge.className = 'copilot-mode-status offline';
          if (copilotModeStatusText) copilotModeStatusText.textContent = 'Offline mode active — using local diagnostic templates.';
        } else {
          if (copilotModeStatusBadge) copilotModeStatusBadge.className = 'copilot-mode-status';
          if (copilotModeStatusText) copilotModeStatusText.textContent = 'Cloud Gemini 1.5 Pro Active — Live Inference';
        }
      });
    }

    // Copilot Actions
    if (btnAcknowledgeAlert) {
      btnAcknowledgeAlert.addEventListener('click', () => {
        isAlertAcknowledged = !isAlertAcknowledged;
        const banner = document.getElementById('incidentHeaderBanner');
        if (isAlertAcknowledged) {
          btnAcknowledgeAlert.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            <span>Incident Acknowledged</span>
          `;
          btnAcknowledgeAlert.style.borderColor = 'var(--accent-emerald)';
          btnAcknowledgeAlert.style.color = '#34d399';
          if (banner) banner.style.borderColor = 'rgba(16, 185, 129, 0.4)';
        } else {
          btnAcknowledgeAlert.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            <span>Acknowledge Incident</span>
          `;
          btnAcknowledgeAlert.style.borderColor = '';
          btnAcknowledgeAlert.style.color = '';
          if (banner) banner.style.borderColor = 'rgba(239, 68, 68, 0.35)';
        }
      });
    }

    if (btnGenSopReport) {
      btnGenSopReport.addEventListener('click', () => {
        switchView('technician');
        const firstUnchecked = document.querySelector('.checklist-step-item:not(.completed)');
        if (firstUnchecked) {
          firstUnchecked.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    }

    if (btnExportAiReport) {
      btnExportAiReport.addEventListener('click', exportAiReport);
    }

    // Chat Form Submits
    if (chatInputForm) {
      chatInputForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = chatInputText.value;
        chatInputText.value = '';
        handleChatSubmit(text, chatMessageStream);
      });
    }

    if (drawerChatForm) {
      drawerChatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = drawerChatInput.value;
        drawerChatInput.value = '';
        handleChatSubmit(text, drawerChatStream);
      });
    }

    // Chat Suggestion Chips
    document.querySelectorAll('.btn-suggestion-chip[data-prompt]').forEach(chip => {
      chip.addEventListener('click', () => {
        const prompt = chip.getAttribute('data-prompt');
        handleChatSubmit(prompt, chatMessageStream);
      });
    });

    // Slide-Over Drawer Controls
    if (btnOpenCopilotModal) {
      btnOpenCopilotModal.addEventListener('click', () => {
        if (copilotDrawerOverlay) {
          copilotDrawerOverlay.classList.add('active');
          renderDrawerChecklist();
          updateChecklistProgress();
        }
      });
    }

    if (btnCloseCopilotDrawer) {
      btnCloseCopilotDrawer.addEventListener('click', () => {
        if (copilotDrawerOverlay) copilotDrawerOverlay.classList.remove('active');
      });
    }

    if (copilotDrawerOverlay) {
      copilotDrawerOverlay.addEventListener('click', (e) => {
        if (e.target === copilotDrawerOverlay) {
          copilotDrawerOverlay.classList.remove('active');
        }
      });
    }

    if (btnDrawerOpenFullView) {
      btnDrawerOpenFullView.addEventListener('click', () => {
        if (copilotDrawerOverlay) copilotDrawerOverlay.classList.remove('active');
        switchView('technician');
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && copilotDrawerOverlay && copilotDrawerOverlay.classList.contains('active')) {
        copilotDrawerOverlay.classList.remove('active');
      }
    });

    // Mouse Tracking on Canvas for Crosshair
    if (fftCanvasWrapper) {
      fftCanvasWrapper.addEventListener('mousemove', (e) => {
        const rect = fftCanvasWrapper.getBoundingClientRect();
        hoverMouse.active = true;
        hoverMouse.chartX = e.clientX - rect.left;
        hoverMouse.chartY = e.clientY - rect.top;

        if (canvasCrosshairTooltip) {
          const maxFreqBand = currentFftRange;
          const chartWidth = rect.width - 72;
          const cursorFreq = (((e.clientX - rect.left - 48) / chartWidth) * maxFreqBand).toFixed(1);
          if (cursorFreq >= 0 && cursorFreq <= maxFreqBand) {
            canvasCrosshairTooltip.style.display = 'block';
            canvasCrosshairTooltip.style.left = `${e.clientX - rect.left + 15}px`;
            canvasCrosshairTooltip.style.top = `${e.clientY - rect.top - 20}px`;
            canvasCrosshairTooltip.textContent = `f: ${cursorFreq} Hz`;
          } else {
            canvasCrosshairTooltip.style.display = 'none';
          }
        }
      });

      fftCanvasWrapper.addEventListener('mouseleave', () => {
        hoverMouse.active = false;
        if (canvasCrosshairTooltip) canvasCrosshairTooltip.style.display = 'none';
        if (spectrumHud) spectrumHud.textContent = 'Cursor: Hover over spectrum for crosshair telemetry';
      });
    }

    // Machine Selector Box Sync
    const machineSelect = document.getElementById('machineSelect');
    if (machineSelect) {
      machineSelect.addEventListener('change', (e) => {
        const label = e.target.options[e.target.selectedIndex].text;
        const val = e.target.value;
        const activeMachineLabel = document.getElementById('activeMachineLabel');
        if (activeMachineLabel) activeMachineLabel.textContent = label;
        selectFleetMachine(val);
      });
    }
  }

  window.DomainXAPI = apiAdapter;

  init();
});
