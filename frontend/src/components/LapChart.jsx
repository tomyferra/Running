import {
  ComposedChart, Bar, Cell, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts'

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
  if (abs > 0.75) return { text: `${r.toFixed(2)} — fuerte`,   sub: 'La FC sigue de cerca el ritmo en cada vuelta' }
  if (abs > 0.45) return { text: `${r.toFixed(2)} — moderada`, sub: 'La FC sigue en líneas generales los cambios de ritmo' }
  return               { text: `${r.toFixed(2)} — débil`,     sub: 'Posible deriva cardíaca o variación de terreno' }
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div className="bg-ink border border-ink/20 rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="font-mono text-paper/60 mb-1">{label}</p>
      {d.pace != null && (
        <p className="font-mono text-leaf">
          Ritmo {secToMinSec(d.pace)}/km
          <span className="text-paper/40 ml-1">
            ({d.paceDev > 0 ? '+' : ''}{d.paceDev}s vs prom.)
          </span>
        </p>
      )}
      {d.hr != null && (
        <p className="font-mono text-amber-400">
          FC {d.hr} ppm
          <span className="text-paper/40 ml-1">
            ({d.hrDev > 0 ? '+' : ''}{d.hrDev} vs prom.)
          </span>
        </p>
      )}
    </div>
  )
}

export default function LapChart({ laps }) {
  const full = laps.filter(l => l.distance_m != null && l.distance_m > 500)
  if (full.length < 2) return null

  const paces = full.map(l => l.avg_speed_ms ? Math.round(1000 / l.avg_speed_ms) : null)
  const hrs   = full.map(l => l.avg_hr ?? null)

  const validP = paces.filter(Boolean)
  const validH = hrs.filter(Boolean)

  const avgPace = validP.reduce((a, b) => a + b, 0) / validP.length
  const avgHr   = validH.reduce((a, b) => a + b, 0) / validH.length

  const pairs = full.filter(l => l.avg_speed_ms != null && l.avg_hr != null)
  const r = pearson(pairs.map(l => l.avg_speed_ms), pairs.map(l => l.avg_hr))
  const { text: rText, sub: rSub } = corrLabel(r)

  const data = full.map(l => {
    const pace    = l.avg_speed_ms ? Math.round(1000 / l.avg_speed_ms) : null
    const paceDev = pace != null ? Math.round(avgPace - pace) : null
    const hrDev   = l.avg_hr != null ? Math.round(l.avg_hr - avgHr) : null
    return { lap: `V${l.lap_index + 1}`, pace, hr: l.avg_hr ?? null, paceDev, hrDev }
  })

  return (
    <div className="mt-5">
      <div className="flex items-baseline gap-3 mb-2">
        <h3 className="font-fraunces italic text-lg text-ink">Análisis de Vueltas</h3>
      </div>
      <div className="border-b border-ink mb-4" />

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-rust-soft/30 rounded-lg p-3">
          <p className="font-mono text-muted text-[10px] uppercase tracking-wider mb-1">Ritmo Prom. Vuelta</p>
          <p className="font-mono text-ink font-bold">
            {secToMinSec(avgPace)}
            <span className="text-muted text-xs font-normal ml-1">/km</span>
          </p>
        </div>
        <div className="bg-rust-soft/30 rounded-lg p-3">
          <p className="font-mono text-muted text-[10px] uppercase tracking-wider mb-1">FC Prom. Vuelta</p>
          <p className="font-mono text-ink font-bold">
            {Math.round(avgHr)}
            <span className="text-muted text-xs font-normal ml-1">ppm</span>
          </p>
        </div>
        <div className="bg-rust-soft/30 rounded-lg p-3">
          <p className="font-mono text-muted text-[10px] uppercase tracking-wider mb-1">Relación Ritmo–FC</p>
          <p className={`font-mono font-bold text-sm ${Math.abs(r ?? 0) > 0.45 ? 'text-leaf' : 'text-muted'}`}>
            {rText}
          </p>
          {rSub && <p className="font-mono text-muted/60 text-[10px] mt-0.5 leading-tight">{rSub}</p>}
        </div>
      </div>

      {/* Chart */}
      <div className="bg-rust-soft/10 rounded-xl p-3 border border-line">
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#D9D1C0" vertical={false} />
            <XAxis
              dataKey="lap"
              tick={{ fill: '#7A7363', fontSize: 10, fontFamily: '"Space Mono", monospace' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="pace"
              orientation="left"
              tick={{ fill: '#7A7363', fontSize: 10, fontFamily: '"Space Mono", monospace' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `${v > 0 ? '+' : ''}${v}s`}
            />
            <YAxis
              yAxisId="hr"
              orientation="right"
              tick={{ fill: '#7A7363', fontSize: 10, fontFamily: '"Space Mono", monospace' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `${v > 0 ? '+' : ''}${v}`}
            />
            <Tooltip content={<ChartTooltip />} />
            <ReferenceLine yAxisId="pace" y={0} stroke="#D9D1C0" strokeDasharray="4 4" />
            <ReferenceLine yAxisId="hr"   y={0} stroke="#D9D1C0" strokeDasharray="4 4" />
            <Bar yAxisId="pace" dataKey="paceDev" name="Desv. ritmo" radius={[3, 3, 0, 0]} maxBarSize={24}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.paceDev == null ? '#D9D1C0' : d.paceDev >= 0 ? '#5B6F4F' : '#B5512E'} />
              ))}
            </Bar>
            <Line
              yAxisId="hr"
              dataKey="hrDev"
              name="Desv. FC"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
        <p className="font-mono text-muted/60 text-[10px] text-center mt-1">
          Barras = desviación de ritmo (verde más rápido · rojo más lento). Línea ámbar = desviación de FC.
        </p>
      </div>
    </div>
  )
}
