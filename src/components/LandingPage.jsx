import { Link } from 'react-router-dom'
import { usePlatformStats } from '../hooks/usePlatformStats'
import { useLang } from '../context/LanguageContext'
import {
  ClipboardList, Package, Users, Smartphone, FileText,
  CheckCircle, ArrowRight, BarChart2, Shield, Zap,
  ChevronDown, Star, TrendingUp, Clock, Camera,
  MessageSquare, BookOpen, AlertTriangle,
} from 'lucide-react'
import { useState } from 'react'

/* ─── helpers ─────────────────────────────────────────── */
function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <button onClick={() => setOpen(o => !o)}
      className="w-full text-left bg-surface-card border border-hairline rounded-xl px-6 py-5 hover:bg-surface-bone transition-colors">
      <div className="flex items-center justify-between gap-4">
        <p className="font-semibold text-ink text-sm">{q}</p>
        <ChevronDown className={`w-4 h-4 text-ash flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>
      {open && <p className="text-charcoal text-sm mt-3 leading-relaxed text-left">{a}</p>}
    </button>
  )
}

/* ─── App preview mockups ─────────────────────────────── */
function DashboardMockup() {
  return (
    <div className="rounded-2xl overflow-hidden shadow-2xl border border-black/10 bg-canvas select-none">
      {/* Browser chrome */}
      <div className="bg-surface-bone border-b border-hairline px-3 py-2 flex items-center gap-2.5">
        <div className="flex gap-1 flex-shrink-0">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 bg-canvas rounded px-2.5 py-0.5 text-[9px] text-mute font-mono truncate">
          app.digitaldepot.my/dashboard
        </div>
      </div>
      {/* App */}
      <div className="flex h-60">
        {/* Sidebar */}
        <div className="w-36 bg-surface-deep flex-shrink-0 flex flex-col">
          <div className="px-2.5 py-2.5 border-b border-white/10">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded bg-primary flex items-center justify-center flex-shrink-0">
                <span className="text-white text-[7px] font-bold">DD</span>
              </div>
              <div className="min-w-0">
                <p className="text-on-dark text-[8px] font-bold leading-tight">Digital Depot</p>
                <p className="text-on-dark/40 text-[7px] truncate leading-tight">Bengkel Maju Jaya</p>
              </div>
            </div>
          </div>
          <div className="flex-1 p-1.5 space-y-0.5">
            {[['Dashboard', true], ['Inventori', false], ['Pekerja', false], ['Tetapan', false]].map(([label, active]) => (
              <div key={label} className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[8px] font-semibold ${active ? 'bg-primary text-white' : 'text-on-dark/50'}`}>
                <div className={`w-1 h-1 rounded-full flex-shrink-0 ${active ? 'bg-white' : 'bg-white/25'}`} />
                {label}
              </div>
            ))}
          </div>
          <div className="p-1.5 border-t border-white/10">
            <div className="flex items-center gap-1.5 px-2 py-1.5 text-on-dark/30 text-[8px]">
              <div className="w-1 h-1 rounded-full bg-white/15" /> Log Keluar
            </div>
          </div>
        </div>
        {/* Main */}
        <div className="flex-1 bg-canvas p-3 overflow-hidden">
          <div className="grid grid-cols-3 gap-1.5 mb-2.5">
            {[['8', 'Kerja Aktif'], ['3', 'Siap Hari Ini'], ['RM 2.4k', 'Bulan Ini']].map(([v, l], i) => (
              <div key={l} className={`rounded-lg p-2 border ${i === 2 ? 'bg-primary/5 border-primary/20' : 'bg-surface-card border-hairline'}`}>
                <p className={`font-bold text-xs ${i === 2 ? 'text-primary' : 'text-ink'}`}>{v}</p>
                <p className="text-mute text-[8px] mt-0.5">{l}</p>
              </div>
            ))}
          </div>
          <p className="text-mute text-[8px] font-bold uppercase tracking-wide mb-1.5">Kerja Semasa</p>
          {[
            { plate: 'WXX 1234', car: 'Toyota Vios',   stage: 'Cat',    cls: 'text-primary bg-primary/10' },
            { plate: 'BYD 5678', car: 'Honda Civic',   stage: 'Dempul', cls: 'text-amber-600 bg-amber-50' },
            { plate: 'VXD 9012', car: 'Perodua Myvi',  stage: 'Polish', cls: 'text-emerald-600 bg-emerald-50' },
          ].map(({ plate, car, stage, cls }) => (
            <div key={plate} className="bg-surface-card border border-hairline rounded-lg px-2.5 py-1.5 flex items-center justify-between mb-1">
              <div>
                <p className="text-ink text-[9px] font-bold font-mono tracking-wider">{plate}</p>
                <p className="text-mute text-[8px]">{car}</p>
              </div>
              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${cls}`}>{stage}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function CustomerMockup() {
  return (
    <div className="w-40 flex-shrink-0 select-none">
      <div className="bg-surface-dark rounded-[1.75rem] p-1.5 shadow-2xl border border-white/10">
        <div className="bg-canvas rounded-[1.25rem] overflow-hidden">
          {/* Status bar */}
          <div className="px-3 pt-2 pb-1 flex justify-between items-center">
            <span className="text-ink text-[8px] font-bold">9:41</span>
            <div className="flex gap-px items-end">
              {[2, 3, 4, 3].map((h, i) => (
                <div key={i} className={`w-0.5 rounded-sm ${i < 3 ? 'bg-ink' : 'bg-ink/25'}`} style={{ height: h * 2 }} />
              ))}
            </div>
          </div>
          {/* Header */}
          <div className="border-b border-hairline px-3 py-2 flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <span className="text-white text-[7px] font-bold">B</span>
            </div>
            <div>
              <p className="text-ink text-[8px] font-bold leading-tight">Bengkel Maju Jaya</p>
              <p className="text-mute text-[7px] leading-tight">Semak Status Kenderaan</p>
            </div>
          </div>
          {/* Search */}
          <div className="px-2.5 py-2">
            <div className="bg-surface-bone border border-hairline rounded-full px-2.5 py-1.5 text-[8px] text-mute">
              🔍  No. plat anda...
            </div>
          </div>
          {/* Result */}
          <div className="px-2.5 pb-3">
            <div className="bg-primary rounded-lg py-1.5 text-center mb-2">
              <p className="text-white font-bold text-[10px] tracking-[0.15em]">WXX 1234</p>
            </div>
            <div className="bg-surface-card border border-hairline rounded-lg p-2 space-y-1.5">
              {[
                { s: 'Terima',      done: true,  cur: false },
                { s: 'Ketuk & Tarik', done: true,  cur: false },
                { s: 'Dempul',      done: true,  cur: true  },
                { s: 'Cat Spray',   done: false, cur: false },
                { s: 'Siap',        done: false, cur: false },
              ].map(({ s, done, cur }) => (
                <div key={s} className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${done ? 'bg-primary' : 'bg-hairline border border-hairline'}`} />
                  <span className={`text-[7px] flex-1 leading-none ${done ? 'text-ink font-medium' : 'text-mute'}`}>{s}</span>
                  {cur && <span className="text-primary text-[6px] font-bold">SEDANG</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── data ─────────────────────────────────────────────── */
const painPoints = [
  {
    icon: MessageSquare,
    title: 'WhatsApp tak berhenti',
    desc: '"Kereta saya dah siap ke?" — Layan pelanggan satu persatu setiap hari.',
    fix:  'Portal status — pelanggan semak sendiri, tanpa ganggu anda.',
  },
  {
    icon: BookOpen,
    title: 'Nota & buku rekod berselerak',
    desc: 'Kerja terselit dalam mesej, nota hilang, susah nak cari rekod lama.',
    fix:  'Semua rekod dalam satu sistem, boleh cari pada bila-bila masa.',
  },
  {
    icon: AlertTriangle,
    title: 'Stok habis tengah kerja',
    desc: 'Tiba-tiba kehabisan cat atau bahan — baru tahu masa nak guna.',
    fix:  'Amaran automatik bila stok hampir habis, sebelum terlambat.',
  },
]

const features = [
  { icon: ClipboardList, title: 'Pengurusan Kerja',        desc: 'Jejak setiap kenderaan dari mula hingga siap. Tahu status setiap kerja pada bila-bila masa.' },
  { icon: Smartphone,    title: 'Portal Status Pelanggan', desc: 'Pelanggan semak sendiri melalui link khas bengkel. Kurang call, lebih fokus kerja.' },
  { icon: Package,       title: 'Inventori Masa Nyata',    desc: 'Pantau stok bahan. Amaran automatik sebelum kehabisan supaya kerja tidak terganggu.' },
  { icon: Users,         title: 'Pengurusan Pekerja',      desc: 'Jemput pekerja masuk sistem. Mereka nampak tugasan sahaja — data kewangan tetap peribadi.' },
  { icon: FileText,      title: 'Resit & Invois Digital',  desc: 'Jana resit profesional terus dari sistem. Pelanggan simpan sebagai PDF tanpa pencetak.' },
  { icon: BarChart2,     title: 'Laporan Pendapatan',      desc: 'Lihat pendapatan bulanan, kerja tertunggak dan prestasi bengkel dalam satu pandangan.' },
  { icon: Camera,        title: 'Gambar Sebelum & Selepas', desc: 'Lampir foto setiap peringkat kerja sebagai bukti kepada pelanggan dan rekod bengkel.' },
  { icon: Clock,         title: 'Amaran Kerja Tertangguh', desc: 'Sistem tandakan kerja melebihi tempoh secara automatik. Tiada kerja terlupa atau tertangguh.' },
]

const steps = [
  { num: '01', title: 'Daftar Percuma',   desc: 'Buat akaun dalam masa 30 saat guna Google. Tiada kad kredit, tiada borang panjang.' },
  { num: '02', title: 'Tetapkan Bengkel', desc: 'Namakan bengkel anda. Link status pelanggan terus sedia untuk dikongsi kepada pelanggan.' },
  { num: '03', title: 'Mula Urus Kerja',  desc: 'Tambah kerja pertama dan jemput pekerja masuk. Sistem terus sedia digunakan.' },
]

const trialFeatures = [
  'Rekod kenderaan (maks 30 kerja aktif)',
  'Portal status pelanggan',
  'Resit & invois digital (print / PDF)',
  '1 akaun pekerja',
  'Inventori (maks 20 item)',
  'Ringkasan pendapatan asas',
]

const proExtras = [
  'Kerja, pekerja & inventori tanpa had',
  'Laporan & analitik lanjutan',
  'Eksport data (CSV / PDF)',
  'Sokongan keutamaan WhatsApp',
]

const earlyBirdFeatures = [
  'Kerja & rekod kenderaan tanpa had',
  'Portal status pelanggan',
  'Pekerja & kod jemputan tanpa had',
  'Resit & invois digital (print / PDF)',
  'Inventori & pemantauan stok tanpa had',
  'Laporan & analitik penuh',
  'Eksport data (CSV / PDF)',
]

const faqs = [
  { q: 'Apa yang berlaku selepas tempoh percuma?', a: 'Kami akan hantar peringatan sebelum tamat. Pendaftar awal (early bird) mendapat RM20/bulan selamanya selepas 12 bulan percuma. Pendaftar biasa perlu naik taraf ke Pro (RM30/bulan) selepas 14 hari percubaan. Jika tidak, akaun dibekukan — data anda tidak dipadam.' },
  { q: 'Apa had dalam percubaan percuma?', a: 'Semasa 14 hari percubaan, anda boleh rekod sehingga 30 kerja aktif, tambah 1 akaun pekerja, dan simpan sehingga 20 item inventori. Naik taraf ke Pro untuk semua had tanpa had.' },
  { q: 'Sistem ini untuk jenis bengkel apa?', a: 'Digital Depot sesuai untuk pelbagai jenis bengkel kereta — bengkel cat & spray, ketuk & tarik, dempul, polish, servis umum dan lain-lain. Setiap bengkel boleh tetapkan peringkat kerja sendiri mengikut aliran kerja mereka.' },
  { q: 'Boleh guna dari telefon?', a: 'Ya, Digital Depot direka khas untuk mudah alih. Berfungsi lancar di telefon, tablet dan komputer — tiada aplikasi perlu dimuat turun. Buka pelayar web, terus boleh guna.' },
  { q: 'Adakah data bengkel saya selamat?', a: 'Data anda disimpan di pelayan bertaraf enterprise dengan enkripsi penuh. Setiap bengkel hanya boleh akses data mereka sendiri. Kami tidak kongsi maklumat anda dengan mana-mana pihak.' },
]

/* ─── billing toggle component ───────────────────────── */
function BillingToggle({ stats, loading }) {
  const [annual, setAnnual] = useState(false)
  const { t } = useLang()
  const earlyBird = !loading && (stats?.workshops ?? 0) < 10
  const spotsLeft = Math.max(0, 10 - (stats?.workshops ?? 0))
  const freeFeatures = earlyBird ? earlyBirdFeatures : trialFeatures

  const proMonthly = earlyBird ? 20 : 30
  const proAnnual  = earlyBird ? 200 : 300
  const proSaving  = earlyBird ? 40 : 60
  const proPrice   = annual ? proAnnual : proMonthly
  const proUnit    = annual ? 'tahun' : 'bulan'

  return (
    <div className="max-w-4xl mx-auto">

      {/* ── Annual / Monthly toggle ── */}
      <div className="flex items-center justify-center gap-3 mb-8">
        <span className={`text-sm font-semibold transition-colors ${!annual ? 'text-ink' : 'text-mute'}`}>{t('land_monthly')}</span>
        <button onClick={() => setAnnual(a => !a)}
          className={`relative w-12 h-6 rounded-full transition-colors ${annual ? 'bg-primary' : 'bg-stone'}`}>
          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${annual ? 'translate-x-[26px]' : 'translate-x-0.5'}`} />
        </button>
        <span className={`inline-flex items-center gap-1.5 text-sm font-semibold transition-colors ${annual ? 'text-ink' : 'text-mute'}`}>
          {t('land_annual')}
          <span className="text-xs font-bold text-badge-success bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full whitespace-nowrap">
            {t('land_save_rm')}{proSaving}
          </span>
        </span>
      </div>

      {/* ── Side-by-side cards ── */}
      <div className="grid sm:grid-cols-2 gap-5">

        {/* Free / Early Bird card */}
        <div className="rounded-2xl overflow-hidden border-2 border-primary flex flex-col">
          <div className="bg-primary px-5 py-3 flex items-center gap-2">
            {earlyBird
              ? <><Zap className="w-3.5 h-3.5 text-white flex-shrink-0" fill="white" />
                  <span className="text-white font-bold text-sm">EARLY BIRD — {spotsLeft} tempat lagi</span></>
              : <><Star className="w-3.5 h-3.5 text-white flex-shrink-0" />
                  <span className="text-white font-bold text-sm">PERCUBAAN PERCUMA</span></>
            }
          </div>
          <div className="bg-surface-card px-5 py-5 flex flex-col flex-1">
            <div className="mb-4">
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="font-display font-bold text-4xl text-ink">RM 0</span>
                <span className="text-mute text-sm">{earlyBird ? '/ 12 bulan' : '/ 14 hari'}</span>
              </div>
              <p className="text-charcoal text-sm leading-snug">
                {earlyBird
                  ? `Percuma penuh 12 bulan. Selepas itu, RM${proMonthly}/bulan selamanya.`
                  : 'Cuba semua ciri tanpa komitmen. Tiada kad kredit diperlukan.'}
              </p>
            </div>
            <div className="space-y-2 mb-5 flex-1">
              {freeFeatures.map(f => (
                <div key={f} className="flex items-start gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-badge-success flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-charcoal leading-snug">{f}</span>
                </div>
              ))}
              {!earlyBird && proExtras.map(f => (
                <div key={f} className="flex items-start gap-1.5">
                  <span className="text-stone text-xs flex-shrink-0 font-bold leading-none mt-0.5">—</span>
                  <span className="text-xs text-mute leading-snug line-through">{f}</span>
                </div>
              ))}
            </div>
            <Link to="/register"
              className="w-full inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-deep text-white font-bold rounded-full px-5 py-3 text-sm transition-colors">
              {earlyBird ? 'Daftar Sekarang' : 'Cuba Percuma'} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Pro card */}
        <div className="rounded-2xl overflow-hidden border border-hairline flex flex-col">
          <div className="bg-surface-deep px-5 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-on-dark font-bold text-sm">Pro</span>
              <span className="text-[10px] bg-white/10 text-on-dark/60 px-2 py-0.5 rounded-full font-semibold tracking-wide">AKAN DATANG</span>
            </div>
            {earlyBird && (
              <span className="text-[10px] text-on-dark/60 hidden sm:block">
                Harga khas early bird
              </span>
            )}
          </div>
          <div className="bg-surface-bone px-5 py-5 flex flex-col flex-1">
            <div className="mb-4">
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="font-display font-bold text-4xl text-ink">RM {proPrice}</span>
                <span className="text-mute text-sm">/ {proUnit}</span>
              </div>
              {earlyBird && (
                <p className="text-xs text-badge-success font-semibold mb-1">
                  Harga awal selamanya — tidak akan naik
                </p>
              )}
              <p className="text-charcoal text-sm leading-snug">
                {earlyBird
                  ? 'Semua ciri tanpa had — aktif selepas tempoh percuma.'
                  : 'Semua dalam percubaan, ditambah ciri lanjutan tanpa had.'}
              </p>
            </div>
            <div className="space-y-2 mb-5 flex-1">
              {(earlyBird ? earlyBirdFeatures : trialFeatures).map(f => (
                <div key={f} className="flex items-start gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-ash flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-mute leading-snug">{f}</span>
                </div>
              ))}
              {proExtras.map(f => (
                <div key={f} className="flex items-start gap-1.5">
                  <span className="text-primary font-bold text-sm leading-none flex-shrink-0">+</span>
                  <span className="text-xs text-charcoal leading-snug font-medium">{f}</span>
                </div>
              ))}
            </div>
            <button disabled
              className="w-full inline-flex items-center justify-center gap-2 bg-stone/40 text-mute font-semibold rounded-full px-5 py-3 text-sm cursor-not-allowed">
              Akan Datang
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

/* ─── main component ────────────────────────────────────── */
export function LandingPage() {
  const stats     = usePlatformStats()
  const loading   = stats === null
  const earlyBird = !loading && (stats?.workshops ?? 0) < 10
  const { t } = useLang()

  return (
    <div className="min-h-screen bg-canvas">

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-40 bg-canvas/95 backdrop-blur border-b border-hairline">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
              <span className="font-display font-bold text-white text-xs">DD</span>
            </div>
            <span className="font-display font-bold text-ink">Digital Depot</span>
          </div>
          <div className="hidden sm:flex items-center gap-1">
            {[[t('land_features'),'ciri'], [t('land_how'),'cara'], [t('land_pricing'),'harga'], [t('land_faq'),'faq']].map(([label, id]) => (
              <button key={id} onClick={() => scrollTo(id)}
                className="text-sm text-mute hover:text-ink px-3 py-2 rounded-full hover:bg-surface-bone transition-colors font-medium">
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login"
              className="text-sm font-semibold text-charcoal hover:text-ink px-4 py-2 rounded-full hover:bg-surface-bone transition-colors">
              {t('land_login')}
            </Link>
            <button onClick={() => scrollTo('harga')}
              className="text-sm font-bold bg-primary hover:bg-primary-deep text-white px-5 py-2 rounded-full transition-colors">
              {t('land_free')}
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="max-w-5xl mx-auto px-4 pt-14 pb-10">
        <div className="flex flex-col lg:flex-row items-center gap-10">
          {/* Text */}
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-red-50 border border-red-100 text-primary text-xs font-bold px-4 py-1.5 rounded-full mb-5 tracking-wide">
              <Zap className="w-3.5 h-3.5" fill="currentColor" />
              {earlyBird ? 'EARLY BIRD — PERCUMA 12 BULAN' : 'PERCUMA 14 HARI · TIADA KAD KREDIT'}
            </div>
            <h1 className="font-display font-bold text-4xl sm:text-5xl text-ink leading-[1.1] mb-4">
              Bengkel Anda,<br />
              <span className="text-primary">Diurus Cara Digital.</span>
            </h1>
            <p className="text-charcoal text-lg leading-relaxed mb-7 max-w-lg mx-auto lg:mx-0">
              Jejak kerja, pantau stok dan urus pekerja dalam satu sistem. Pelanggan semak status sendiri. Anda fokus buat kerja.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-5">
              <button onClick={() => scrollTo('harga')}
                className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-deep text-white font-bold rounded-full px-8 py-3.5 text-sm transition-colors shadow-sm">
                {earlyBird ? 'Daftar Percuma — 12 Bulan' : 'Cuba Percuma 14 Hari'} <ArrowRight className="w-4 h-4" />
              </button>
              <button onClick={() => scrollTo('ciri')}
                className="inline-flex items-center justify-center gap-2 bg-surface-card hover:bg-surface-bone border border-hairline text-ink font-semibold rounded-full px-8 py-3.5 text-sm transition-colors">
                Lihat Ciri-ciri
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 text-sm text-mute">
              {['Tiada kad kredit', 'Setup 5 minit', 'Batal bila-bila masa'].map(t => (
                <span key={t} className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-badge-success" /> {t}
                </span>
              ))}
            </div>
          </div>
          {/* Mockups */}
          <div className="flex-1 w-full max-w-lg lg:max-w-none">
            <div className="relative flex items-end gap-3">
              <div className="flex-1">
                <DashboardMockup />
              </div>
              <div className="mb-4">
                <CustomerMockup />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── LIVE STATS ── */}
      <section className="border-y border-hairline bg-surface-card">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <p className="text-center text-xs font-bold text-mute uppercase tracking-widest mb-6">
            Digital Depot Dalam Angka
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-10">
            {[
              [loading ? '—' : `${stats?.workshops ?? 0}+`, 'Bengkel Aktif'],
              [loading ? '—' : `${stats?.jobs ?? 0}+`,      'Kenderaan Direkod'],
              [loading ? '—' : `${stats?.paid ?? 0}+`,      'Invois Diselesaikan'],
              [loading ? '—' : `${stats?.photos ?? 0}+`,    'Gambar Dimuat Naik'],
            ].map(([val, label]) => (
              <div key={label} className="text-center">
                <p className="font-display font-bold text-3xl sm:text-4xl text-primary">{val}</p>
                <p className="text-charcoal text-sm mt-1 font-medium">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PAIN SECTION ── */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Masalah Biasa</p>
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-ink mb-3">
            Masih guna cara lama?
          </h2>
          <p className="text-charcoal text-lg max-w-xl mx-auto">Kebanyakan bengkel masih guna WhatsApp, nota tangan dan agak-agak. Ada jalan yang lebih baik.</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-5">
          {painPoints.map(({ icon: Icon, title, desc, fix }) => (
            <div key={title} className="bg-surface-card border border-hairline rounded-xl p-5">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center mb-3">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-display font-bold text-ink text-sm mb-1.5">{title}</h3>
              <p className="text-mute text-xs leading-relaxed mb-3">{desc}</p>
              <div className="flex items-start gap-1.5 pt-3 border-t border-hairline">
                <CheckCircle className="w-3.5 h-3.5 text-badge-success flex-shrink-0 mt-0.5" />
                <p className="text-charcoal text-xs font-medium leading-snug">{fix}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="ciri" className="bg-surface-card border-y border-hairline">
        <div className="max-w-5xl mx-auto px-4 py-16">
          <div className="text-center mb-10">
            <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Ciri-ciri</p>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-ink mb-3">Semua yang bengkel anda perlukan</h2>
            <p className="text-charcoal text-lg max-w-xl mx-auto">Direka untuk bengkel kereta Malaysia. Mudah digunakan, tiada latihan khas diperlukan.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-canvas border border-hairline rounded-xl p-5 hover:shadow-sm hover:-translate-y-0.5 transition-all">
                <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center mb-3">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <h3 className="font-display font-bold text-ink text-sm mb-1.5">{title}</h3>
                <p className="text-charcoal text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SCREENSHOTS ── */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Antara Muka</p>
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-ink mb-3">Tengok sendiri</h2>
          <p className="text-charcoal text-lg max-w-xl mx-auto">Bersih, mudah dan berfungsi. Direka untuk digunakan di telefon mahupun komputer.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start gap-8">
          <div className="flex-1 w-full">
            <p className="text-xs font-bold text-mute uppercase tracking-wide mb-3">Dashboard Pemilik</p>
            <DashboardMockup />
            <p className="text-charcoal text-sm mt-3 text-center">Papan pemuka lengkap — kerja aktif, pendapatan, stok dan pekerja dalam satu tempat.</p>
          </div>
          <div className="flex justify-center sm:justify-start sm:flex-shrink-0">
            <div>
              <p className="text-xs font-bold text-mute uppercase tracking-wide mb-3 text-center">Portal Pelanggan (Telefon)</p>
              <CustomerMockup />
              <p className="text-charcoal text-sm mt-3 text-center max-w-[10rem]">Pelanggan semak status kenderaan sendiri.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="cara" className="bg-surface-card border-y border-hairline">
        <div className="max-w-5xl mx-auto px-4 py-16">
          <div className="text-center mb-10">
            <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Cara Kerja</p>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-ink mb-3">Mula dalam 3 langkah</h2>
            <p className="text-charcoal text-lg">Sistem anda sedia dalam masa kurang dari 5 minit.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-8">
            {steps.map(({ num, title, desc }, i) => (
              <div key={num} className="relative text-center">
                {i < steps.length - 1 && (
                  <div className="hidden sm:block absolute top-7 left-[calc(50%+2rem)] right-0 border-t-2 border-dashed border-red-200" />
                )}
                <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4 relative z-10 shadow-sm">
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
      <section id="harga" className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Harga</p>
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-ink mb-3">
            {earlyBird ? 'Percuma 12 bulan untuk pendaftar awal' : 'Bermula dengan RM 0'}
          </h2>
          <p className="text-charcoal text-lg">
            {earlyBird ? 'Daftar sekarang sebelum kehabisan tempat.' : 'Cuba percuma selama 14 hari. Naik taraf bila anda sedia.'}
          </p>
        </div>

        {earlyBird && (
          <div className="max-w-4xl mx-auto mb-6">
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex items-center gap-4">
              <Zap className="w-5 h-5 text-amber-600 flex-shrink-0" fill="currentColor" />
              <div className="flex-1">
                <p className="text-amber-800 font-bold text-sm">
                  Tawaran Pengguna Awal — {10 - (stats?.workshops ?? 0)} tempat lagi!
                </p>
                <p className="text-amber-700 text-xs mt-0.5">
                  Daftar sekarang dan dapatkan <strong>PERCUMA 12 BULAN</strong>, kemudian RM20/bulan selamanya.
                </p>
              </div>
              <span className="font-display font-bold text-2xl text-amber-700 flex-shrink-0">
                {stats?.workshops ?? 0}/10
              </span>
            </div>
          </div>
        )}

        <BillingToggle stats={stats} loading={loading} />
      </section>

      {/* ── TRUST STRIP ── */}
      <section className="bg-surface-bone border-y border-hairline">
        <div className="max-w-5xl mx-auto px-4 py-12">
          <div className="grid sm:grid-cols-3 gap-8 text-center">
            {[
              { icon: Shield,     title: 'Data Selamat',          desc: 'Enkripsi penuh. Data bengkel anda tidak dikongsi dengan sesiapa.' },
              { icon: TrendingUp, title: 'Skala Mengikut Keperluan', desc: 'Dari 1 pekerja ke 20 — sistem kami membesar bersama bengkel anda.' },
              { icon: Zap,        title: 'Berfungsi di Mana-mana', desc: 'Telefon, tablet atau komputer. Data sentiasa disegerak masa nyata.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title}>
                <div className="w-10 h-10 rounded-xl bg-surface-card border border-hairline flex items-center justify-center mx-auto mb-3">
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
      <section id="faq" className="max-w-3xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">FAQ</p>
          <h2 className="font-display font-bold text-3xl text-ink">Soalan Lazim</h2>
        </div>
        <div className="space-y-3">
          {faqs.map(f => <FaqItem key={f.q} {...f} />)}
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="bg-surface-deep">
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <p className="text-on-dark/50 text-sm font-semibold uppercase tracking-widest mb-4">Sedia bermula?</p>
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-on-dark mb-4">
            Cuba percuma. Tiada risiko.
          </h2>
          <p className="text-on-dark/70 text-lg mb-8">
            14 hari penuh, semua ciri tersedia. Tiada kad kredit.<br className="hidden sm:block" />
            Batal bila-bila masa.
          </p>
          <Link to="/register"
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-deep text-white font-bold rounded-full px-10 py-4 text-base transition-colors">
            Mulakan Percuma Sekarang <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="text-on-dark/30 text-xs mt-4">Daftar dalam 30 saat · Guna Google · Tiada kad kredit</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-surface-deep border-t border-white/5">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                  <span className="font-display font-bold text-white text-[10px]">DD</span>
                </div>
                <span className="font-display font-bold text-on-dark">Digital Depot</span>
              </div>
              <p className="text-on-dark/40 text-xs max-w-xs">Sistem pengurusan bengkel digital untuk Malaysia. Mudah, pantas dan boleh dipercayai.</p>
            </div>
            <div className="flex flex-col sm:items-end gap-3">
              <div className="flex items-center gap-5 text-on-dark/40 text-xs">
                {[['Ciri-ciri','ciri'], ['Cara Kerja','cara'], ['Harga','harga'], ['FAQ','faq']].map(([label, id]) => (
                  <button key={id} onClick={() => scrollTo(id)} className="hover:text-on-dark transition-colors">{label}</button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <Link to="/login" className="text-on-dark/40 hover:text-on-dark text-xs transition-colors">Log Masuk</Link>
                <Link to="/register" className="bg-primary hover:bg-primary-deep text-white text-xs font-semibold px-4 py-2 rounded-full transition-colors">Daftar Percuma</Link>
              </div>
            </div>
          </div>
          <div className="border-t border-white/5 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-on-dark/25 text-xs">© {new Date().getFullYear()} Digital Depot. Hak cipta terpelihara.</p>
            <p className="text-on-dark/25 text-xs">Dibina untuk bengkel Malaysia 🇲🇾</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
