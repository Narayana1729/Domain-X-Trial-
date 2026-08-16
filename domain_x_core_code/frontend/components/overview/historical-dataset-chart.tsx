"use client"

import { useState, useEffect } from "react"
import { Calendar, Filter, Activity, Thermometer, Zap, Layers, RefreshCw } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  ReferenceArea
} from "recharts"

interface SamplePoint {
  timestamp: string
  accel_x: number
  accel_y: number
  accel_z: number
  rpm: number
  temp: number
  condition: string
}

const CLASS_COLORS: Record<string, string> = {
  healthy: "#10B981",          // Emerald Green
  hair_strand: "#F59E0B",      // Amber Gold
  scratched_bearing: "#EF4444",// Bright Red
  misalignment: "#8B5CF6",    // Purple
  propeller_load: "#3B82F6",  // Blue
  uneven_propeller: "#EC4899" // Pink
}

const RenderClassDot = (props: any) => {
  const { cx, cy, payload } = props
  if (!cx || !cy || !payload) return null
  const condKey = payload.condition?.toLowerCase() || ""
  const color = CLASS_COLORS[condKey] || "#FF6B00"
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill={color}
      stroke="#121212"
      strokeWidth={1.5}
    />
  )
}

export function HistoricalDatasetChart() {
  const [data, setData] = useState<SamplePoint[]>([])
  const [selectedClass, setSelectedClass] = useState<string>("all")
  const [selectedDate, setSelectedDate] = useState<string>("all")
  const [metric, setMetric] = useState<"rpm" | "accel" | "temp">("rpm")
  const [loading, setLoading] = useState<boolean>(true)
  const [isZoomed, setIsZoomed] = useState<boolean>(false)

  const fetchDataset = async () => {
    setLoading(true)
    try {
      const url = `http://localhost:5001/api/dataset_samples?date=${encodeURIComponent(selectedDate)}&condition=${encodeURIComponent(selectedClass)}&limit=150`
      const res = await fetch(url)
      if (res.ok) {
        const json = await res.json()
        if (Array.isArray(json.samples)) {
          // Sort chronologically by timestamp
          const sorted = json.samples.sort(
            (a: SamplePoint, b: SamplePoint) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          )
          setData(sorted)
        }
      }
    } catch (err) {
      console.warn("Failed to fetch historical dataset:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDataset()
  }, [selectedClass, selectedDate])

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-100 flex items-center gap-2">
                Multi-Day Historical Telemetry Time-Series
                <span className="text-xs font-mono font-normal px-2.5 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-orange-400">
                  {selectedDate === "all" ? "Aug 10 ➔ Aug 12, 2026" : selectedDate}
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Filter historical motor condition trends by date and fault type (all_data.csv)
              </p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Metric Selector */}
          <div className="flex items-center rounded-lg bg-neutral-900 border border-neutral-800 p-1">
            <button
              onClick={() => setMetric("rpm")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                metric === "rpm" ? "bg-orange-500 text-black font-semibold" : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              <Zap className="h-3.5 w-3.5" /> RPM Speed
            </button>
            <button
              onClick={() => setMetric("accel")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                metric === "accel" ? "bg-emerald-500 text-black font-semibold" : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              <Activity className="h-3.5 w-3.5" /> Accel (X/Y/Z)
            </button>
            <button
              onClick={() => setMetric("temp")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                metric === "temp" ? "bg-amber-500 text-black font-semibold" : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              <Thermometer className="h-3.5 w-3.5" /> Temp (°C)
            </button>
          </div>

          {/* Date Filter Dropdown */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-neutral-400" />
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-neutral-900 border border-neutral-800 rounded-lg text-xs font-mono text-neutral-200 px-3 py-1.5 focus:outline-none focus:border-orange-500"
            >
              <option value="all">📅 All Dates (Aug 10 - 12)</option>
              <option value="2026-08-10">📅 Aug 10, 2026</option>
              <option value="2026-08-11">📅 Aug 11, 2026</option>
              <option value="2026-08-12">📅 Aug 12, 2026</option>
            </select>
          </div>

          {/* Condition Filter Dropdown */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-neutral-400" />
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="bg-neutral-900 border border-neutral-800 rounded-lg text-xs font-mono text-neutral-200 px-3 py-1.5 focus:outline-none focus:border-orange-500"
            >
              <option value="all">All Conditions (6 Classes)</option>
              <option value="healthy">Healthy Baseline</option>
              <option value="hair_strand">Hair Strand Obstruction</option>
              <option value="scratched_bearing">Scratched Bearing Fault</option>
              <option value="misalignment">Shaft Misalignment</option>
              <option value="propeller_load">Propeller Load</option>
              <option value="uneven_propeller">Uneven Propeller Imbalance</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchDataset}
            className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
            title="Refresh Dataset Graph"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Quick Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 bg-neutral-900/60 p-3.5 rounded-xl border border-neutral-800 text-xs font-mono">
        <div>
          <span className="text-neutral-500 block text-[10px]">TOTAL FRAMES</span>
          <span className="text-neutral-200 font-bold">{data.length} frames</span>
        </div>
        <div>
          <span className="text-neutral-500 block text-[10px]">AVG SPEED</span>
          <span className="text-orange-400 font-bold">
            {data.length > 0 ? (data.reduce((acc, curr) => acc + curr.rpm, 0) / data.length).toFixed(0) : 0} RPM
          </span>
        </div>
        <div>
          <span className="text-neutral-500 block text-[10px]">MAX SPEED</span>
          <span className="text-orange-300 font-bold">
            {data.length > 0 ? Math.max(...data.map(d => d.rpm)).toFixed(0) : 0} RPM
          </span>
        </div>
        <div>
          <span className="text-neutral-500 block text-[10px]">AVG VIBRATION</span>
          <span className="text-emerald-400 font-bold">
            {data.length > 0 ? (data.reduce((acc, curr) => acc + Math.sqrt(curr.accel_x**2 + curr.accel_y**2 + (curr.accel_z-1)**2), 0) / data.length).toFixed(3) : 0} g
          </span>
        </div>
        <div>
          <span className="text-neutral-500 block text-[10px]">AVG TEMP</span>
          <span className="text-amber-400 font-bold">
            {data.length > 0 ? (data.reduce((acc, curr) => acc + curr.temp, 0) / data.length).toFixed(1) : 0} °C
          </span>
        </div>
        <div>
          <span className="text-neutral-500 block text-[10px]">ACTIVE CLASS</span>
          <span className="text-purple-400 font-bold truncate block">
            {selectedClass === "all" ? "All 6 Classes" : selectedClass}
          </span>
        </div>
      </div>

      {/* Interactive Class Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-mono">
        <span className="text-neutral-400 text-[11px] font-sans flex items-center gap-1 mr-1">
          <Layers className="h-3.5 w-3.5" /> Filter Class:
        </span>

        <button
          onClick={() => setSelectedClass("all")}
          className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
            selectedClass === "all"
              ? "bg-neutral-100 text-neutral-900 font-bold shadow"
              : "bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-neutral-200"
          }`}
        >
          All Classes
        </button>

        <button
          onClick={() => setSelectedClass("healthy")}
          className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1.5 ${
            selectedClass === "healthy"
              ? "bg-emerald-500 text-black font-bold shadow-lg shadow-emerald-500/20"
              : "bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-900/60"
          }`}
        >
          ● Healthy
        </button>

        <button
          onClick={() => setSelectedClass("hair_strand")}
          className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1.5 ${
            selectedClass === "hair_strand"
              ? "bg-amber-500 text-black font-bold shadow-lg shadow-amber-500/20"
              : "bg-amber-950/40 border border-amber-500/30 text-amber-400 hover:bg-amber-900/60"
          }`}
        >
          ● Hair Strand
        </button>

        <button
          onClick={() => setSelectedClass("scratched_bearing")}
          className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1.5 ${
            selectedClass === "scratched_bearing"
              ? "bg-red-500 text-black font-bold shadow-lg shadow-red-500/20"
              : "bg-red-950/40 border border-red-500/30 text-red-400 hover:bg-red-900/60"
          }`}
        >
          ● Scratched Bearing
        </button>

        <button
          onClick={() => setSelectedClass("misalignment")}
          className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1.5 ${
            selectedClass === "misalignment"
              ? "bg-purple-500 text-black font-bold shadow-lg shadow-purple-500/20"
              : "bg-purple-950/40 border border-purple-500/30 text-purple-400 hover:bg-purple-900/60"
          }`}
        >
          ● Misalignment
        </button>

        <button
          onClick={() => setSelectedClass("propeller_load")}
          className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1.5 ${
            selectedClass === "propeller_load"
              ? "bg-blue-500 text-black font-bold shadow-lg shadow-blue-500/20"
              : "bg-blue-950/40 border border-blue-500/30 text-blue-400 hover:bg-blue-900/60"
          }`}
        >
          ● Propeller Load
        </button>

        <button
          onClick={() => setSelectedClass("uneven_propeller")}
          className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1.5 ${
            selectedClass === "uneven_propeller"
              ? "bg-pink-500 text-black font-bold shadow-lg shadow-pink-500/20"
              : "bg-pink-950/40 border border-pink-500/30 text-pink-400 hover:bg-pink-900/60"
          }`}
        >
          ● Uneven Propeller
        </button>
      </div>

      {/* Time-Series Chart */}
      <div className="h-80 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 30, left: 15, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
            <XAxis
              dataKey="timestamp"
              stroke="#737373"
              tick={{ fontSize: 10, fill: "#a3a3a3" }}
              tickFormatter={(ts) => {
                if (!ts) return ""
                const str = String(ts)
                const month = str.includes("08-10") ? "Aug 10" : str.includes("08-11") ? "Aug 11" : str.includes("08-12") ? "Aug 12" : ""
                const parts = str.split(" ")
                const timeStr = parts.length >= 2 ? parts[1].slice(0, 5) : ""
                return `${month} ${timeStr}`.trim()
              }}
              label={{ value: "Timeline (Chronological Order)", position: "bottom", offset: 10, fill: "#a3a3a3", fontSize: 11 }}
            />
            <YAxis
              stroke="#737373"
              tick={{ fontSize: 10, fill: "#a3a3a3" }}
              domain={metric === "rpm" ? [0, 20000] : metric === "accel" ? [-0.5, 2.0] : [20, 60]}
              tickFormatter={(val) => {
                if (metric === "rpm") return `${(val / 1000).toFixed(0)}k`
                if (metric === "temp") return `${val}°C`
                return `${val}g`
              }}
              label={{
                value: metric === "rpm" ? "RPM Speed" : metric === "accel" ? "Acceleration (g)" : "Temperature (°C)",
                angle: -90,
                position: "insideLeft",
                fill: "#a3a3a3",
                fontSize: 11
              }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const p = payload[0].payload
                  const condKey = p?.condition?.toLowerCase() || ""
                  const color = CLASS_COLORS[condKey] || "#FF6B00"
                  return (
                    <div className="rounded-lg border border-neutral-800 bg-neutral-900/95 p-3 text-xs font-mono space-y-1.5 shadow-2xl">
                      <div className="text-neutral-400 font-sans text-[11px] border-b border-neutral-800 pb-1 flex items-center justify-between">
                        <span>📅 {p?.timestamp}</span>
                      </div>
                      <div className="flex items-center gap-2 pt-0.5">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-neutral-100 font-bold font-sans">
                          {p?.condition}
                        </span>
                      </div>
                      <div className="text-orange-400">⚡ Speed: {p?.rpm?.toFixed(0)} RPM</div>
                      <div className="text-emerald-400">📊 Vibration: X:{p?.accel_x?.toFixed(2)}g Y:{p?.accel_y?.toFixed(2)}g Z:{p?.accel_z?.toFixed(2)}g</div>
                      <div className="text-amber-400">🌡️ Temp: {p?.temp?.toFixed(1)} °C</div>
                    </div>
                  )
                }
                return null
              }}
            />

            {metric === "rpm" && (
              <Line
                type="monotone"
                dataKey="rpm"
                name="Motor RPM"
                stroke={selectedClass === "all" ? "#525252" : CLASS_COLORS[selectedClass.toLowerCase()] || "#FF6B00"}
                strokeWidth={selectedClass === "all" ? 1.5 : 2.5}
                strokeDasharray={selectedClass === "all" ? "3 3" : undefined}
                dot={<RenderClassDot />}
                activeDot={{ r: 8 }}
              />
            )}

            {metric === "accel" && (
              <>
                <Line type="monotone" dataKey="accel_x" name="Accel X" stroke="#10B981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="accel_y" name="Accel Y" stroke="#3B82F6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="accel_z" name="Accel Z" stroke="#F59E0B" strokeWidth={2} dot={false} />
              </>
            )}

            {metric === "temp" && (
              <Line
                type="monotone"
                dataKey="temp"
                name="Bearing Temperature (°C)"
                stroke={selectedClass === "all" ? "#EF4444" : CLASS_COLORS[selectedClass.toLowerCase()] || "#EF4444"}
                strokeWidth={2}
                dot={<RenderClassDot />}
                activeDot={{ r: 8 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
