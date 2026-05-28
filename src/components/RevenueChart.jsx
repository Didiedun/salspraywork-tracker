import { useMemo } from 'react'

const MONTH_SHORT = ['Jan','Feb','Mac','Apr','Mei','Jun','Jul','Ogs','Sep','Okt','Nov','Dis']

export function RevenueChart({ jobs }) {
  const months = useMemo(() => {
    const now    = new Date()
    const result = []
    for (let i = 5; i >= 0; i--) {
      const d   = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      result.push({ key, label: MONTH_SHORT[d.getMonth()], revenue: 0, count: 0 })
    }
    jobs.forEach(j => {
      if (!j.paid || !j.total_amount) return
      const d   = new Date(j.created_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const m   = result.find(r => r.key === key)
      if (m) { m.revenue += Number(j.total_amount); m.count++ }
    })
    return result
  }, [jobs])

  const maxRevenue = Math.max(...months.map(m => m.revenue), 1)
  const total = months.reduce((s, m) => s + m.revenue, 0)

  return (
    <div className="bg-surface-card rounded-lg border border-hairline p-5">
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="font-semibold text-ink">Pendapatan Bulanan</p>
          <p className="text-mute text-xs mt-0.5">6 bulan terkini · kerja lunas</p>
        </div>
        <div className="text-right">
          <p className="text-primary font-bold text-xl font-display">
            RM {total.toLocaleString('ms-MY', { minimumFractionDigits: 0 })}
          </p>
          <p className="text-mute text-xs">Jumlah</p>
        </div>
      </div>

      <div className="flex items-end gap-2 h-28">
        {months.map(m => {
          const pct = maxRevenue > 0 ? (m.revenue / maxRevenue) * 100 : 0
          return (
            <div key={m.key} className="flex-1 flex flex-col items-center gap-1">
              <div className="relative w-full flex flex-col justify-end" style={{ height: '80px' }}>
                {m.revenue > 0 && (
                  <p className="text-xs text-primary font-semibold text-center mb-1 leading-none">
                    {m.revenue >= 1000 ? `${(m.revenue / 1000).toFixed(1)}k` : m.revenue}
                  </p>
                )}
                <div
                  className="w-full rounded-t-sm bg-primary/80 transition-all duration-700"
                  style={{
                    height: `${Math.max(pct * 0.6, m.revenue > 0 ? 4 : 1)}px`,
                    minHeight: m.revenue > 0 ? '4px' : '1px',
                    opacity: m.revenue > 0 ? 1 : 0.2,
                  }}
                />
              </div>
              <p className="text-xs text-mute font-medium">{m.label}</p>
              {m.count > 0 && <p className="text-xs text-stone">{m.count}j</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
