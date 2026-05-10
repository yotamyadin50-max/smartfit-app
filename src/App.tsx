import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense, type ReactNode } from 'react'
import { useAuth } from './context/AuthContext'
import { useUser } from './context/UserContext'
import { useI18n } from './context/I18nContext'

import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import OnboardingPage from './pages/OnboardingPage'
import DashboardPage from './pages/DashboardPage'
import WorkoutPage from './pages/WorkoutPage'
import WorkoutSummaryPage from './pages/WorkoutSummaryPage'
import NutritionPage from './pages/NutritionPage'
import SettingsPage from './pages/SettingsPage'
import TrainingPlanPage from './pages/TrainingPlanPage'
import AnimatedWaveBackground from './components/AnimatedWaveBackground'

const AIToolsPage = lazy(() => import('./pages/AIToolsPage'))
const ChatPage = lazy(() => import('./pages/ChatPage'))
const ProgressPage = lazy(() => import('./pages/ProgressPage'))

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const { profile } = useUser()
  const { t } = useI18n()

  if (loading) return <div className="spinner-screen">{t('loading')}</div>
  if (!user) return <Navigate to="/login" replace />
  if (!profile.onboardingComplete) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const { t } = useI18n()
  if (loading) return <div className="spinner-screen">{t('loading')}</div>
  if (user) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function OnboardingRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const { profile } = useUser()
  const { t } = useI18n()
  if (loading) return <div className="spinner-screen">{t('loading')}</div>
  if (!user) return <Navigate to="/login" replace />
  if (profile.onboardingComplete) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  const { t } = useI18n()

  return (
    <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <AnimatedWaveBackground />
      <Suspense fallback={<div className="spinner-screen">{t('loading')}</div>}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />

          <Route path="/onboarding" element={<OnboardingRoute><OnboardingPage /></OnboardingRoute>} />

          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/workout" element={<ProtectedRoute><WorkoutPage /></ProtectedRoute>} />
          <Route path="/workout/summary" element={<ProtectedRoute><WorkoutSummaryPage /></ProtectedRoute>} />
          <Route path="/training-plan" element={<ProtectedRoute><TrainingPlanPage /></ProtectedRoute>} />
          <Route path="/ai-tools" element={<ProtectedRoute><AIToolsPage /></ProtectedRoute>} />
          <Route path="/nutrition" element={<ProtectedRoute><NutritionPage /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
          <Route path="/progress" element={<ProtectedRoute><ProgressPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
