"use client"

import { useRef, useEffect } from "react"
import { Terminal, ShieldCheck, Zap, Trash2 } from "lucide-react"

interface SerialTerminalWidgetProps {
  logs: string[]
  selectedPort: string
  baudrate: number
  isHardwareActive: boolean
}

export function SerialTerminalWidget({
  logs,
  selectedPort,
  baudrate,
  isHardwareActive,
}: SerialTerminalWidgetProps) {
  const terminalEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [logs])

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-neutral-950 p-5 shadow-2xl space-y-4">
      {/* Terminal Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-neutral-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-400">
            <Terminal className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
              ESP32 Live Serial Monitor Stream
              <span className="inline-flex items-center gap-1 text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live Parsed Stream
              </span>
            </h3>
            <p className="text-xs text-neutral-400 font-mono">
              Format: <span className="text-emerald-400">✅ LIVE READ: {'{ accel_x, accel_y, accel_z, rpm, temp }'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-neutral-300">
          <div className="px-2.5 py-1 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-400">
            PORT: <span className="text-amber-400">{selectedPort}</span>
          </div>
          <div className="px-2.5 py-1 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-400">
            BAUD: <span className="text-emerald-400">{baudrate}</span>
          </div>
        </div>
      </div>

      {/* Terminal Window */}
      <div className="relative rounded-lg bg-black/90 border border-neutral-800 p-4 font-mono text-xs text-emerald-400 h-48 overflow-y-auto space-y-1 shadow-inner scrollbar-thin scrollbar-thumb-neutral-800">
        {logs.length === 0 ? (
          <div className="text-neutral-600 italic py-8 text-center">
            Waiting for serial frames from {selectedPort}...
          </div>
        ) : (
          logs.map((log, idx) => (
            <div key={idx} className="flex items-start gap-2 hover:bg-emerald-950/20 px-1 rounded transition-colors">
              <span className="text-neutral-500 select-none">$</span>
              <span className="text-emerald-300 leading-relaxed font-mono">{log}</span>
            </div>
          ))
        )}
        <div ref={terminalEndRef} />
      </div>

      {/* Terminal Footer Status Bar */}
      <div className="flex items-center justify-between text-xs text-neutral-400 font-mono pt-1">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span>{isHardwareActive ? "Hardware Active (USB-Serial Connected)" : "Synthetic Fallback Mode"}</span>
        </div>
        <div className="text-neutral-500 text-[11px]">
          Auto-scroll Enabled • 50 Hz Refresh
        </div>
      </div>
    </div>
  )
}
