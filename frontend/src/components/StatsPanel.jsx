import { useEffect, useState } from 'react'

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

  const km  = stats?.total_distance_km ?? 0
  // Format: integer part with locale thousands separator, decimal separate
  const intPart = Math.floor(km).toLocaleString('es-AR')
  const decPart = (km % 1).toFixed(1).slice(1) // ".3"
  const elev = stats?.total_elevation_gain_m != null
    ? Math.round(stats.total_elevation_gain_m).toLocaleString('es-AR') + ' m'
    : '—'
  const runs = stats?.total_runs ?? '—'

  return (
    <div className="shrink-0">
      <p className="font-mono text-[11px] tracking-[.12em] uppercase text-rust mb-3">
        Distancia acumulada
      </p>

      {loading ? (
        <div className="space-y-4">
          <div className="h-20 w-56 bg-rust-soft rounded animate-pulse" />
          <div className="flex gap-8">
            <div className="h-8 w-24 bg-rust-soft/60 rounded animate-pulse" />
            <div className="h-8 w-16 bg-rust-soft/60 rounded animate-pulse" />
          </div>
        </div>
      ) : (
        <>
          <p className="font-fraunces font-semibold text-ink leading-[.9] mb-5 whitespace-nowrap">
            <span className="text-[96px]">{intPart}</span>
            <span className="text-[28px] text-muted font-normal">{decPart} km</span>
          </p>
          <div className="flex gap-8">
            <div>
              <b className="font-fraunces font-semibold text-2xl text-ink block leading-tight">{elev}</b>
              <span className="font-mono text-[11px] text-muted">Elevación</span>
            </div>
            <div>
              <b className="font-fraunces font-semibold text-2xl text-ink block leading-tight">{runs}</b>
              <span className="font-mono text-[11px] text-muted">Carreras</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
