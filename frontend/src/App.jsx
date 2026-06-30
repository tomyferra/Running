import { useState, useCallback } from 'react'
import StatsPanel from './components/StatsPanel.jsx'
import RunHeatmap from './components/RunHeatmap.jsx'
import OfficialRaces from './components/OfficialRaces.jsx'
import ActivityList from './components/ActivityList.jsx'
import ActivityDetail from './components/ActivityDetail.jsx'
import FatiguePanel from './components/FatiguePanel.jsx'

function SyncIcon({ spinning }) {
  return (
    <svg
      className={`w-4 h-4 ${spinning ? 'animate-spin' : ''}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  )
}

export default function App() {
  const [selectedId, setSelectedId] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState(null)
  const [tab, setTab] = useState('dashboard')

  const handleSync = useCallback(async () => {
    setSyncing(true)
    setSyncMsg(null)
    try {
      const res = await fetch('/api/v1/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: 365 }),
      })
      const data = await res.json()
      setSyncMsg(`${data.activities_synced ?? 0} actividades sincronizadas`)
      setRefreshKey(k => k + 1)
    } catch {
      setSyncMsg('Error al sincronizar')
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncMsg(null), 5000)
    }
  }, [])

  const handleSelect = useCallback(id => {
    setSelectedId(prev => (prev === id ? null : id))
  }, [])

  const year = new Date().getFullYear()

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-paper border-b-2 border-ink px-8 pt-4 pb-4 flex items-end gap-6">
        <div className="flex-1">
          <p className="font-mono text-[11px] tracking-[.12em] uppercase text-rust mb-0.5">
            Cuaderno de campo · Temporada {year}
          </p>
          <h1 className="font-fraunces italic font-semibold text-[42px] text-ink leading-[1]">
            Bitácora de Carrera
          </h1>
        </div>

        {syncMsg && (
          <span className="font-mono text-xs text-muted hidden sm:block">{syncMsg}</span>
        )}

        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 bg-rust hover:bg-rust/80 disabled:opacity-50 disabled:cursor-not-allowed text-paper font-mono text-xs font-bold px-4 py-2 rounded transition-colors"
        >
          <SyncIcon spinning={syncing} />
          {syncing ? 'Sincronizando…' : 'Sincronizar'}
        </button>
      </header>

      {/* Tabs */}
      <div className="px-8 flex gap-6 border-b border-line">
        {[
          { id: 'dashboard', label: 'Panel' },
          { id: 'fatigue',   label: 'Fatiga' },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`font-mono text-xs uppercase tracking-widest py-3 border-b-2 transition-colors -mb-px ${
              tab === id
                ? 'border-rust text-ink font-bold'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && (
        <main className="px-8 py-10">
          {/* Hero: stats left, heatmap right */}
          <div className="flex items-start mb-12">
            <StatsPanel refreshKey={refreshKey} />
            <RunHeatmap refreshKey={refreshKey} />
          </div>

          <OfficialRaces />

          <div className="flex gap-5">
            <div className={selectedId ? 'w-[55%] shrink-0' : 'w-full'}>
              <ActivityList
                selectedId={selectedId}
                onSelect={handleSelect}
                refreshKey={refreshKey}
              />
            </div>

            {selectedId && (
              <div className="flex-1 min-w-0">
                <ActivityDetail
                  activityId={selectedId}
                  onClose={() => setSelectedId(null)}
                />
              </div>
            )}
          </div>
        </main>
      )}

      {tab === 'fatigue' && (
        <main className="px-8 py-10">
          <FatiguePanel refreshKey={refreshKey} />
        </main>
      )}
    </div>
  )
}
