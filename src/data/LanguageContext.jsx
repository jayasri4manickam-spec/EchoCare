import React, { createContext, useContext, useState, useEffect } from 'react';
import { TRANSLATIONS, getTranslation } from './translations';
import { getPatientProfile, savePatientProfile } from '../services/storage';

const LanguageContext = createContext();

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧', speechLang: 'en-IN' },
  { code: 'ta', label: 'தமிழ் (Tamil)', flag: '🇮🇳', speechLang: 'ta-IN' },
  { code: 'hi', label: 'हिन्दी (Hindi)', flag: '🇮🇳', speechLang: 'hi-IN' },
  { code: 'te', label: 'తెలుగు (Telugu)', flag: '🇮🇳', speechLang: 'te-IN' },
  { code: 'ml', label: 'മലയാളം (Malayalam)', flag: '🇮🇳', speechLang: 'ml-IN' },
  { code: 'kn', label: 'ಕನ್ನಡ (Kannada)', flag: '🇮🇳', speechLang: 'kn-IN' },
];

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem('echocare_language');
      if (saved && TRANSLATIONS[saved]) return saved;
      const profile = getPatientProfile();
      if (profile && profile.preferredLanguage) {
        const match = SUPPORTED_LANGUAGES.find(l => profile.preferredLanguage.toLowerCase().startsWith(l.code));
        if (match) return match.code;
      }
    } catch (e) {}
    return 'en';
  });

  const setLanguage = (newLang) => {
    if (!TRANSLATIONS[newLang]) return;
    setLanguageState(newLang);
    localStorage.setItem('echocare_language', newLang);

    // Sync back to patient profile as single source of truth
    const profile = getPatientProfile();
    const langObj = SUPPORTED_LANGUAGES.find((l) => l.code === newLang);
    if (langObj && profile) {
      savePatientProfile({ ...profile, preferredLanguage: langObj.speechLang });
    }
  };

  const t = (key) => getTranslation(language, key);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, languages: SUPPORTED_LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
