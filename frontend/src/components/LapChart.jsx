import {
  ComposedChart, Bar, Cell, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts'

// ── helpers ────────────────────────────────────────────────────────────────

function secToMinSec(sec) {
  if (sec == null) return '—'
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function pearson(xs, ys) {
  const n = xs.length
  if (n < 3) return null
  const mx = xs.reduce((a, b) => a + b, 0) / n
  const my = ys.reduce((a, b) => a + b, 0) / n
  const num = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0)
  const dx  = Math.sqrt(xs.reduce((s, x) => s + (x - mx) ** 2, 0))
  const dy  = Math.sqrt(ys.reduce((s, y) => s + (y - my) ** 2, 0))
  return dx === 0 || dy === 0 ? 0 : num / (dx * dy)
}

function corrLabel(r) {
  if (r == null) return { text: '—', sub: '' }
  const abs = Math.abs(r)
  if (abs > 0.75) return { text: `${r.toFixed(2)} — strong`,   sub: 'HR closely tracks pace every lap' }
  if (abs > 0.45) return { text: `${r.toFixed(2)} — moderate`, sub: 'HR broadly follows pace changes' }
  return               { text: `${r.toFixed(2)} — weak`,     sub: 'Possible cardiac drift or terrain variation' }
}

// ── custom tooltip ─────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-slate-400 mb-1 font-medium">{label}</p>
      {d.pace != null && (
        <p className="text-emerald-400">
          Pace {secToMinSec(d.pace)}/km
          <span className="text-slate-500 ml-1">
            ({d.paceDev > 0 ? '+' : ''}{d.paceDev}s vs avg)
          </span>
        </p>
      )}
      {d.hr != null && (
        <p className="text-amber-400">
          HR {d.hr} bpm
          <span className="text-slate-500 ml-1">
            ({d.hrDev > 0 ? '+' : ''}{d.hrDev} vs avg)
          </span>
        </p>
      )}
    </div>
  )
}

// ── main component ─────────────────────────────────────────────────────────

export default function LapChart({ laps }) {
  // Only full-distance laps (skip partial last lap < 500 m)
  const full = laps.filter(l => l.distance_m != null && l.distance_m > 500)
  if (full.length < 2) return null

  // Pace in sec/km from speed m/s
  const paces = full.map(l => l.avg_speed_ms ? Math.round(1000 / l.avg_speed_ms) : null)
  const hrs   = full.map(l => l.avg_hr ?? null)

  const validP = paces.filter(Boolean)
  const validH = hrs.filter(Boolean)

  const avgPace = validP.reduce((a, b) => a + b, 0) / validP.length
  const avgHr   = validH.reduce((a, b) => a + b, 0) / validH.length

  // Correlation: speed (m/s) vs HR — positive r means faster = higher HR (expected)
  const pairs = full.filter(l => l.avg_speed_ms != null && l.avg_hr != null)
  const r = pearson(pairs.map(l => l.avg_speed_ms), pairs.map(l => l.avg_hr))
  const { text: rText, sub: rSub } = corrLabel(r)

  // Chart data
  const data = full.map(l => {
    const pace   = l.avg_speed_ms ? Math.round(1000 / l.avg_speed_ms) : null
    const paceDev = pace != null ? Math.round(avgPace - pace) : null // +ve = faster
    const hrDev   = l.avg_hr != null ? Math.round(l.avg_hr - avgHr) : null
    return {
      lap: `L${l.lap_index + 1}`,
      pace,
      hr: l.avg_hr ?? null,
      paceDev,
      hrDev,
    }
  })

  return (
    <div className="mt-6">
      <h3 className="text-slate-500 text-xs uppercase tracking-wider mb-3">Lap Analysis</h3>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-slate-800/50 rounded-lg p-3">
          <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Avg Lap Pace</p>
          <p className="text-white font-semibold">
            {secToMinSec(avgPace)}
            <span className="text-slate-500 text-xs font-normal ml-1">/km</span>
          </p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3">
          <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Avg Lap HR</p>
          <p className="text-white font-semibold">
            {Math.round(avgHr)}
            <span className="text-slate-500 text-xs font-normal ml-1">bpm</span>
          </p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3">
          <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Pace–HR Link</p>
          <p className={`font-semibold text-sm ${Math.abs(r ?? 0) > 0.45 ? 'text-emerald-400' : 'text-slate-400'}`}>
            {rText}
          </p>
          {rSub && <p className="text-slate-600 text-xs mt-0.5 leading-tight">{rSub}</p>}
        </div>
      </div>

      {/* Chart */}
      <div className="bg-slate-800/30 rounded-xl p-3">
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="lap"
              tick={{ fill: '#475569', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            {/* Left axis: pace deviation in seconds */}
            <YAxis
              yAxisId="pace"
              orientation="left"
              tick={{ fill: '#475569', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `${v > 0 ? '+' : ''}${v}s`}
            />
            {/* Right axis: HR deviation in bpm */}
            <YAxis
              yAxisId="hr"
              orientation="right"
              tick={{ fill: '#475569', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `${v > 0 ? '+' : ''}${v}`}
            />
            <Tooltip content={<ChartTooltip />} />
            {/* Zero reference lines */}
            <ReferenceLine yAxisId="pace" y={0} stroke="#334155" strokeDasharray="4 4" />
            <ReferenceLine yAxisId="hr"   y={0} stroke="#334155" strokeDasharray="4 4" />
            {/* Pace deviation bars: green = faster, red = slower */}
            <Bar yAxisId="pace" dataKey="paceDev" name="Pace dev" radius={[3, 3, 0, 0]} maxBarSize={24}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.paceDev == null ? '#1e293b' : d.paceDev >= 0 ? '#34d399' : '#f87171'} />
              ))}
            </Bar>
            {/* HR deviation line */}
            <Line
              yAxisId="hr"
              dataKey="hrDev"
              name="HR dev"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
        <p className="text-slate-600 text-xs text-center mt-1">
          Bars = pace deviation (green faster / red slower). Amber line = HR deviation. Both relative to lap averages.
        </p>
      </div>
    </div>
  )
}
