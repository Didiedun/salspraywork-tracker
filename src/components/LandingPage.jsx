import { Link } from 'react-router-dom'
import {
  Wrench, ClipboardList, Package, Users, Smartphone, FileText,
  CheckCircle, ArrowRight, Star, BarChart2, Bell, Shield
} from 'lucide-react'

const features = [
  {
    icon: ClipboardList,
    title: 'Pengurusan Kerja',
    desc: 'Tambah, kemaskini dan jejak semua kerja dalam bengkel. Tahu status setiap kereta pada bila-bila masa.',
  },
  {
    icon: Smartphone,
    title: 'Pelanggan Semak Sendiri',
    desc: 'Pelanggan boleh semak status kenderaan mereka sendiri melalui link khas bengkel anda. Kurang panggilan, lebih fokus.',
  },
  {
    icon: Package,
    title: 'Inventori Masa Nyata',
    desc: 'Pantau stok cat, bahan dan peralatan. Amaran automatik bila stok hampir habis.',
  },
  {
    icon: Users,
    title: 'Akaun Pekerja',
    desc: 'Jemput pekerja masuk sistem. Mereka lihat tugasan mereka sahaja — tanpa akses ke maklumat kewangan.',
  },
  {
    icon: FileText,
    title: 'Resit & Invois',
    desc: 'Jana resit profesional terus dari sistem. Pelanggan boleh simpan sebagai PDF.',
  },
  {
    icon: BarChart2,
    title: 'Laporan Pendapatan',
    desc: 'Lihat carta pendapatan bulanan, kerja tertunggak dan prestasi bengkel dalam sekilas pandang.',
  },
]

const steps = [
  { num: '01', title: 'Daftar Percuma', desc: 'Buat akaun dalam masa 30 saat. Tiada kad kredit diperlukan.' },
  { num: '02', title: 'Tetapkan Bengkel', desc: 'Masukkan nama bengkel. Sistem terus sedia untuk digunakan.' },
  { num: '03', title: 'Mula Urus Kerja', desc: 'Tambah kerja pertama dan kongsi link status kepada pelanggan.' },
]

const pricingFeatures = [
  'Kerja tanpa had',
  'Paparan status pelanggan',
  'Pengurusan inventori',
  'Akaun pekerja (tanpa had)',
  'Resit & invois digital',
  'Laporan pendapatan',
  'Sokongan melalui WhatsApp',
]

const faqs = [
  {
    q: 'Adakah data saya selamat?',
    a: 'Ya. Data anda disimpan di Supabase, platform pangkalan data bertaraf enterprise yang digunakan oleh ribuan syarikat di seluruh dunia. Setiap bengkel hanya boleh akses data mereka sendiri.',
  },
  {
    q: 'Boleh guna dari telefon?',
    a: 'Ya, SprayTrack direka khas untuk mudah alih. Ia berfungsi lancar di telefon, tablet dan komputer tanpa perlu muat turun aplikasi.',
  },
  {
    q: 'Apa yang berlaku selepas 14 hari percuma?',
    a: 'Anda akan dimaklumkan. Jika ingin teruskan, bayar RM30/bulan. Jika tidak, akaun akan dibekukan tetapi data anda tidak dipadam.',
  },
  {
    q: 'Berapa ramai pekerja boleh ditambah?',
    a: 'Tiada had. Tambah seberapa ramai pekerja yang anda perlukan tanpa kos tambahan.',
  },
]

export function LandingPage() {
  return (
    <div className="min-h-screen bg-canvas">
      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-canvas/90 backdrop-blur border-b border-hairline">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <Wrench className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-ink text-base">SprayTrack</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login"
              className="text-sm font-semibold text-charcoal hover:text-ink px-4 py-2 rounded-full hover:bg-surface-bone transition-colors">
              Log Masuk
            </Link>
            <Link to="/register"
              className="text-sm font-semibold bg-primary hover:bg-primary-deep text-white px-5 py-2 rounded-full transition-colors">
              Cuba Percuma
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-red-50 border border-red-200 text-primary text-xs font-semibold px-4 py-1.5 rounded-full mb-6">
          <Star className="w-3.5 h-3.5" /> Percuma 14 hari · Tiada kad kredit diperlukan
        </div>
        <h1 className="font-display font-bold text-4xl sm:text-5xl text-ink leading-tight mb-5 max-w-3xl mx-auto">
          Urus Bengkel Cat Anda<br />
          <span className="text-primary">Lebih Mudah, Lebih Kemas</span>
        </h1>
        <p className="text-charcoal text-lg sm:text-xl max-w-2xl mx-auto mb-8 leading-relaxed">
          Sistem pengurusan lengkap untuk bengkel cat & spray. Jejak kerja, inventori, pekerja dan pelanggan — semua dalam satu platform.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/register"
            className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-deep text-white font-bold rounded-full px-8 py-4 text-base transition-colors">
            Mulakan Percuma <ArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/login"
            className="flex items-center justify-center gap-2 bg-surface-card hover:bg-surface-bone border border-hairline text-ink font-semibold rounded-full px-8 py-4 text-base transition-colors">
            Log Masuk
          </Link>
        </div>
        <p className="text-ash text-sm mt-4">14 hari percuma · Kemudian RM30/bulan · Batal bila-bila masa</p>
      </section>

      {/* Stats strip */}
      <section className="border-y border-hairline bg-surface-card">
        <div className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[
            { value: 'RM30', label: 'Sebulan sahaja' },
            { value: '14 hari', label: 'Cuba percuma' },
            { value: '∞', label: 'Pekerja & kerja' },
            { value: '24/7', label: 'Akses dari mana-mana' },
          ].map(({ value, label }) => (
            <div key={label}>
              <p className="font-display font-bold text-2xl text-primary">{value}</p>
              <p className="text-charcoal text-sm mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="font-display font-bold text-3xl text-ink mb-3">Semua yang bengkel anda perlukan</h2>
          <p className="text-charcoal text-lg max-w-xl mx-auto">Direka khas untuk bengkel cat & spray di Malaysia. Mudah digunakan, tanpa latihan khas.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-surface-card border border-hairline rounded-lg p-6 hover:shadow-sm transition-shadow">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-display font-bold text-ink mb-2">{title}</h3>
              <p className="text-charcoal text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-surface-card border-y border-hairline">
        <div className="max-w-5xl mx-auto px-4 py-20">
          <div className="text-center mb-12">
            <h2 className="font-display font-bold text-3xl text-ink mb-3">Mula dalam 3 langkah</h2>
            <p className="text-charcoal text-lg">Sistem anda sedia dalam masa kurang dari 5 minit.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-8">
            {steps.map(({ num, title, desc }) => (
              <div key={num} className="text-center">
                <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center mx-auto mb-4">
                  <span className="font-display font-bold text-white text-lg">{num}</span>
                </div>
                <h3 className="font-display font-bold text-ink text-lg mb-2">{title}</h3>
                <p className="text-charcoal text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-5xl mx-auto px-4 py-20" id="harga">
        <div className="text-center mb-12">
          <h2 className="font-display font-bold text-3xl text-ink mb-3">Harga yang jelas, tiada kejutan</h2>
          <p className="text-charcoal text-lg">Satu pelan sahaja. Semua ciri tersedia.</p>
        </div>
        <div className="max-w-sm mx-auto">
          <div className="bg-surface-card border-2 border-primary rounded-xl p-8 text-center shadow-sm relative">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="bg-primary text-white text-xs font-bold px-4 py-1.5 rounded-full">PALING POPULAR</span>
            </div>
            <p className="text-charcoal font-semibold mb-1">Pelan Bengkel</p>
            <div className="flex items-end justify-center gap-1 my-4">
              <span className="text-mute text-lg">RM</span>
              <span className="font-display font-bold text-5xl text-ink">30</span>
              <span className="text-mute mb-2">/bulan</span>
            </div>
            <p className="text-badge-success text-sm font-semibold mb-6">14 hari percuma · Tiada kad kredit</p>
            <ul className="space-y-3 text-left mb-8">
              {pricingFeatures.map(f => (
                <li key={f} className="flex items-center gap-3 text-sm text-charcoal">
                  <CheckCircle className="w-4 h-4 text-badge-success flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Link to="/register"
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-deep text-white font-bold rounded-full py-4 transition-colors text-sm">
              Cuba Percuma Sekarang <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="bg-surface-bone border-y border-hairline">
        <div className="max-w-5xl mx-auto px-4 py-12">
          <div className="grid sm:grid-cols-3 gap-6 text-center">
            {[
              { icon: Shield, title: 'Data Selamat', desc: 'Enkripsi penuh. Data bengkel anda tidak dikongsi dengan sesiapa.' },
              { icon: Bell,   title: 'Sentiasa Terkini', desc: 'Akses dari telefon, tablet atau komputer. Data sentiasa disegerakkan.' },
              { icon: Wrench, title: 'Sokongan Aktif', desc: 'Ada masalah? Hubungi kami melalui WhatsApp. Kami respon dengan cepat.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-surface-card border border-hairline flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-ink mb-1">{title}</h3>
                <p className="text-charcoal text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 py-20">
        <div className="text-center mb-10">
          <h2 className="font-display font-bold text-3xl text-ink">Soalan Lazim</h2>
        </div>
        <div className="space-y-4">
          {faqs.map(({ q, a }) => (
            <div key={q} className="bg-surface-card border border-hairline rounded-lg p-6">
              <h3 className="font-semibold text-ink mb-2">{q}</h3>
              <p className="text-charcoal text-sm leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary">
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <h2 className="font-display font-bold text-3xl text-white mb-4">Sedia urus bengkel dengan lebih baik?</h2>
          <p className="text-white/80 text-lg mb-8">Cuba percuma selama 14 hari. Tiada kad kredit. Batal bila-bila masa.</p>
          <Link to="/register"
            className="inline-flex items-center gap-2 bg-white hover:bg-surface-bone text-primary font-bold rounded-full px-8 py-4 text-base transition-colors">
            Mulakan Percuma <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-surface-deep">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                  <Wrench className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="font-display font-bold text-on-dark text-sm">SprayTrack</span>
              </div>
              <p className="text-on-dark-mute text-xs">Sistem pengurusan bengkel cat & spray untuk Malaysia.</p>
            </div>
            <div className="flex items-center gap-6 text-on-dark-mute text-xs">
              <Link to="/login"    className="hover:text-on-dark transition-colors">Log Masuk</Link>
              <Link to="/register" className="hover:text-on-dark transition-colors">Daftar</Link>
            </div>
          </div>
          <div className="border-t border-divider-dark mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-on-dark-mute text-xs">© {new Date().getFullYear()} SprayTrack. Hak cipta terpelihara.</p>
            <p className="text-on-dark-mute text-xs">Dibina untuk bengkel Malaysia</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
