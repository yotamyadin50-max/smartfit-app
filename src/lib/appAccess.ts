import { readJson, removeJson, writeJson } from './storage'

export type AppAccessKey = 'notifications' | 'location' | 'smartWatch' | 'smartScale' | 'bluetooth'
export type AppAccessStatus = 'unknown' | 'granted' | 'denied' | 'unavailable' | 'disabled'
export type AppAccessSource = 'browser' | 'capacitor' | 'manual' | 'device' | 'system'

export type AppAccessRecord = {
  key: AppAccessKey
  status: AppAccessStatus
  updatedAt: string
  source?: AppAccessSource
  deviceName?: string
  deviceId?: string
  remember?: boolean
  note?: string
}

export type AppAccessState = Partial<Record<AppAccessKey, AppAccessRecord>>

export const APP_ACCESS_KEY = 'smartfit_app_access'

const ACCESS_KEYS = new Set<AppAccessKey>([
  'notifications',
  'location',
  'smartWatch',
  'smartScale',
  'bluetooth',
])

const ACCESS_STATUSES = new Set<AppAccessStatus>([
  'unknown',
  'granted',
  'denied',
  'unavailable',
  'disabled',
])

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object')
}

function isAppAccessRecord(value: unknown): value is AppAccessRecord {
  return (
    isObject(value) &&
    ACCESS_KEYS.has(value.key as AppAccessKey) &&
    ACCESS_STATUSES.has(value.status as AppAccessStatus) &&
    typeof value.updatedAt === 'string' &&
    (value.source === undefined || typeof value.source === 'string') &&
    (value.deviceName === undefined || typeof value.deviceName === 'string') &&
    (value.deviceId === undefined || typeof value.deviceId === 'string') &&
    (value.remember === undefined || typeof value.remember === 'boolean') &&
    (value.note === undefined || typeof value.note === 'string')
  )
}

function isAppAccessState(value: unknown): value is AppAccessState {
  if (!isObject(value)) return false
  return Object.entries(value).every(([key, record]) =>
    ACCESS_KEYS.has(key as AppAccessKey) &&
    isAppAccessRecord(record) &&
    record.key === key
  )
}

function notificationPermissionToStatus(permission: NotificationPermission | 'unsupported'): AppAccessStatus {
  if (permission === 'unsupported') return 'unavailable'
  if (permission === 'granted') return 'granted'
  if (permission === 'denied') return 'denied'
  return 'unknown'
}

function browserPermissionToStatus(state: PermissionState): AppAccessStatus {
  if (state === 'granted') return 'granted'
  if (state === 'denied') return 'denied'
  return 'unknown'
}

export function getAppAccessState(): AppAccessState {
  return readJson<AppAccessState>(APP_ACCESS_KEY, {}, isAppAccessState)
}

export function getAppAccess(key: AppAccessKey): AppAccessRecord | null {
  return getAppAccessState()[key] ?? null
}

export function saveAppAccess(key: AppAccessKey, data: Omit<Partial<AppAccessRecord>, 'key' | 'updatedAt'>): AppAccessRecord {
  const current = getAppAccessState()
  const next: AppAccessRecord = {
    ...current[key],
    ...data,
    key,
    status: data.status ?? current[key]?.status ?? 'unknown',
    updatedAt: new Date().toISOString(),
  }
  writeJson(APP_ACCESS_KEY, { ...current, [key]: next })
  return next
}

export function clearAppAccess(key: AppAccessKey) {
  const current = getAppAccessState()
  const next = { ...current }
  delete next[key]
  writeJson(APP_ACCESS_KEY, next)
}

export function clearAllAppAccess() {
  removeJson(APP_ACCESS_KEY)
}

export function hasGrantedAccess(key: AppAccessKey): boolean {
  return getAppAccess(key)?.status === 'granted'
}

export function saveNotificationAccess(permission: NotificationPermission | 'unsupported', source: AppAccessSource = 'browser') {
  return saveAppAccess('notifications', {
    status: notificationPermissionToStatus(permission),
    source,
    remember: permission === 'granted',
  })
}

export async function syncKnownAppAccess() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return

  if ('Notification' in window) {
    saveNotificationAccess(Notification.permission, 'browser')
  } else {
    saveNotificationAccess('unsupported', 'browser')
  }

  const nav = navigator as Navigator & {
    permissions?: {
      query: (descriptor: { name: PermissionName }) => Promise<PermissionStatus>
    }
  }

  if (!nav.permissions?.query) return

  try {
    const locationPermission = await nav.permissions.query({ name: 'geolocation' })
    saveAppAccess('location', {
      status: browserPermissionToStatus(locationPermission.state),
      source: 'browser',
      remember: locationPermission.state === 'granted',
      note: 'passive-permission-sync',
    })
    locationPermission.onchange = () => {
      saveAppAccess('location', {
        status: browserPermissionToStatus(locationPermission.state),
        source: 'browser',
        remember: locationPermission.state === 'granted',
        note: 'permission-change',
      })
    }
  } catch {
    // Some WebViews do not expose geolocation through the Permissions API.
  }
}
