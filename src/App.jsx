import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import { LanguageProvider } from './context/LanguageContext'
import { AuthScreen }    from './components/AuthScreen'
import { Onboarding }    from './components/Onboarding'
import { Layout }        from './components/Layout'
import { Dashboard }     from './components/Dashboard'
import { InventoryPage }     from './components/InventoryPage'
import { WorkersPage }       from './components/WorkersPage'
import { WorkerView }        from './components/WorkerView'
import { CustomerView }      from './components/CustomerView'
import { LandingPage }       from './components/LandingPage'
import { WorkshopSettings }  from './components/WorkshopSettings'
import { MaintenancePage }   from './components/MaintenancePage'
import { RefreshCw }     from 'lucide-react'

const MAINTENANCE = import.meta.env.VITE_MAINTENANCE === 'true'

function Spinner() {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center">
      <RefreshCw className="w-6 h-6 text-mute animate-spin" />
    </div>
  )
}

function AppRoutes() {
  const { user, workshop, role, loading } = useApp()
  if (loading) return <Spinner />

  return (
    <Routes>
      {/* Always-public: customer status page per workshop */}
      <Route path="/w/:slug" element={<CustomerView />} />

      {/* Landing page — show when not logged in, redirect when logged in */}
      <Route path="/" element={!user ? <LandingPage /> : <Navigate to="/dashboard" replace />} />

      {/* Auth pages redirect away if already logged in */}
      <Route path="/login"    element={!user ? <AuthScreen /> : <Navigate to="/dashboard" replace />} />
      <Route path="/register" element={!user ? <AuthScreen /> : <Navigate to="/dashboard" replace />} />

      {/* Not logged in */}
      {!user && <Route path="*" element={<Navigate to="/login" replace />} />}

      {/* Logged in, no workshop yet → onboarding */}
      {user && !workshop && (
        <>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="*" element={<Navigate to="/onboarding" replace />} />
        </>
      )}

      {/* Worker: read-only job sheet */}
      {user && workshop && role === 'worker' && (
        <Route path="*" element={<WorkerView />} />
      )}

      {/* Owner: full dashboard */}
      {user && workshop && role === 'owner' && (
        <>
          <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
          <Route path="/inventory" element={<Layout><InventoryPage /></Layout>} />
          <Route path="/workers"   element={<Layout><WorkersPage /></Layout>} />
          <Route path="/settings"  element={<Layout><WorkshopSettings /></Layout>} />
          <Route path="*"          element={<Navigate to="/dashboard" replace />} />
        </>
      )}
    </Routes>
  )
}

export default function App() {
  if (MAINTENANCE) return <MaintenancePage />
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AppProvider>
          <AppRoutes />
        </AppProvider>
      </LanguageProvider>
    </BrowserRouter>
  )
}
