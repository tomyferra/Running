import { useEffect, useState } from 'react'

const LIMIT = 20

function SkeletonRow() {
  return (
    <tr className="border-b border-line/50">
      {[100, 160, 70, 70, 80, 55, 50].map((w, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-rust-soft/60 rounded animate-pulse" style={{ width: w }} />
        </td>
      ))}
    </tr>
  )
}

export default function ActivityList({ selectedId, onSelect, refreshKey }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [offset, setOffset]   = useState(0)
  const [filters, setFilters] = useState({ start_date: '', end_date: '', min_distance_km: '' })

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ offset, limit: LIMIT })
    if (filters.start_date)              params.set('start_date', filters.start_date)
    if (filters.end_date)                params.set('end_date', filters.end_date)
    if (filters.min_distance_km !== '')  params.set('min_distance_km', filters.min_distance_km)

    fetch(`/api/v1/activities?${params}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [offset, filters, refreshKey])

  const handleFilter = e => {
    setFilters(f => ({ ...f, [e.target.name]: e.target.value }))
    setOffset(0)
  }

  const totalPages  = data ? Math.ceil(data.total / LIMIT) : 0
  const currentPage = Math.floor(offset / LIMIT) + 1

  return (
    <div className="border border-line rounded-xl overflow-hidden">
      {/* Section header */}
      <div className="px-4 py-3 border-b-2 border-ink flex items-baseline justify-between">
        <h2 className="font-fraunces italic text-xl text-ink">Registro de actividades</h2>
        {data != null && (
          <span className="font-mono text-xs text-muted">{data.total} entradas</span>
        )}
      </div>

      {/* Filter bar */}
      <div className="px-4 py-3 border-b border-line flex flex-wrap items-center gap-3 bg-rust-soft/20">
        <span className="font-mono text-muted text-[10px] uppercase tracking-widest">Filtrar</span>
        <input
          type="date"
          name="start_date"
          value={filters.start_date}
          onChange={handleFilter}
          className="bg-paper border border-line text-ink font-mono text-xs rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-rust"
        />
        <span className="font-mono text-muted text-sm">→</span>
        <input
          type="date"
          name="end_date"
          value={filters.end_date}
          onChange={handleFilter}
          className="bg-paper border border-line text-ink font-mono text-xs rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-rust"
        />
        <input
          type="number"
          name="min_distance_km"
          value={filters.min_distance_km}
          onChange={handleFilter}
          placeholder="Mín km"
          min="0"
          step="0.5"
          className="bg-paper border border-line text-ink font-mono text-xs rounded px-3 py-1.5 w-24 focus:outline-none focus:ring-1 focus:ring-rust placeholder-muted/50"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line">
              <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-muted font-normal">Fecha</th>
              <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-muted font-normal">Nombre</th>
              <th className="text-right px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-muted font-normal">Dist</th>
              <th className="text-right px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-muted font-normal">Tiempo</th>
              <th className="text-right px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-muted font-normal">Ritmo</th>
              <th className="text-right px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-muted font-normal">FC</th>
              <th className="text-right px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-muted font-normal">↑</th>
            </tr>
          </thead>
          <tbody>
            {loading && Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}

            {!loading && data?.items?.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center">
                  <p className="font-fraunces italic text-ink text-lg mb-1">Sin actividades.</p>
                  <p className="font-mono text-muted text-xs">
                    Presioná <span className="text-rust font-bold">Sincronizar</span> para importar desde Garmin Connect.
                  </p>
                </td>
              </tr>
            )}

            {!loading && data?.items?.map(a => {
              const date = a.start_time
                ? new Date(a.start_time).toLocaleDateString('es-AR', {
                    day: '2-digit', month: 'short', year: 'numeric',
                  })
                : '—'
              const isSelected = a.activity_id === selectedId

              return (
                <tr
                  key={a.activity_id}
                  onClick={() => onSelect(a.activity_id)}
                  className={`border-b border-line/50 cursor-pointer transition-colors select-none ${
                    isSelected ? 'bg-rust-soft/60' : 'hover:bg-rust-soft/30'
                  }`}
                >
                  <td className="px-4 py-3 font-mono text-muted text-xs whitespace-nowrap">{date}</td>
                  <td className="px-4 py-3 font-fraunces italic text-ink text-base max-w-[180px] truncate">{a.name ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-mono">
                    <span className="text-rust font-bold">
                      {a.distance_km != null ? a.distance_km.toFixed(2) : '—'}
                    </span>
                    {a.distance_km != null && (
                      <span className="text-muted text-xs ml-0.5">km</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-ink text-xs">{a.elapsed_time ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-mono text-ink text-xs">{a.avg_pace ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-mono text-muted text-xs">
                    {a.avg_hr != null ? a.avg_hr : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-muted text-xs">
                    {a.ascent != null ? `${Math.round(a.ascent)}m` : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="px-4 py-3 border-t border-line flex items-center justify-between bg-rust-soft/10">
          <button
            onClick={() => setOffset(o => Math.max(0, o - LIMIT))}
            disabled={offset === 0}
            className="font-mono text-xs text-muted hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ← Ant.
          </button>
          <span className="font-mono text-muted text-xs">Pág. {currentPage} / {totalPages}</span>
          <button
            onClick={() => setOffset(o => o + LIMIT)}
            disabled={!data || offset + LIMIT >= data.total}
            className="font-mono text-xs text-muted hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Sig. →
          </button>
        </div>
      )}
    </div>
  )
}
