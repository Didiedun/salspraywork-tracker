import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Loader, CheckCircle, ClipboardList, Smartphone, Package } from 'lucide-react'

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

const highlights = [
  { icon: ClipboardList, text: 'Jejak setiap kenderaan dari mula hingga siap' },
  { icon: Smartphone,    text: 'Pelanggan semak status sendiri tanpa hubungi anda' },
  { icon: Package,       text: 'Pantau stok dan amaran automatik bila hampir habis' },
]

export function AuthScreen() {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleGoogle = async () => {
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })
    if (err) { setError(err.message); setLoading(false) }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* ── Left panel: brand (desktop only) ── */}
      <div className="hidden lg:flex lg:w-[45%] bg-surface-deep flex-col justify-between p-12">
        <Link to="/" className="inline-flex items-center gap-2.5 group w-fit">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <span className="font-display font-bold text-white text-sm">DD</span>
          </div>
          <span className="font-display font-bold text-on-dark text-base group-hover:opacity-80 transition-opacity">
            Digital Depot
          </span>
        </Link>

        <div>
          <h2 className="font-display font-bold text-3xl text-on-dark leading-snug mb-6">
            Sistem pengurusan bengkel yang mudah dan berkesan.
          </h2>
          <ul className="space-y-4">
            {highlights.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-on-dark/70 text-sm leading-snug">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-on-dark/25 text-xs">© {new Date().getFullYear()} Digital Depot. Dibina untuk bengkel Malaysia.</p>
      </div>

      {/* ── Right panel: auth ── */}
      <div className="flex-1 bg-canvas flex flex-col">
        {/* Mobile: back link */}
        <div className="lg:hidden px-6 py-5">
          <Link to="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center transition-opacity group-hover:opacity-80">
              <span className="font-display font-bold text-white text-sm">DD</span>
            </div>
            <span className="font-display font-bold text-ink text-sm group-hover:text-primary transition-colors">
              Digital Depot
            </span>
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-sm">
            <div className="mb-8">
              <h1 className="font-display font-bold text-2xl text-ink">Selamat Datang</h1>
              <p className="text-mute text-sm mt-1.5">Log masuk untuk teruskan ke bengkel anda</p>
            </div>

            <div className="bg-surface-card rounded-2xl border border-hairline p-6 shadow-sm space-y-4">
              <button
                onClick={handleGoogle}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-surface-bone disabled:opacity-60 border border-hairline rounded-full py-3.5 text-sm font-semibold text-ink transition-colors shadow-sm"
              >
                {loading ? <Loader className="w-5 h-5 animate-spin text-ash" /> : <GoogleIcon />}
                {loading ? 'Mengalihkan...' : 'Teruskan dengan Google'}
              </button>

              {error && (
                <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-center">
                  {error}
                </p>
              )}

              <div className="pt-1 space-y-2">
                {['Tiada kad kredit diperlukan', 'Setup dalam masa 2 minit', 'Batal bila-bila masa'].map(f => (
                  <p key={f} className="flex items-center gap-2 text-xs text-mute">
                    <CheckCircle className="w-3.5 h-3.5 text-badge-success flex-shrink-0" />
                    {f}
                  </p>
                ))}
              </div>

              <p className="text-center text-xs text-mute leading-relaxed border-t border-hairline pt-3">
                Belum ada akaun? Google akan cipta satu secara automatik.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
