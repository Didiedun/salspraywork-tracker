import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowLeft, Mail, Phone, MapPin } from 'lucide-react'
import { useLang } from '../context/LanguageContext'
import { LEGAL, fillLegal } from '../legal/content'
import { BUSINESS, LEGAL_VERSION } from '../legal/business'

// **bold** spans inside a paragraph or list item.
function Rich({ text }) {
  return fillLegal(text, BUSINESS).split(/\*\*(.+?)\*\*/g)
    .map((part, i) => (i % 2 ? <strong key={i} className="font-semibold text-ink">{part}</strong> : part))
}

// Who runs Digital Depot and how to reach them (the e-commerce regulations' disclosures).
export function BusinessDetails({ className = '' }) {
  const { t } = useLang()
  const row = 'flex items-start gap-2'
  return (
    <div className={`text-sm text-charcoal space-y-1.5 ${className}`}>
      {BUSINESS.operator && <p className="font-semibold text-ink">{t('legal_operator', { name: BUSINESS.operator })}</p>}
      {BUSINESS.ssm && <p>{t('legal_ssm', { ssm: BUSINESS.ssm })}</p>}
      <p className={row}><Mail className="w-4 h-4 mt-0.5 text-mute flex-shrink-0" aria-hidden="true" />
        <a href={`mailto:${BUSINESS.email}`} className="font-semibold text-primary underline underline-offset-2 break-all">{BUSINESS.email}</a></p>
      {BUSINESS.phone && <p className={row}><Phone className="w-4 h-4 mt-0.5 text-mute flex-shrink-0" aria-hidden="true" />
        <a href={`tel:${BUSINESS.phone.replace(/[^\d+]/g, '')}`} className="font-semibold text-primary underline underline-offset-2">{BUSINESS.phone}</a></p>}
      {BUSINESS.address && <p className={row}><MapPin className="w-4 h-4 mt-0.5 text-mute flex-shrink-0" aria-hidden="true" /><span>{BUSINESS.address}</span></p>}
    </div>
  )
}

export function LegalPage({ kind }) {
  const { lang, setLang, t } = useLang()
  const doc = LEGAL[kind][lang === 'en' ? 'en' : 'ms']
  const { hash } = useLocation()

  useEffect(() => {
    const before = document.title
    document.title = `${doc.title} — Digital Depot`
    return () => { document.title = before }
  }, [doc.title])
  useEffect(() => {
    if (hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ block: 'start' })
    else window.scrollTo(0, 0)
  }, [hash, kind])

  const effective = new Date(`${LEGAL_VERSION}T00:00:00`)
    .toLocaleDateString(lang === 'en' ? 'en-MY' : 'ms-MY', { day: 'numeric', month: 'long', year: 'numeric' })
  const [otherHref, otherLabel] = kind === 'privacy' ? ['/terma', t('legal_terms')] : ['/privasi', t('legal_privacy')]

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="sticky top-0 z-30 bg-canvas/95 backdrop-blur border-b border-hairline">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <Link to="/" className="inline-flex items-center gap-2.5 min-h-11">
            <span className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
              <span className="font-display font-bold text-white text-xs">DD</span>
            </span>
            <span className="font-display font-bold text-ink">Digital Depot</span>
          </Link>
          <div role="group" aria-label={t('legal_language')} className="flex rounded-full border border-hairline bg-surface-card p-0.5 text-xs font-semibold">
            {[['ms', 'BM'], ['en', 'EN']].map(([code, label]) => (
              <button key={code} type="button" onClick={() => setLang(code)} aria-pressed={lang === code}
                className={`min-w-11 px-3 py-2 rounded-full transition-colors ${lang === code ? 'bg-primary text-white' : 'text-charcoal hover:text-ink'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main id="main-content" className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <h1 className="font-display font-bold text-4xl sm:text-5xl text-ink leading-tight">{doc.title}</h1>
        <p className="text-sm text-mute mt-2">{t('legal_effective', { date: effective })}</p>
        {doc.intro.map(p => <p key={p} className="text-base text-charcoal leading-relaxed mt-5"><Rich text={p} /></p>)}

        <section aria-labelledby="legal-who" className="mt-6 rounded-xl border border-hairline bg-surface-card p-5">
          <h2 id="legal-who" className="text-xs font-bold uppercase tracking-widest text-mute mb-3">{t('legal_contact')}</h2>
          <BusinessDetails />
        </section>

        <nav aria-label={t('legal_contents')} className="mt-8">
          <h2 className="text-xs font-bold uppercase tracking-widest text-mute mb-3">{t('legal_contents')}</h2>
          <ol className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm list-decimal list-inside text-charcoal">
            {doc.sections.map(s => (
              <li key={s.id}><a href={`#${s.id}`} className="text-primary hover:text-primary-deep underline-offset-2 hover:underline">{s.title}</a></li>
            ))}
          </ol>
        </nav>

        <div className="mt-10 space-y-10">
          {doc.sections.map((s, n) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="scroll-mt-20">
              <h2 id={`${s.id}-h`} className="font-display font-bold text-2xl text-ink">{n + 1}. {s.title}</h2>
              <div className="mt-3 space-y-3 text-base text-charcoal leading-relaxed">
                {s.blocks.map((b, i) => Array.isArray(b)
                  ? <ul key={i} className="list-disc pl-5 space-y-2 marker:text-stone">{b.map(item => <li key={item}><Rich text={item} /></li>)}</ul>
                  : <p key={i}><Rich text={b} /></p>)}
              </div>
            </section>
          ))}
        </div>

        <footer className="mt-14 pt-6 border-t border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm">
          <Link to="/" className="inline-flex items-center gap-2 font-semibold text-charcoal hover:text-ink min-h-11">
            <ArrowLeft className="w-4 h-4" /> {t('ui_back_home')}
          </Link>
          <Link to={otherHref} className="font-semibold text-primary underline underline-offset-2 hover:text-primary-deep">{otherLabel}</Link>
        </footer>
      </main>
    </div>
  )
}
