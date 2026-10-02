import { Link } from 'react-router-dom'
import { useLang } from '../context/LanguageContext'

const LINK_CLS = 'font-semibold text-primary underline underline-offset-2 hover:text-primary-deep'

// A translated sentence in which <terms> and <privacy> become links to the two documents.
// newTab keeps a half-filled form (sign-up, onboarding) on screen while the reader opens them.
export function LegalText({ text, newTab = false, className = LINK_CLS }) {
  const { t } = useLang()
  const tab = newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {}
  return text.split(/(<terms>|<privacy>)/).map((part, i) => {
    if (part === '<terms>') return <Link key={i} to="/terma" className={className} {...tab}>{t('legal_terms')}</Link>
    if (part === '<privacy>') return <Link key={i} to="/privasi" className={className} {...tab}>{t('legal_privacy')}</Link>
    return part
  })
}
