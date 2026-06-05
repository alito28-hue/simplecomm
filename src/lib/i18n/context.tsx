'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { es } from './es';
import { en } from './en';

type Locale = 'es' | 'en';

interface I18nContextType {
  locale: Locale;
  t: typeof es;
  setLocale: (l: Locale) => void;
}

const I18nContext = createContext<I18nContextType>({
  locale: 'es',
  t: es,
  setLocale: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === 'undefined') return 'es';
    const saved = localStorage.getItem('sc_locale') as Locale;
    return saved === 'en' || saved === 'es' ? saved : 'es';
  });

  function setLocale(l: Locale) {
    setLocaleState(l);
    localStorage.setItem('sc_locale', l);
  }

  const t = locale === 'es' ? es : en;

  return (
    <I18nContext.Provider value={{ locale, t, setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
