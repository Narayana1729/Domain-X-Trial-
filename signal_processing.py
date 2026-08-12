import numpy as np
import pandas as pd
from scipy.fft import rfft, rfftfreq
from scipy.signal.windows import hann
from scipy.stats import kurtosis, skew

def compute_fft(signal, fs=1000):
    """
    Computes single-sided magnitude spectrum using Hanning windowed Real FFT.
    Returns: freqs (Hz), magnitudes (g RMS)
    """
    n = len(signal)
    if n == 0:
        return np.array([]), np.array([])
    
    window = hann(n)
    windowed_signal = (signal - np.mean(signal)) * window
    
    fft_vals = rfft(windowed_signal)
    freqs = rfftfreq(n, 1.0 / fs)
    
    # Scale magnitude for single-sided spectrum (with window correction factor 2.0)
    magnitudes = (2.0 / np.sum(window)) * np.abs(fft_vals)
    return freqs, magnitudes

def get_peak_in_band(freqs, magnitudes, center_freq, bandwidth=5.0):
    """
    Finds the maximum spectral amplitude around a target center frequency band.
    """
    mask = (freqs >= (center_freq - bandwidth)) & (freqs <= (center_freq + bandwidth))
    if np.any(mask):
        return np.max(magnitudes[mask])
    return 0.0

def extract_vibration_features(df, fs=1000):
    """
    Extracts statistical time-domain and FFT frequency-domain features from telemetry dataframe.
    """
    accel_x = df['accel_x'].values
    accel_y = df['accel_y'].values
    accel_z = df['accel_z'].values
    
    # Total vibration acceleration magnitude vector
    accel_mag = np.sqrt(accel_x**2 + accel_y**2 + (accel_z - 1.0)**2)
    
    # Time-Domain Metrics
    rms_val = float(np.sqrt(np.mean(accel_mag**2)))
    peak_val = float(np.max(np.abs(accel_mag)))
    crest_factor = float(peak_val / (rms_val + 1e-6))
    kurt_val = float(kurtosis(accel_mag))
    skew_val = float(skew(accel_mag))
    peak_to_peak = float(np.max(accel_mag) - np.min(accel_mag))
    
    # Speed & Temperature Features
    rpm_mean = float(df['rpm'].mean()) if 'rpm' in df else 1800.0
    temp_mean = float(df['temp'].mean()) if 'temp' in df else 38.0
    temp_max = float(df['temp'].max()) if 'temp' in df else 38.0
    
    # Frequency-Domain Features via FFT
    freqs, magnitudes = compute_fft(accel_mag, fs=fs)
    
    f_rot = rpm_mean / 60.0  # 1x RPM
    f_2x = 2.0 * f_rot       # 2x RPM
    f_bpfo = 4.7 * f_rot     # BPFO Outer Race Defect Frequency
    
    peak_1x = float(get_peak_in_band(freqs, magnitudes, f_rot, bandwidth=4.0))
    peak_2x = float(get_peak_in_band(freqs, magnitudes, f_2x, bandwidth=4.0))
    peak_bpfo = float(get_peak_in_band(freqs, magnitudes, f_bpfo, bandwidth=6.0))
    
    features = {
        "rms": rms_val,
        "peak": peak_val,
        "crest_factor": crest_factor,
        "kurtosis": kurt_val,
        "skewness": skew_val,
        "peak_to_peak": peak_to_peak,
        "rpm": rpm_mean,
        "temp_mean": temp_mean,
        "temp_max": temp_max,
        "peak_1x": peak_1x,
        "peak_2x": peak_2x,
        "peak_bpfo": peak_bpfo,
        "f_rot": f_rot,
        "f_2x": f_2x,
        "f_bpfo": f_bpfo
    }
    
    return features, freqs, magnitudes
