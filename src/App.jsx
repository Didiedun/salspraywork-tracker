import { useState } from 'react'
import { CustomerView } from './components/CustomerView'
import { LoginScreen } from './components/LoginScreen'
import { Dashboard } from './components/Dashboard'

export default function App() {
  const [view, setView] = useState('customer') // 'customer' | 'login' | 'admin'

  const handleLogin = () => setView('admin')
  const handleLogout = () => setView('customer')

  if (view === 'admin') return <Dashboard onLogout={handleLogout} />
  if (view === 'login') return <LoginScreen onLogin={handleLogin} onBack={() => setView('customer')} />

  return (
    <div className="relative">
      <CustomerView />
      <button
        onClick={() => setView('login')}
        className="fixed bottom-5 right-5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-full px-4 py-2 shadow-lg transition-colors z-40"
      >
        🔐 Staf
      </button>
    </div>
  )
}
