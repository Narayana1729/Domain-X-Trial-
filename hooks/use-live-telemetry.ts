"use client"

import { useState, useEffect, useCallback } from "react"

export interface TelemetryReading {
  accel_x: number
  accel_y: number
  accel_z: number
  rpm: number
  temp: number
}

export interface TelemetryFeatures {
  rms: number
  peak: number
  crest_factor: number
  kurtosis: number
  skewness: number
  temp_mean: number
  rpm: number
  f_rot: number
  f_2x: number
  f_bpfo: number
}

export interface MlResult {
  predicted_class: string
  confidence: number
  health_score: number
  status_color: "green" | "amber" | "red"
  iso_zone: string
}

export interface FftPoint {
  freq: number
  magnitude: number
}

export interface ReportObject {
  summary: string
  evidence: string[]
  checklist: string[]
  disclaimer: string
}

export interface TelemetryPayload {
  reading: TelemetryReading | null
  rawLine?: string
  features: TelemetryFeatures
  mlResult: MlResult
  report: string | ReportObject
  fftData: FftPoint[]
}

const API_BASE = "http://localhost:5001"

export function useLiveTelemetry() {
  const [ports, setPorts] = useState<string[]>([])
  const [selectedPort, setSelectedPort] = useState<string>("/dev/cu.usbserial-0001")
  const [baudrate, setBaudrate] = useState<number>(115200)
  const [autoPoll, setAutoPoll] = useState<boolean>(true)
  const [data, setData] = useState<TelemetryPayload | null>(null)
  const [serialLogs, setSerialLogs] = useState<string[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch available serial ports
  const fetchPorts = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/ports`)
      if (res.ok) {
        const json = await res.json()
        if (Array.isArray(json.ports)) {
          setPorts(json.ports)
          if (json.ports.length > 0 && !json.ports.includes(selectedPort)) {
            // Pick first hardware serial port if available
            const hwPort = json.ports.find((p: string) => p.includes("usbserial") || p.includes("usbmodem")) || json.ports[0]
            setSelectedPort(hwPort)
          }
        }
      }
    } catch (err) {
      console.warn("API ports fetch failed:", err)
    }
  }, [selectedPort])

  // Fetch single frame reading
  const fetchTelemetry = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const url = `${API_BASE}/api/read_esp32?port=${encodeURIComponent(selectedPort)}&baudrate=${baudrate}`
      const res = await fetch(url)
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const payload: TelemetryPayload = await res.json()
      setData(payload)
      
      const timestamp = new Date().toLocaleTimeString()
      const logLine = payload.reading
        ? `[${timestamp}] ✅ LIVE READ: {'accel_x': ${payload.reading.accel_x.toFixed(4)}, 'accel_y': ${payload.reading.accel_y.toFixed(4)}, 'accel_z': ${payload.reading.accel_z.toFixed(4)}, 'rpm': ${payload.reading.rpm.toFixed(1)}, 'temp': ${payload.reading.temp.toFixed(2)}}`
        : payload.rawLine 
          ? `[${timestamp}] TX ➔ ${payload.rawLine}`
          : `[${timestamp}] TX ➔ 0.0000,0.0000,1.0000,1800.0,36.50`
      
      setSerialLogs((prev) => [...prev.slice(-49), logLine])
    } catch (err: any) {
      setError(err?.message || "Failed to connect to Python backend API")
    } finally {
      setLoading(false)
    }
  }, [selectedPort, baudrate])

  useEffect(() => {
    fetchPorts()
  }, [fetchPorts])

  useEffect(() => {
    fetchTelemetry()
  }, [fetchTelemetry])

  useEffect(() => {
    if (!autoPoll) return
    const timer = setInterval(() => {
      fetchTelemetry()
    }, 2000)
    return () => clearInterval(timer)
  }, [autoPoll, fetchTelemetry])

  return {
    ports,
    selectedPort,
    setSelectedPort,
    baudrate,
    setBaudrate,
    autoPoll,
    setAutoPoll,
    data,
    serialLogs,
    loading,
    error,
    refreshPorts: fetchPorts,
    fetchTelemetry,
  }
}
