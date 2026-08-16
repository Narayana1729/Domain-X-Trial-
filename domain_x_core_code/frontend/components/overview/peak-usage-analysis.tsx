"use client"

import { Zap, Activity, Cpu } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"

const peakData = [
  { name: "1x Speed Peak", amplitude: 0.24, color: "#10b981" },
  { name: "2x Harmonic", amplitude: 0.08, color: "#FF6B00" },
  { name: "BPFO Bearing", amplitude: 0.04, color: "#ef4444" },
  { name: "Base Noise", amplitude: 0.02, color: "#64748b" },
]

export function PeakUsageAnalysis() {
  return (
    <div className="bg-[#1B1B1B] border border-[#2A2A2A] rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#EDEDED] flex items-center gap-2">
            <Activity className="h-5 w-5 text-[#FF6B00]" /> Spectral Peak & Harmonics Analysis
          </h2>
          <p className="text-xs text-[#9A9A9A]">Vibration power distribution across fundamental and fault frequencies</p>
        </div>
      </div>

      <div className="h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={peakData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
            <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
            <YAxis stroke="#64748b" tick={{ fontSize: 11 }} label={{ value: 'Amplitude (g RMS)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 12 }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#121212', borderColor: '#2A2A2A', borderRadius: '8px', color: '#EDEDED' }}
              formatter={(value: any) => [`${value} g`, 'Amplitude']}
            />
            <Bar dataKey="amplitude" radius={[6, 6, 0, 0]}>
              {peakData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
