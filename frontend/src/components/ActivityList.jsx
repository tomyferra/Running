import { useEffect, useState } from 'react'

const LIMIT = 20

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-800/50">
      {[100, 160, 70, 70, 80, 55, 50].map((w, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-slate-800 rounded animate-pulse" style={{ width: w }} />
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
    if (filters.start_date)       params.set('start_date', filters.start_date)
    if (filters.end_date)         params.set('end_date', filters.end_date)
    if (filters.min_distance_km !== '') params.set('min_distance_km', filters.min_distance_km)

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
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      {/* Filter bar */}
      <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center gap-3">
        <span className="text-slate-500 text-xs font-medium uppercase tracking-wider">Filter</span>
        <input
          type="date"
          name="start_date"
          value={filters.start_date}
          onChange={handleFilter}
          className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <span className="text-slate-600 text-sm">→</span>
        <input
          type="date"
          name="end_date"
          value={filters.end_date}
          onChange={handleFilter}
          className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <input
          type="number"
          name="min_distance_km"
          value={filters.min_distance_km}
          onChange={handleFilter}
          placeholder="Min km"
          min="0"
          step="0.5"
          className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-1.5 w-24 focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder-slate-600"
        />
        {data != null && (
          <span className="ml-auto text-slate-500 text-sm">{data.total} runs</span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-slate-800">
              <th className="text-left px-4 py-3 font-medium">Date</th>
              <th className="text-left px-4 py-3 font-medium">Name</th>
              <th className="text-right px-4 py-3 font-medium">Dist</th>
              <th className="text-right px-4 py-3 font-medium">Time</th>
              <th className="text-right px-4 py-3 font-medium">Pace</th>
              <th className="text-right px-4 py-3 font-medium">HR</th>
              <th className="text-right px-4 py-3 font-medium">↑</th>
            </tr>
          </thead>
          <tbody>
            {loading && Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}

            {!loading && data?.items?.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center">
                  <p className="text-slate-500 mb-1">No activities found.</p>
                  <p className="text-slate-600 text-xs">
                    Hit <span className="text-emerald-400 font-medium">Sync</span> to pull from Garmin Connect.
                  </p>
                </td>
              </tr>
            )}

            {!loading && data?.items?.map(a => {
              const date = a.start_time
                ? new Date(a.start_time).toLocaleDateString('en-GB', {
                    day: '2-digit', month: 'short', year: 'numeric',
                  })
                : '—'
              const isSelected = a.activity_id === selectedId

              return (
                <tr
                  key={a.activity_id}
                  onClick={() => onSelect(a.activity_id)}
                  className={`border-b border-slate-800/40 cursor-pointer transition-colors select-none ${
                    isSelected ? 'bg-emerald-950/40' : 'hover:bg-slate-800/40'
                  }`}
                >
                  <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{date}</td>
                  <td className="px-4 py-3 text-white font-medium max-w-[180px] truncate">{a.name ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-mono">
                    <span className="text-emerald-400 font-medium">
                      {a.distance_km != null ? a.distance_km.toFixed(2) : '—'}
                    </span>
                    {a.distance_km != null && (
                      <span className="text-slate-600 text-xs ml-0.5">km</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-300">{a.elapsed_time ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-300">{a.avg_pace ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-slate-400">
                    {a.avg_hr != null ? a.avg_hr : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-500">
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
        <div className="px-4 py-3 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={() => setOffset(o => Math.max(0, o - LIMIT))}
            disabled={offset === 0}
            className="text-sm text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ← Prev
          </button>
          <span className="text-slate-600 text-xs">Page {currentPage} / {totalPages}</span>
          <button
            onClick={() => setOffset(o => o + LIMIT)}
            disabled={!data || offset + LIMIT >= data.total}
            className="text-sm text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
