# Hardware Demo Setup for Predictive Maintenance

## Recommended Test Rig (Minimal & Effective)

```
                    ┌──────────────┐
                    │  ESP32 / RPi │──── WiFi/USB ────▶ Laptop (Dashboard)
                    └──┬───┬───┬──┘
                       │   │   │
              ┌────────┘   │   └────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ ADXL345   │ │ DS18B20  │ │ IR Speed │
        │ 3-axis    │ │ Temp     │ │ Sensor   │
        │ Accel     │ │ Sensor   │ │ (RPM)    │
        └─────┬────┘ └────┬─────┘ └────┬─────┘
              │            │            │
              └────────────┼────────────┘
                           ▼
                 ┌───────────────────┐
                 │   Small DC Motor  │
                 │   + Shaft + Fan   │
                 │   mounted on base │
                 └───────────────────┘
```

---

## Bill of Materials

| Component                         | Purpose                          | Approx Cost (₹) |
|-----------------------------------|----------------------------------|------------------|
| DC Motor (775/555)                | Rotating shaft to mount on       | 150–300          |
| MPU6050                           | 6-axis vibration & gyro           | 150–250          |
| DS18B20                           | Temperature sensing              | 60–100           |
| IR Sensor + Encoder Wheel         | RPM measurement                  | 80–120           |
| ESP32 DevKit                      | MCU — WiFi built-in, fast ADC    | 400–500          |
| 12V Power Supply + Motor Driver (L298N) | Power & speed control      | 200–300          |
| Wooden/Acrylic Base Plate         | Mounting everything              | 100–200          |
| Bearings (608ZZ skateboard bearings) | Cheap, easy to fault-inject   | 50–100           |
| Jumper wires, breadboard, screws  | Assembly                         | 100–200          |
| **Total**                         |                                  | **~₹1,300–₹2,000** |

> This entire rig costs less than a restaurant dinner and fits on a desk.

---

## How to Simulate Faults (Safely)

| Fault Type        | How to Simulate                                                              |
|-------------------|------------------------------------------------------------------------------|
| Bearing defect    | Score a groove on a 608ZZ bearing with a file/dremel                         |
| Imbalance         | Attach a small weight (bolt/clip) to one of the 3 wings of the blue propeller |
| Misalignment      | Slightly offset the motor mounting (shim one side with a washer)             |
| Healthy baseline  | Clean bearing, balanced 3-wing blue propeller, aligned mount                  |

> SAFETY: Keep RPM low (~1000–3000), use a guard/enclosure over rotating parts, 
> and never touch the rig while running. Safety first.

---

## Demo Flow (The "Wow" Sequence)

1. START with healthy bearing     →  Dashboard shows GREEN, flat spectrum
2. SWAP to damaged bearing        →  Dashboard detects BPFO peak, turns YELLOW
3. ADD imbalance weight           →  1x RPM spike appears, classifier calls it
4. MISALIGN the motor             →  2x RPM harmonic shows, severity goes RED
5. Technician summary updates live with fault type + confidence + action

This live transition from green → yellow → red in front of the audience is extremely compelling.

---

## Software ↔ Hardware Integration

```
ESP32 (Serial/WiFi)          Python Backend              Dashboard
─────────────────          ──────────────────          ─────────────
Sample accel @ 1kHz   ──▶  Read stream via            Plotly real-time
Read temp every 5s         serial/MQTT            ──▶  spectrum + trend
Count RPM pulses      ──▶  FFT + feature extract      Risk alerts
                           ML classify/score           Technician summary
```

---

## What Gives You the "Extra Edge"

| Edge Factor               | Why It Works                                          |
|----------------------------|------------------------------------------------------|
| Live data, not playback    | Audience sees it's real, not pre-recorded             |
| Physical fault injection   | Swap bearings mid-demo — dramatic and memorable       |
| End-to-end story           | Sensor → Edge → Cloud → Decision — full pipeline     |
| Tangible + Intelligent     | Hardware catches attention, software shows the brains |

---

## Recommendation

Build the software system first (synthetic data, full pipeline, dashboard), then add 
hardware as the cherry on top. This way:
- If hardware fails on demo day, you still have a complete working demo
- The software validates your algorithms before you wire anything
- Hardware becomes a dramatic enhancement, not a fragile dependency
