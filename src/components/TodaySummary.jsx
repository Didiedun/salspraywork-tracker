import { useMemo } from 'react'
import { isOverdue, daysIn, OVERDUE_DAYS } from '../constants'

export function TodaySummary({ jobs, onSelectJob }) {
  const today = new Date().toDateString()

  const { newToday, overdueList, readyList } = useMemo(() => {
    const newToday    = jobs.filter(j => !j.archived && new Date(j.created_at).toDateString() === today)
    const overdueList = jobs.filter(j => isOverdue(j))
    const readyList   = jobs.filter(j => !j.archived && j.stage === 'siap')
    return { newToday, overdueList, readyList }
  }, [jobs, today])

  if (newToday.length === 0 && overdueList.length === 0 && readyList.length === 0) return null

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {newToday.length > 0 && (
        <div className="bg-surface-card rounded-md border border-hairline p-4">
          <p className="text-primary font-bold text-2xl font-display">{newToday.length}</p>
          <p className="text-charcoal text-xs font-semibold mt-0.5">Masuk Hari Ini</p>
          <div className="mt-2 space-y-1">
            {newToday.slice(0, 3).map(j => (
              <p key={j.id} className="text-xs text-mute truncate cursor-pointer hover:text-ink transition-colors"
                onClick={() => onSelectJob?.(j)}>{j.plate} — {j.car}</p>
            ))}
          </div>
        </div>
      )}

      {overdueList.length > 0 && (
        <div className="bg-surface-card rounded-md border border-red-200 p-4">
          <p className="text-red-600 font-bold text-2xl font-display">{overdueList.length}</p>
          <p className="text-charcoal text-xs font-semibold mt-0.5">Tertangguh (&gt;{OVERDUE_DAYS} hari)</p>
          <div className="mt-2 space-y-1">
            {overdueList.slice(0, 3).map(j => (
              <p key={j.id} className="text-xs text-mute truncate cursor-pointer hover:text-ink transition-colors"
                onClick={() => onSelectJob?.(j)}>
                {j.plate} — {daysIn(j)}h
              </p>
            ))}
          </div>
        </div>
      )}

      {readyList.length > 0 && (
        <div className="bg-surface-card rounded-md border border-emerald-200 p-4">
          <p className="text-badge-success font-bold text-2xl font-display">{readyList.length}</p>
          <p className="text-charcoal text-xs font-semibold mt-0.5">Siap — Tunggu Ambil</p>
          <div className="mt-2 space-y-1">
            {readyList.slice(0, 3).map(j => (
              <p key={j.id} className="text-xs text-mute truncate cursor-pointer hover:text-ink transition-colors"
                onClick={() => onSelectJob?.(j)}>{j.plate} — {j.owner}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
