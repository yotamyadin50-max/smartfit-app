/**
 * remindersService.ts
 * Workout reminders: local storage + browser Push Notifications.
 */

import { readJson, writeJson } from './storage'

// ── Types ────────────────────────────────────────────────────────────────────

export type Reminder = {
  id: string
  label: string
  time: string        // "HH:MM"
  days: number[]      // 0=Sun, 1=Mon, ... 6=Sat
  repeat: boolean     // repeat every week
  sound: boolean      // play sound
  soundName?: string  // file name from downloads
  enabled: boolean
  createdAt: string
}

// ── Storage ───────────────────────────────────────────────────────────────────

const KEY = 'smartfit_reminders'

export function getReminders(): Reminder[] {
  return readJson<Reminder[]>(KEY, [])
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
  const r = all.find(r => r.id === id)
  if (r) { r.enabled = !r.enabled; writeJson(KEY, all) }
}

export function createReminder(partial: Omit<Reminder, 'id' | 'createdAt'>): Reminder {
  return {
    ...partial,
    id: crypto.randomUUID?.() ?? `${Date.now()}`,
    createdAt: new Date().toISOString(),
  }
}

// ── Day labels ────────────────────────────────────────────────────────────────

export const DAY_LABELS_HE = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש']
export const DAY_LABELS_EN = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
export const DAY_FULL_HE   = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
export const DAY_FULL_EN   = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function formatReminderDays(days: number[], isHebrew: boolean): string {
  if (days.length === 7) return isHebrew ? 'כל יום' : 'Every day'
  if (days.length === 0) return isHebrew ? 'לא פעיל' : 'Inactive'
  const labels = isHebrew ? DAY_LABELS_HE : DAY_LABELS_EN
  return days.map(d => labels[d]).join(', ')
}

// ── Push Notifications ────────────────────────────────────────────────────────

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function sendTestNotification(label: string) {
  if (Notification.permission !== 'granted') return
  new Notification('SmartFit 🐯', {
    body: label || 'זמן לאימון!',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
  })
}

// ── Streak warning ────────────────────────────────────────────────────────────
// Called from the app at 20:00 on workout days

export function scheduleStreakWarning(streakDays: number, isHebrew: boolean) {
  if (Notification.permission !== 'granted') return
  if (streakDays === 0) return

  const motivations = isHebrew
    ? [
        'אל תפסיק עכשיו — הגעת רחוק! 💪',
        'עוד אימון אחד ואתה שומר על הרצף 🔥',
        `${streakDays} ימי רצף — לא לזרוק את זה!`,
        'הגוף שלך מחכה לך. בוא!',
      ]
    : [
        "Don't stop now — you've come so far! 💪",
        'One more workout keeps the streak alive 🔥',
        `${streakDays} day streak — don't lose it!`,
        'Your body is waiting. Let\'s go!',
      ]

  const msg = motivations[Math.floor(Math.random() * motivations.length)]

  new Notification('SmartFit 🐯', {
    body: isHebrew
      ? `⚠️ עוד מעט נשבר הסטריק שלך!\n${msg}`
      : `⚠️ Your streak is about to break!\n${msg}`,
    icon: '/icons/icon-192.png',
  })
}
