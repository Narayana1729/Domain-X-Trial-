"use client"

import { Table } from "lucide-react"
import type { TelemetryPayload } from "@/hooks/use-live-telemetry"

interface FeatureMatrixTableProps {
  telemetry?: TelemetryPayload | null
}

export function FeatureMatrixTable({ telemetry }: FeatureMatrixTableProps) {
  const rms = telemetry?.features?.rms ?? 0.082
  const peak = telemetry?.features?.peak ?? (rms * 1.73)
  const crestFactor = telemetry?.features?.crest_factor ?? (rms > 0 ? peak / rms : 1.73)
  const kurtosis = telemetry?.features?.kurtosis ?? 1.87
  const fRot = telemetry?.features?.f_rot ?? 30.0
  const fBpfo = telemetry?.features?.f_bpfo ?? 141.0

  return (
    <div className="bg-[#1B1B1B] border border-[#2A2A2A] rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-3">
        <div className="flex items-center gap-2 text-[#FF6B00]">
          <Table className="h-5 w-5" />
          <h2 className="text-base font-bold text-[#EDEDED]">Extracted Vibration Feature Matrix</h2>
        </div>
        <span className="text-xs font-mono text-[#9A9A9A]">SciPy FFT + Time Domain Metrics</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs">
        <div className="bg-[#121212] p-3 rounded-lg border border-[#2A2A2A]">
          <span className="text-[#9A9A9A] text-[11px] block">Vibration RMS</span>
          <strong className="text-[#FF6B00] font-mono text-sm">{rms.toFixed(3)} g</strong>
        </div>
        <div className="bg-[#121212] p-3 rounded-lg border border-[#2A2A2A]">
          <span className="text-[#9A9A9A] text-[11px] block">Peak Amplitude</span>
          <strong className="text-cyan-400 font-mono text-sm">{peak.toFixed(3)} g</strong>
        </div>
        <div className="bg-[#121212] p-3 rounded-lg border border-[#2A2A2A]">
          <span className="text-[#9A9A9A] text-[11px] block">Crest Factor</span>
          <strong className="text-amber-400 font-mono text-sm">{crestFactor.toFixed(2)}</strong>
        </div>
        <div className="bg-[#121212] p-3 rounded-lg border border-[#2A2A2A]">
          <span className="text-[#9A9A9A] text-[11px] block">Kurtosis</span>
          <strong className="text-emerald-400 font-mono text-sm">{kurtosis.toFixed(2)}</strong>
        </div>
        <div className="bg-[#121212] p-3 rounded-lg border border-[#2A2A2A]">
          <span className="text-[#9A9A9A] text-[11px] block">1x RPM Frequency</span>
          <strong className="text-emerald-400 font-mono text-sm">{fRot.toFixed(1)} Hz</strong>
        </div>
        <div className="bg-[#121212] p-3 rounded-lg border border-[#2A2A2A]">
          <span className="text-[#9A9A9A] text-[11px] block">BPFO Frequency</span>
          <strong className="text-red-400 font-mono text-sm">{fBpfo.toFixed(1)} Hz</strong>
        </div>
      </div>
    </div>
  )
}
