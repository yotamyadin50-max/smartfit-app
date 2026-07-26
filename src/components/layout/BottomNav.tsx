import { NavLink } from 'react-router-dom'
import { useI18n } from '../../context/I18nContext'
import { getProfileGoals, useUser } from '../../context/UserContext'

const navItems = [
  { to: '/dashboard', labelKey: 'navHome', icon: '🏠' },
  { to: '/workout', labelKey: 'navWorkout', icon: '🏋️' },
  { to: '/nutrition', labelKey: 'navNutrition', icon: '🥗' },
  { to: '/social', labelKey: 'navSocial', icon: '👥' },
  { to: '/progress', labelKey: 'navProgress', icon: '📊' },
  { to: '/chat', labelKey: 'navChat', icon: 'AI' },
]

export default function BottomNav() {
  const { t, isHebrew } = useI18n()
  const { profile } = useUser()
  const hasCuttingGoal = getProfileGoals(profile).includes('cut')

  return (
    <nav className="bottom-nav">
      {navItems.map(item => {
        const resolvedItem = item.to === '/nutrition' && hasCuttingGoal
          ? { ...item, to: '/shredding', icon: '🔥' }
          : item
        const label = resolvedItem.to === '/shredding'
          ? isHebrew ? 'חיטוב' : 'Shredding'
          : t(resolvedItem.labelKey)

        return (
          <NavLink
            key={resolvedItem.to}
            to={resolvedItem.to}
            className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
          >
            <span className="bottom-nav-icon">{resolvedItem.icon}</span>
            <span className="bottom-nav-label">{label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}
