import os
import pickle
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
from signal_processing import extract_vibration_features

DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "complete_training_dataset.csv")
MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")

def train_and_save_model():
    """Extracts windowed FFT features from the dataset and trains the Random Forest / XGBoost model."""
    os.makedirs(MODEL_DIR, exist_ok=True)
    
    print(f"📊 Loading dataset from: {DATA_PATH}")
    df_raw = pd.read_csv(DATA_PATH)
    
    # Process 1-second chunks (1,000 samples per chunk)
    chunk_size = 1000
    X = []
    y = []
    
    grouped = df_raw.groupby('label')
    for label, group in grouped:
        n_chunks = len(group) // chunk_size
        print(f"⚙-[#] Processing class '{label}': {n_chunks} feature windows...")
        
        for i in range(n_chunks):
            chunk = group.iloc[i * chunk_size : (i + 1) * chunk_size]
            features, _, _ = extract_vibration_features(chunk, fs=1000)
            
            feature_vector = [
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
            ]
            
            X.append(feature_vector)
            y.append(label)
            
    X = np.array(X)
    y = np.array(y)
    
    # Train-Test Split (80% Train, 20% Test)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    print(f"\n🚀 Training Random Forest Classifier on {len(X_train)} samples...")
    clf = RandomForestClassifier(n_estimators=100, random_state=42)
    clf.fit(X_train, y_train)
    
    # Evaluate Accuracy
    y_pred = clf.predict(X_test)
    acc = np.mean(y_pred == y_test) * 100.0
    print(f"\n✨ TEST ACCURACY: {acc:.2f}%\n")
    print("CLASSIFICATION REPORT:")
    print(classification_report(y_test, y_pred))
    
    model_path = os.path.join(MODEL_DIR, "fault_classifier.pkl")
    with open(model_path, "wb") as f:
        pickle.dump(clf, f)
        
    print(f"🎉 Model saved successfully to: {model_path}")

if __name__ == "__main__":
    train_and_save_model()
