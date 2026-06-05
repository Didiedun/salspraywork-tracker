import { useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { SPRAY_STAGES, OVERDUE_DAYS } from '../constants'

export function useStages() {
  const { workshop } = useApp()

  const stages = useMemo(() => {
    const ws = workshop?.stages
    return Array.isArray(ws) && ws.length > 0 ? ws : SPRAY_STAGES
  }, [workshop?.stages])

  const stageMap = useMemo(
    () => Object.fromEntries(stages.map((s, i) => [s.value, i])),
    [stages]
  )

  const lastValue = stages[stages.length - 1]?.value

  const nextStage = (current) => {
    const i = stageMap[current] ?? 0
    return stages[Math.min(i + 1, stages.length - 1)].value
  }

  const prevStage = (current) => {
    const i = stageMap[current] ?? 0
    return stages[Math.max(i - 1, 0)].value
  }

  const labelOf = (value) => stages.find(s => s.value === value)?.label ?? value

  const isComplete = (job) => job.stage === lastValue

  const isOverdue = (job) => {
    if (job.archived || job.stage === lastValue) return false
    const from = new Date(job.date_in || job.created_at)
    const days = Math.floor((new Date() - from) / 86400000)
    return days >= OVERDUE_DAYS
  }

  return { stages, stageMap, lastValue, nextStage, prevStage, labelOf, isComplete, isOverdue }
}
