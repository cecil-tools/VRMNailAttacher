import Vue from 'vue';
import VueI18n from 'vue-i18n';
import ja from '@/locales/ja.json';
import en from '@/locales/en.json';
import pt from '@/locales/pt.json';

Vue.use(VueI18n);

export type SupportedLocale = 'ja' | 'en' | 'pt';

export interface LocaleOption {
  code: SupportedLocale;
  label: string;
  flag: string;
}

export const SUPPORTED_LOCALES: LocaleOption[] = [
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' }
];

const STORAGE_KEY = 'vrm_nail_attacher_locale';

export function getInitialLocale(): SupportedLocale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as SupportedLocale | null;
    if (saved && (saved === 'ja' || saved === 'en' || saved === 'pt')) {
      return saved;
    }
  } catch (e) {
    // localStorage access may fail in private mode
  }

  // Detect from browser
  const navLang = (navigator.language || (navigator as any).userLanguage || '').toLowerCase();
  if (navLang.startsWith('ja')) {
    return 'ja';
  }
  if (navLang.startsWith('pt')) {
    return 'pt';
  }
  return 'ja'; // Default to Japanese as base, or English if non-ja/pt
}

const i18n = new VueI18n({
  locale: getInitialLocale(),
  fallbackLocale: 'ja',
  messages: {
    ja,
    en,
    pt
  }
});

export function setAppLocale(locale: SupportedLocale): void {
  i18n.locale = locale;
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch (e) {
    // ignore
  }
}

export default i18n;
