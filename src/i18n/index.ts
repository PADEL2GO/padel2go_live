import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import deCommon from "@/locales/de/common.json";
import deIndex from "@/locales/de/index.json";
import enCommon from "@/locales/en/common.json";
import enIndex from "@/locales/en/index.json";

export type SupportedLanguage = "de" | "en";

export const LANGUAGE_DOMAINS: Record<SupportedLanguage, string> = {
  de: "www.padel2go-official.de",
  en: "www.padel2go-official.com",
};

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ["de", "en"];

const STORAGE_KEY = "padel2go.lang";

const isBrowser = () => typeof window !== "undefined";

const detectLanguageFromHostname = (): SupportedLanguage => {
  if (!isBrowser()) return "de";
  const host = window.location.hostname.toLowerCase();
  if (host.endsWith("padel2go-official.com")) return "en";
  if (host.endsWith("padel2go-official.de")) return "de";
  // Vercel preview, lovable preview, localhost → honor user override, default DE
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY) as SupportedLanguage | null;
    if (saved === "de" || saved === "en") return saved;
  } catch {
    /* localStorage may be blocked */
  }
  return "de";
};

export const getInitialLanguage = detectLanguageFromHostname;

export const buildAlternateUrl = (targetLang: SupportedLanguage): string => {
  if (!isBrowser()) return "/";
  const host = window.location.hostname.toLowerCase();
  const onProduction =
    host.endsWith("padel2go-official.de") ||
    host.endsWith("padel2go-official.com");

  if (onProduction) {
    const targetHost = LANGUAGE_DOMAINS[targetLang];
    return `https://${targetHost}${window.location.pathname}${window.location.search}${window.location.hash}`;
  }

  // Preview / localhost: stay on current host, persist override
  try {
    window.localStorage.setItem(STORAGE_KEY, targetLang);
  } catch {
    /* ignore */
  }
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
};

void i18n.use(initReactI18next).init({
  lng: getInitialLanguage(),
  fallbackLng: "de",
  defaultNS: "common",
  ns: ["common", "index"],
  resources: {
    de: { common: deCommon, index: deIndex },
    en: { common: enCommon, index: enIndex },
  },
  interpolation: { escapeValue: false },
  returnEmptyString: false,
});

if (isBrowser()) {
  document.documentElement.setAttribute("lang", i18n.language);
  i18n.on("languageChanged", (lng) => {
    document.documentElement.setAttribute("lang", lng);
  });
}

export default i18n;
