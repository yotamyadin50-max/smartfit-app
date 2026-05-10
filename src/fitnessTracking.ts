export type CardioActivityType = 'walk' | 'run' | 'bike'

export type CardioEstimateInput = {
  activityType: CardioActivityType
  distanceKm: number
  durationMinutes: number
  weightKg?: number
}

const MET_BY_ACTIVITY: Record<CardioActivityType, number> = {
  bike: 6.8,
  run: 8.3,
  walk: 3.5,
}

export function getCardioActivityType(label: string): CardioActivityType {
  const lower = label.toLowerCase()
  if (/(bike|cycle|אופניים)/i.test(lower)) return 'bike'
  if (/(run|running|ריצה)/i.test(lower)) return 'run'
  return 'walk'
}

export function estimateCardioCalories(input: CardioEstimateInput) {
  const weightKg = Number.isFinite(input.weightKg) ? Number(input.weightKg) : 70
  const durationHours = Math.max(0, input.durationMinutes) / 60
  const metEstimate = MET_BY_ACTIVITY[input.activityType] * weightKg * durationHours
  const distanceEstimate = input.activityType === 'bike'
    ? input.distanceKm * weightKg * 0.32
    : input.distanceKm * weightKg * (input.activityType === 'run' ? 1 : 0.55)

  if (input.distanceKm > 0 && input.durationMinutes > 0) {
    return Math.max(0, Math.round((metEstimate + distanceEstimate) / 2))
  }

  return Math.max(0, Math.round(metEstimate))
}

export function formatPace(durationMinutes: number, distanceKm: number, language: 'en' | 'he' = 'he') {
  const unit = language === 'he' ? 'ק״מ' : 'km'
  if (!Number.isFinite(distanceKm) || distanceKm <= 0 || !Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return `--:-- / ${unit}`
  }

  const pace = durationMinutes / distanceKm
  const minutes = Math.floor(pace)
  const seconds = Math.round((pace - minutes) * 60).toString().padStart(2, '0')
  return `${minutes}:${seconds} / ${unit}`
}
