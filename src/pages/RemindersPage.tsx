import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../context/I18nContext'
import BottomNav from '../components/layout/BottomNav'
import {
  getReminders, saveReminder, deleteReminder, toggleReminder,
  createReminder, formatReminderDays, requestNotificationPermission,
  sendTestNotification, DAY_LABELS_HE, DAY_LABELS_EN,
  type Reminder,
} from '../lib/remindersService'

export default function RemindersPage() {
  const { isHebrew } = useI18n()
  const navigate = useNavigate()

  const [reminders, setReminders] = useState<Reminder[]>(() => getReminders())
  const [showForm, setShowForm] = useState(false)
  const [notifGranted, setNotifGranted] = useState(Notification.permission === 'granted')

  // Form state
  const [formTime, setFormTime] = useState('08:00')
  const [formDays, setFormDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6])
  const [formRepeat, setFormRepeat] = useState(true)
  const [formSound, setFormSound] = useState(false)
  const [formLabel, setFormLabel] = useState('')

  const t = (en: string, he: string) => isHebrew ? he : en
  const dayLabels = isHebrew ? DAY_LABELS_HE : DAY_LABELS_EN

  const reload = () => setReminders(getReminders())

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission()
    setNotifGranted(granted)
  }

  const toggleDay = (day: number) => {
    setFormDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    )
  }

  const handleSave = () => {
    if (formDays.length === 0) return
    const r = createReminder({
      label: formLabel || t('Workout reminder', 'תזכורת אימון'),
      time: formTime,
      days: formDays,
      repeat: formRepeat,
      sound: formSound,
      enabled: true,
    })
    saveReminder(r)
    reload()
    setShowForm(false)
    setFormLabel('')
    setFormTime('08:00')
    setFormDays([0, 1, 2, 3, 4, 5, 6])
    setFormRepeat(true)
    setFormSound(false)
  }

  const handleDelete = (id: string) => {
    deleteReminder(id)
    reload()
  }

  const handleToggle = (id: string) => {
    toggleReminder(id)
    reload()
  }

  const card = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: 14,
    padding: '14px 16px',
  } as const

  return (
    <div className="app-layout">
      <div className="page-content">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button className="btn-secondary" style={{ padding: '6px 14px' }} onClick={() => navigate(-1)}>
            ← {t('Back', 'חזור')}
          </button>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>
            ⏰ {t('Reminders', 'תזכורות')}
          </h1>
        </div>

        {/* Permission banner */}
        {!notifGranted && (
          <div style={{ ...card, border: '1.5px solid rgba(251,191,36,0.4)', background: 'rgba(251,191,36,0.07)', marginBottom: 14 }}>
            <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: 14 }}>
              🔔 {t('Enable notifications', 'אפשר התראות')}
            </p>
            <p style={{ margin: '0 0 12px', fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
              {t('Allow push notifications to receive workout reminders.',
                 'אפשר התראות Push כדי לקבל תזכורות אימון.')}
            </p>
            <button className="btn-primary" onClick={handleRequestPermission}>
              {t('Allow', 'אפשר')}
            </button>
          </div>
        )}

        {/* Streak warning info */}
        <div style={{ ...card, marginBottom: 14, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
            🔥 {t('Automatic: every workout day at 20:00, you\'ll get a streak warning if you haven\'t trained yet.',
                  'אוטומטי: בכל יום אימון ב-20:00 תקבל התראת סטריק אם לא התאמנת עדיין.')}
          </p>
        </div>

        {/* Reminders list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
          {reminders.length === 0 && !showForm && (
            <div style={{ ...card, textAlign: 'center', padding: 32 }}>
              <p style={{ fontSize: 40, margin: '0 0 10px' }}>⏰</p>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, margin: 0 }}>
                {t('No reminders yet', 'אין תזכורות עדיין')}
              </p>
            </div>
          )}

          {reminders.map(r => (
            <div key={r.id} style={{
              ...card,
              display: 'flex', alignItems: 'center', gap: 12,
              opacity: r.enabled ? 1 : 0.5,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 22, fontWeight: 900, color: r.enabled ? '#22c55e' : '#888' }}>
                    {r.time}
                  </span>
                  {r.sound && <span style={{ fontSize: 14 }}>🎵</span>}
                  {r.repeat && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                    {t('Weekly', 'שבועי')}
                  </span>}
                </div>
                <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                  {r.label}
                </p>
                <p style={{ margin: '3px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                  {formatReminderDays(r.days, isHebrew)}
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                {/* Toggle */}
                <button
                  onClick={() => handleToggle(r.id)}
                  style={{
                    width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                    background: r.enabled ? '#22c55e' : 'rgba(255,255,255,0.15)',
                    position: 'relative', transition: 'background 0.2s',
                  }}
                >
                  <span style={{
                    position: 'absolute', top: 3,
                    left: r.enabled ? 22 : 3,
                    width: 18, height: 18, borderRadius: '50%',
                    background: '#fff', transition: 'left 0.2s',
                  }} />
                </button>
                <button
                  onClick={() => handleDelete(r.id)}
                  style={{
                    padding: '4px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: 11,
                  }}
                >
                  {t('Delete', 'מחק')}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add form */}
        {showForm ? (
          <div style={{ ...card, border: '1.5px solid rgba(34,197,94,0.3)' }}>
            <p style={{ margin: '0 0 14px', fontWeight: 800, fontSize: 16 }}>
              ➕ {t('New reminder', 'תזכורת חדשה')}
            </p>

            {/* Label */}
            <input
              placeholder={t('Label (optional)', 'שם (אופציונלי)')}
              value={formLabel}
              onChange={e => setFormLabel(e.target.value)}
              style={{
                width: '100%', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(0,0,0,0.3)', color: '#fff', padding: '10px 12px',
                fontSize: 14, marginBottom: 12, boxSizing: 'border-box',
              }}
            />

            {/* Time */}
            <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
              {t('Time', 'שעה')}
            </label>
            <input
              type="time"
              value={formTime}
              onChange={e => setFormTime(e.target.value)}
              style={{
                borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(0,0,0,0.3)', color: '#fff', padding: '10px 12px',
                fontSize: 16, marginBottom: 14, width: 130,
              }}
            />

            {/* Days */}
            <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
              {t('Days', 'ימים')}
            </label>
            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
              {dayLabels.map((label, i) => (
                <button
                  key={i}
                  onClick={() => toggleDay(i)}
                  style={{
                    width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer',
                    fontWeight: 700, fontSize: 13,
                    background: formDays.includes(i) ? '#22c55e' : 'rgba(255,255,255,0.1)',
                    color: formDays.includes(i) ? '#000' : '#fff',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Options */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={formRepeat} onChange={e => setFormRepeat(e.target.checked)} />
                {t('Repeat weekly', 'חזור כל שבוע')}
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={formSound} onChange={e => setFormSound(e.target.checked)} />
                🎵 {t('Sound', 'צליל')}
              </label>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-primary" style={{ flex: 1 }} onClick={handleSave}
                disabled={formDays.length === 0}>
                {t('Save', 'שמור')}
              </button>
              <button className="btn-secondary" onClick={() => setShowForm(false)}>
                {t('Cancel', 'ביטול')}
              </button>
            </div>
          </div>
        ) : (
          <button className="btn-primary" style={{ width: '100%' }} onClick={() => setShowForm(true)}>
            ➕ {t('Add reminder', 'הוסף תזכורת')}
          </button>
        )}

        {/* Test notification */}
        {notifGranted && (
          <button
            className="btn-secondary"
            style={{ width: '100%', marginTop: 10 }}
            onClick={() => sendTestNotification(t('Test notification! 🐯', 'בדיקת התראה! 🐯'))}
          >
            🔔 {t('Test notification', 'בדיקת התראה')}
          </button>
        )}

      </div>
      <BottomNav />
    </div>
  )
}
