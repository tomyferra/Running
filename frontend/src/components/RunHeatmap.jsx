import { useEffect, useState } from 'react'

const MESES   = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const DIA_ABR = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

function toKey(d) {
  return d.toISOString().slice(0, 10)
}

function cellColor(km) {
  if (!km || km === 0) return '#D9D1C0'
  if (km < 3)          return '#cdd9c2'
  if (km < 6)          return '#9eb98a'
  if (km < 10)         return '#6f9956'
  if (km < 15)         return '#5B6F4F'
  return                      '#3d5234'
}

const C = 12
const G = 2

async function fetchAllActivities() {
  const PAGE = 100
  let offset = 0
  let all = []
  while (true) {
    const r = await fetch(`/api/v1/activities?limit=${PAGE}&offset=${offset}`)
    const { items = [], total = 0 } = await r.json()
    all = all.concat(items)
    offset += PAGE
    if (offset >= total) break
  }
  return all
}

function computeStreaks(distMap) {
  const runDays = Object.keys(distMap).filter(k => distMap[k] > 0).sort()
  if (!runDays.length) return { current: 0, longest: 0 }

  let longest = 1, streak = 1
  for (let i = 1; i < runDays.length; i++) {
    const prev = new Date(runDays[i - 1] + 'T00:00:00')
    const curr = new Date(runDays[i] + 'T00:00:00')
    if (Math.round((curr - prev) / 86400000) === 1) {
      streak++
      longest = Math.max(longest, streak)
    } else {
      streak = 1
    }
  }
  longest = Math.max(longest, 1)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const lastRun = new Date(runDays[runDays.length - 1] + 'T00:00:00')
  const daysSinceLast = Math.round((today - lastRun) / 86400000)

  if (daysSinceLast > 1) return { current: 0, longest }

  let current = 1
  for (let i = runDays.length - 2; i >= 0; i--) {
    const next = new Date(runDays[i + 1] + 'T00:00:00')
    const curr = new Date(runDays[i] + 'T00:00:00')
    if (Math.round((next - curr) / 86400000) === 1) current++
    else break
  }

  return { current, longest }
}

export default function RunHeatmap({ refreshKey }) {
  const [distMap, setDistMap] = useState({})
  const [tooltip, setTooltip] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchAllActivities()
      .then(items => {
        const m = {}
        for (const a of items) {
          if (!a.start_time || !a.distance_km) continue
          const k = a.start_time.slice(0, 10)
          m[k] = (m[k] ?? 0) + a.distance_km
        }
        setDistMap(m)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [refreshKey])

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayKey = toKey(today)

  const allKeys = Object.keys(distMap)
  const earliest = allKeys.length > 0
    ? new Date(allKeys.reduce((a, b) => a < b ? a : b))
    : (() => { const d = new Date(today); d.setDate(d.getDate() - 364); return d })()

  const gridStart = new Date(earliest)
  gridStart.setDate(earliest.getDate() - earliest.getDay())

  const weeks = []
  const cur = new Date(gridStart)
  while (cur <= today) {
    const week = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + i)
      week.push(day <= today ? day : null)
    }
    weeks.push(week)
    cur.setDate(cur.getDate() + 7)
  }

  const colLabels = weeks.map((week, wi) => {
    const first = week.find(Boolean)
    if (!first) return null
    if (wi === 0) return MESES[first.getMonth()]
    const prevFirst = weeks[wi - 1].find(Boolean)
    if (!prevFirst) return null
    if (first.getMonth() !== prevFirst.getMonth()) {
      if (first.getMonth() === 0) return String(first.getFullYear())
      return MESES[first.getMonth()]
    }
    return null
  })

  const { current: rachaActual, longest: rachaMáxima } = computeStreaks(distMap)

  return (
    <div className="ml-auto border-l border-line pl-10 relative">
      <p className="font-mono text-[11px] tracking-[.12em] uppercase text-rust mb-3">
        Mapa de calor
      </p>

      {loading ? (
        <div className="h-24 w-96 bg-rust-soft/40 rounded-lg animate-pulse" />
      ) : (
        <>
          <div className="overflow-x-auto">
            <div style={{ display: 'inline-flex', flexDirection: 'column', userSelect: 'none' }}>

              {/* Month labels */}
              <div style={{ display: 'flex', gap: G, marginLeft: 28, marginBottom: 4 }}>
                {weeks.map((_, wi) => {
                  const label = colLabels[wi]
                  const isYear = label && /^\d{4}$/.test(label)
                  return (
                    <div
                      key={wi}
                      style={{
                        width: C,
                        fontSize: 9,
                        fontFamily: '"Space Mono", monospace',
                        color: isYear ? '#26231D' : '#7A7363',
                        fontWeight: isYear ? 700 : 400,
                        whiteSpace: 'nowrap',
                        overflow: 'visible',
                      }}
                    >
                      {label ?? ''}
                    </div>
                  )
                })}
              </div>

              <div style={{ display: 'flex', gap: G }}>
                {/* Day labels */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: G, marginRight: 4 }}>
                  {DIA_ABR.map((label, i) => (
                    <div
                      key={i}
                      style={{
                        height: C,
                        width: 22,
                        fontSize: 9,
                        fontFamily: '"Space Mono", monospace',
                        color: '#7A7363',
                        lineHeight: `${C}px`,
                        textAlign: 'right',
                      }}
                    >
                      {i === 1 || i === 3 || i === 5 ? label : ''}
                    </div>
                  ))}
                </div>

                {/* Week columns */}
                {weeks.map((week, wi) => (
                  <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: G }}>
                    {week.map((day, di) => {
                      if (!day) return <div key={di} style={{ width: C, height: C }} />

                      const key     = toKey(day)
                      const km      = distMap[key]
                      const isToday = key === todayKey

                      return (
                        <div
                          key={di}
                          style={{
                            width: C,
                            height: C,
                            borderRadius: isToday ? '50%' : 3,
                            backgroundColor: isToday && !km ? '#E7D3C5' : cellColor(km),
                            border: isToday ? '2px solid #B5512E' : 'none',
                            boxSizing: 'border-box',
                            cursor: 'default',
                          }}
                          onMouseMove={e => setTooltip({ key, km, x: e.clientX, y: e.clientY })}
                          onMouseLeave={() => setTooltip(null)}
                        />
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Streaks — below the grid, matching design.html */}
          <div className="flex gap-6 mt-4">
            <div>
              <b className="font-fraunces font-semibold text-base text-ink block leading-tight">{rachaActual}</b>
              <span className="font-mono text-[11px] text-muted">racha actual</span>
            </div>
            <div>
              <b className="font-fraunces font-semibold text-base text-ink block leading-tight">{rachaMáxima}</b>
              <span className="font-mono text-[11px] text-muted">racha máxima</span>
            </div>
          </div>
        </>
      )}

      {tooltip && (
        <div
          style={{
            position: 'fixed',
            top: tooltip.y - 48,
            left: tooltip.x + 12,
            zIndex: 9999,
            pointerEvents: 'none',
          }}
          className="bg-ink border border-ink/20 rounded-lg px-3 py-1.5 text-xs shadow-xl whitespace-nowrap"
        >
          <span className="font-mono text-paper/60">{tooltip.key}</span>
          {tooltip.km != null
            ? <span className="font-mono text-leaf font-bold ml-2">{tooltip.km.toFixed(1)} km</span>
            : <span className="font-mono text-paper/40 ml-2">Sin carrera</span>
          }
          {tooltip.key === todayKey && (
            <span className="font-mono text-rust ml-2">· hoy</span>
          )}
        </div>
      )}
    </div>
  )
}
