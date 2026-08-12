"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Settings, Cpu, Wifi, Radio } from "lucide-react"

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="bg-[#1B1B1B] border border-[#2A2A2A] rounded-lg p-6">
          <h2 className="text-xl font-bold text-[#EDEDED] flex items-center gap-2">
            <Settings className="h-6 w-6 text-[#FF6B00]" /> Hardware Telemetry & Sensor Settings
          </h2>
          <p className="text-xs text-[#9A9A9A]">Configure serial port baudrate, sampling frequency, and sensor pinouts</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#1B1B1B] border border-[#2A2A2A] rounded-lg p-6 space-y-4">
            <h3 className="text-base font-bold text-[#EDEDED] flex items-center gap-2">
              <Cpu className="h-5 w-5 text-emerald-400" /> ESP32 Serial Settings
            </h3>
            <div className="space-y-3 text-xs text-[#9A9A9A]">
              <div>
                <label className="block text-[#EDEDED] mb-1 font-medium">Baudrate</label>
                <input type="text" value="115200" readOnly className="w-full bg-[#121212] border border-[#2A2A2A] p-2 rounded text-[#EDEDED] font-mono" />
              </div>
              <div>
                <label className="block text-[#EDEDED] mb-1 font-medium">Sampling Rate</label>
                <input type="text" value="1000 Hz (1ms interval)" readOnly className="w-full bg-[#121212] border border-[#2A2A2A] p-2 rounded text-[#EDEDED] font-mono" />
              </div>
              <div>
                <label className="block text-[#EDEDED] mb-1 font-medium">Connected Sensors</label>
                <ul className="space-y-1 text-slate-300">
                  <li>• ADXL345 3-Axis Vibration Accelerometer (I2C 400kHz)</li>
                  <li>• DS18B20 Waterproof Temperature Probe (1-Wire)</li>
                  <li>• FC-03 IR Optical Speed Sensor (RPM Interrupts)</li>
                  <li>• 12V DC Motor + 3-Blade Blue Propeller Assembly</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-[#1B1B1B] border border-[#2A2A2A] rounded-lg p-6 space-y-4">
            <h3 className="text-base font-bold text-[#EDEDED] flex items-center gap-2">
              <Radio className="h-5 w-5 text-[#FF6B00]" /> FFT Windowing & Model Hyperparameters
            </h3>
            <div className="space-y-3 text-xs text-[#9A9A9A]">
              <div>
                <label className="block text-[#EDEDED] mb-1 font-medium">FFT Window Function</label>
                <select className="w-full bg-[#121212] border border-[#2A2A2A] p-2 rounded text-[#EDEDED]">
                  <option>Hanning Window (scipy.signal.windows.hann)</option>
                  <option>Hamming Window</option>
                  <option>Rectangular Window</option>
                </select>
              </div>
              <div>
                <label className="block text-[#EDEDED] mb-1 font-medium">ML Fault Classifier</label>
                <input type="text" value="RandomForestClassifier / XGBoost (100 estimators)" readOnly className="w-full bg-[#121212] border border-[#2A2A2A] p-2 rounded text-[#EDEDED] font-mono" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
