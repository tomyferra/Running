import { useEffect, useState } from 'react'

function fmt(date) {
  if (!date) return ''
  const [y, m, d] = date.split('-')
  return new Date(y, m - 1, d).toLocaleDateString('es-AR', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function parseSeconds(t) {
  if (!t) return 0
  const p = t.split(':').map(Number)
  if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2]
  if (p.length === 2) return p[0] * 60 + p[1]
  return 0
}

const DIST_TAGS = [10, 15, 21, 25, 30, 42, 70]

function matchesDist(raceDist, tag) {
  return Math.abs(raceDist - tag) <= tag * 0.15
}

// ── Bar indicator ──────────────────────────────────────────────────────────

function BarItem({ label, fill }) {
  const pct = Math.min(100, Math.max(0, fill))
  return (
    <div className="flex-1">
      <p className="font-mono text-[9px] uppercase tracking-[.06em] text-muted mb-1.5 leading-none">{label}</p>
      <div className="h-[5px] bg-rust-soft rounded-sm overflow-hidden">
        <div className="h-full bg-rust rounded-sm" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ── Error row ──────────────────────────────────────────────────────────────

function ErrorRow({ race }) {
  return (
    <div className="border-t border-line py-5 flex items-center gap-3">
      <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
      <div>
        <p className="font-fraunces italic text-ink">{race.race_name}</p>
        <p className="font-mono text-red-600 text-xs mt-0.5">{race.error}</p>
      </div>
    </div>
  )
}

// ── Race row ───────────────────────────────────────────────────────────────

function RaceRow({ race }) {
  const [confirmDel, setConfirmDel] = useState(false)

  const generalFill  = 100 - race.pct_from_top
  const categoryFill = (1 - race.rank_category / race.total_category) * 100
  // Infer total for the runner's sex from rank_sex vs the two totals
  const totalSex = race.rank_sex <= (race.total_males ?? 0)
    ? (race.total_males ?? 0)
    : (race.total_females ?? 0)
  const sexFill = totalSex ? (1 - race.rank_sex / totalSex) * 100 : 0

  return (
    <div
      className="border-t border-line py-6 grid items-center gap-7 group"
      style={{ gridTemplateColumns: '160px 1fr 200px' }}
    >
      {/* Left: date + distance */}
      <div>
        <p className="font-mono text-[11px] text-muted">{fmt(race.race_date)}</p>
        <b className="font-fraunces font-semibold text-xl text-ink mt-1 block">{race.distance_km} km</b>
      </div>

      {/* Middle: name + meta + bars */}
      <div>
        <p className="font-fraunces italic text-[22px] text-ink leading-tight mb-1">{race.race_name}</p>
        <div className="flex gap-3 font-mono text-[11px] text-muted mb-3">
          <span>#{race.bib}</span>
          <span>{race.pace}/km</span>
          <span>{race.gap_to_winner} vs líder</span>
        </div>
        <div className="flex gap-4">
          <BarItem label={`General top ${race.pct_from_top}%`}                            fill={generalFill} />
          <BarItem label={`Categoría #${race.rank_category}/${race.total_category}`}  fill={categoryFill} />
          <BarItem label={`Género #${race.rank_sex}/${totalSex}`}                     fill={sexFill} />
        </div>
      </div>

      {/* Right: time + placement */}
      <div className="text-right relative">
        <p className="font-fraunces font-semibold text-[26px] text-ink leading-none">
          {race.finish_time?.replace(/^00:/, '')}
        </p>
        <p className="font-mono text-[11px] text-leaf font-bold mt-1">
          #{race.rank_overall} / {race.total_finishers.toLocaleString()}
        </p>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function OfficialRaces() {
  const [races,        setRaces]        = useState([])
  const [loading,      setLoading]      = useState(true)
  const [isOpen,       setIsOpen]       = useState(true)
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

  const validRaces    = races.filter(r => !r.error)
  const availableTags = DIST_TAGS.filter(tag => validRaces.some(r => matchesDist(r.distance_km, tag)))
  const distLabel     = availableTags.map(t => `${t}K`).join(' / ')

  const filteredRaces = selectedDist
    ? races.filter(r => r.error || matchesDist(r.distance_km, selectedDist))
    : races

  return (
    <div className="mb-12">
      {/* Section title — matches design.html .section-title */}
      <div className="flex items-baseline gap-3 mb-[18px]">
        <button
          onClick={() => setIsOpen(o => !o)}
          className="font-fraunces italic text-[24px] text-ink hover:text-rust transition-colors"
        >
          Carreras oficiales
        </button>
        {races.length > 0 && (
          <span className="font-mono text-xs text-muted">
            {validRaces.length} registrada{validRaces.length !== 1 ? 's' : ''}
          </span>
        )}
        <div className="ml-auto flex items-center gap-3">
          <button onClick={load} className="font-mono text-muted/50 hover:text-muted text-xs transition-colors" title="Actualizar">↺</button>
          <button onClick={() => setIsOpen(o => !o)} className="font-mono text-muted/50 hover:text-muted text-xs transition-colors">{isOpen ? '↑' : '↓'}</button>
        </div>
      </div>
      {/* Rule — 1px line color matching design.html */}
      <div className="h-px bg-line mb-7" />

      {isOpen && (
        <>
          {/* Distance filter */}
          {availableTags.length > 1 && (
            <div className="flex items-center gap-2 mb-5">
              <span className="font-mono text-muted text-[10px] uppercase tracking-widest">Distancia</span>
              {availableTags.map(tag => {
                const active = selectedDist === tag
                return (
                  <button
                    key={tag}
                    onClick={() => setSelectedDist(active ? null : tag)}
                    className={`px-3 py-1 font-mono text-xs font-bold rounded transition-all ${
                      active
                        ? 'bg-rust text-paper'
                        : 'border border-line text-muted hover:border-ink hover:text-ink'
                    }`}
                  >
                    {tag} km
                  </button>
                )
              })}
              {selectedDist && (
                <button onClick={() => setSelectedDist(null)} className="font-mono text-muted hover:text-ink text-[10px] ml-1 transition-colors">
                  limpiar
                </button>
              )}
            </div>
          )}

          {loading && (
            <div className="space-y-4">
              {[0, 1].map(i => (
                <div key={i} className="h-28 border-t border-line animate-pulse bg-rust-soft/10" />
              ))}
            </div>
          )}

          {!loading && races.length === 0 && (
            <div className="py-8 text-center">
              <p className="font-fraunces italic text-ink text-lg mb-1">Sin carreras importadas.</p>
              <p className="font-mono text-muted text-xs">
                Colocá un JSON de resultados en{' '}
                <code className="bg-rust-soft font-mono px-1 rounded">data/garmin/races/</code>{' '}
                y recargá.
              </p>
            </div>
          )}

          {/* Race rows — horizontal layout like design.html */}
          {filteredRaces.length > 0 && (
            <div className="border-b border-line">
              {filteredRaces.map(race =>
                race.error
                  ? <ErrorRow key={race.id} race={race} />
                  : <RaceRow  key={race.id} race={race}/>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
