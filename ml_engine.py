import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from data_engine import generate_synthetic_telemetry
from signal_processing import extract_vibration_features

class FaultClassifier:
    def __init__(self):
        self.model = RandomForestClassifier(n_estimators=100, random_state=42)
        self.class_names = [
            "Healthy",
            "Bearing Outer Race Fault",
            "Rotor Imbalance",
            "Shaft Misalignment"
        ]
        self.is_trained = False
        self._train_initial_model()

    def _train_initial_model(self):
        """Generates a training dataset across speeds & load conditions to train the classifier."""
        X_train = []
        y_train = []

        fault_presets = [
            ("healthy", "Healthy"),
            ("bearing_fault", "Bearing Outer Race Fault"),
            ("imbalance", "Rotor Imbalance"),
            ("misalignment", "Shaft Misalignment")
        ]

        # Train across variable RPM speeds (1200 to 3000 RPM)
        speeds = [1200.0, 1500.0, 1800.0, 2400.0, 3000.0]
        
        for preset_key, label_name in fault_presets:
            for rpm in speeds:
                for trial in range(5):  # 5 randomized trials per speed
                    df = generate_synthetic_telemetry(fault_type=preset_key, rpm=rpm, duration=1.0)
                    feats, _, _ = extract_vibration_features(df)
                    
                    feature_vector = [
                        feats['rms'],
                        feats['peak'],
                        feats['crest_factor'],
                        feats['kurtosis'],
                        feats['skewness'],
                        feats['peak_to_peak'],
                        feats['temp_mean'],
                        feats['peak_1x'],
                        feats['peak_2x'],
                        feats['peak_bpfo']
                    ]
                    
                    X_train.append(feature_vector)
                    y_train.append(label_name)

        X_train = np.array(X_train)
        y_train = np.array(y_train)

        self.model.fit(X_train, y_train)
        self.is_trained = True

    def predict(self, features):
        """
        Ingests extracted feature dict and returns predicted fault class, confidence dict, and health score.
        """
        feature_vector = np.array([[
            features['rms'],
            features['peak'],
            features['crest_factor'],
            features['kurtosis'],
            features['skewness'],
            features['peak_to_peak'],
            features['temp_mean'],
            features['peak_1x'],
            features['peak_2x'],
            features['peak_bpfo']
        ]])

        predicted_class = self.model.predict(feature_vector)[0]
        probs = self.model.predict_proba(feature_vector)[0]
        
        confidence_dict = {cls: float(prob) for cls, prob in zip(self.model.classes_, probs)}
        
        # Calculate Health Score (0 - 100%)
        healthy_prob = confidence_dict.get("Healthy", 0.0)
        rms_penalty = max(0.0, (features['rms'] - 0.15) * 40.0)
        health_score = int(np.clip((healthy_prob * 100.0) - rms_penalty, 5.0, 100.0))

        # ISO 10816 Vibration Zone Assessment
        if features['rms'] < 0.25 and predicted_class == "Healthy":
            iso_zone = "GREEN - Good (ISO Class I)"
            status_color = "green"
        elif features['rms'] < 0.65 or predicted_class == "Bearing Outer Race Fault":
            iso_zone = "YELLOW - Allowable / Minor Fault (ISO Class II)"
            status_color = "amber"
        elif predicted_class == "Rotor Imbalance":
            iso_zone = "ORANGE - Unsatisfactory (ISO Class III)"
            status_color = "orange"
        else:
            iso_zone = "RED - Unacceptable / Critical (ISO Class IV)"
            status_color = "red"

        return {
            "predicted_class": predicted_class,
            "confidence_dict": confidence_dict,
            "health_score": health_score,
            "iso_zone": iso_zone,
            "status_color": status_color
        }
