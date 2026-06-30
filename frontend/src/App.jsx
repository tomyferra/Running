import { useState, useCallback } from 'react'
import StatsPanel from './components/StatsPanel.jsx'
import RunHeatmap from './components/RunHeatmap.jsx'
import OfficialRaces from './components/OfficialRaces.jsx'
import ActivityList from './components/ActivityList.jsx'
import ActivityDetail from './components/ActivityDetail.jsx'

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
      setSyncMsg(`✓ ${data.activities_synced ?? 0} activities synced`)
      setRefreshKey(k => k + 1)
    } catch {
      setSyncMsg('Sync failed — is the backend running?')
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncMsg(null), 5000)
    }
  }, [])

  const handleSelect = useCallback(id => {
    setSelectedId(prev => (prev === id ? null : id))
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center gap-4">
        <div className="flex items-center gap-2 flex-1">
          <svg className="w-6 h-6 text-emerald-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M13.49 5.48c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-3.6 13.9 1-4.4 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1l-5.2 2.2v4.7h2v-3.4l1.8-.7-1.6 8.1-4.9-1-.4 2 7 1.4z" />
          </svg>
          <span className="font-semibold tracking-tight">Garmin Dashboard</span>
        </div>

        {syncMsg && (
          <span className="text-sm text-slate-400 hidden sm:block">{syncMsg}</span>
        )}

        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <SyncIcon spinning={syncing} />
          {syncing ? 'Syncing…' : 'Sync'}
        </button>
      </header>

      <main className="p-6">
        <StatsPanel refreshKey={refreshKey} />
        <RunHeatmap refreshKey={refreshKey} />
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
    </div>
  )
}
