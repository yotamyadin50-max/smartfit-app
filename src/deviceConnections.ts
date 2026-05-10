import { readJson, removeJson, writeJson } from './lib/storage'

export type ConnectedWatch = {
  avgHeartRate?: number
  connected: boolean
  currentHeartRate?: number
  lastSync?: string
  provider: 'manual' | 'watch'
}

export type ConnectedScale = {
  connected: boolean
  lastSync?: string
  provider: 'manual' | 'scale'
}

export type WeightHistoryEntry = {
  date: string
  weight: number
}

const WATCH_KEY = 'smartfit_connected_watch'
const SCALE_KEY = 'smartfit_connected_scale'
const WEIGHT_HISTORY_KEY = 'smartfit_weight_history'
const MAX_WEIGHT_HISTORY = 80

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object')
}

function isConnectedWatch(value: unknown): value is ConnectedWatch {
  return (
    isObject(value) &&
    typeof value.connected === 'boolean' &&
    (value.provider === 'manual' || value.provider === 'watch') &&
    (value.currentHeartRate === undefined || typeof value.currentHeartRate === 'number') &&
    (value.avgHeartRate === undefined || typeof value.avgHeartRate === 'number')
  )
}

function isConnectedScale(value: unknown): value is ConnectedScale {
  return (
    isObject(value) &&
    typeof value.connected === 'boolean' &&
    (value.provider === 'manual' || value.provider === 'scale')
  )
}

function isWeightHistoryEntry(value: unknown): value is WeightHistoryEntry {
  return (
    isObject(value) &&
    typeof value.date === 'string' &&
    typeof value.weight === 'number' &&
    Number.isFinite(value.weight) &&
    value.weight >= 25 &&
    value.weight <= 250
  )
}

function isWeightHistory(value: unknown): value is WeightHistoryEntry[] {
  return Array.isArray(value) && value.every(isWeightHistoryEntry)
}

export function getConnectedWatch(): ConnectedWatch {
  return readJson<ConnectedWatch>(
    WATCH_KEY,
    { connected: false, provider: 'manual' },
    isConnectedWatch,
  )
}

export function saveConnectedWatch(data: Partial<ConnectedWatch>) {
  const next: ConnectedWatch = {
    connected: Boolean(data.connected),
    lastSync: data.lastSync ?? new Date().toISOString(),
    provider: data.provider ?? 'watch',
    ...(typeof data.currentHeartRate === 'number' ? { currentHeartRate: data.currentHeartRate } : {}),
    ...(typeof data.avgHeartRate === 'number' ? { avgHeartRate: data.avgHeartRate } : {}),
  }
  writeJson(WATCH_KEY, next)
  return next
}

export function disconnectWatch() {
  removeJson(WATCH_KEY)
}

export function getHeartRateSummary(language: 'en' | 'he' = 'he') {
  const watch = getConnectedWatch()
  if (!watch.connected) {
    return {
      connected: false,
      text: language === 'he'
        ? 'דופק לא זמין — חבר שעון חכם כדי לראות נתוני דופק.'
        : 'Heart rate unavailable — connect a smart watch to see heart-rate data.',
    }
  }

  const current = typeof watch.currentHeartRate === 'number'
    ? `${Math.round(watch.currentHeartRate)} bpm`
    : null
  const average = typeof watch.avgHeartRate === 'number'
    ? `${Math.round(watch.avgHeartRate)} bpm ממוצע`
    : null

  return {
    connected: true,
    text: current ?? average ?? (
      language === 'he'
        ? 'שעון מחובר, אבל אין כרגע נתוני דופק זמינים.'
        : 'Watch connected, but no heart-rate data is available right now.'
    ),
  }
}

export function getConnectedScale(): ConnectedScale {
  return readJson<ConnectedScale>(
    SCALE_KEY,
    { connected: false, provider: 'manual' },
    isConnectedScale,
  )
}

export function saveConnectedScale(data: Partial<ConnectedScale>) {
  const next: ConnectedScale = {
    connected: Boolean(data.connected),
    lastSync: data.lastSync ?? new Date().toISOString(),
    provider: data.provider ?? 'scale',
  }
  writeJson(SCALE_KEY, next)
  return next
}

export function disconnectScale() {
  removeJson(SCALE_KEY)
}

export function getWeightHistory() {
  return readJson<WeightHistoryEntry[]>(WEIGHT_HISTORY_KEY, [], isWeightHistory)
}

export function saveManualWeight(weight: number) {
  if (!Number.isFinite(weight) || weight < 25 || weight > 250) return null

  const entry: WeightHistoryEntry = {
    date: new Date().toISOString(),
    weight: Math.round(weight * 10) / 10,
  }
  writeJson(WEIGHT_HISTORY_KEY, [entry, ...getWeightHistory()].slice(0, MAX_WEIGHT_HISTORY))
  saveConnectedScale({ connected: false, provider: 'manual' })
  return entry
}

export function getLatestWeight(defaultWeight?: number) {
  const latest = getWeightHistory()[0]?.weight
  return typeof latest === 'number' ? latest : defaultWeight
}
