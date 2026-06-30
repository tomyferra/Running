import { useEffect, useState } from 'react'

function fmt(date) {
  if (!date) return ''
  const [y, m, d] = date.split('-')
  return new Date(y, m - 1, d).toLocaleDateString('es-AR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function parseSeconds(t) {
  if (!t) return 0
  const p = t.split(':').map(Number)
  if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2]
  if (p.length === 2) return p[0] * 60 + p[1]
  return 0
}

function tierColor(pct) {
  if (pct <= 5)  return '#fbbf24'
  if (pct <= 10) return '#22c55e'
  if (pct <= 25) return '#3b82f6'
  if (pct <= 50) return '#94a3b8'
  return               '#64748b'
}

const DIST_TAGS = [10, 15, 21, 25, 30, 42]

function matchesDist(raceDist, tag) {
  return Math.abs(raceDist - tag) <= tag * 0.15
}

// ── sub-components ─────────────────────────────────────────────────────────

function Ring({ label, pct, sublabel, size = 72 }) {
  const r    = size / 2 - 8
  const cx   = size / 2
  const cy   = size / 2
  const circ = 2 * Math.PI * r
  const filled = Math.min(pct, 100) / 100 * circ
  const color  = tierColor(pct <= 100 ? pct : 100 - pct)  // for speed ring pct is already "good"

  return (
    <div className="flex flex-col items-center gap-0.5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e293b" strokeWidth={6} />
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeDasharray={`${filled} ${circ - filled}`}
          strokeLinecap="round"
          style={{ transform: `rotate(-90deg)`, transformOrigin: `${cx}px ${cy}px`, transition: 'stroke-dasharray 0.5s ease' }}
        />
        <text x={cx} y={cy + 4} textAnchor="middle" fill={color} fontSize="11" fontWeight="bold">
          {pct.toFixed(pct < 10 ? 1 : 0)}%
        </text>
      </svg>
      <span className="text-[10px] text-slate-400 font-medium">{label}</span>
      {sublabel && <span className="text-[9px] text-slate-600 leading-none">{sublabel}</span>}
    </div>
  )
}

function OverallRing({ pctFromTop }) {
  return <Ring label="Overall" pct={pctFromTop} sublabel="from top" />
}

function CategoryRing({ rank, total }) {
  const pct = parseFloat(((rank / total) * 100).toFixed(1))
  return <Ring label="Category" pct={pct} sublabel={`#${rank} / ${total}`} />
}

function SpeedRing({ finishTime, winnerTime }) {
  const my     = parseSeconds(finishTime)
  const winner = parseSeconds(winnerTime)
  if (!my || !winner) return null
  const pct = parseFloat(((winner / my) * 100).toFixed(1))
  return <Ring label="Speed" pct={pct} sublabel="of winner" />
}

function StatBox({ label, value, sub, highlight }) {
  return (
    <div className="bg-slate-800/60 rounded-lg p-3 text-center">
      <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">{label}</p>
      <p className={`font-bold text-sm leading-none ${highlight ? 'text-emerald-400' : 'text-white'}`}>{value}</p>
      {sub && <p className="text-slate-600 text-[10px] mt-1 leading-tight">{sub}</p>}
    </div>
  )
}

function FieldBar({ rank, total }) {
  const [hovered, setHovered] = useState(false)
  const pct    = (rank / total) * 100
  const beaten = total - rank

  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div className="flex justify-between text-[10px] text-slate-600 mb-1">
        <span>{(rank - 1).toLocaleString()} ahead</span>
        {hovered
          ? <span className="text-emerald-400 font-semibold">{beaten.toLocaleString()} runners behind you</span>
          : <span>{beaten.toLocaleString()} behind</span>
        }
      </div>
      <div className="relative h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className="absolute left-0 top-0 h-full bg-emerald-500/30 rounded-full" style={{ width: `${pct}%` }} />
        <div className="absolute top-0 h-full w-0.5 bg-emerald-400" style={{ left: `${pct}%`, transform: 'translateX(-50%)' }} />
      </div>
    </div>
  )
}

function CategoryPodium({ rank, ageGroup }) {
  if (rank <= 3) {
    const medals = ['🥇', '🥈', '🥉']
    return (
      <div className="flex items-center gap-1.5">
        <span>{medals[rank - 1]}</span>
        <span className="text-yellow-400 text-xs font-semibold">Category podium!</span>
        <span className="text-slate-600 text-[10px]">{ageGroup}</span>
      </div>
    )
  }
  return (
    <div className="text-[10px] text-slate-600">
      <span className="text-slate-400 font-semibold">{rank - 3}</span> places from category podium
      <span className="text-slate-700 ml-1">· {ageGroup}</span>
    </div>
  )
}

function ErrorCard({ race }) {
  return (
    <div className="bg-slate-900 border border-red-900/50 rounded-xl p-5">
      <div className="flex items-start gap-3">
        <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <div className="min-w-0">
          <p className="text-white font-semibold text-sm">{race.race_name}</p>
          <p className="text-slate-400 text-xs mt-0.5">{fmt(race.race_date)}</p>
          <p className="text-red-400 text-xs mt-2">{race.error}</p>
          <p className="text-slate-600 text-xs mt-1 font-mono">{race.json_filename}</p>
        </div>
      </div>
    </div>
  )
}

function RaceCard({ race, onDelete }) {
  const [confirmDel, setConfirmDel] = useState(false)
  const beaten = race.total_finishers - race.rank_overall

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-white font-bold text-base leading-tight truncate">{race.race_name}</h3>
          <p className="text-slate-400 text-xs mt-0.5">{fmt(race.race_date)}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="bg-slate-800 text-slate-300 text-xs font-semibold rounded-md px-2 py-1">
            {race.distance_km} km
          </span>
          <span className="bg-emerald-700/70 text-emerald-300 text-sm font-mono font-bold rounded-lg px-3 py-1.5">
            {race.finish_time?.replace(/^00:/, '')}
          </span>
        </div>
      </div>

      {/* Bib + pace + gap */}
      <div className="flex items-center gap-3 text-xs">
        <span className="bg-slate-800 text-slate-400 rounded px-2 py-1 font-mono">#{race.bib}</span>
        <span className="text-emerald-400 font-semibold">{race.pace}/km</span>
        <span className="text-slate-700">·</span>
        <span className="text-slate-400">gap to winner: <span className="text-white font-mono">{race.gap_to_winner}</span></span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <StatBox label="General"  value={`#${race.rank_overall}`}  sub={`/ ${race.total_finishers.toLocaleString()}`} highlight />
        <StatBox label="Top"      value={`${race.pct_from_top}%`}  sub="from top" highlight />
        <StatBox label="Category" value={`#${race.rank_category}`} sub={`/ ${race.total_category}`} />
      </div>

      {/* Performance rings */}
      <div className="bg-slate-800/40 rounded-xl p-4 flex flex-col gap-3">
        <div className="flex items-start justify-around">
          <OverallRing pctFromTop={race.pct_from_top} />
          <CategoryRing rank={race.rank_category} total={race.total_category} />
          <SpeedRing finishTime={race.finish_time} winnerTime={race.winner_time} />
        </div>
        <div className="border-t border-slate-700/50 pt-3 flex items-center justify-between">
          <div>
            <p className="text-white text-xl font-bold leading-none">{beaten.toLocaleString()}</p>
            <p className="text-slate-500 text-[10px] mt-0.5">runners you beat</p>
          </div>
          <CategoryPodium rank={race.rank_category} ageGroup={race.age_group} />
        </div>
      </div>

      {/* Field position bar */}
      <FieldBar rank={race.rank_overall} total={race.total_finishers} />

      {/* Winner */}
      <div className="flex items-center gap-2 text-xs text-slate-600 border-t border-slate-800 pt-3">
        <span className="text-yellow-500">🥇</span>
        <span className="truncate">{race.winner_name}</span>
        <span className="font-mono text-slate-500 ml-auto shrink-0">{race.winner_time?.replace(/^00:/, '')}</span>
      </div>

      {/* Delete */}
      <div className="flex justify-end">
        {confirmDel ? (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Delete?</span>
            <button onClick={() => onDelete(race.id)} className="text-red-400 hover:text-red-300 font-medium">Yes</button>
            <button onClick={() => setConfirmDel(false)} className="text-slate-500 hover:text-slate-300">No</button>
          </div>
        ) : (
          <button onClick={() => setConfirmDel(true)} className="text-slate-700 hover:text-slate-500 text-xs transition-colors">
            Delete
          </button>
        )}
      </div>
    </div>
  )
}

// ── main ───────────────────────────────────────────────────────────────────

export default function OfficialRaces() {
  const [races,       setRaces]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [isOpen,      setIsOpen]      = useState(true)
  const [selectedDist, setSelectedDist] = useState(null)

  const load = () => {
    setLoading(true)
    fetch('/api/v1/races')
      .then(r => r.json())
      .then(d => { setRaces(d); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(load, [])

  const handleDelete = async (id) => {
    await fetch(`/api/v1/races/${id}`, { method: 'DELETE' })
    setRaces(prev => prev.filter(r => r.id !== id))
  }

  const validRaces = races.filter(r => !r.error)
  const availableTags = DIST_TAGS.filter(tag => validRaces.some(r => matchesDist(r.distance_km, tag)))

  const filteredRaces = selectedDist
    ? races.filter(r => r.error || matchesDist(r.distance_km, selectedDist))
    : races

  return (
    <div className="mb-5">
      {/* Section header — clickable to collapse */}
      <button
        className="w-full flex items-center justify-between mb-3 group"
        onClick={() => setIsOpen(o => !o)}
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          <h2 className="text-white font-semibold">Official Races</h2>
          {races.length > 0 && (
            <span className="text-slate-600 text-xs">{validRaces.length} race{validRaces.length !== 1 ? 's' : ''}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={e => { e.stopPropagation(); load() }}
            className="text-slate-600 hover:text-slate-400 transition-colors"
            title="Refresh"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <svg
            className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-all"
            style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
            fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isOpen && (
        <>
          {/* Distance filter tags */}
          {availableTags.length > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-slate-600 text-[10px] uppercase tracking-wider">Distance</span>
              {availableTags.map(tag => {
                const active = selectedDist === tag
                return (
                  <button
                    key={tag}
                    onClick={() => setSelectedDist(active ? null : tag)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                      active
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {tag} km
                  </button>
                )
              })}
              {selectedDist && (
                <button
                  onClick={() => setSelectedDist(null)}
                  className="text-slate-600 hover:text-slate-400 text-[10px] ml-1 transition-colors"
                >
                  clear
                </button>
              )}
            </div>
          )}

          {loading && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {[0, 1].map(i => (
                <div key={i} className="h-80 bg-slate-900 border border-slate-800 rounded-xl animate-pulse" />
              ))}
            </div>
          )}

          {!loading && races.length === 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
              <p className="text-slate-500 text-sm mb-1">No races imported yet.</p>
              <p className="text-slate-600 text-xs">
                Drop a results JSON in <code className="bg-slate-800 px-1 rounded">data/garmin/races/</code> and reload.
              </p>
            </div>
          )}

          {!loading && filteredRaces.length === 0 && races.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center">
              <p className="text-slate-500 text-sm">No {selectedDist} km races yet.</p>
            </div>
          )}

          {filteredRaces.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredRaces.map(race =>
                race.error
                  ? <ErrorCard key={race.id} race={race} />
                  : <RaceCard  key={race.id} race={race} onDelete={handleDelete} />
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
