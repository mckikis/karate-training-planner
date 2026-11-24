import { HashRouter, Navigate, NavLink, Outlet, Route, Routes } from 'react-router'
import ExercisesPage from './pages/ExercisesPage'
import ExerciseDetailPage from './pages/ExerciseDetailPage'
import ExerciseFormPage from './pages/ExerciseFormPage'
import TrainingsPage from './pages/TrainingsPage'
import TrainingDetailPage from './pages/TrainingDetailPage'
import TrainingFormPage from './pages/TrainingFormPage'
import CategoriesPage from './pages/CategoriesPage'
import SettingsPage from './pages/SettingsPage'
import LoginPage from './pages/LoginPage'
import TimerPage from './pages/TimerPage'
import { useError, useSession } from './cloud'
import { ConfirmHost } from './confirm'

/** Screens with the bottom navigation. */
function TabLayout() {
  return (
    <div className="app">
      <main className="content">
        <Outlet />
      </main>
      <nav className="tabbar" aria-label="Hlavná navigácia">
        <NavLink to="/exercises" className="tab">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <rect x="4" y="3" width="16" height="18" rx="2" />
            <path d="M8 8h8M8 12h8M8 16h5" />
          </svg>
          Cviky
        </NavLink>
        <NavLink to="/timer" className="tab">
          {/* stopwatch */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="13" r="8" />
            <path d="M12 9v4l2.5 2.5M9 2h6M19 6l1.5-1.5" />
          </svg>
          Časomiera
        </NavLink>
        <NavLink to="/trainings" className="tab">
          {/* calendar with a tick: planned trainings */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
            <path d="M3.5 10h17M8 3v4M16 3v4M9 15l2 2 4-4" />
          </svg>
          Tréningy
        </NavLink>
      </nav>
    </div>
  )
}

/** Error of a save in the background (e.g. no permission). */
function ErrorBanner() {
  const [message, close] = useError()
  if (!message) return null
  return (
    <div className="error-banner" role="alert">
      <span>{message}</span>
      <button type="button" className="icon-button small" onClick={close} aria-label="Zavrieť">
        ✕
      </button>
    </div>
  )
}

export default function App() {
  const session = useSession()
  if (session.status === 'loading') return <div className="splash" aria-label="Načítavam" />
  if (session.status === 'out') return <LoginPage error={session.error} />

  return (
    <HashRouter>
      <ErrorBanner />
      <ConfirmHost />
      <Routes>
        <Route element={<TabLayout />}>
          <Route path="/exercises" element={<ExercisesPage />} />
          <Route path="/exercises/:id" element={<ExerciseDetailPage />} />
          <Route path="/trainings" element={<TrainingsPage />} />
          <Route path="/trainings/:id" element={<TrainingDetailPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/timer" element={<TimerPage />} />
        </Route>
        <Route path="/exercises/new" element={<ExerciseFormPage />} />
        <Route path="/exercises/:id/edit" element={<ExerciseFormPage />} />
        <Route path="/trainings/new" element={<TrainingFormPage />} />
        <Route path="/trainings/:id/edit" element={<TrainingFormPage />} />
        <Route path="*" element={<Navigate to="/trainings" replace />} />
      </Routes>
    </HashRouter>
  )
}
