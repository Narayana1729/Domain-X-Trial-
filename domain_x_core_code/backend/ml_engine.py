import os
import pickle
import numpy as np
import pandas as pd
from data_engine import generate_synthetic_telemetry
from signal_processing import extract_vibration_features

class FaultClassifier:
    def __init__(self, use_ml=True):
        self.model = None
        self.use_ml = use_ml
        self.class_names = [
            "Healthy",
            "Hair Strand Obstruction",
            "Scratched Bearing Fault",
            "Shaft Misalignment",
            "Propeller Load",
            "Uneven Propeller Imbalance"
        ]
        self.is_trained = False
        if self.use_ml:
            self._load_or_train_model()

    def _load_or_train_model(self):
        model_path = os.path.join(os.path.dirname(__file__), "models", "fault_classifier.pkl")
        if os.path.exists(model_path):
            try:
                with open(model_path, "rb") as f:
                    self.model = pickle.load(f)
                self.is_trained = True
                print(f"✅ Loaded pre-trained ML model from {model_path}", flush=True)
                return
            except Exception as e:
                print(f"⚠️ Failed to load pre-trained model ({e}). Retraining...", flush=True)
        
        self._train_initial_model()

    def _train_initial_model(self):
        """Trains initial model if fault_classifier.pkl does not exist."""
        try:
            from train_model import train_and_save_model
            train_and_save_model()
            model_path = os.path.join(os.path.dirname(__file__), "models", "fault_classifier.pkl")
            if os.path.exists(model_path):
                with open(model_path, "rb") as f:
                    self.model = pickle.load(f)
                self.is_trained = True
        except Exception as e:
            print(f"⚠️ Sklearn ML training error: {e}. Using fallback rule-based classifier.", flush=True)
            self.use_ml = False

    def _normalize_label(self, label: str) -> str:
        lbl = str(label).lower()
        if "hair" in lbl:
            return "Hair Strand Obstruction"
        elif "scratched" in lbl or "bearing" in lbl:
            return "Scratched Bearing Fault"
        elif "misalignment" in lbl:
            return "Shaft Misalignment"
        elif "uneven" in lbl or "imbalance" in lbl:
            return "Healthy Baseline"
        elif "propeller" in lbl or "load" in lbl:
            return "Propeller Load"
        elif "healthy" in lbl:
            return "Healthy Baseline"
        return "Healthy Baseline"


    def _rule_based_predict(self, features):
        """Ultra-fast DSP threshold classification without requiring ML models."""
        rms = features.get('rms', 0.1)
        kurt = features.get('kurtosis', 3.0)
        p1x = features.get('peak_1x', 0.0)
        p2x = features.get('peak_2x', 0.0)
        p_bpfo = features.get('peak_bpfo', 0.0)
        temp = features.get('temp_mean', 36.5)

        if p_bpfo > 0.4 or (kurt > 4.2 and rms > 0.25):
            predicted_class = "Bearing Outer Race Fault"
            confidence_dict = {"Healthy": 0.05, "Bearing Outer Race Fault": 0.88, "Rotor Imbalance": 0.04, "Shaft Misalignment": 0.03}
        elif p1x > 0.6 or (rms > 0.35 and p1x > p2x):
            predicted_class = "Rotor Imbalance"
            confidence_dict = {"Healthy": 0.05, "Bearing Outer Race Fault": 0.04, "Rotor Imbalance": 0.88, "Shaft Misalignment": 0.03}
        elif p2x > 0.5 or temp > 48.0:
            predicted_class = "Shaft Misalignment"
            confidence_dict = {"Healthy": 0.05, "Bearing Outer Race Fault": 0.04, "Rotor Imbalance": 0.03, "Shaft Misalignment": 0.88}
        else:
            predicted_class = "Healthy"
            confidence_dict = {"Healthy": 0.96, "Bearing Outer Race Fault": 0.02, "Rotor Imbalance": 0.01, "Shaft Misalignment": 0.01}

        healthy_prob = confidence_dict["Healthy"]
        rms_penalty = max(0.0, (rms - 0.15) * 40.0)
        health_score = int(np.clip((healthy_prob * 100.0) - rms_penalty, 5.0, 100.0))

        if rms < 0.25 and predicted_class == "Healthy":
            iso_zone = "GREEN - Good (ISO Class I)"
            status_color = "green"
        elif rms < 0.65 or predicted_class == "Bearing Outer Race Fault":
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

    def predict(self, features):
        """
        Ingests extracted feature dict and returns predicted fault class, confidence dict, and health score.
        """
        if not self.use_ml or self.model is None:
            return self._rule_based_predict(features)

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

        try:
            raw_predicted_class = self.model.predict(feature_vector)[0]
            probs = self.model.predict_proba(feature_vector)[0]
            
            raw_confidence = {cls: float(prob) for cls, prob in zip(self.model.classes_, probs)}
            
            confidence_dict = {}
            for cls, prob in raw_confidence.items():
                norm_cls = self._normalize_label(cls)
                confidence_dict[norm_cls] = max(confidence_dict.get(norm_cls, 0.0), prob)

            predicted_class = self._normalize_label(raw_predicted_class)
            
            healthy_prob = confidence_dict.get("Healthy", 0.0)
            rms_penalty = max(0.0, (features['rms'] - 0.15) * 40.0)
            health_score = int(np.clip((healthy_prob * 100.0) - rms_penalty, 5.0, 100.0))

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
        except Exception as err:
            print(f"⚠️ ML inference error ({err}). Using rule-based fallbacks.", flush=True)
            return self._rule_based_predict(features)


