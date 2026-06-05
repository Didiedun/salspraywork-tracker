import { createContext, useContext, useState } from 'react'
import { translations } from '../i18n'

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('lang') || 'ms')

  const setLang = (l) => {
    setLangState(l)
    localStorage.setItem('lang', l)
  }

  const t = (key) => translations[lang]?.[key] ?? translations.ms[key] ?? key

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLang = () => useContext(LanguageContext)
