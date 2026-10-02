import { useEffect, useState } from 'react'
import { ShieldCheck, Loader } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { hasAcceptedLegal, acceptLegal } from '../lib/legal'
import { LEGAL_VERSION } from '../legal/business'
import { useLang } from '../context/LanguageContext'
import { LegalText } from './LegalText'

// Asks signed-in users once to accept the current Terms and Privacy Notice, and records
// it. Shows nothing while checking, once accepted, or if the check itself fails.
export function LegalBanner() {
  const { t, lang } = useLang()
  const [state, setState] = useState('checking')   // checking | needed | saving | error | done

  useEffect(() => {
    let alive = true
    hasAcceptedLegal(supabase).then(ok => { if (alive) setState(ok === false ? 'needed' : 'done') })
    return () => { alive = false }
  }, [])

  if (state === 'checking' || state === 'done') return null

  const accept = async () => {
    setState('saving')
    try { await acceptLegal(supabase); setState('done') } catch { setState('error') }
  }
  const date = new Date(`${LEGAL_VERSION}T00:00:00`)
    .toLocaleDateString(lang === 'en' ? 'en-MY' : 'ms-MY', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div role="region" aria-label={t('legal_banner_label')} className="border-b border-hairline bg-surface-card">
      <div className="px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <ShieldCheck className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-charcoal leading-snug">
            <LegalText text={t('legal_banner', { date })} />
            {state === 'error' && <span role="alert" className="block text-red-700 text-xs mt-1">{t('legal_banner_err')}</span>}
          </p>
        </div>
        <button type="button" onClick={accept} disabled={state === 'saving'}
          className="self-start sm:self-auto inline-flex items-center justify-center gap-2 min-h-11 px-5 rounded-full bg-primary hover:bg-primary-deep disabled:opacity-60 text-white text-sm font-semibold transition-colors flex-shrink-0">
          {state === 'saving' && <Loader className="w-4 h-4 animate-spin" />}
          {t('legal_banner_ok')}
        </button>
      </div>
    </div>
  )
}
