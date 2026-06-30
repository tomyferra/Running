import { useEffect, useState } from 'react'
import LapChart from './LapChart.jsx'
import { Tooltip } from './Tooltip.jsx'

function Stat({ label, tooltip, value, unit, highlight }) {
  return (
    <div className="bg-rust-soft/30 rounded-lg p-3">
      <p className="font-mono text-muted text-[10px] uppercase tracking-wider mb-1.5">
        {tooltip ? <Tooltip text={tooltip}>{label}</Tooltip> : label}
      </p>
      <p className={`font-mono text-sm font-bold leading-none ${highlight ? 'text-rust' : 'text-ink'}`}>
        {value ?? '—'}
        {value != null && unit && (
          <span className="text-muted text-xs font-normal ml-1">{unit}</span>
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
    ? new Date(activity.start_time).toLocaleDateString('es-AR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : null

  const rm = activity?.run_metrics

  return (
    <div className="border border-line rounded-xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b-2 border-ink flex items-start justify-between shrink-0">
        <div className="min-w-0 flex-1 mr-3">
          {loading ? (
            <>
              <div className="h-5 w-48 bg-rust-soft/60 rounded animate-pulse mb-2" />
              <div className="h-3 w-36 bg-rust-soft/40 rounded animate-pulse" />
            </>
          ) : (
            <>
              <h2 className="font-fraunces italic text-xl text-ink truncate">{activity?.name ?? 'Actividad'}</h2>
              {date && <p className="font-mono text-muted text-xs mt-0.5">{date}</p>}
            </>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="text-muted hover:text-ink transition-colors shrink-0 mt-0.5 font-mono text-lg leading-none"
        >
          ×
        </button>
      </div>

      {/* Body */}
      <div className="p-5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
        {loading && (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-16 bg-rust-soft/40 rounded-lg animate-pulse" />
            ))}
          </div>
        )}

        {!loading && activity && (
          <>
            {/* Core metrics */}
            <div className="grid grid-cols-3 gap-2 mb-5">
              <Stat label="Distancia"       value={activity.distance_km?.toFixed(2)}       unit="km"   highlight />
              <Stat label="Duración"        value={activity.elapsed_time} />
              <Stat label="Ritmo Prom."     value={activity.avg_pace}                                   highlight />
              <Stat
                label="FC Prom."
                tooltip="Frecuencia Cardíaca Promedio — promedio de latidos por minuto durante la actividad."
                value={activity.avg_hr}
                unit="ppm"
              />
              <Stat
                label="FC Máx."
                tooltip="Frecuencia Cardíaca Máxima — el pico de latidos por minuto alcanzado."
                value={activity.max_hr}
                unit="ppm"
              />
              <Stat label="Calorías"        value={activity.calories}                        unit="kcal" />
              <Stat label="Ascenso"         value={activity.ascent != null ? Math.round(activity.ascent) : null} unit="m" />
              <Stat
                label="Cadencia"
                tooltip="Cadencia — cantidad de pasos por minuto (spm). Una cadencia eficiente ronda los 170–180 spm."
                value={activity.avg_cadence}
                unit="spm"
              />
              <Stat
                label="Efecto de Entreno"
                tooltip="Training Effect — escala de 1 a 5 que indica el impacto aeróbico de la sesión según Garmin."
                value={activity.training_effect?.toFixed(1)}
              />
            </div>

            {/* Run metrics */}
            {rm && Object.values(rm).some(v => v != null) && (
              <>
                <div className="flex items-baseline gap-3 mb-2">
                  <h3 className="font-fraunces italic text-lg text-ink">Métricas de Carrera</h3>
                </div>
                <div className="border-b border-ink mb-4" />
                <div className="grid grid-cols-3 gap-2 mb-5">
                  {rm.vo2max != null && (
                    <Stat
                      label="VO₂ Máx."
                      tooltip="VO₂ Máx. — consumo máximo de oxígeno (ml/kg/min). Indicador clave de la capacidad aeróbica."
                      value={rm.vo2max.toFixed(0)}
                      highlight
                    />
                  )}
                  {rm.avg_stride_length != null && (
                    <Stat
                      label="Zancada"
                      tooltip="Longitud media de zancada en metros."
                      value={rm.avg_stride_length.toFixed(2)}
                      unit="m"
                    />
                  )}
                  {rm.avg_running_cadence != null && (
                    <Stat
                      label="Cadencia"
                      tooltip="Cadencia de carrera — pasos por minuto (spm)."
                      value={rm.avg_running_cadence.toFixed(0)}
                      unit="spm"
                    />
                  )}
                  {rm.avg_vertical_oscillation != null && (
                    <Stat
                      label="Oscil. Vertical"
                      tooltip="Oscilación Vertical — cuánto sube y baja el torso en cada zancada (cm)."
                      value={rm.avg_vertical_oscillation.toFixed(1)}
                      unit="cm"
                    />
                  )}
                  {rm.avg_ground_contact_time != null && (
                    <Stat
                      label="TCO"
                      tooltip="TCO — Tiempo de Contacto con el Suelo (ms)."
                      value={rm.avg_ground_contact_time.toFixed(0)}
                      unit="ms"
                    />
                  )}
                  {rm.avg_vertical_ratio != null && (
                    <Stat
                      label="Proporción Vert."
                      tooltip="Proporción Vertical — relación entre oscilación vertical y longitud de zancada (%)."
                      value={rm.avg_vertical_ratio.toFixed(1)}
                      unit="%"
                    />
                  )}
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
                <div className="flex items-baseline gap-3 mt-5 mb-2">
                  <h3 className="font-fraunces italic text-lg text-ink">Vueltas</h3>
                  <span className="font-mono text-xs text-muted">({activity.laps.length})</span>
                </div>
                <div className="border-b border-ink mb-4" />
                <div className="overflow-x-auto rounded-lg border border-line">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-line">
                        <th className="text-left px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted font-normal">#</th>
                        <th className="text-right px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted font-normal">km</th>
                        <th className="text-right px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted font-normal">Tiempo</th>
                        <th className="text-right px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted font-normal">Ritmo</th>
                        <th className="text-right px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted font-normal">FC</th>
                        <th className="text-right px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted font-normal">↑</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activity.laps.map(lap => (
                        <tr
                          key={lap.lap_index}
                          className="border-b border-line/50 hover:bg-rust-soft/30 transition-colors"
                        >
                          <td className="px-3 py-2 font-mono text-muted">{lap.lap_index + 1}</td>
                          <td className="px-3 py-2 text-right font-mono text-rust font-bold">
                            {lap.distance_km?.toFixed(2) ?? '—'}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-ink">{lap.elapsed_time ?? '—'}</td>
                          <td className="px-3 py-2 text-right font-mono text-ink">{lap.avg_pace ?? '—'}</td>
                          <td className="px-3 py-2 text-right font-mono text-muted">{lap.avg_hr ?? '—'}</td>
                          <td className="px-3 py-2 text-right font-mono text-muted">
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
