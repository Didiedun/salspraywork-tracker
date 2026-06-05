import { SPRAY_STAGES } from '../constants'

export function StageBar({ current, compact = false, stages = SPRAY_STAGES }) {
  const idx = stages.findIndex(s => s.value === current)
  const safeIdx = idx === -1 ? 0 : idx

  if (compact) {
    return (
      <div className="flex items-center gap-0.5">
        {stages.map((s, i) => (
          <div key={s.value} className="flex items-center gap-0.5">
            <div className={`w-2 h-2 rounded-full transition-colors ${
              i < safeIdx  ? 'bg-primary' :
              i === safeIdx ? 'bg-primary/50' :
              'bg-stone'
            }`} />
            {i < stages.length - 1 && (
              <div className={`w-3 h-0.5 rounded-full ${i < safeIdx ? 'bg-primary' : 'bg-stone/50'}`} />
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="flex items-start">
        {stages.map((s, i) => (
          <div key={s.value} className="flex-1 flex flex-col items-center relative">
            {i > 0 && (
              <div className={`absolute top-3.5 right-1/2 w-full h-0.5 -translate-y-1/2 transition-colors ${
                i <= safeIdx ? 'bg-primary' : 'bg-stone/40'
              }`} />
            )}
            <div className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all ${
              i < safeIdx  ? 'bg-primary border-primary text-white' :
              i === safeIdx ? 'bg-white border-primary text-primary' :
              'bg-white border-stone/50 text-stone'
            }`}>
              {i < safeIdx ? '✓' : i + 1}
            </div>
            <p className={`text-xs mt-1.5 text-center leading-tight ${
              i === safeIdx ? 'text-primary font-semibold' :
              i < safeIdx   ? 'text-charcoal font-medium' :
              'text-stone'
            }`}>{s.short}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 h-1 bg-stone/30 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${(safeIdx / Math.max(stages.length - 1, 1)) * 100}%` }}
        />
      </div>
    </div>
  )
}
