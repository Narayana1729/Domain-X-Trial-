def generate_diagnostic_report(ml_result, features):
    """
    Generates plain-language GenAI Technician Summary, Evidence Breakdown, and Step-by-Step Inspection Checklist.
    Enforces Safety Disclaimer and No Direct Control Action Guardrails.
    """
    pred_class = ml_result['predicted_class']
    confidence = ml_result['confidence_dict'].get(pred_class, 0.0) * 100.0
    health_score = ml_result['health_score']
    
    rms = features['rms']
    kurt = features['kurtosis']
    p1x = features['peak_1x']
    p2x = features['peak_2x']
    p_bpfo = features['peak_bpfo']
    temp = features['temp_mean']
    f_rot = features['f_rot']
    f_2x = features['f_2x']
    f_bpfo = features['f_bpfo']
    
    # 1. Root Cause Summary & Evidence Breakdown
    if pred_class == "Healthy":
        summary = (
            f"**Machine operating within normal parameters.** Vibration RMS ({rms:.3f} g) and "
            f"temperature ({temp:.1f}°C) are well within ISO 10816 baseline thresholds. "
            f"No dominant harmonic or impact frequency spikes detected."
        )
        evidence = [
            f"Vibration RMS: {rms:.3f} g (Normal < 0.25 g)",
            f"Kurtosis: {kurt:.2f} (Normal Gaussian ~3.0)",
            f"Temperature: {temp:.1f} °C (Nominal)",
            f"1x RPM Peak ({f_rot:.1f} Hz): {p1x:.3f} g (Low)"
        ]
        checklist = [
            "Perform standard routine lubrication check.",
            "Verify optical speed sensor sensor alignment.",
            "Log baseline metrics into plant maintenance ledger."
        ]
        
    elif pred_class == "Bearing Outer Race Fault":
        summary = (
            f"**Outer Race Bearing Defect (BPFO) Detected.** High-frequency micro-impact shocks "
            f"detected at BPFO frequency ({f_bpfo:.1f} Hz) with elevated Kurtosis ({kurt:.2f}). "
            f"Indicates localized surface fatigue or flaking on 608ZZ outer ring."
        )
        evidence = [
            f"BPFO Peak @ {f_bpfo:.1f} Hz: {p_bpfo:.3f} g (Elevated shock spike)",
            f"Kurtosis: {kurt:.2f} (High peakiness > 4.0 indicates impact shocks)",
            f"Vibration RMS: {rms:.3f} g",
            f"Model Confidence: {confidence:.1f}%"
        ]
        checklist = [
            "Apply Lockout/Tagout (LOTO) procedure to 12V motor driver.",
            "Inspect 608ZZ bearing housing for grease contamination or metallic debris.",
            "Perform ultrasonic acoustic listening test on bearing casing.",
            "Schedule bearing replacement during next planned maintenance window (RUL ~14 days)."
        ]
        
    elif pred_class == "Rotor Imbalance":
        summary = (
            f"**Rotor Mass Imbalance Detected.** Prominent 1x running speed fundamental peak "
            f"({f_rot:.1f} Hz) with peak amplitude of {p1x:.3f} g. Indicates eccentric mass distribution "
            f"on impeller/fan assembly."
        )
        evidence = [
            f"1x RPM Peak @ {f_rot:.1f} Hz: {p1x:.3f} g (Dominant fundamental sinusoid)",
            f"Overall RMS: {rms:.3f} g",
            f"Speed: {features['rpm']:.0f} RPM",
            f"Model Confidence: {confidence:.1f}%"
        ]
        checklist = [
            "Power down drive motor and inspect the 3-blade blue propeller for chipped wings or debris.",
            "Verify all 3 propeller wings have equal mass distribution and no loose clip/weight attached.",
            "Attach trial counterweight clip to one of the 3 blue propeller wings and re-measure 1x RPM amplitude.",
            "Perform dynamic rotor balancing."
        ]
        
    else:  # Shaft Misalignment
        summary = (
            f"**Shaft Angular/Parallel Misalignment & Thermal Rise Detected.** Strong 2x RPM "
            f"harmonic peak ({f_2x:.1f} Hz) accompanied by surface temperature rise ({temp:.1f}°C). "
            f"Indicates physical offset between motor drive shaft and axle coupling."
        )
        evidence = [
            f"2x Harmonics Peak @ {f_2x:.1f} Hz: {p2x:.3f} g (Strong harmonic distortion)",
            f"Thermal Elevation: {temp:.1f} °C (Frictional heating)",
            f"Overall RMS: {rms:.3f} g",
            f"Model Confidence: {confidence:.1f}%"
        ]
        checklist = [
            "Isolate electrical power and allow motor housing to cool.",
            "Check 5mm-to-8mm rigid shaft coupler set screws for axial slippage.",
            "Use feeler gauge or dial indicator to measure radial/angular shaft runout.",
            "Insert 0.5mm stainless steel alignment shims under motor mounting feet."
        ]

    # Mandatory Safety Guardrail Disclaimer
    safety_disclaimer = (
        "⚠️ **SAFETY GUARDRAIL & DISCLAIMER**: This AI diagnostic report is advisory only. "
        "The system does NOT execute automated hardware shutdown or control commands. "
        "Physical inspection and repair actions MUST be confirmed by a certified maintenance engineer."
    )

    return {
        "summary": summary,
        "evidence": evidence,
        "checklist": checklist,
        "disclaimer": safety_disclaimer
    }
