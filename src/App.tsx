import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { useUser } from './context/UserContext'

import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import OnboardingPage from './pages/OnboardingPage'
import DashboardPage from './pages/DashboardPage'
import WorkoutPage from './pages/WorkoutPage'
import WorkoutSummaryPage from './pages/WorkoutSummaryPage'
import NutritionPage from './pages/NutritionPage'
import ChatPage from './pages/ChatPage'
import ProgressPage from './pages/ProgressPage'
import SettingsPage from './pages/SettingsPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const { profile } = useUser()

  if (loading) return <div className="spinner-screen">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  if (!profile.onboardingComplete) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="spinner-screen">Loading…</div>
  if (user) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function OnboardingRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const { profile } = useUser()
  if (loading) return <div className="spinner-screen">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  if (profile.onboardingComplete) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login"   element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/signup"  element={<PublicRoute><SignupPage /></PublicRoute>} />

        {/* Onboarding */}
        <Route path="/onboarding" element={<OnboardingRoute><OnboardingPage /></OnboardingRoute>} />

        {/* Protected app */}
        <Route path="/dashboard"       element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/workout"         element={<ProtectedRoute><WorkoutPage /></ProtectedRoute>} />
        <Route path="/workout/summary" element={<ProtectedRoute><WorkoutSummaryPage /></ProtectedRoute>} />
        <Route path="/nutrition"       element={<ProtectedRoute><NutritionPage /></ProtectedRoute>} />
        <Route path="/chat"            element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
        <Route path="/progress"        element={<ProtectedRoute><ProgressPage /></ProtectedRoute>} />
        <Route path="/settings"        element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
