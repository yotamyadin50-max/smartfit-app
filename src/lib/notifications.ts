const REMINDER_KEY = 'smartfit_notif_timer_id'

export function notificationsSupported() {
  return typeof window !== 'undefined' && 'Notification' in window
}

export async function requestPermission(): Promise<boolean> {
  if (!notificationsSupported()) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function getPermissionState(): NotificationPermission | 'unsupported' {
  if (!notificationsSupported()) return 'unsupported'
  return Notification.permission
}

export function sendNotification(title: string, body: string, icon?: string) {
  if (!notificationsSupported() || Notification.permission !== 'granted') return
  new Notification(title, { body, icon: icon ?? '/favicon.ico' })
}

function parseReminderMs(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number)
  const now = new Date()
  const target = new Date()
  target.setHours(h, m, 0, 0)
  if (target <= now) target.setDate(target.getDate() + 1)
  return target.getTime() - now.getTime()
}

export function scheduleWorkoutReminder(
  timeStr: string,
  titleEn: string,
  bodyEn: string,
) {
  cancelWorkoutReminder()
  if (!notificationsSupported() || Notification.permission !== 'granted') return

  const delay = parseReminderMs(timeStr)
  const id = window.setTimeout(() => {
    sendNotification(titleEn, bodyEn)
    scheduleWorkoutReminder(timeStr, titleEn, bodyEn)
  }, delay)

  try {
    sessionStorage.setItem(REMINDER_KEY, String(id))
  } catch {
    // sessionStorage may be blocked
  }
}

export function cancelWorkoutReminder() {
  try {
    const raw = sessionStorage.getItem(REMINDER_KEY)
    if (raw) {
      window.clearTimeout(Number(raw))
      sessionStorage.removeItem(REMINDER_KEY)
    }
  } catch {
    // sessionStorage may be blocked
  }
}
