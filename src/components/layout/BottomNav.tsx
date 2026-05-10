import { NavLink } from 'react-router-dom'
import { useI18n } from '../../context/I18nContext'

const navItems = [
  { to: '/dashboard', labelKey: 'navHome', icon: '🏠' },
  { to: '/workout', labelKey: 'navWorkout', icon: '🏋️' },
  { to: '/nutrition', labelKey: 'navNutrition', icon: '🥗' },
  { to: '/progress', labelKey: 'navProgress', icon: '📊' },
  { to: '/chat', labelKey: 'navChat', icon: 'AI' },
]

export default function BottomNav() {
  const { t } = useI18n()

  return (
    <nav className="bottom-nav">
      {navItems.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
        >
          <span className="bottom-nav-icon">{item.icon}</span>
          <span className="bottom-nav-label">{t(item.labelKey)}</span>
        </NavLink>
      ))}
    </nav>
  )
}
