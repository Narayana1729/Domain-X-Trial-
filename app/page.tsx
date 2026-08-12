"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { OverviewKpiSection } from "@/components/overview/overview-kpi-section"
import { EnergyTrendChart } from "@/components/overview/energy-trend-chart"
import { PeakUsageAnalysis } from "@/components/overview/peak-usage-analysis"
import { InteractiveControlsCard } from "@/components/overview/interactive-controls-card"
import { FeatureMatrixTable } from "@/components/overview/feature-matrix-table"
import { SystemAlertsWidget } from "@/components/overview/system-alerts-widget"
import { SerialTerminalWidget } from "@/components/overview/serial-terminal-widget"
import { useLiveTelemetry } from "@/hooks/use-live-telemetry"

export default function OverviewPage() {
  const {
    ports,
    selectedPort,
    setSelectedPort,
    baudrate,
    autoPoll,
    setAutoPoll,
    data: telemetry,
    serialLogs,
    loading,
    fetchTelemetry
  } = useLiveTelemetry()

  const isHardwareActive = telemetry?.reading !== null && telemetry?.reading !== undefined

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Predictive Maintenance KPI Cards Header */}
        <OverviewKpiSection telemetry={telemetry} />

        {/* Live FFT Spectrum Analyzer & Harmonics Peak Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <EnergyTrendChart telemetry={telemetry} />
          <PeakUsageAnalysis />
        </div>

        {/* ESP32 Controls & Signal Feature Vector */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <InteractiveControlsCard
            ports={ports}
            selectedPort={selectedPort}
            setSelectedPort={setSelectedPort}
            autoPoll={autoPoll}
            setAutoPoll={setAutoPoll}
            loading={loading}
            refetch={fetchTelemetry}
            isHardwareActive={isHardwareActive}
          />
          <FeatureMatrixTable telemetry={telemetry} />
        </div>

        {/* GenAI Technician Assistant & Safety Disclaimer Widget */}
        <SystemAlertsWidget telemetry={telemetry} />

        {/* Live Serial Monitor Output Log Window */}
        <SerialTerminalWidget
          logs={serialLogs}
          selectedPort={selectedPort}
          baudrate={baudrate}
          isHardwareActive={isHardwareActive}
        />
      </div>
    </DashboardLayout>
  )
}
