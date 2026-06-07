/**
 * Workout reminders: persistent reminder storage plus native Android/iOS
 * local notifications through Capacitor, with a browser fallback for localhost.
 */

import { Capacitor } from '@capacitor/core'
import { LocalNotifications, type LocalNotificationSchema, type Weekday } from '@capacitor/local-notifications'
import { saveAppAccess, saveNotificationAccess } from './appAccess'
import { readJson, writeJson } from './storage'

export type Reminder = {
  id: string
  label: string
  time: string
  days: number[]
  repeat: boolean
  sound: boolean
  soundName?: string
  enabled: boolean
  createdAt: string
}

const KEY = 'smartfit_reminders'
const SCHEDULED_IDS_KEY = 'smartfit_scheduled_reminder_ids'
const SILENT_CHANNEL_ID = 'smartfit_reminders_silent'
let browserTimers: number[] = []

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object')
}

function isReminder(value: unknown): value is Reminder {
  return (
    isObject(value) &&
    typeof value.id === 'string' &&
    typeof value.label === 'string' &&
    typeof value.time === 'string' &&
    Array.isArray(value.days) &&
    value.days.every(day => Number.isInteger(day) && day >= 0 && day <= 6) &&
    typeof value.repeat === 'boolean' &&
    typeof value.sound === 'boolean' &&
    typeof value.enabled === 'boolean' &&
    typeof value.createdAt === 'string'
  )
}

function isReminders(value: unknown): value is Reminder[] {
  return Array.isArray(value) && value.every(isReminder)
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every(item => Number.isInteger(item))
}

function saveNativeNotificationAccess(display: string) {
  saveAppAccess('notifications', {
    status: display === 'granted' ? 'granted' : display === 'denied' ? 'denied' : 'unknown',
    source: 'capacitor',
    remember: display === 'granted',
    note: `native-display-${display}`,
  })
}

export function getReminders(): Reminder[] {
  return readJson<Reminder[]>(KEY, [], isReminders)
}

export function saveReminder(reminder: Reminder): void {
  const all = getReminders()
  const idx = all.findIndex(r => r.id === reminder.id)
  if (idx >= 0) all[idx] = reminder
  else all.push(reminder)
  writeJson(KEY, all)
}

export function deleteReminder(id: string): void {
  writeJson(KEY, getReminders().filter(r => r.id !== id))
}

export function toggleReminder(id: string): void {
  const all = getReminders()
  const reminder = all.find(r => r.id === id)
  if (reminder) {
    reminder.enabled = !reminder.enabled
    writeJson(KEY, all)
  }
}

export function createReminder(partial: Omit<Reminder, 'id' | 'createdAt'>): Reminder {
  return {
    ...partial,
    id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: new Date().toISOString(),
  }
}

export const DAY_LABELS_HE = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש']
export const DAY_LABELS_EN = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
export const DAY_FULL_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
export const DAY_FULL_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function formatReminderDays(days: number[], isHebrew: boolean): string {
  if (days.length === 7) return isHebrew ? 'כל יום' : 'Every day'
  if (days.length === 0) return isHebrew ? 'לא פעיל' : 'Inactive'
  const labels = isHebrew ? DAY_LABELS_HE : DAY_LABELS_EN
  return days.map(day => labels[day]).join(', ')
}

function isNativeNotifications() {
  return Capacitor.isNativePlatform()
}

export function notificationsSupported() {
  return isNativeNotifications() || (typeof window !== 'undefined' && 'Notification' in window)
}

export async function getNotificationPermissionGranted(): Promise<boolean> {
  if (isNativeNotifications()) {
    const status = await LocalNotifications.checkPermissions()
    saveNativeNotificationAccess(status.display)
    return status.display === 'granted'
  }

  if (typeof Notification === 'undefined') {
    saveNotificationAccess('unsupported', 'browser')
    return false
  }
  saveNotificationAccess(Notification.permission, 'browser')
  return Notification.permission === 'granted'
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (isNativeNotifications()) {
    const current = await LocalNotifications.checkPermissions()
    saveNativeNotificationAccess(current.display)
    if (current.display === 'granted') return true
    const requested = await LocalNotifications.requestPermissions()
    saveNativeNotificationAccess(requested.display)
    return requested.display === 'granted'
  }

  if (!('Notification' in window)) {
    saveNotificationAccess('unsupported', 'browser')
    return false
  }
  if (Notification.permission === 'granted') {
    saveNotificationAccess('granted', 'browser')
    return true
  }
  if (Notification.permission === 'denied') {
    saveNotificationAccess('denied', 'browser')
    return false
  }
  const result = await Notification.requestPermission()
  saveNotificationAccess(result, 'browser')
  return result === 'granted'
}

function parseTime(time: string) {
  const [hourRaw, minuteRaw] = time.split(':').map(Number)
  const hour = Number.isFinite(hourRaw) ? Math.min(23, Math.max(0, hourRaw)) : 8
  const minute = Number.isFinite(minuteRaw) ? Math.min(59, Math.max(0, minuteRaw)) : 0
  return { hour, minute }
}

function nextDateFor(day: number, time: string) {
  const { hour, minute } = parseTime(time)
  const now = new Date()
  const target = new Date()
  target.setHours(hour, minute, 0, 0)
  const daysUntil = (day - now.getDay() + 7) % 7
  target.setDate(now.getDate() + daysUntil)
  if (target <= now) target.setDate(target.getDate() + 7)
  return target
}

function stableNotificationId(input: string) {
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0
  }
  return Math.abs(hash % 2_000_000_000) + 10_000
}

function reminderNotificationId(reminder: Reminder, day: number) {
  return stableNotificationId(`smartfit-reminder:${reminder.id}:${day}`)
}

function getReminderTitle(reminder: Reminder, isHebrew: boolean) {
  return reminder.label || (isHebrew ? 'תזכורת אימון' : 'Workout reminder')
}

function getReminderBody(reminder: Reminder, isHebrew: boolean) {
  const dayText = formatReminderDays(reminder.days, isHebrew)
  return isHebrew
    ? `זמן לאימון ב-Ascend AI. ימים: ${dayText}.`
    : `Time for your Ascend AI workout. Days: ${dayText}.`
}

async function ensureNativeChannels() {
  if (!isNativeNotifications()) return
  try {
    await LocalNotifications.createChannel({
      description: 'Ascend AI reminders without sound',
      id: SILENT_CHANNEL_ID,
      importance: 3,
      lights: false,
      name: 'Ascend AI Silent Reminders',
      vibration: false,
    })
  } catch (error) {
    console.log('[Reminders] Could not create silent notification channel', error)
  }
}

async function cancelNativeScheduledReminders() {
  const ids = readJson<number[]>(SCHEDULED_IDS_KEY, [], isNumberArray)
  if (!ids.length || !isNativeNotifications()) return
  try {
    await LocalNotifications.cancel({ notifications: ids.map(id => ({ id })) })
  } catch (error) {
    console.log('[Reminders] Could not cancel previous native reminders', error)
  }
  writeJson(SCHEDULED_IDS_KEY, [])
}

function buildNativeNotification(reminder: Reminder, day: number, isHebrew: boolean): LocalNotificationSchema {
  const { hour, minute } = parseTime(reminder.time)
  const schedule = reminder.repeat
    ? {
        allowWhileIdle: true,
        on: {
          hour,
          minute,
          second: 0,
          weekday: (day + 1) as Weekday,
        },
      }
    : {
        allowWhileIdle: true,
        at: nextDateFor(day, reminder.time),
      }

  return {
    autoCancel: true,
    body: getReminderBody(reminder, isHebrew),
    channelId: reminder.sound ? undefined : SILENT_CHANNEL_ID,
    extra: {
      reminderId: reminder.id,
      source: 'smartfit-reminder',
    },
    id: reminderNotificationId(reminder, day),
    schedule,
    title: getReminderTitle(reminder, isHebrew),
  }
}

function clearBrowserTimers() {
  browserTimers.forEach(id => window.clearTimeout(id))
  browserTimers = []
}

function sendBrowserNotification(reminder: Reminder, isHebrew: boolean) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  new Notification(getReminderTitle(reminder, isHebrew), {
    badge: '/icons/icon-72.png',
    body: getReminderBody(reminder, isHebrew),
    icon: '/icons/icon-192.png',
    silent: !reminder.sound,
    tag: `smartfit-reminder-${reminder.id}`,
  })
}

function scheduleBrowserOccurrence(reminder: Reminder, day: number, isHebrew: boolean) {
  const delay = nextDateFor(day, reminder.time).getTime() - Date.now()
  const timerId = window.setTimeout(() => {
    sendBrowserNotification(reminder, isHebrew)
    if (reminder.repeat && getReminders().some(item => item.id === reminder.id && item.enabled)) {
      scheduleBrowserOccurrence(reminder, day, isHebrew)
    }
  }, Math.max(0, delay))
  browserTimers.push(timerId)
}

function syncBrowserReminders(reminders: Reminder[], isHebrew: boolean) {
  clearBrowserTimers()
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  reminders
    .filter(reminder => reminder.enabled)
    .forEach(reminder => {
      const days = reminder.days.length ? reminder.days : [new Date().getDay()]
      const scheduledDays = reminder.repeat ? days : [days.reduce((best, day) =>
        nextDateFor(day, reminder.time) < nextDateFor(best, reminder.time) ? day : best
      , days[0])]
      scheduledDays.forEach(day => scheduleBrowserOccurrence(reminder, day, isHebrew))
    })
}

export async function syncScheduledReminders(isHebrew: boolean): Promise<void> {
  const reminders = getReminders().filter(reminder => reminder.enabled && reminder.days.length > 0)

  if (isNativeNotifications()) {
    const granted = await requestNotificationPermission()
    if (!granted) return
    await ensureNativeChannels()
    await cancelNativeScheduledReminders()

    const notifications = reminders.flatMap(reminder => {
      const days = reminder.repeat ? reminder.days : [reminder.days.reduce((best, day) =>
        nextDateFor(day, reminder.time) < nextDateFor(best, reminder.time) ? day : best
      , reminder.days[0])]
      return days.map(day => buildNativeNotification(reminder, day, isHebrew))
    })

    if (notifications.length) {
      await LocalNotifications.schedule({ notifications })
      writeJson(SCHEDULED_IDS_KEY, notifications.map(notification => notification.id))
    }
    return
  }

  syncBrowserReminders(reminders, isHebrew)
}

export async function sendTestNotification(label: string, sound = true): Promise<boolean> {
  const granted = await requestNotificationPermission()
  if (!granted) return false

  const testReminder: Reminder = {
    createdAt: new Date().toISOString(),
    days: [new Date().getDay()],
    enabled: true,
    id: 'test',
    label: 'Ascend AI',
    repeat: false,
    sound,
    time: '00:00',
  }

  if (isNativeNotifications()) {
    await ensureNativeChannels()
    await LocalNotifications.schedule({
      notifications: [{
        autoCancel: true,
        body: label || 'Time for your workout!',
        channelId: sound ? undefined : SILENT_CHANNEL_ID,
        id: stableNotificationId(`smartfit-test:${Date.now()}`),
        title: 'Ascend AI',
      }],
    })
    return true
  }

  sendBrowserNotification({ ...testReminder, label: label || 'Ascend AI' }, true)
  return true
}

const INACTIVITY_SENT_KEY = 'smartfit_inactivity_reminder_sent'

/**
 * Sends a one-time notification when the user has not logged a workout
 * for 3+ consecutive days. Resets when a new workout is logged.
 */
export function checkInactivityReminder(isHebrew: boolean, lastWorkoutDate?: string): void {
  if (!lastWorkoutDate) return

  const last = new Date(lastWorkoutDate)
  if (!Number.isFinite(last.getTime())) return
  const daysSince = Math.floor((Date.now() - last.getTime()) / 86400_000)
  if (daysSince < 3) {
    // User is active — clear the "already sent" flag so we can send again next time
    try { localStorage.removeItem(INACTIVITY_SENT_KEY) } catch {}
    return
  }

  try {
    const alreadySent = localStorage.getItem(INACTIVITY_SENT_KEY)
    if (alreadySent === lastWorkoutDate) return  // already notified for this absence period
    localStorage.setItem(INACTIVITY_SENT_KEY, lastWorkoutDate)
  } catch {}

  const title = isHebrew ? 'Ascend AI 💪' : 'Ascend AI 💪'
  const body = isHebrew
    ? 'היי, לא אימנת 3 ימים — 5 דקות מספיקות לחזור לריצה 🔥'
    : "Hey, you haven't trained in 3 days — 5 minutes is enough to get back on track 🔥"
  void sendTestNotification(`${title}\n${body}`, true)
}

export function scheduleStreakWarning(streakDays: number, isHebrew: boolean) {
  if (streakDays === 0) return

  const motivations = isHebrew
    ? [
        'אל תפסיק עכשיו - הגעת רחוק!',
        'עוד אימון אחד ואתה שומר על הרצף.',
        `${streakDays} ימי רצף - שווה לשמור על זה.`,
        'הגוף שלך מחכה לך. בוא נתחיל.',
      ]
    : [
        "Don't stop now - you've come so far!",
        'One more workout keeps the streak alive.',
        `${streakDays} day streak - keep it going.`,
        "Your body is waiting. Let's go.",
      ]

  const msg = motivations[Math.floor(Math.random() * motivations.length)]
  void sendTestNotification(
    isHebrew
      ? `עוד מעט נשבר הסטריק שלך. ${msg}`
      : `Your streak is about to break. ${msg}`,
    true,
  )
}
