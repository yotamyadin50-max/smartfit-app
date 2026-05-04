import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/dashboard', label: 'Home', icon: '🏠' },
  { to: '/workout', label: 'Workout', icon: '🏋️' },
  { to: '/nutrition', label: 'Nutrition', icon: '🥗' },
  { to: '/progress', label: 'Progress', icon: '📊' },
  { to: '/chat', label: 'AI Chat', icon: '🤖' },
]

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {navItems.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
        >
          <span className="bottom-nav-icon">{item.icon}</span>
          <span className="bottom-nav-label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
