"use client"

import { UnifiedKpiCard } from "@/components/unified-kpi-card"
import { ShieldCheck, Gauge, Thermometer, Activity } from "lucide-react"
import type { TelemetryPayload } from "@/hooks/use-live-telemetry"

interface OverviewKpiSectionProps {
  telemetry?: TelemetryPayload | null
}

export function OverviewKpiSection({ telemetry }: OverviewKpiSectionProps) {
  const healthScore = telemetry?.mlResult?.health_score ?? 94
  const statusColor = telemetry?.mlResult?.status_color ?? "green"
  const isoZone = telemetry?.mlResult?.iso_zone ?? "ISO Class I"
  const predictedClass = telemetry?.mlResult?.predicted_class ?? "Healthy"
  
  const rpm = telemetry?.features?.rpm ?? 1800
  const fRot = telemetry?.features?.f_rot ?? 30.0
  const temp = telemetry?.features?.temp_mean ?? 38.5
  const rms = telemetry?.features?.rms ?? 0.082
  const peak = telemetry?.features?.peak ?? (rms * 1.73)

  const isHardware = telemetry?.reading !== null && telemetry?.reading !== undefined

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <UnifiedKpiCard
        title="Machine Health Score"
        value={`${healthScore}%`}
        unit="Index"
        icon={<ShieldCheck />}
        emphasis={healthScore > 75 ? "primary" : "tertiary"}
        trend={{
          direction: healthScore > 75 ? "up" : "down",
          percentage: predictedClass,
          period: isoZone,
        }}
      />
      <UnifiedKpiCard
        title="Motor Rotation Speed"
        value={rpm.toLocaleString("en-US", { maximumFractionDigits: 0 })}
        unit="RPM"
        icon={<Gauge />}
        emphasis="secondary"
        trend={{
          direction: "up",
          percentage: `${fRot.toFixed(1)} Hz`,
          period: "1x Fundamental",
        }}
      />
      <UnifiedKpiCard
        title="Surface Temperature"
        value={temp.toFixed(1)}
        unit="°C"
        icon={<Thermometer />}
        emphasis="secondary"
        trend={{
          direction: temp > 60 ? "up" : "down",
          percentage: temp > 50 ? "Elevated" : "Nominal",
          period: isHardware ? "DS18B20 Live" : "DS18B20 Sim",
        }}
      />
      <UnifiedKpiCard
        title="Vibration RMS Energy"
        value={rms.toFixed(3)}
        unit="g RMS"
        icon={<Activity />}
        emphasis={statusColor === "red" ? "tertiary" : "secondary"}
        trend={{
          direction: rms > 0.2 ? "up" : "down",
          percentage: `${peak.toFixed(3)}g Peak`,
          period: isHardware ? "ADXL345 ESP32" : "ADXL345 Sim",
        }}
      />
    </div>
  )
}
