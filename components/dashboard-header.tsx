"use client"

import { usePathname } from "next/navigation"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Activity, ShieldCheck } from "lucide-react"

export function DashboardHeader() {
  const pathname = usePathname()

  const getPageTitle = () => {
    switch (pathname) {
      case "/":
        return "Machine Health Overview"
      case "/meters":
        return "Vibration FFT Spectrum & Diagnostics"
      case "/reports":
        return "GenAI Technician Repair Reports"
      case "/settings":
        return "Hardware Telemetry & Sensor Setup"
      default:
        return "Predictive Maintenance Engine"
    }
  }

  return (
    <header className="flex items-center justify-between border-b border-[#2A2A2A] bg-[#1B1B1B] px-6 py-4">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="text-[#EDEDED] hover:bg-[#FF6B00]/20" />
        <div>
          <h1 className="text-xl font-bold text-[#EDEDED] flex items-center gap-2">
            {getPageTitle()}
          </h1>
          <p className="text-xs text-[#9A9A9A]">Domain-X Industrial Rotating Machinery Condition Monitoring Platform</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-[#121212] px-3 py-1.5 rounded-lg border border-[#2A2A2A] text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-[#EDEDED] font-mono font-semibold">ISO 10816 CLASS I: HEALTHY</span>
        </div>
      </div>
    </header>
  )
}
