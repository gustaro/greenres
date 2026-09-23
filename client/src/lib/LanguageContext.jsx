import { createContext, useContext, useEffect, useState } from 'react'
import { translations } from '../locales/translations'

const LANG_STORAGE_KEY = 'limeleaf_lang'
const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
    const [lang, setLangState] = useState(() => {
        try {
            return localStorage.getItem(LANG_STORAGE_KEY) || 'th'
        } catch {
            return 'th'
        }
    })

    const setLang = (newLang) => {
        const validated = newLang === 'en' ? 'en' : 'th'
        setLangState(validated)
        try {
            localStorage.setItem(LANG_STORAGE_KEY, validated)
        } catch {
            // ignore storage error
        }
    }

    const toggleLang = () => {
        setLang(lang === 'th' ? 'en' : 'th')
    }

    const t = (key, fallback = '') => {
        const currentPack = translations[lang] || translations.th
        if (currentPack && key in currentPack) {
            return currentPack[key]
        }
        // Fallback to Thai or provided fallback
        return translations.th[key] || fallback || key
    }

    const value = {
        lang,
        isEn: lang === 'en',
        isTh: lang === 'th',
        setLang,
        toggleLang,
        t,
    }

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    )
}

export function useLanguage() {
    const context = useContext(LanguageContext)
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider')
    }
    return context
}
