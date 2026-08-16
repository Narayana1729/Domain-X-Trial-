"use client"

import { useState } from "react"
import { Sliders, RefreshCw, Zap, Power, AlertOctagon, Gauge } from "lucide-react"

interface InteractiveControlsCardProps {
  ports: string[]
  selectedPort: string
  setSelectedPort: (port: string) => void
  autoPoll: boolean
  setAutoPoll: (auto: boolean) => void
  pollInterval?: number
  setPollInterval?: (ms: number) => void
  loading: boolean
  refetch: () => void
  isHardwareActive: boolean
}

export function InteractiveControlsCard({
  ports,
  selectedPort,
  setSelectedPort,
  autoPoll,
  setAutoPoll,
  pollInterval = 1000,
  setPollInterval,
  loading,
  refetch,
  isHardwareActive
}: InteractiveControlsCardProps) {
  const [motorRunning, setMotorRunning] = useState<boolean>(false)
  const [motorLoading, setMotorLoading] = useState<boolean>(false)

  const handleMotorToggle = async (cmd: "STOP" | "START") => {
    setMotorLoading(true)
    try {
      await fetch(`http://localhost:5001/api/control_motor?cmd=${cmd}`)
      setMotorRunning(cmd === "START")
    } catch (err) {
      console.warn("Failed to send motor control command:", err)
    } finally {
      setMotorLoading(false)
    }
  }

  return (
    <div className="bg-[#1B1B1B] border border-[#2A2A2A] rounded-lg p-6 space-y-5">
      <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-3">
        <div className="flex items-center gap-2 text-[#FF6B00]">
          <Sliders className="h-5 w-5" />
          <h2 className="text-base font-bold text-[#EDEDED]">ESP32 Serial & Motor Controls</h2>
        </div>
        <div className="flex items-center gap-2">
          {isHardwareActive ? (
            <span className="text-xs font-mono bg-emerald-950/80 px-2.5 py-1 rounded text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 font-semibold">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              ESP32 CONNECTED
            </span>
          ) : (
            <span className="text-xs font-mono bg-amber-950/80 px-2.5 py-1 rounded text-amber-400 border border-amber-500/30 flex items-center gap-1.5 font-semibold">
              <span className="h-2 w-2 rounded-full bg-amber-400"></span>
              SYNTHETIC FALLBACK
            </span>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* USB Serial Port Selection */}
        <div>
          <label className="text-xs font-bold text-[#9A9A9A] uppercase tracking-wider block mb-2">
            Detected USB Serial Ports
          </label>
          <div className="flex gap-2">
            <select
              value={selectedPort}
              onChange={(e) => setSelectedPort(e.target.value)}
              className="flex-1 bg-[#121212] border border-[#2A2A2A] rounded-lg px-3 py-2 text-xs font-mono text-[#EDEDED] focus:outline-none focus:border-[#FF6B00]"
            >
              {ports.length > 0 ? (
                ports.map((port) => (
                  <option key={port} value={port}>
                    {port}
                  </option>
                ))
              ) : (
                <option value="/dev/cu.usbserial-0001">/dev/cu.usbserial-0001 (Default ESP32)</option>
              )}
            </select>

            <button
              onClick={refetch}
              disabled={loading}
              className="px-4 py-2 bg-[#FF6B00] hover:bg-[#e05e00] text-black font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Read Frame
            </button>
          </div>
        </div>

        {/* Live Auto-Polling Speed & Emergency Motor Toggle */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col justify-between p-3 bg-[#121212] rounded-lg border border-[#2A2A2A] gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-[#FF6B00]" />
                <div>
                  <span className="text-xs font-semibold text-[#EDEDED] block">Live Telemetry Stream</span>
                  <span className="text-[11px] text-[#9A9A9A]">{pollInterval}ms Interval</span>
                </div>
              </div>
              <button
                onClick={() => setAutoPoll(!autoPoll)}
                className={`px-3 py-1.5 rounded text-xs font-bold font-mono transition-all ${
                  autoPoll
                    ? "bg-emerald-950 border border-emerald-500 text-emerald-300"
                    : "bg-neutral-800 border border-neutral-700 text-neutral-400"
                }`}
              >
                {autoPoll ? "STREAMING" : "PAUSED"}
              </button>
            </div>

            {setPollInterval && (
              <div className="flex items-center gap-1.5 pt-1 border-t border-neutral-800/60">
                <Gauge className="h-3 w-3 text-neutral-400" />
                <span className="text-[10px] text-neutral-400">Rate:</span>
                {[500, 1000, 2000].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => setPollInterval(rate)}
                    className={`px-2 py-0.5 text-[10px] font-mono rounded ${
                      pollInterval === rate
                        ? "bg-[#FF6B00] text-black font-bold"
                        : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                    }`}
                  >
                    {rate === 500 ? "0.5s Fast" : rate === 1000 ? "1s Normal" : "2s Slow"}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Software Motor Stop/Start Button */}
          <div className="flex flex-col justify-between p-3 bg-[#121212] rounded-lg border border-[#2A2A2A]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Power className={`h-4 w-4 ${motorRunning ? "text-emerald-400" : "text-red-500"}`} />
                <div>
                  <span className="text-xs font-semibold text-[#EDEDED] block">Motor Power State</span>
                  <span className="text-[11px] text-[#9A9A9A]">L298N Motor Driver</span>
                </div>
              </div>
              <button
                onClick={() => handleMotorToggle(motorRunning ? "STOP" : "START")}
                disabled={motorLoading}
                className={`px-3 py-1.5 rounded text-xs font-bold font-mono flex items-center gap-1.5 transition-all disabled:opacity-50 ${
                  motorRunning
                    ? "bg-red-950 border border-red-500/60 text-red-400 hover:bg-red-900/80"
                    : "bg-emerald-950 border border-emerald-500/60 text-emerald-400 hover:bg-emerald-900/80"
                }`}
              >
                <AlertOctagon className="h-3.5 w-3.5" />
                {motorRunning ? "STOP MOTOR" : "START MOTOR"}
              </button>
            </div>
            <div className="text-[10px] font-mono text-neutral-400 pt-2 border-t border-neutral-800/60 flex justify-between">
              <span>Status: <strong className={motorRunning ? "text-emerald-400" : "text-red-400"}>{motorRunning ? "RUNNING" : "STOPPED"}</strong></span>
              <span>Cmd: {motorRunning ? "START" : "STOP"}</span>
            </div>
          </div>
        </div>

        {/* Hardware Rig Banner Info */}
        <div className="p-3 bg-[#121212] rounded-lg border border-[#2A2A2A] flex items-center justify-between text-xs font-mono text-[#9A9A9A]">
          <span>RIG: 12V DC MOTOR + MPU6050 + DS18B20</span>
          <span className="text-cyan-400 font-semibold">BAUD: 115200</span>
        </div>
      </div>
    </div>
  )
}


