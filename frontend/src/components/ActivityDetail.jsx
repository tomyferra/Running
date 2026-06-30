import { useEffect, useState } from 'react'
import LapChart from './LapChart.jsx'

function Stat({ label, value, unit, highlight }) {
  return (
    <div className="bg-slate-800/50 rounded-lg p-3">
      <p className="text-slate-500 text-xs uppercase tracking-wider mb-1.5">{label}</p>
      <p className={`text-base font-semibold leading-none ${highlight ? 'text-emerald-400' : 'text-white'}`}>
        {value ?? '—'}
        {value != null && unit && (
          <span className="text-slate-500 text-xs font-normal ml-1">{unit}</span>
        )}
      </p>
    </div>
  )
}

export default function ActivityDetail({ activityId, onClose }) {
  const [activity, setActivity] = useState(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    setLoading(true)
    setActivity(null)
    fetch(`/api/v1/activities/${activityId}`)
      .then(r => r.json())
      .then(d => { setActivity(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [activityId])

  const date = activity?.start_time
    ? new Date(activity.start_time).toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : null

  const rm = activity?.run_metrics

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800 flex items-start justify-between shrink-0">
        <div className="min-w-0 flex-1 mr-3">
          {loading ? (
            <>
              <div className="h-5 w-48 bg-slate-800 rounded animate-pulse mb-2" />
              <div className="h-3 w-36 bg-slate-800/60 rounded animate-pulse" />
            </>
          ) : (
            <>
              <h2 className="text-white font-semibold truncate">{activity?.name ?? 'Activity'}</h2>
              {date && <p className="text-slate-400 text-sm mt-0.5">{date}</p>}
            </>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="text-slate-600 hover:text-white transition-colors shrink-0 mt-0.5"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Scrollable body */}
      <div className="p-5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
        {loading && (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-16 bg-slate-800 rounded-lg animate-pulse" />
            ))}
          </div>
        )}

        {!loading && activity && (
          <>
            {/* Core metrics */}
            <div className="grid grid-cols-3 gap-2 mb-5">
              <Stat label="Distance"        value={activity.distance_km?.toFixed(2)}       unit="km"  highlight />
              <Stat label="Duration"        value={activity.elapsed_time} />
              <Stat label="Avg Pace"        value={activity.avg_pace}                                 highlight />
              <Stat label="Avg HR"          value={activity.avg_hr}                          unit="bpm" />
              <Stat label="Max HR"          value={activity.max_hr}                          unit="bpm" />
              <Stat label="Calories"        value={activity.calories}                        unit="kcal" />
              <Stat label="Ascent"          value={activity.ascent != null ? Math.round(activity.ascent) : null} unit="m" />
              <Stat label="Cadence"         value={activity.avg_cadence}                     unit="spm" />
              <Stat label="Training Effect" value={activity.training_effect?.toFixed(1)} />
            </div>

            {/* Run metrics */}
            {rm && Object.values(rm).some(v => v != null) && (
              <>
                <h3 className="text-slate-500 text-xs uppercase tracking-wider mb-2">Run Metrics</h3>
                <div className="grid grid-cols-3 gap-2 mb-5">
                  {rm.vo2max                    != null && <Stat label="VO₂ Max"       value={rm.vo2max.toFixed(0)}                       highlight />}
                  {rm.avg_stride_length         != null && <Stat label="Stride"        value={rm.avg_stride_length.toFixed(2)}         unit="m" />}
                  {rm.avg_running_cadence       != null && <Stat label="Cadence"       value={rm.avg_running_cadence.toFixed(0)}       unit="spm" />}
                  {rm.avg_vertical_oscillation  != null && <Stat label="Vert. Osc."   value={rm.avg_vertical_oscillation.toFixed(1)}  unit="cm" />}
                  {rm.avg_ground_contact_time   != null && <Stat label="GCT"           value={rm.avg_ground_contact_time.toFixed(0)}  unit="ms" />}
                  {rm.avg_vertical_ratio        != null && <Stat label="Vert. Ratio"  value={rm.avg_vertical_ratio.toFixed(1)}        unit="%" />}
                </div>
              </>
            )}

            {/* Lap chart */}
            {activity.laps?.length > 1 && (
              <LapChart laps={activity.laps} />
            )}

            {/* Laps table */}
            {activity.laps?.length > 0 && (
              <>
                <h3 className="text-slate-500 text-xs uppercase tracking-wider mb-2">
                  Laps{' '}
                  <span className="text-slate-700 normal-case">({activity.laps.length})</span>
                </h3>
                <div className="overflow-x-auto rounded-lg border border-slate-800">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-600 border-b border-slate-800 uppercase tracking-wider">
                        <th className="text-left px-3 py-2 font-medium">#</th>
                        <th className="text-right px-3 py-2 font-medium">km</th>
                        <th className="text-right px-3 py-2 font-medium">Time</th>
                        <th className="text-right px-3 py-2 font-medium">Pace</th>
                        <th className="text-right px-3 py-2 font-medium">HR</th>
                        <th className="text-right px-3 py-2 font-medium">↑</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activity.laps.map(lap => (
                        <tr
                          key={lap.lap_index}
                          className="border-b border-slate-800/40 hover:bg-slate-800/30 transition-colors"
                        >
                          <td className="px-3 py-2 text-slate-500">{lap.lap_index + 1}</td>
                          <td className="px-3 py-2 text-right font-mono text-emerald-400">
                            {lap.distance_km?.toFixed(2) ?? '—'}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-slate-300">{lap.elapsed_time ?? '—'}</td>
                          <td className="px-3 py-2 text-right font-mono text-slate-300">{lap.avg_pace ?? '—'}</td>
                          <td className="px-3 py-2 text-right text-slate-400">{lap.avg_hr ?? '—'}</td>
                          <td className="px-3 py-2 text-right text-slate-500">
                            {lap.ascent_m != null ? `${Math.round(lap.ascent_m)}m` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
