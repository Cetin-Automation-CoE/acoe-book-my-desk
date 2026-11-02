import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { dictionaries, getLang, setLang as persistLang, type Lang, type Strings } from '../strings'

interface LangState {
  lang: Lang
  t: Strings
  setLang: (lang: Lang) => void
}

const LangContext = createContext<LangState>({ lang: 'en', t: dictionaries.en, setLang: () => {} })

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getLang)
  const setLang = useCallback((next: Lang) => {
    persistLang(next)
    setLangState(next)
    document.documentElement.lang = next
  }, [])
  const value = useMemo(() => ({ lang, t: dictionaries[lang], setLang }), [lang, setLang])
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

export function useLang() {
  return useContext(LangContext)
}

export function useT(): Strings {
  return useContext(LangContext).t
}
