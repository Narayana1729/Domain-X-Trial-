"use client"

import { Bot, Sparkles, ShieldCheck, AlertTriangle } from "lucide-react"
import type { TelemetryPayload, ReportObject } from "@/hooks/use-live-telemetry"

interface SystemAlertsWidgetProps {
  telemetry?: TelemetryPayload | null
}

export function SystemAlertsWidget({ telemetry }: SystemAlertsWidgetProps) {
  const predictedClass = telemetry?.mlResult?.predicted_class ?? "Healthy Baseline"
  const confidence = telemetry?.mlResult?.confidence_dict?.[predictedClass]
    ? (telemetry.mlResult.confidence_dict[predictedClass] * 100).toFixed(1)
    : "98.5"
  
  const rawReport = telemetry?.report
  let summaryText = "Machine operating within normal parameters. Vibration RMS and surface temperature are well within ISO baseline thresholds."
  let evidenceList: string[] = []
  let checklistItems: string[] = []
  let disclaimerText = ""

  if (typeof rawReport === "string") {
    summaryText = rawReport
  } else if (rawReport && typeof rawReport === "object") {
    const r = rawReport as ReportObject
    summaryText = r.summary || summaryText
    evidenceList = r.evidence || []
    checklistItems = r.checklist || []
    disclaimerText = r.disclaimer || ""
  }

  // Remove bold markdown tags for clean HTML rendering if present
  const cleanSummary = summaryText.replace(/\*\*/g, "")
  const rms = telemetry?.features?.rms ?? 0.082
  const kurtosis = telemetry?.features?.kurtosis ?? 1.87
  const temp = telemetry?.features?.temp_mean ?? 38.5
  const statusColor = telemetry?.mlResult?.status_color ?? "green"

  return (
    <div className="bg-[#1B1B1B] border border-[#2A2A2A] rounded-lg p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#FF6B00]/10 border border-[#FF6B00]/30 rounded-lg text-[#FF6B00]">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#EDEDED] flex items-center gap-2">
              GenAI Technician Assistant & Incident Resolution
              <Sparkles className="h-4 w-4 text-[#FF6B00]" />
            </h2>
            <p className="text-xs text-[#9A9A9A]">Real-time LLM diagnostic report, evidence breakdown, and field checklist</p>
          </div>
        </div>
        <span className="text-xs font-mono bg-[#121212] px-3 py-1 rounded text-emerald-400 border border-emerald-500/30 font-semibold">
          {confidence}% CONFIDENCE
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Diagnosis & Summary */}
        <div className="bg-[#121212] p-4 rounded-lg border border-[#2A2A2A] space-y-2">
          <span className="text-xs font-bold text-[#FF6B00] uppercase tracking-wider block">Predicted Machine Diagnosis</span>
          <h3 className="text-base font-bold text-[#EDEDED] flex items-center gap-2">
            {statusColor === "red" || statusColor === "orange" ? (
              <AlertTriangle className="h-4 w-4 text-red-500" />
            ) : (
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            )}
            {predictedClass}
          </h3>
          <p className="text-xs text-[#9A9A9A] leading-relaxed whitespace-pre-line">
            {cleanSummary}
          </p>
        </div>

        {/* Evidence Breakdown */}
        <div className="bg-[#121212] p-4 rounded-lg border border-[#2A2A2A] space-y-2">
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">Spectral Evidence Breakdown</span>
          <ul className="space-y-2 text-xs text-[#EDEDED]">
            {evidenceList.length > 0 ? (
              evidenceList.map((item, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                  <span>{item}</span>
                </li>
              ))
            ) : (
              <>
                <li className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full ${rms > 0.25 ? "bg-red-400" : "bg-emerald-400"}`}></span>
                  Vibration RMS: <strong>{rms.toFixed(3)} g</strong> {rms > 0.25 ? "(High > 0.25 g)" : "(Normal < 0.25 g)"}
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                  Kurtosis: <strong>{kurtosis.toFixed(2)}</strong> (Gaussian ~3.0)
                </li>
                <li className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full ${temp > 50 ? "bg-amber-400" : "bg-emerald-400"}`}></span>
                  Surface Temp: <strong>{temp.toFixed(1)} °C</strong> {temp > 50 ? "(Elevated)" : "(Nominal)"}
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400"></span>
                  Model: <strong>RandomForest / XGBoost</strong>
                </li>
              </>
            )}
          </ul>
        </div>

        {/* Guided Checklist */}
        <div className="bg-[#121212] p-4 rounded-lg border border-[#2A2A2A] space-y-2">
          <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider block">Recommended Field Actions</span>
          <div className="space-y-2 text-xs text-[#9A9A9A]">
            {checklistItems.length > 0 ? (
              checklistItems.map((item, idx) => (
                <label key={idx} className="flex items-start gap-2 cursor-pointer hover:text-[#EDEDED]">
                  <input type="checkbox" defaultChecked={idx === 0} className="mt-0.5 rounded border-neutral-700 accent-[#FF6B00]" />
                  <span>{item}</span>
                </label>
              ))
            ) : (
              <>
                <label className="flex items-start gap-2 cursor-pointer hover:text-[#EDEDED]">
                  <input type="checkbox" defaultChecked className="mt-0.5 rounded border-neutral-700 accent-[#FF6B00]" />
                  <span>Verify accelerometer MPU6050 physical mounting firm on motor housing.</span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer hover:text-[#EDEDED]">
                  <input type="checkbox" defaultChecked className="mt-0.5 rounded border-neutral-700 accent-[#FF6B00]" />
                  <span>Check DS18B20 thermal contact with motor casing.</span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer hover:text-[#EDEDED]">
                  <input type="checkbox" className="mt-0.5 rounded border-neutral-700 accent-[#FF6B00]" />
                  <span>Inspect 608ZZ bearing race for mechanical wear if BPFO peak spikes.</span>
                </label>
              </>
            )}
          </div>
        </div>
      </div>
      
      {disclaimerText && (
        <div className="p-3 bg-[#121212] rounded border border-amber-500/20 text-[11px] text-amber-400/90 font-mono">
          {disclaimerText.replace(/\*\*/g, "")}
        </div>
      )}
    </div>
  )
}
