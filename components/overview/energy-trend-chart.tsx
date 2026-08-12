"use client"

import { Radio } from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"
import type { TelemetryPayload } from "@/hooks/use-live-telemetry"

const defaultFftData = [
  { freq: 0, magnitude: 0.01 },
  { freq: 10, magnitude: 0.02 },
  { freq: 20, magnitude: 0.04 },
  { freq: 30, magnitude: 0.24 }, // 1x RPM Peak
  { freq: 40, magnitude: 0.03 },
  { freq: 50, magnitude: 0.05 },
  { freq: 60, magnitude: 0.08 }, // 2x Harmonic
  { freq: 80, magnitude: 0.02 },
  { freq: 100, magnitude: 0.03 },
  { freq: 120, magnitude: 0.02 },
  { freq: 142, magnitude: 0.04 }, // BPFO
  { freq: 160, magnitude: 0.02 },
  { freq: 180, magnitude: 0.03 },
  { freq: 200, magnitude: 0.02 },
]

interface EnergyTrendChartProps {
  telemetry?: TelemetryPayload | null
}

export function EnergyTrendChart({ telemetry }: EnergyTrendChartProps) {
  const chartData = telemetry?.fftData && telemetry.fftData.length > 0 ? telemetry.fftData : defaultFftData
  const fRot = telemetry?.features?.f_rot ?? 30.0
  const f2x = telemetry?.features?.f_2x ?? 60.0
  const fBpfo = telemetry?.features?.f_bpfo ?? 141.0
  const rpm = telemetry?.features?.rpm ?? 1800

  return (
    <div className="bg-[#1B1B1B] border border-[#2A2A2A] rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#EDEDED] flex items-center gap-2">
            <Radio className="h-5 w-5 text-[#FF6B00]" /> Live Vibration FFT Spectrum Analyzer
          </h2>
          <p className="text-xs text-[#9A9A9A]">Fast Fourier Transform frequency magnitude (0 - 150 Hz) sampled at 1 kHz</p>
        </div>
        <span className="text-xs font-mono bg-[#121212] px-2.5 py-1 rounded text-[#FF6B00] border border-[#FF6B00]/30">
          f_rot = {fRot.toFixed(1)} Hz @ {rpm.toFixed(0)} RPM
        </span>
      </div>

      <div className="h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
            <defs>
              <linearGradient id="orangeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF6B00" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#FF6B00" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="freq" stroke="#64748b" tick={{ fontSize: 11 }} label={{ value: 'Frequency (Hz)', position: 'bottom', offset: 0, fill: '#94a3b8', fontSize: 12 }} />
            <YAxis stroke="#64748b" tick={{ fontSize: 11 }} label={{ value: 'Amplitude (g RMS)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 12 }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#121212', borderColor: '#2A2A2A', borderRadius: '8px', color: '#EDEDED' }}
              formatter={(value: any) => [`${value} g`, 'Magnitude']}
              labelFormatter={(label) => `${label} Hz`}
            />
            <ReferenceLine x={Math.round(fRot)} stroke="#10b981" strokeDasharray="3 3" label={{ value: `1x (${fRot.toFixed(0)}Hz)`, fill: '#10b981', fontSize: 10, position: 'top' }} />
            <ReferenceLine x={Math.round(f2x)} stroke="#FF6B00" strokeDasharray="3 3" label={{ value: `2x (${f2x.toFixed(0)}Hz)`, fill: '#FF6B00', fontSize: 10, position: 'top' }} />
            <ReferenceLine x={Math.round(fBpfo)} stroke="#ef4444" strokeDasharray="3 3" label={{ value: `BPFO (${fBpfo.toFixed(0)}Hz)`, fill: '#ef4444', fontSize: 10, position: 'top' }} />
            <Area type="monotone" dataKey="magnitude" stroke="#FF6B00" strokeWidth={2} fillOpacity={1} fill="url(#orangeGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
