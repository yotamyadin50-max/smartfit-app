export type LocationTrackerStatus = 'idle' | 'requesting' | 'tracking' | 'denied' | 'unavailable' | 'error'

export type LocationTrackerPoint = {
  accuracy?: number
  latitude: number
  longitude: number
  timestamp: number
}

export type LocationTrackerHandle = {
  stop: () => void
}

type StartLocationTrackerOptions = {
  onDistanceChange: (distanceKm: number) => void
  onStatusChange?: (status: LocationTrackerStatus) => void
}

function toRadians(value: number) {
  return value * (Math.PI / 180)
}

export function getDistanceKm(from: LocationTrackerPoint, to: LocationTrackerPoint) {
  const earthRadiusKm = 6371
  const latDelta = toRadians(to.latitude - from.latitude)
  const lonDelta = toRadians(to.longitude - from.longitude)
  const fromLat = toRadians(from.latitude)
  const toLat = toRadians(to.latitude)
  const a = Math.sin(latDelta / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lonDelta / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return earthRadiusKm * c
}

export function startLocationTracker(options: StartLocationTrackerOptions): LocationTrackerHandle {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    options.onStatusChange?.('unavailable')
    return { stop: () => undefined }
  }

  let lastPoint: LocationTrackerPoint | null = null
  let totalDistanceKm = 0
  options.onStatusChange?.('requesting')

  const watchId = navigator.geolocation.watchPosition(
    position => {
      const nextPoint: LocationTrackerPoint = {
        accuracy: position.coords.accuracy,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        timestamp: position.timestamp,
      }

      options.onStatusChange?.('tracking')

      if (lastPoint) {
        const segmentKm = getDistanceKm(lastPoint, nextPoint)
        const accuracyOk = (nextPoint.accuracy ?? 0) <= 80
        if (segmentKm >= 0.005 && segmentKm <= 1.5 && accuracyOk) {
          totalDistanceKm += segmentKm
          options.onDistanceChange(Number(totalDistanceKm.toFixed(3)))
        }
      }

      lastPoint = nextPoint
    },
    error => {
      options.onStatusChange?.(error.code === error.PERMISSION_DENIED ? 'denied' : 'error')
    },
    {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 12000,
    },
  )

  return {
    stop: () => navigator.geolocation.clearWatch(watchId),
  }
}

