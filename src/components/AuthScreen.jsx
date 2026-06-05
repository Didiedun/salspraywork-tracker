import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { Lock, Mail, Eye, EyeOff, Wrench } from 'lucide-react'

export function AuthScreen({ mode }) {
  const { signIn, signUp } = useApp()
  const navigate = useNavigate()
  const isRegister = mode === 'register'

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow]         = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

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
