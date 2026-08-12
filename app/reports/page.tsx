"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { SystemAlertsWidget } from "@/components/overview/system-alerts-widget"
import { FileText, Bot, ShieldCheck } from "lucide-react"

export default function ReportsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="bg-[#1B1B1B] border border-[#2A2A2A] rounded-lg p-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-[#EDEDED] flex items-center gap-2">
              <FileText className="h-6 w-6 text-[#FF6B00]" /> GenAI Technician Coaching & Incident Reports
            </h2>
            <p className="text-xs text-[#9A9A9A]">Automated Gemini AI LLM root cause analysis, evidence breakdown, and safety procedures</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono bg-[#121212] px-3 py-1.5 rounded text-cyan-400 border border-cyan-500/30">
            <Bot className="h-4 w-4" />
            AI MODEL: GEMINI API + TEMPLATE FALLBACK
          </div>
        </div>

        <SystemAlertsWidget />
      </div>
    </DashboardLayout>
  )
}
