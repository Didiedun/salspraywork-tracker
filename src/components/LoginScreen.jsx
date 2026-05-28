import { useState } from 'react'
import { Lock, Eye, EyeOff } from 'lucide-react'
import { ADMIN_PASSWORD } from '../constants'

export function LoginScreen({ onLogin }) {
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [locked, setLocked] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (locked) return
    if (password === ADMIN_PASSWORD) {
      onLogin()
    } else {
      const next = attempts + 1
      setAttempts(next)
      setError('Kata laluan salah')
      setPassword('')
      if (next >= 5) {
        setLocked(true)
        setError('Terlalu banyak percubaan. Cuba lagi dalam 30 saat.')
        setTimeout(() => { setLocked(false); setAttempts(0); setError('') }, 30000)
      }
    }
  }

  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center font-bold text-white text-2xl mx-auto mb-4">
            S
          </div>
          <h1 className="font-display font-bold text-2xl text-ink">SALSPRAYWORKLEGACY</h1>
          <p className="text-mute text-sm mt-1.5">Portal Pengurusan Staf</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface-card rounded-lg border border-hairline p-6 space-y-4">
          <div>
            <label className="flex items-center gap-2 text-charcoal text-sm font-semibold mb-2">
              <Lock className="w-3.5 h-3.5" /> Kata Laluan
            </label>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={locked}
                placeholder="Masukkan kata laluan..."
                className="w-full bg-canvas border border-hairline rounded-full px-5 py-3 pr-12 text-ink placeholder-ash focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm disabled:opacity-50 transition-colors"
              />
              <button type="button" onClick={() => setShow(s => !s)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-ash hover:text-ink transition-colors">
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>
          )}

          <button type="submit" disabled={locked || !password}
            className="w-full bg-primary hover:bg-primary-deep disabled:bg-stone disabled:cursor-not-allowed text-white font-semibold rounded-full py-3 transition-colors text-sm">
            {locked ? 'Dikunci...' : 'Log Masuk'}
          </button>
        </form>

        <p className="text-center text-ash text-xs mt-6">
          TikTok: @salsprayworklegacy
        </p>
      </div>
    </div>
  )
}
