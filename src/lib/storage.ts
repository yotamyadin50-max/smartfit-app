export function readJson<T>(key: string, fallback: T, validate?: (value: unknown) => value is T): T {
  if (typeof window === 'undefined') return fallback

  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback

    const parsed = JSON.parse(raw) as unknown
    if (validate && !validate(parsed)) {
      window.localStorage.removeItem(key)
      return fallback
    }

    return parsed as T
  } catch {
    try {
      window.localStorage.removeItem(key)
    } catch {
      // localStorage can be blocked; returning the fallback keeps the app stable.
    }
    return fallback
  }
}

export function writeJson<T>(key: string, value: T) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(value))
}

export function removeJson(key: string) {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(key)
}
