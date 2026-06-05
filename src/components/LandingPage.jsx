import { Link } from 'react-router-dom'
import { usePlatformStats } from '../hooks/usePlatformStats'
import {
  Wrench, ClipboardList, Package, Users, Smartphone, FileText,
  CheckCircle, ArrowRight, BarChart2, Shield, Bell, Zap,
  ChevronDown, ChevronRight, Star, TrendingUp, Clock, Camera
} from 'lucide-react'
import { useState } from 'react'

/* ─── helpers ─────────────────────────────────────────── */
function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

function StatCard({ value, label, loading }) {
  return (
    <div className="text-center">
      <p className="font-display font-bold text-3xl sm:text-4xl text-primary">
        {loading ? '—' : value}
      </p>
      <p className="text-charcoal text-sm mt-1 font-medium">{label}</p>
    </div>
  )
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <button onClick={() => setOpen(o => !o)}
      className="w-full text-left bg-surface-card border border-hairline rounded-lg px-6 py-5 hover:bg-surface-bone transition-colors">
      <div className="flex items-center justify-between gap-4">
        <p className="font-semibold text-ink text-sm">{q}</p>
        <ChevronDown className={`w-4 h-4 text-ash flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>
      {open && <p className="text-charcoal text-sm mt-3 leading-relaxed">{a}</p>}
    </button>
  )
}

/* ─── data ─────────────────────────────────────────────── */
const features = [
  { icon: ClipboardList, title: 'Pengurusan Kerja',       desc: 'Jejak semua kerja dari mula hingga siap. Tahu status setiap kenderaan dalam bengkel pada bila-bila masa.' },
  { icon: Smartphone,   title: 'Portal Status Pelanggan', desc: 'Pelanggan semak status kenderaan sendiri melalui link khas. Kurang panggilan masuk, lebih fokus kerja.' },
  { icon: Package,      title: 'Inventori Masa Nyata',    desc: 'Pantau stok cat dan bahan. Amaran automatik sebelum kehabisan supaya operasi tidak terganggu.' },
  { icon: Users,        title: 'Pengurusan Pekerja',      desc: 'Jemput pekerja masuk sistem dengan kod jemputan. Mereka lihat tugasan sahaja — tanpa akses kewangan.' },
  { icon: FileText,     title: 'Resit & Invois Digital',  desc: 'Jana resit profesional terus dari sistem. Pelanggan simpan sebagai PDF tanpa perlukan pencetak.' },
  { icon: BarChart2,    title: 'Laporan Pendapatan',      desc: 'Carta pendapatan bulanan, kerja tertunggak dan prestasi bengkel tersedia dalam sekilas pandang.' },
  { icon: Camera,       title: 'Gambar Sebelum & Selepas', desc: 'Lampir foto setiap peringkat kerja. Tunjuk hasil kerja kepada pelanggan dengan visual yang jelas.' },
  { icon: Clock,        title: 'Amaran Kerja Tertangguh', desc: 'Sistem tanda kerja yang melebihi tempoh secara automatik. Pastikan tiada kerja yang terlupa.' },
]

const steps = [
  { num: '01', title: 'Daftar Percuma',      desc: 'Buat akaun dalam masa 30 saat. Tiada kad kredit, tiada kontrak.' },
  { num: '02', title: 'Tetapkan Bengkel',    desc: 'Namakan bengkel anda. Link status pelanggan terus sedia untuk dikongsi.' },
  { num: '03', title: 'Mula Urus Kerja',     desc: 'Tambah kerja pertama dan ajak pekerja masuk. Semua sudah sedia.' },
]

const trialFeatures = [
  'Kerja & rekod kenderaan tanpa had',
  'Portal status pelanggan',
  'Pengurusan pekerja & kod jemputan',
  'Resit & invois digital (print / PDF)',
  'Inventori & pemantauan stok',
  'Laporan pendapatan bulanan',
]
const proFeatures = [
  'Akses berterusan — tiada had masa',
  'Semua ciri dalam pelan percubaan',
  'Sokongan keutamaan via WhatsApp',
  'Laporan & analitik lanjutan',
  'Eksport data (CSV / PDF)',
  'Kemas kini ciri baru percuma',
]

const faqs = [
  { q: 'Apa yang berlaku selepas 14 hari?', a: 'Kami akan hantar peringatan. Jika ingin teruskan, bayar RM30/bulan. Jika tidak, akaun dibekukan tetapi data anda tidak dipadam — boleh aktifkan semula bila-bila masa.' },
  { q: 'Boleh guna dari telefon?', a: 'Ya, SprayTrack direka khas untuk mudah alih. Berfungsi lancar di telefon, tablet dan komputer tanpa perlu muat turun aplikasi. Buka pelayar web, terus boleh guna.' },
  { q: 'Adakah data bengkel saya selamat?', a: 'Data anda disimpan di Supabase — platform pangkalan data bertaraf enterprise yang disulitkan. Setiap bengkel hanya boleh akses data mereka sendiri.' },
  { q: 'Berapa ramai pekerja boleh ditambah?', a: 'Tiada had. Tambah seberapa ramai pekerja yang anda perlukan tanpa kos tambahan langsung.' },
  { q: 'Boleh saya eksport data saya?', a: 'Ya. Data invois dan rekod kenderaan boleh dicetak atau disimpan sebagai PDF pada bila-bila masa.' },
]

function BillingToggle({ stats, loading }) {
  const [annual, setAnnual] = useState(false)
  const earlyBird = !loading && (stats?.workshops ?? 0) < 10

  return (
    <div className="max-w-3xl mx-auto">
      {/* Monthly / Annual toggle */}
      <div className="flex items-center justify-center gap-3 mb-8">
        <span className={`text-sm font-semibold transition-colors ${!annual ? 'text-ink' : 'text-mute'}`}>Bulanan</span>
        <button onClick={() => setAnnual(a => !a)}
          className={`relative w-12 h-6 rounded-full transition-colors ${annual ? 'bg-primary' : 'bg-stone'}`}>
          <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${annual ? 'translate-x-7' : 'translate-x-1'}`} />
        </button>
        <span className={`text-sm font-semibold transition-colors ${annual ? 'text-ink' : 'text-mute'}`}>
          Tahunan <span className="text-xs font-normal text-mute">(RM 360/thn)</span>
        </span>
      </div>

      {/* Plan cards — extra top padding so the badge isn't clipped */}
      <div className="grid sm:grid-cols-2 gap-6 pt-5">

        {/* ── Free Trial / Early-bird ── */}
        <div className="relative">
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
            <span className="bg-primary text-white text-xs font-bold px-4 py-1.5 rounded-full whitespace-nowrap shadow-sm">
              {earlyBird ? '⚡ EARLY BIRD' : '✦ PALING POPULAR'}
            </span>
          </div>
          <div className="bg-surface-card border-2 border-primary rounded-xl p-6 h-full flex flex-col">
            <p className="font-display font-bold text-ink text-xl mb-0.5">
              {earlyBird ? 'Percuma Selamanya' : 'Cuba Percuma'}
            </p>
            <p className="text-mute text-sm mb-4">
              {earlyBird
                ? `Tinggal ${10 - (stats?.workshops ?? 0)} tempat — daftar sekarang`
                : 'Akses penuh selama 14 hari, tiada komitmen'}
            </p>

            <div className="flex items-baseline gap-1 mb-1">
              <span className="font-display font-bold text-5xl text-primary">RM 0</span>
              <span className="text-mute text-sm font-medium">
                {earlyBird ? ' / selamanya' : ' / 14 hari'}
              </span>
            </div>
            <p className="text-xs text-charcoal mb-5">
              {earlyBird
                ? 'Tiada caj langsung. Dijamin percuma selama-lamanya.'
                : 'Tiada kad kredit. Batal bila-bila masa.'}
            </p>

            <ul className="space-y-2.5 mb-6 flex-1">
              {(earlyBird ? proFeatures : trialFeatures).map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-charcoal">
                  <CheckCircle className="w-4 h-4 text-badge-success flex-shrink-0 mt-0.5" /> {f}
                </li>
              ))}
            </ul>

            <Link to="/register"
              className="block w-full bg-primary hover:bg-primary-deep text-white font-bold rounded-full py-3 text-center text-sm transition-colors">
              {earlyBird ? 'Dapatkan Akses Percuma Selamanya' : 'Mulakan Percubaan Percuma'}
            </Link>
          </div>
        </div>

        {/* ── Pro (coming soon) ── */}
        <div className="relative">
          <div className="bg-surface-card border border-hairline rounded-xl p-6 h-full flex flex-col opacity-75">
            <p className="font-display font-bold text-ink text-xl mb-0.5">Pro</p>
            <p className="text-mute text-sm mb-4">Untuk bengkel yang terus berkembang</p>

            <div className="flex items-baseline gap-1 mb-1">
              <span className="font-display font-bold text-5xl text-ink">
                {annual ? 'RM 360' : 'RM 30'}
              </span>
              <span className="text-mute text-sm font-medium">/{annual ? 'tahun' : 'bulan'}</span>
            </div>
            {annual && (
              <p className="text-xs text-mute mb-1">Bayar sekali setahun — lebih mudah</p>
            )}
            <p className="text-xs text-charcoal mb-5">
              Akan diaktifkan selepas 10 bengkel pertama berdaftar.
            </p>

            <ul className="space-y-2.5 mb-6 flex-1">
              {proFeatures.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-charcoal">
                  <CheckCircle className="w-4 h-4 text-stone flex-shrink-0 mt-0.5" /> {f}
                </li>
              ))}
            </ul>

            <button disabled
              className="w-full bg-canvas border border-hairline text-ash font-bold rounded-full py-3 text-sm cursor-not-allowed">
              Akan Datang
            </button>
            <p className="text-center text-xs text-mute mt-2">Aktif selepas 10 bengkel berdaftar</p>
          </div>
        </div>

      </div>
    </div>
  )
}

/* ─── main component ────────────────────────────────────── */
export function LandingPage() {
  const stats   = usePlatformStats()
  const loading = stats === null

  return (
    <div className="min-h-screen bg-canvas">

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-40 bg-canvas/95 backdrop-blur border-b border-hairline">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <Wrench className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-ink">SprayTrack</span>
          </div>
          <div className="hidden sm:flex items-center gap-1">
            {[['Ciri-ciri','#ciri'], ['Cara Kerja','#cara'], ['Harga','#harga'], ['FAQ','#faq']].map(([label, id]) => (
              <button key={id} onClick={() => scrollTo(id.slice(1))}
                className="text-sm text-mute hover:text-ink px-3 py-2 rounded-full hover:bg-surface-bone transition-colors font-medium">
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login"
              className="text-sm font-semibold text-charcoal hover:text-ink px-4 py-2 rounded-full hover:bg-surface-bone transition-colors">
              Log Masuk
            </Link>
            <button onClick={() => scrollTo('harga')}
              className="text-sm font-bold bg-primary hover:bg-primary-deep text-white px-5 py-2 rounded-full transition-colors">
              Cuba Percuma
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="max-w-5xl mx-auto px-4 pt-16 pb-12 text-center">
        <div className="inline-flex items-center gap-2 bg-red-50 border border-red-100 text-primary text-xs font-bold px-4 py-1.5 rounded-full mb-6 tracking-wide">
          <Zap className="w-3.5 h-3.5" fill="currentColor" /> PERCUMA 14 HARI · TIADA KAD KREDIT
        </div>

        <h1 className="font-display font-bold text-4xl sm:text-[3.25rem] text-ink leading-[1.15] mb-5 max-w-3xl mx-auto">
          Cara Terbaik Urus<br />
          <span className="text-primary">Bengkel Cat & Spray</span>
        </h1>

        <p className="text-charcoal text-lg sm:text-xl max-w-xl mx-auto mb-8 leading-relaxed">
          Jejak kerja, inventori, pekerja dan pelanggan — semua dalam satu sistem mudah. Pelanggan semak status sendiri. Anda fokus kerja.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
          <button onClick={() => scrollTo('harga')}
            className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-deep text-white font-bold rounded-full px-8 py-4 text-base transition-colors shadow-sm">
            Cuba Percuma 14 Hari <ArrowRight className="w-4 h-4" />
          </button>
          <button onClick={() => scrollTo('ciri')}
            className="flex items-center justify-center gap-2 bg-surface-card hover:bg-surface-bone border border-hairline text-ink font-semibold rounded-full px-8 py-4 text-base transition-colors">
            Lihat Ciri-ciri <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-center gap-6 text-sm text-mute">
          {['Cuba percuma 14 hari', 'Tiada kad kredit', 'Batal bila-bila masa'].map(t => (
            <span key={t} className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-badge-success" /> {t}
            </span>
          ))}
        </div>
      </section>

      {/* ── LIVE STATS ── */}
      <section className="border-y border-hairline bg-surface-card">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <p className="text-center text-xs font-bold text-mute uppercase tracking-widest mb-8">
            SprayTrack Dalam Angka — Data Masa Nyata
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-10">
            <StatCard value={`${stats?.workshops ?? '—'}+`}    label="Bengkel Berdaftar"   loading={loading} />
            <StatCard value={`${stats?.jobs ?? '—'}+`}         label="Kenderaan Direkod"   loading={loading} />
            <StatCard value={`${stats?.paid ?? '—'}+`}         label="Invois Diselesaikan" loading={loading} />
            <StatCard value={`${stats?.photos ?? '—'}+`}       label="Gambar Dimuat Naik"  loading={loading} />
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="ciri" className="max-w-5xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Ciri-ciri Utama</p>
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-ink mb-4">Semua yang bengkel anda perlukan</h2>
          <p className="text-charcoal text-lg max-w-xl mx-auto">Direka khas untuk bengkel cat & spray Malaysia. Mudah digunakan, tanpa latihan khas.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-surface-card border border-hairline rounded-lg p-5 hover:shadow-sm hover:-translate-y-0.5 transition-all">
              <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center mb-3">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <h3 className="font-display font-bold text-ink text-sm mb-1.5">{title}</h3>
              <p className="text-charcoal text-xs leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="cara" className="bg-surface-card border-y border-hairline">
        <div className="max-w-5xl mx-auto px-4 py-20">
          <div className="text-center mb-12">
            <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Cara Kerja</p>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-ink mb-4">Mula dalam 3 langkah mudah</h2>
            <p className="text-charcoal text-lg">Sistem anda sedia dalam masa kurang dari 5 minit.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-8">
            {steps.map(({ num, title, desc }, i) => (
              <div key={num} className="relative text-center">
                {i < steps.length - 1 && (
                  <div className="hidden sm:block absolute top-7 left-[calc(50%+2rem)] right-0 border-t-2 border-dashed border-red-200" />
                )}
                <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center mx-auto mb-4 relative z-10">
                  <span className="font-display font-bold text-white text-lg">{num}</span>
                </div>
                <h3 className="font-display font-bold text-ink text-lg mb-2">{title}</h3>
                <p className="text-charcoal text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="harga" className="max-w-5xl mx-auto px-4 py-20">
        <div className="text-center mb-4">
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Harga</p>
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-ink mb-4">Bermula dengan RM 0</h2>
          <p className="text-charcoal text-lg">Cuba percuma selama 14 hari. Teruskan dengan harga yang berbaloi.</p>
        </div>

        {/* Early adopter promo */}
        {!loading && stats?.workshops < 10 && (
          <div className="max-w-3xl mx-auto mb-8">
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex items-center gap-4">
              <Zap className="w-5 h-5 text-amber-600 flex-shrink-0" fill="currentColor" />
              <div className="flex-1">
                <p className="text-amber-800 font-bold text-sm">Tawaran Pengguna Awal — {10 - (stats?.workshops ?? 0)} tempat lagi!</p>
                <p className="text-amber-700 text-xs mt-0.5">Bengkel yang mendaftar sekarang mendapat akses <strong>PERCUMA SELAMANYA</strong> — tiada caj selepas percubaan.</p>
              </div>
              <span className="font-display font-bold text-2xl text-amber-700 flex-shrink-0">{stats?.workshops ?? 0}/10</span>
            </div>
          </div>
        )}

        {/* Billing toggle */}
        <BillingToggle stats={stats} loading={loading} />
      </section>

      {/* ── TRUST STRIP ── */}
      <section className="bg-surface-bone border-y border-hairline">
        <div className="max-w-5xl mx-auto px-4 py-12">
          <div className="grid sm:grid-cols-3 gap-8 text-center">
            {[
              { icon: Shield,   title: 'Data Selamat',         desc: 'Enkripsi penuh. Data bengkel anda tidak dikongsi dengan sesiapa.' },
              { icon: Bell,     title: 'Akses Dari Mana-mana', desc: 'Telefon, tablet atau komputer. Data sentiasa disegerakkan dalam masa nyata.' },
              { icon: TrendingUp, title: 'Sokong Pertumbuhan', desc: 'Dari 1 pekerja ke 20 — sistem skala mengikut keperluan bengkel anda.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title}>
                <div className="w-10 h-10 rounded-full bg-surface-card border border-hairline flex items-center justify-center mx-auto mb-3">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-ink mb-1">{title}</h3>
                <p className="text-charcoal text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="max-w-3xl mx-auto px-4 py-20">
        <div className="text-center mb-10">
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">FAQ</p>
          <h2 className="font-display font-bold text-3xl text-ink">Soalan Lazim</h2>
        </div>
        <div className="space-y-3">
          {faqs.map(f => <FaqItem key={f.q} {...f} />)}
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="bg-primary">
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <p className="text-white/70 text-sm font-semibold uppercase tracking-widest mb-4">Sedia bermula?</p>
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-white mb-5">
            Cuba percuma. Tiada risiko.
          </h2>
          <p className="text-white/80 text-lg mb-8">
            14 hari penuh, semua ciri tersedia. Tiada kad kredit.<br className="hidden sm:block" />
            Batal bila-bila masa tanpa sebarang caj.
          </p>
          <Link to="/register"
            className="inline-flex items-center gap-2 bg-white hover:bg-surface-bone text-primary font-bold rounded-full px-10 py-4 text-base transition-colors">
            Mulakan Percuma Sekarang <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="text-white/50 text-xs mt-4">Daftar dalam 30 saat · Tiada kad kredit</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-surface-deep">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                  <Wrench className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="font-display font-bold text-on-dark">SprayTrack</span>
              </div>
              <p className="text-on-dark-mute text-xs max-w-xs">Sistem pengurusan bengkel cat & spray untuk Malaysia. Mudah, pantas dan boleh dipercayai.</p>
            </div>
            <div className="flex flex-col sm:items-end gap-3">
              <div className="flex items-center gap-5 text-on-dark-mute text-xs">
                {[['Ciri-ciri','ciri'], ['Cara Kerja','cara'], ['Harga','harga'], ['FAQ','faq']].map(([label, id]) => (
                  <button key={id} onClick={() => scrollTo(id)} className="hover:text-on-dark transition-colors">{label}</button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <Link to="/login"    className="text-on-dark-mute hover:text-on-dark text-xs transition-colors">Log Masuk</Link>
                <Link to="/register" className="bg-primary hover:bg-primary-deep text-white text-xs font-semibold px-4 py-2 rounded-full transition-colors">Daftar Percuma</Link>
              </div>
            </div>
          </div>
          <div className="border-t border-divider-dark mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-on-dark-mute text-xs">© {new Date().getFullYear()} SprayTrack. Hak cipta terpelihara.</p>
            <p className="text-on-dark-mute text-xs">Dibina untuk bengkel Malaysia 🇲🇾</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
