import { useState, useEffect, useRef } from 'react'
import GaugeComponent from 'react-gauge-component'
import {
  ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Legend,
} from 'recharts'

// ── status helpers ─────────────────────────────────────────────────────────

function ctlStatus(v) {
  if (v < 20) return { text: 'Fitness bajo',  cls: 'text-muted'    }
  if (v < 40) return { text: 'En desarrollo', cls: 'text-blue-500'  }
  if (v < 60) return { text: 'Buen nivel',    cls: 'text-blue-600'  }
  if (v < 80) return { text: 'Nivel alto',    cls: 'text-blue-700'  }
  return             { text: 'Nivel élite',   cls: 'text-blue-800'  }
}

function atlStatus(v) {
  if (v < 20) return { text: 'Descansado',     cls: 'text-leaf'      }
  if (v < 40) return { text: 'Fatiga normal',  cls: 'text-amber-600' }
  if (v < 60) return { text: 'Cansancio alto', cls: 'text-orange-600'}
  return             { text: 'Muy cansado',    cls: 'text-red-600'   }
}

function tsbStatus(v) {
  if (v == null) return { text: '—',                    cls: 'text-muted'     }
  if (v < -30)  return { text: 'Fatiga excesiva',       cls: 'text-red-600'   }
  if (v < -10)  return { text: 'Construyendo forma',    cls: 'text-orange-600'}
  if (v <   5)  return { text: 'Entrenamiento normal',  cls: 'text-ink'       }
  if (v <  25)  return { text: 'Fresco / listo',        cls: 'text-leaf'      }
  return              { text: 'Riesgo de pérdida',     cls: 'text-amber-600' }
}

function rampStatus(v) {
  if (v == null) return { text: '—',                   cls: 'text-muted'     }
  if (v <  0)   return { text: 'Perdiendo forma',      cls: 'text-red-600'   }
  if (v <  5)   return { text: 'Progresión segura',    cls: 'text-leaf'      }
  if (v <  8)   return { text: 'Progresión alta',      cls: 'text-orange-600'}
  return              { text: 'Riesgo de lesión',     cls: 'text-red-600'   }
}

// ── shared gauge style ─────────────────────────────────────────────────────

const POINTER = { type: "needle", elastic: false, animationDelay: 0, animationDuration: 1500, color: '#26231D', strokeColor: "#F3EFE6", width: 5, length: 0.8 }
const LABEL_STYLE = { fontSize: '28px', matchColorWithArc: true, fill: "#000", }

// ── GaugeCard ──────────────────────────────────────────────────────────────

function GaugeCard({ title, value, cls, statusText, description, gaugeProps }) {
  return (
    <div className="border border-line rounded-xl p-4 flex flex-col">
      <p className="font-mono text-muted text-[10px] uppercase tracking-wider mb-1">{title}</p>
      <GaugeComponent
        {...gaugeProps}
        value={value}
        pointer={POINTER}
        style={{ width: '100%' }}
      />
      <div className="text-center -mt-2">
        <p className={`font-mono text-sm font-bold ${cls}`}>{statusText}</p>
        <p className="font-mono text-muted text-xs mt-1 leading-snug">{description}</p>
      </div>
    </div>
  )
}

// ── chart tooltip ──────────────────────────────────────────────────────────

function fmtDate(isoStr) {
  const d = new Date(isoStr + 'T00:00:00')
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div className="bg-ink border border-ink/20 rounded-lg px-3 py-2 font-mono text-xs shadow-lg min-w-[180px]">
      <p className="text-paper/60 mb-2">{fmtDate(label)}</p>
      <p className="text-red-400">Estrés diario <span className="text-paper ml-1">{d.daily_stress}</span></p>
      <p className="text-blue-400">CTL (Forma) <span className="text-paper ml-1">{d.ctl}</span></p>
      <p className="text-pink-400">ATL (Fatiga) <span className="text-paper ml-1">{d.atl}</span></p>
      <p className="text-yellow-400">TSB (Estado) <span className="text-paper ml-1">{d.tsb}</span></p>
    </div>
  )
}

// ── skeleton ───────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-rust-soft/50 rounded-xl h-48" />
        ))}
      </div>
      <div className="bg-rust-soft/30 rounded-xl h-64" />
    </div>
  )
}

// ── number input ───────────────────────────────────────────────────────────

function NumberInput({ label, description, value, onChange, min, max }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-mono text-ink text-xs font-bold">{label}</span>
      {description && <span className="font-mono text-muted text-[11px] leading-tight">{description}</span>}
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={e => onChange(Number(e.target.value))}
        className="bg-paper border border-line text-ink font-mono text-sm rounded px-3 py-1.5 w-24 focus:outline-none focus:ring-1 focus:ring-rust mt-1"
      />
    </label>
  )
}

// ── window options ─────────────────────────────────────────────────────────

const WINDOW_OPTIONS = [
  { label: '1 mes',   days: 30  },
  { label: '3 meses', days: 90  },
  { label: '6 meses', days: 180 },
  { label: '1 año',   days: 365 },
  { label: 'Todo',    days: null },
]

// ── main component ─────────────────────────────────────────────────────────

export default function FatiguePanel({ refreshKey }) {
  const [thresholdHr, setThresholdHr] = useState(170)
  const [windowDays, setWindowDays]   = useState(90)
  const atlDays = 7
  const ctlDays = 42

  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const timer = useRef(null)
  const [debouncedHr, setDebouncedHr] = useState(thresholdHr)

  useEffect(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setDebouncedHr(thresholdHr), 400)
    return () => clearTimeout(timer.current)
  }, [thresholdHr])

  useEffect(() => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({
      threshold_hr: debouncedHr,
      atl_days: atlDays,
      ctl_days: ctlDays,
    })
    if (windowDays) {
      const start = new Date()
      start.setDate(start.getDate() - windowDays)
      params.set('start_date', start.toISOString().slice(0, 10))
    }
    fetch(`/api/v1/pmc?${params}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setError('Error al cargar los datos de fatiga.'); setLoading(false) })
  }, [refreshKey, debouncedHr, windowDays])

  const [selectedDay, setSelectedDay] = useState(null)

  const last        = data?.days?.at(-1)
  const chartData   = data?.days ?? []
  const xTickInterval = Math.max(1, Math.floor(chartData.length / 8))

  const day = selectedDay ?? last

  const dayIndex     = day ? chartData.findIndex(d => d.date === day.date) : -1
  const sevenDaysAgo = dayIndex >= 7 ? chartData[dayIndex - 7] : null
  const rampRate     = (day && sevenDaysAgo)
    ? Math.round((day.ctl - sevenDaysAgo.ctl) * 10) / 10
    : null

  const ctl  = day ? ctlStatus(day.ctl)  : null
  const atl  = day ? atlStatus(day.atl)  : null
  const tsb  = day ? tsbStatus(day.tsb)  : null
  const ramp = rampStatus(rampRate)

  function handleChartClick(e) {
    if (!e?.activePayload?.length) { setSelectedDay(null); return }
    const clicked = e.activePayload[0].payload
    if (clicked.date === (selectedDay?.date ?? last?.date)) setSelectedDay(null)
    else setSelectedDay(clicked)
  }

  return (
    <div className="space-y-5">
      {/* Parámetros — compact inline toolbar */}
      <div className="flex items-center gap-5 flex-wrap">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">Período</span>
        <div className="flex gap-1">
          {WINDOW_OPTIONS.map(opt => (
            <button
              key={opt.label}
              onClick={() => setWindowDays(opt.days)}
              className={`px-2 py-0.5 font-mono text-[10px] rounded transition-colors ${
                windowDays === opt.days
                  ? 'bg-rust text-paper'
                  : 'border border-line text-muted hover:border-ink hover:text-ink'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted">FC umbral [ppm]</span>
        <input
          type="number"
          value={thresholdHr}
          min={100}
          max={220}
          onChange={e => setThresholdHr(Number(e.target.value))}
          className="bg-paper border border-line text-ink font-mono text-xs rounded px-2 py-0.5 w-16 focus:outline-none focus:ring-1 focus:ring-rust"
        />
        <div className="w-px h-4 bg-line mx-1" />

        {/* Selected date indicator */}
        <div className="flex items-center gap-3">
          <p className="font-mono text-sm text-muted">
            {selectedDay
              ? <>
                  <span className="text-ink font-bold">{fmtDate(selectedDay.date)}</span>
                  <button onClick={() => setSelectedDay(null)} className="ml-3 font-mono text-xs text-muted hover:text-ink transition-colors">
                    ← volver al último
                  </button>
                </>
              : <span className="font-mono text-muted text-xs">Mostrando el día más reciente · hacé clic en el gráfico para explorar</span>
            }
          </p>
        </div>
      </div>

      {/* Gauges + chart */}
      {loading ? <Skeleton /> : error ? (
        <p className="font-mono text-red-600 text-sm">{error}</p>
      ) : !last ? (
        <p className="font-mono text-muted text-sm">Sin datos. Sincronizá actividades primero.</p>
      ) : (
        <>

          {/* Four gauges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <GaugeCard
              title="Forma (CTL)"
              value={day.ctl}
              cls={ctl.cls}
              statusText={ctl.text}
              description="Forma acumulada (~42 días). Sube con semanas de entrenamiento consistente."
              gaugeProps={{
                type: 'grafana',
                minValue: 0,
                maxValue: 100,
                arc: {
                  width: 0.15,
                  cornerRadius: 0,
                  subArcs: [
                    { limit: 20, color: '#C9C1B0', showTick: true, tooltip: { text: 'Fitness bajo.' } },
                    { limit: 40, color: '#93c5fd', showTick: true, tooltip: { text: 'En desarrollo.' } },
                    { limit: 60, color: '#60a5fa', showTick: true, tooltip: { text: 'Buen nivel.' } },
                    { limit: 80, color: '#3b82f6', showTick: true, tooltip: { text: 'Nivel alto.' } },
                    {            color: '#1d4ed8',                  tooltip: { text: 'Nivel élite.' } },
                  ],
                },
                labels: {
                  valueLabel: { style: LABEL_STYLE },
                  tickLabels: { type: "outer", hideMinMax: true, ticks: [] },
                },
              }}
            />

            <GaugeCard
              title="Fatiga (ATL)"
              value={day.atl}
              cls={atl.cls}
              statusText={atl.text}
              description="Cansancio reciente (~7 días). Un valor alto indica carga acumulada."
              gaugeProps={{
                type: 'grafana',
                minValue: 0,
                maxValue: 100,
                arc: {
                  width: 0.15,
                  subArcs: [
                    { limit: 20, color: '#5B6F4F', showTick: true, tooltip: { text: 'Descansado.' } },
                    { limit: 40, color: '#eab308', showTick: true, tooltip: { text: 'Fatiga normal.' } },
                    { limit: 60, color: '#f97316', showTick: true, tooltip: { text: 'Cansancio alto.' } },
                    {            color: '#ef4444',                  tooltip: { text: 'Muy cansado.' } },
                  ],
                },
                labels: {
                  valueLabel: { style: LABEL_STYLE },
                  tickLabels: { hideMinMax: true, ticks: [] },
                },
              }}
            />

            <GaugeCard
              title="Estado (TSB)"
              value={day.tsb ?? 0}
              cls={tsb.cls}
              statusText={tsb.text}
              description="CTL − ATL. Entre +5 y +25 es la zona ideal para una carrera."
              gaugeProps={{
                type: 'grafana',
                minValue: -50,
                maxValue: 50,
                arc: {
                  width: 0.15,
                  subArcs: [
                    { limit: -30, color: '#ef4444', showTick: true, tooltip: { text: 'Fatiga excesiva.' } },
                    { limit: -10, color: '#f97316', showTick: true, tooltip: { text: 'Construyendo forma.' } },
                    { limit:   5, color: '#C9C1B0', showTick: true, tooltip: { text: 'Entrenamiento normal.' } },
                    { limit:  25, color: '#5B6F4F', showTick: true, tooltip: { text: 'Fresco / listo.' } },
                    {             color: '#f59e0b',                  tooltip: { text: 'Riesgo de pérdida.' } },
                  ],
                },
                labels: {
                  valueLabel: {
                    style: LABEL_STYLE,
                    formatTextValue: v => v > 0 ? `+${v}` : String(v),
                  },
                  tickLabels: { hideMinMax: true, ticks: [] },
                },
              }}
            />

            <GaugeCard
              title="Tasa de Progresión"
              value={rampRate ?? 0}
              cls={ramp.cls}
              statusText={ramp.text}
              description="Cambio de CTL en 7 días. Más de +7/semana aumenta riesgo de lesión."
              gaugeProps={{
                type: 'grafana',
                minValue: -10,
                maxValue: 15,
                arc: {
                  width: 0.15,
                  subArcs: [
                    { limit:  0, color: '#ef4444', showTick: true, tooltip: { text: 'Perdiendo forma.' } },
                    { limit:  5, color: '#5B6F4F', showTick: true, tooltip: { text: 'Progresión segura.' } },
                    { limit:  8, color: '#f97316', showTick: true, tooltip: { text: 'Progresión alta.' } },
                    {            color: '#ef4444',                  tooltip: { text: 'Riesgo de lesión.' } },
                  ],
                },
                labels: {
                  valueLabel: {
                    style: LABEL_STYLE,
                    formatTextValue: v => v > 0 ? `+${v}` : String(v),
                  },
                  tickLabels: { hideMinMax: true, ticks: [] },
                },
              }}
            />
          </div>

          {/* Historical chart */}
          <div className="border border-line rounded-xl p-5">
            <div className="flex items-baseline gap-3 mb-3">
              <h3 className="font-fraunces italic text-xl text-ink">Evolución histórica</h3>
            </div>
            <div className="border-b border-ink mb-4" />
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart
                data={chartData}
                margin={{ top: 8, right: 12, left: -10, bottom: 0 }}
                onClick={handleChartClick}
                style={{ cursor: 'crosshair' }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#D9D1C0" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#7A7363', fontSize: 10, fontFamily: '"Space Mono", monospace' }}
                  axisLine={false} tickLine={false}
                  interval={xTickInterval}
                  tickFormatter={fmtDate}
                />
                <YAxis yAxisId="load" orientation="left"
                  tick={{ fill: '#7A7363', fontSize: 10, fontFamily: '"Space Mono", monospace' }}
                  axisLine={false} tickLine={false} />
                <YAxis yAxisId="stress" orientation="right"
                  tick={{ fill: '#7A7363', fontSize: 10, fontFamily: '"Space Mono", monospace' }}
                  axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#7A7363', paddingTop: 8, fontFamily: '"Space Mono", monospace' }} />
                <ReferenceLine yAxisId="load" y={0} stroke="#D9D1C0" strokeDasharray="4 4" />
                {selectedDay && (
                  <ReferenceLine
                    yAxisId="load"
                    x={selectedDay.date}
                    stroke="#B5512E"
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                    label={{ value: fmtDate(selectedDay.date), position: 'top', fill: '#B5512E', fontSize: 10, fontFamily: '"Space Mono", monospace' }}
                  />
                )}
                <Bar yAxisId="stress" dataKey="daily_stress" name="Estrés diario (hrTSS)"
                  fill="#B5512E" opacity={0.4} maxBarSize={8} radius={[2, 2, 0, 0]} />
                <Line yAxisId="load" dataKey="ctl" name="CTL (Forma)"
                  stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                <Line yAxisId="load" dataKey="atl" name="ATL (Fatiga)"
                  stroke="#ec4899" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                <Line yAxisId="load" dataKey="tsb" name="TSB (Estado)"
                  stroke="#d97706" strokeWidth={1.5} strokeDasharray="5 3"
                  dot={false} activeDot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
            <p className="font-mono text-muted/60 text-[10px] text-center mt-1">
              Azul = CTL/Forma · Rosa = ATL/Fatiga · Ámbar punteado = TSB/Estado · Barras = estrés diario
            </p>
          </div>
        </>
      )}
    </div>
  )
}
