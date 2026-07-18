import { createContext, useContext, useState, useCallback } from 'react'
import taDict from './ta.json'

const SHOW_TAMIL_VERSION = false

// Interpolate {token} placeholders with runtime values.
function interpolate(str, params) {
  if (!params) return str
  return str.replace(/\{(\w+)\}/g, (m, k) => (k in params ? params[k] : m))
}

const LanguageContext = createContext({
  lang: 'en',
  setLang: () => {},
  t: (s) => s,
  showTamilVersion: SHOW_TAMIL_VERSION,
})

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    if (!SHOW_TAMIL_VERSION) return 'en'
    try { return localStorage.getItem('org_lang') === 'ta' ? 'ta' : 'en' } catch { return 'en' }
  })

  const setLang = useCallback((l) => {
    if (!SHOW_TAMIL_VERSION) {
      setLangState('en')
      return
    }
    const next = l === 'ta' ? 'ta' : 'en'
    setLangState(next)
    try { localStorage.setItem('org_lang', next) } catch { /* ignore */ }
  }, [])

  // t('English source text', { token: value }) → Tamil (if lang=ta) else English,
  // with {token} placeholders filled in.
  const t = useCallback((en, params) => {
    const base = (SHOW_TAMIL_VERSION && lang === 'ta') ? (taDict[en] || en) : en
    return interpolate(base, params)
  }, [lang])

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, showTamilVersion: SHOW_TAMIL_VERSION }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLang() {
  return useContext(LanguageContext)
}

