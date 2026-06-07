import { readJson, removeJson, writeJson } from './lib/storage'
import { clearAppAccess, saveAppAccess } from './lib/appAccess'

export type ConnectedWatch = {
  avgHeartRate?: number
  autoReconnect?: boolean
  connected: boolean
  currentHeartRate?: number
  deviceId?: string
  deviceName?: string
  lastSeen?: string
  lastSync?: string
  provider: 'manual' | 'watch'
  remembered?: boolean
  sampleCount?: number
}

export type ConnectedScale = {
  connected: boolean
  deviceName?: string
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
    (value.autoReconnect === undefined || typeof value.autoReconnect === 'boolean') &&
    (value.deviceId === undefined || typeof value.deviceId === 'string') &&
    (value.deviceName === undefined || typeof value.deviceName === 'string') &&
    (value.lastSeen === undefined || typeof value.lastSeen === 'string') &&
    (value.currentHeartRate === undefined || typeof value.currentHeartRate === 'number') &&
    (value.avgHeartRate === undefined || typeof value.avgHeartRate === 'number') &&
    (value.remembered === undefined || typeof value.remembered === 'boolean') &&
    (value.sampleCount === undefined || typeof value.sampleCount === 'number')
  )
}

function isConnectedScale(value: unknown): value is ConnectedScale {
  return (
    isObject(value) &&
    typeof value.connected === 'boolean' &&
    (value.deviceName === undefined || typeof value.deviceName === 'string') &&
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
  const current = getConnectedWatch()
  const connected = data.connected ?? current.connected
  const deviceName = data.deviceName ?? current.deviceName
  const currentHeartRate = connected ? data.currentHeartRate ?? current.currentHeartRate : undefined
  const avgHeartRate = data.avgHeartRate ?? current.avgHeartRate
  const remembered = data.remembered ?? current.remembered ?? Boolean(deviceName)
  const autoReconnect = data.autoReconnect ?? current.autoReconnect ?? false
  const next: ConnectedWatch = {
    autoReconnect,
    connected,
    deviceName,
    lastSync: data.lastSync ?? new Date().toISOString(),
    provider: data.provider ?? current.provider ?? 'watch',
    remembered,
    sampleCount: data.sampleCount ?? current.sampleCount,
    ...(data.deviceId ?? current.deviceId ? { deviceId: data.deviceId ?? current.deviceId } : {}),
    ...(data.lastSeen ?? current.lastSeen ? { lastSeen: data.lastSeen ?? current.lastSeen } : {}),
    ...(typeof currentHeartRate === 'number' ? { currentHeartRate } : {}),
    ...(typeof avgHeartRate === 'number' ? { avgHeartRate } : {}),
  }
  writeJson(WATCH_KEY, next)
  if (next.remembered || next.connected || next.deviceName) {
    saveAppAccess('smartWatch', {
      status: next.connected || next.remembered ? 'granted' : 'disabled',
      source: 'device',
      deviceId: next.deviceId,
      deviceName: next.deviceName,
      remember: next.remembered ?? Boolean(next.deviceName),
      note: next.connected ? 'connected-watch' : 'remembered-watch',
    })
    saveAppAccess('bluetooth', {
      status: next.connected || next.remembered ? 'granted' : 'unknown',
      source: 'device',
      deviceId: next.deviceId,
      deviceName: next.deviceName,
      remember: next.autoReconnect ?? next.remembered ?? false,
      note: next.connected ? 'watch-connected' : 'watch-remembered',
    })
  }
  return next
}

export function recordHeartRateSample(bpm: number, deviceName?: string) {
  if (!Number.isFinite(bpm) || bpm <= 0 || bpm > 240) return getConnectedWatch()

  const current = getConnectedWatch()
  const sampleCount = Math.min(9999, (current.sampleCount ?? 0) + 1)
  const previousAverage = current.avgHeartRate ?? bpm
  const avgHeartRate = ((previousAverage * (sampleCount - 1)) + bpm) / sampleCount

  return saveConnectedWatch({
    avgHeartRate: Math.round(avgHeartRate),
    connected: true,
    currentHeartRate: Math.round(bpm),
    deviceName: deviceName ?? current.deviceName,
    autoReconnect: current.autoReconnect ?? true,
    remembered: true,
    provider: 'watch',
    lastSeen: new Date().toISOString(),
    sampleCount,
  })
}

export function markWatchDisconnected() {
  const current = getConnectedWatch()
  return saveConnectedWatch({
    autoReconnect: current.autoReconnect ?? Boolean(current.deviceName),
    connected: false,
    deviceId: current.deviceId,
    deviceName: current.deviceName,
    lastSeen: current.lastSeen,
    provider: current.provider === 'manual' ? 'watch' : current.provider,
    remembered: current.remembered ?? Boolean(current.deviceName),
    sampleCount: current.sampleCount,
  })
}

export function forgetConnectedWatch() {
  removeJson(WATCH_KEY)
  clearAppAccess('smartWatch')
  clearAppAccess('bluetooth')
}

export function disconnectWatch() {
  forgetConnectedWatch()
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
    ? language === 'he'
      ? `${Math.round(watch.avgHeartRate)} bpm ממוצע`
      : `${Math.round(watch.avgHeartRate)} bpm average`
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
  const current = getConnectedScale()
  const next: ConnectedScale = {
    connected: data.connected ?? current.connected,
    deviceName: data.deviceName ?? current.deviceName,
    lastSync: data.lastSync ?? new Date().toISOString(),
    provider: data.provider ?? current.provider ?? 'scale',
  }
  writeJson(SCALE_KEY, next)
  if (next.connected || next.deviceName) {
    saveAppAccess('smartScale', {
      status: next.connected ? 'granted' : 'disabled',
      source: next.provider === 'manual' ? 'manual' : 'device',
      deviceName: next.deviceName,
      remember: next.connected,
      note: next.connected ? 'scale-connected' : 'manual-weight-sync',
    })
  }
  return next
}

export function disconnectScale() {
  removeJson(SCALE_KEY)
  clearAppAccess('smartScale')
}

export function getWeightHistory() {
  return readJson<WeightHistoryEntry[]>(WEIGHT_HISTORY_KEY, [], isWeightHistory)
}

export function saveManualWeight(weight: number, options: { keepScaleConnected?: boolean } = {}) {
  if (!Number.isFinite(weight) || weight < 25 || weight > 250) return null

  const entry: WeightHistoryEntry = {
    date: new Date().toISOString(),
    weight: Math.round(weight * 10) / 10,
  }
  writeJson(WEIGHT_HISTORY_KEY, [entry, ...getWeightHistory()].slice(0, MAX_WEIGHT_HISTORY))
  if (!options.keepScaleConnected) {
    saveConnectedScale({ connected: false, provider: 'manual' })
  }
  return entry
}

export function getLatestWeight(defaultWeight?: number) {
  const latest = getWeightHistory()[0]?.weight
  return typeof latest === 'number' ? latest : defaultWeight
}
