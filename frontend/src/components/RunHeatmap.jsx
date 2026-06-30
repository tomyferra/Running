import { useEffect, useState } from 'react'

const MONTHS   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAY_ABBR = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function toKey(d) {
  return d.toISOString().slice(0, 10)
}

function cellColor(km) {
  if (!km || km === 0) return '#1e293b'
  if (km < 3)          return '#14532d'
  if (km < 6)          return '#166534'
  if (km < 10)         return '#15803d'
  if (km < 15)         return '#16a34a'
  return                      '#22c55e'
}

const LEGEND = [
  { km: 0  },
  { km: 2  },
  { km: 4  },
  { km: 8  },
  { km: 12 },
  { km: 16 },
]

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

  // Find earliest date in data, or fall back to 52 weeks ago
  const allKeys = Object.keys(distMap)
  const earliest = allKeys.length > 0
    ? new Date(allKeys.reduce((a, b) => a < b ? a : b))
    : (() => { const d = new Date(today); d.setDate(d.getDate() - 364); return d })()

  // Rewind to the Sunday on or before the earliest date
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

  // Month/year labels: show month name normally; when year changes show the year instead
  const colLabels = weeks.map((week, wi) => {
    const first = week.find(Boolean)
    if (!first) return null
    if (wi === 0) return MONTHS[first.getMonth()]
    const prevFirst = weeks[wi - 1].find(Boolean)
    if (!prevFirst) return null
    if (first.getMonth() !== prevFirst.getMonth()) {
      // Year boundary: show year number instead of month name
      if (first.getMonth() === 0) return String(first.getFullYear())
      return MONTHS[first.getMonth()]
    }
    return null
  })

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl px-5 pt-4 pb-3 mb-5 relative">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-slate-400 text-xs uppercase tracking-wider">Running Heatmap</h3>
        <div className="flex items-center gap-1.5">
          <span className="text-slate-600 text-xs mr-0.5">Less</span>
          {LEGEND.map(({ km }, i) => (
            <div key={i} style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: cellColor(km) }} />
          ))}
          <span className="text-slate-600 text-xs ml-0.5">More</span>
        </div>
      </div>

      {loading ? (
        <div className="h-24 bg-slate-800 rounded-lg animate-pulse" />
      ) : (
        <div className="overflow-x-auto">
          <div style={{ display: 'inline-flex', flexDirection: 'column', userSelect: 'none' }}>

            {/* Month / year label row */}
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
                      color: isYear ? '#94a3b8' : '#64748b',
                      fontWeight: isYear ? 600 : 400,
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
              {/* Day-of-week labels */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: G, marginRight: 4 }}>
                {DAY_ABBR.map((label, i) => (
                  <div
                    key={i}
                    style={{
                      height: C,
                      width: 22,
                      fontSize: 9,
                      color: '#64748b',
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
                          backgroundColor: isToday && !km ? '#1e3a5f' : cellColor(km),
                          border: isToday ? `2px solid #94a3b8` : 'none',
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
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs shadow-xl whitespace-nowrap"
        >
          <span className="text-slate-300">{tooltip.key}</span>
          {tooltip.km != null
            ? <span className="text-emerald-400 font-semibold ml-2">{tooltip.km.toFixed(1)} km</span>
            : <span className="text-slate-600 ml-2">No run</span>
          }
          {tooltip.key === todayKey && (
            <span className="text-slate-500 ml-2 text-xs">· today</span>
          )}
        </div>
      )}
    </div>
  )
}
