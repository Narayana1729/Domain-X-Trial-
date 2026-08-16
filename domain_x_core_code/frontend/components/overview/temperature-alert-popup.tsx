"use client"

import { useState, useEffect } from "react"
import { AlertTriangle, Thermometer, Flame, X, ShieldAlert, Zap } from "lucide-react"
import type { TelemetryPayload } from "@/hooks/use-live-telemetry"

interface TemperatureAlertPopupProps {
  telemetry?: TelemetryPayload | null
}

export function TemperatureAlertPopup({ telemetry }: TemperatureAlertPopupProps) {
  const temp = telemetry?.features?.temp_mean ?? telemetry?.reading?.temp ?? 0
  const [acknowledgedTemp, setAcknowledgedTemp] = useState<number | null>(null)

  const isOverheating = temp >= 50.0
  const isCritical = temp >= 60.0

  // Re-arm popup if temp rises by another 3 degrees above acknowledged temp
  const shouldShow = isOverheating && (acknowledgedTemp === null || temp >= acknowledgedTemp + 3.0)

  const handleStopMotor = async () => {
    try {
      await fetch("http://localhost:5001/api/control_motor?cmd=STOP")
    } catch (err) {
      console.warn("Failed to send stop command:", err)
    }
  }

  if (!shouldShow) return null

  return (
    <div className="fixed top-4 right-4 sm:right-8 z-50 max-w-md w-full animate-in slide-in-from-top-4 duration-300">
      <div className={`rounded-xl border p-5 shadow-2xl backdrop-blur-xl ${
        isCritical
          ? "bg-red-950/95 border-red-500/80 text-red-100 shadow-red-500/30"
          : "bg-orange-950/95 border-orange-500/80 text-orange-100 shadow-orange-500/30"
      } ring-2 ring-orange-500/50 space-y-4`}>
        
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg border ${
              isCritical
                ? "bg-red-500/20 border-red-500/50 text-red-400 animate-pulse"
                : "bg-orange-500/20 border-orange-500/50 text-orange-400 animate-bounce"
            }`}>
              <Flame className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-black/40 border border-orange-500/40 text-orange-400">
                  {isCritical ? "CRITICAL OVERHEAT" : "ELEVATED TEMP ALARM"}
                </span>
              </div>
              <h3 className="text-base font-bold text-white mt-1">
                Motor Surface Temperature High!
              </h3>
            </div>
          </div>

          <button
            onClick={() => setAcknowledgedTemp(temp)}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-black/30 transition-colors"
            title="Acknowledge Alert"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Temperature Reading */}
        <div className="flex items-baseline gap-3 bg-black/40 p-3 rounded-lg border border-black/50">
          <span className="text-3xl font-extrabold font-mono text-orange-400 tracking-tight">
            {temp.toFixed(1)} <span className="text-xl font-normal text-orange-300">°C</span>
          </span>
          <span className="text-xs text-neutral-300 font-sans">
            (Safe Threshold: <strong className="text-white">50.0 °C</strong>)
          </span>
        </div>

        {/* Warning Body Text */}
        <p className="text-xs text-neutral-200 leading-relaxed font-sans">
          {isCritical
            ? "CRITICAL: Surface temperature has exceeded 60.0°C! Immediate shutdown required to prevent bearing seizure or motor insulation breakdown."
            : "WARNING: Surface temperature has reached 50.0°C. Elevated friction detected. Check bearing lubrication, motor load, and cooling fan airflow."}
        </p>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleStopMotor}
            className="flex-1 py-2 px-3 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/30 transition-all active:scale-95 cursor-pointer"
          >
            <Zap className="h-4 w-4 fill-current" />
            Emergency Stop Motor
          </button>
          <button
            onClick={() => setAcknowledgedTemp(temp)}
            className="py-2 px-3 rounded-lg bg-black/40 hover:bg-black/60 border border-neutral-700 text-neutral-200 font-medium text-xs transition-colors"
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  )
}
