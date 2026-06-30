import { useEffect, useState } from 'react'

const CARDS = [
  { key: 'total_runs',           label: 'Total Runs',   unit: '',    fmt: v => v },
  { key: 'total_distance_km',    label: 'Distance',     unit: 'km',  fmt: v => v?.toFixed(1) },
  { key: 'total_time',           label: 'Total Time',   unit: '',    fmt: v => v },
  { key: 'avg_pace',             label: 'Avg Pace',     unit: '',    fmt: v => v ?? '—' },
  { key: 'avg_hr',               label: 'Avg HR',       unit: 'bpm', fmt: v => (v != null ? v.toFixed(0) : '—') },
  { key: 'total_elevation_gain_m', label: 'Elevation',  unit: 'm',   fmt: v => v?.toFixed(0) },
]

function SkeletonCard() {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="h-3 w-20 bg-slate-800 rounded mb-3 animate-pulse" />
      <div className="h-6 w-24 bg-slate-800 rounded animate-pulse" />
    </div>
  )
}

export default function StatsPanel({ refreshKey }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch('/api/v1/activities/stats')
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [refreshKey])

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
      {loading
        ? CARDS.map(c => <SkeletonCard key={c.key} />)
        : CARDS.map(card => {
            const raw = stats?.[card.key]
            const val = raw != null ? card.fmt(raw) : '—'
            return (
              <div key={card.key} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">{card.label}</p>
                <p className="text-white text-xl font-bold leading-none">
                  {val}
                  {raw != null && card.unit && (
                    <span className="text-slate-500 text-sm font-normal ml-1">{card.unit}</span>
                  )}
                </p>
              </div>
            )
          })}
    </div>
  )
}
