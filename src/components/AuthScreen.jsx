import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import { Lock, Mail, Eye, EyeOff, Wrench } from 'lucide-react'

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

export function AuthScreen({ mode }) {
  const { signIn, signUp } = useApp()
  const navigate = useNavigate()
  const isRegister = mode === 'register'

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow]         = useState(false)
  const [loading, setLoading]   = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError]       = useState('')

  const handleGoogle = async () => {
    setGoogleLoading(true); setError('')
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })
    if (err) { setError(err.message); setGoogleLoading(false) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      if (isRegister) {
        const { error: err } = await signUp(email, password)
        if (err) throw err
        navigate('/onboarding')
      } else {
        const { error: err } = await signIn(email, password)
        if (err) throw err
        navigate('/dashboard')
      }
    } catch (err) {
      setError(
        err.message === 'Invalid login credentials'
          ? 'E-mel atau kata laluan salah.'
          : err.message.includes('Email not confirmed')
          ? 'Sila sahkan e-mel anda dahulu. Semak inbox/spam.'
          : err.message
      )
    } finally { setLoading(false) }
  }

  const inputCls = 'w-full bg-canvas border border-hairline rounded-full px-5 py-3 text-ink placeholder-ash focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm disabled:opacity-50 transition-colors'

  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center mx-auto mb-4">
            <Wrench className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-display font-bold text-2xl text-ink">SprayTrack</h1>
          <p className="text-mute text-sm mt-1">Sistem Pengurusan Bengkel Cat</p>
        </div>

        <div className="bg-surface-card rounded-lg border border-hairline p-6 space-y-4">
          <h2 className="font-display font-bold text-ink text-lg">
            {isRegister ? 'Buat Akaun Baru' : 'Log Masuk'}
          </h2>

          {/* Google button */}
          <button onClick={handleGoogle} disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 disabled:opacity-50 border border-hairline rounded-full py-3 text-sm font-semibold text-ink transition-colors shadow-sm">
            <GoogleIcon />
            {googleLoading ? 'Mengalihkan...' : `${isRegister ? 'Daftar' : 'Log masuk'} dengan Google`}
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 border-t border-hairline" />
            <span className="text-ash text-xs">atau guna e-mel</span>
            <div className="flex-1 border-t border-hairline" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="flex items-center gap-1.5 text-charcoal text-xs font-semibold mb-1.5">
                <Mail className="w-3.5 h-3.5" /> E-mel
              </label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                required placeholder="nama@email.com" disabled={loading} className={inputCls} />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-charcoal text-xs font-semibold mb-1.5">
                <Lock className="w-3.5 h-3.5" /> Kata Laluan
              </label>
              <div className="relative">
                <input type={show ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  required placeholder="Minimum 6 aksara" disabled={loading}
                  className={inputCls + ' pr-12'} />
                <button type="button" onClick={() => setShow(s => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-ash hover:text-ink transition-colors">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>
            )}

            <button type="submit" disabled={loading || !email || !password}
              className="w-full bg-primary hover:bg-primary-deep disabled:bg-stone disabled:cursor-not-allowed text-white font-semibold rounded-full py-3 transition-colors text-sm border-2 border-primary hover:border-primary-deep disabled:border-stone">
              {loading ? 'Sila tunggu...' : isRegister ? 'Buat Akaun' : 'Log Masuk'}
            </button>
          </form>

          <p className="text-center text-sm text-mute pt-1">
            {isRegister ? (
              <>Sudah ada akaun?{' '}
                <Link to="/login" className="text-primary font-semibold hover:underline">Log Masuk</Link>
              </>
            ) : (
              <>Belum ada akaun?{' '}
                <Link to="/register" className="text-primary font-semibold hover:underline">Daftar Percuma</Link>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
