import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useUser, Goal, FitnessLevel, NutritionPref } from '../context/UserContext'
import BottomNav from '../components/layout/BottomNav'

export default function SettingsPage() {
  const { user, signOut } = useAuth()
  const { profile, updateProfile } = useUser()
  const navigate = useNavigate()

  const [goal, setGoal] = useState<Goal>(profile.goal)
  const [level, setLevel] = useState<FitnessLevel>(profile.fitnessLevel)
  const [nutritionPref, setNutritionPref] = useState<NutritionPref>(profile.nutritionPref)
  const [notifications, setNotifications] = useState(profile.notificationsEnabled)
  const [reminderTime, setReminderTime] = useState(profile.reminderTime)
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    updateProfile({ goal, fitnessLevel: level, nutritionPref, notificationsEnabled: notifications, reminderTime })
    // TODO: persist to Supabase user_profiles table
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="app-layout">
      <div className="page-content">
        <h1 className="page-title">Settings ⚙️</h1>

        {/* Profile */}
        <div className="settings-section">
          <h3 className="settings-section-title">Profile</h3>
          <div className="settings-item">
            <span className="settings-label">Email</span>
            <span className="settings-value">{user?.email}</span>
          </div>
          {/* TODO: add profile name/photo once Supabase is connected */}
        </div>

        {/* Goal */}
        <div className="settings-section">
          <h3 className="settings-section-title">Fitness Goal</h3>
          <div className="option-grid col-2">
            {([
              ['cut', '✂️ Tone Up'],
              ['bulk', '💪 Build Muscle'],
              ['fitness', '🏃 General Fitness'],
              ['health', '❤️ Health'],
            ] as [Goal, string][]).map(([v, label]) => (
              <button key={v} className={`option-card compact${goal === v ? ' selected' : ''}`} onClick={() => setGoal(v)}>
                <span className="option-label">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Fitness Level */}
        <div className="settings-section">
          <h3 className="settings-section-title">Fitness Level</h3>
          <div className="option-grid col-3">
            {([
              ['beginner', '🌱 Beginner'],
              ['intermediate', '🔥 Intermediate'],
              ['advanced', '⚡ Advanced'],
            ] as [FitnessLevel, string][]).map(([v, label]) => (
              <button key={v} className={`option-card compact${level === v ? ' selected' : ''}`} onClick={() => setLevel(v)}>
                <span className="option-label">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Nutrition */}
        <div className="settings-section">
          <h3 className="settings-section-title">Dietary Preference</h3>
          <div className="option-grid col-2">
            {([
              ['none', '🍽️ No restriction'],
              ['vegetarian', '🥦 Vegetarian'],
              ['vegan', '🌱 Vegan'],
              ['gluten-free', '🌾 Gluten-free'],
            ] as [NutritionPref, string][]).map(([v, label]) => (
              <button key={v} className={`option-card compact${nutritionPref === v ? ' selected' : ''}`} onClick={() => setNutritionPref(v)}>
                <span className="option-label">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Notifications */}
        <div className="settings-section">
          <h3 className="settings-section-title">Reminders</h3>
          <div className="settings-toggle-row">
            <span className="settings-label">Daily workout reminder</span>
            <button
              className={`toggle-btn${notifications ? ' on' : ''}`}
              onClick={() => setNotifications(n => !n)}
            >
              {notifications ? 'ON' : 'OFF'}
            </button>
          </div>
          {notifications && (
            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">Reminder Time</label>
              <input
                type="time"
                className="form-input"
                value={reminderTime}
                onChange={e => setReminderTime(e.target.value)}
              />
            </div>
          )}
        </div>

        <button className="btn-primary" onClick={handleSave}>
          {saved ? '✅ Saved!' : 'Save Changes'}
        </button>

        <button className="btn-signout" style={{ marginTop: 12, width: '100%' }} onClick={handleSignOut}>
          Sign Out
        </button>
      </div>
      <BottomNav />
    </div>
  )
}
