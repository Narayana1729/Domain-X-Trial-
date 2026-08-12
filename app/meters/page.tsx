"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { EnergyTrendChart } from "@/components/overview/energy-trend-chart"
import { FeatureMatrixTable } from "@/components/overview/feature-matrix-table"
import { Radio, Activity, Zap } from "lucide-react"

export default function SignalsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="bg-[#1B1B1B] border border-[#2A2A2A] rounded-lg p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-[#EDEDED] flex items-center gap-2">
              <Radio className="h-6 w-6 text-[#FF6B00]" /> High-Frequency Vibration Telemetry & Spectrum
            </h2>
            <p className="text-xs text-[#9A9A9A]">1,000 Hz ADXL345 3-Axis Accelerometer Data & SciPy FFT Feature Extraction</p>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs text-emerald-400 bg-[#121212] px-3 py-1.5 rounded border border-emerald-500/30">
            <Activity className="h-4 w-4 animate-pulse" />
            1024 FFT BUFFER ACTIVE
          </div>
        </div>

        <EnergyTrendChart />

        <FeatureMatrixTable />
      </div>
    </DashboardLayout>
  )
}
