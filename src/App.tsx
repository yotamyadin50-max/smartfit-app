import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense, type ReactNode, useEffect } from 'react'
import { useAuth } from './context/AuthContext'
import { useUser } from './context/UserContext'
import { useI18n } from './context/I18nContext'
import { savePendingInvite, acceptInvite, getPendingInvite, clearPendingInvite } from './lib/friendsService'

import AnimatedWaveBackground from './components/AnimatedWaveBackground'

const LandingPage = lazy(() => import('./pages/LandingPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const WorkoutPage = lazy(() => import('./pages/WorkoutPage'))
const WorkoutSummaryPage = lazy(() => import('./pages/WorkoutSummaryPage'))
const NutritionPage = lazy(() => import('./pages/NutritionPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const TrainingPlanPage = lazy(() => import('./pages/TrainingPlanPage'))
const BadgesPage = lazy(() => import('./pages/BadgesPage'))
const RecipesPage = lazy(() => import('./pages/RecipesPage'))
const SocialPage = lazy(() => import('./pages/SocialPage'))
const WearablePage = lazy(() => import('./pages/WearablePage'))
const RemindersPage = lazy(() => import('./pages/RemindersPage'))
const AIToolsPage = lazy(() => import('./pages/AIToolsPage'))
const ChatPage = lazy(() => import('./pages/ChatPage'))
const ProgressPage = lazy(() => import('./pages/ProgressPage'))

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const { profile, cloudSynced } = useUser()
  const { t } = useI18n()

  if (loading || !cloudSynced) return <div className="spinner-screen">{t('loading')}</div>
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
  const { profile, cloudSynced } = useUser()
  const { t } = useI18n()
  if (loading || !cloudSynced) return <div className="spinner-screen">{t('loading')}</div>
  // Already done → go to app
  if (user && profile.onboardingComplete) return <Navigate to="/dashboard" replace />
  // Allow unauthenticated users — auth is step 1 of the onboarding itself
  return <>{children}</>
}

// Handles ?invite=<code> links
function InviteHandler() {
  const { user } = useAuth()
  const { addXP } = useUser()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('invite')
    if (code) {
      savePendingInvite(code)
      // Remove from URL without reload
      const url = new URL(window.location.href)
      url.searchParams.delete('invite')
      window.history.replaceState({}, '', url.toString())
    }
  }, [])

  useEffect(() => {
    if (!user) return
    const pending = getPendingInvite()
    if (!pending) return
    clearPendingInvite()
    acceptInvite(pending, user.id).then(result => {
      if (result === 'ok') {
        addXP(50) // +50 XP for new friend
        console.log('[Friends] Friendship created +50 XP')
      }
    })
  }, [user, addXP])

  return null
}

export default function App() {
  const { t } = useI18n()

  return (
    <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <InviteHandler />
      <AnimatedWaveBackground />
      <Suspense fallback={<div className="spinner-screen">{t('loading')}</div>}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/signup" element={<Navigate to="/onboarding" replace />} />

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
          <Route path="/badges" element={<ProtectedRoute><BadgesPage /></ProtectedRoute>} />
          <Route path="/recipes" element={<ProtectedRoute><RecipesPage /></ProtectedRoute>} />
          <Route path="/social" element={<ProtectedRoute><SocialPage /></ProtectedRoute>} />
          <Route path="/reminders" element={<ProtectedRoute><RemindersPage /></ProtectedRoute>} />
          <Route path="/wearable" element={<ProtectedRoute><WearablePage /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
