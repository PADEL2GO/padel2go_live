import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Eager-load every JSON file in src/locales/<lang>/*.json so adding a
// new page is just "drop a new pair of JSONs" — no registration needed.
const localeModules = import.meta.glob("../locales/*/*.json", {
  eager: true,
  import: "default",
}) as Record<string, Record<string, unknown>>;

const resources: Record<string, Record<string, Record<string, unknown>>> = {};
const namespaceSet = new Set<string>();

for (const [path, mod] of Object.entries(localeModules)) {
  const match = path.match(/locales\/([^/]+)\/([^/]+)\.json$/);
  if (!match) continue;
  const [, lang, ns] = match;
  resources[lang] ??= {};
  resources[lang][ns] = mod;
  namespaceSet.add(ns);
}

export type SupportedLanguage = "de" | "en";

export const LANGUAGE_DOMAINS: Record<SupportedLanguage, string> = {
  de: "www.padel2go-official.de",
  en: "www.padel2go-official.com",
};

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ["de", "en"];

// www.padel2go-official.com points at this Vercel project with a valid
// Let's Encrypt cert as of June 2026, so the language switch does a full
// cross-domain redirect on every production hit.
export const EN_DOMAIN_LIVE = true;

const STORAGE_KEY = "padel2go.lang";

const isBrowser = () => typeof window !== "undefined";

const readSavedLanguage = (): SupportedLanguage | null => {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY) as SupportedLanguage | null;
    return saved === "de" || saved === "en" ? saved : null;
  } catch {
    return null;
  }
};

const persistLanguage = (lang: SupportedLanguage) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* ignore */
  }
};

const detectLanguageFromHostname = (): SupportedLanguage => {
  if (!isBrowser()) return "de";
  const host = window.location.hostname.toLowerCase();

  // Once both production domains are live, the hostname alone decides.
  if (EN_DOMAIN_LIVE) {
    if (host.endsWith("padel2go-official.com")) return "en";
    if (host.endsWith("padel2go-official.de")) return "de";
  }

  // Transitional / preview / localhost: honor user override, default to DE.
  const saved = readSavedLanguage();
  if (saved) return saved;
  return "de";
};

export const getInitialLanguage = detectLanguageFromHostname;

/**
 * Returns a URL to navigate to when switching languages, or an empty string
 * when the switch should happen in place (same host, just change i18n state).
 */
export const buildAlternateUrl = (targetLang: SupportedLanguage): string => {
  if (!isBrowser()) return "";
  const host = window.location.hostname.toLowerCase();
  const onDeDomain = host.endsWith("padel2go-official.de");
  const onEnDomain = host.endsWith("padel2go-official.com");

  if (EN_DOMAIN_LIVE && (onDeDomain || onEnDomain)) {
    const targetHost = LANGUAGE_DOMAINS[targetLang];
    return `https://${targetHost}${window.location.pathname}${window.location.search}${window.location.hash}`;
  }

  // Preview, localhost, or EN domain not live yet: in-place switch.
  persistLanguage(targetLang);
  return "";
};

void i18n.use(initReactI18next).init({
  lng: getInitialLanguage(),
  fallbackLng: "de",
  defaultNS: "common",
  ns: Array.from(namespaceSet),
  resources,
  interpolation: { escapeValue: false },
});

if (isBrowser()) {
  document.documentElement.setAttribute("lang", i18n.language);
  i18n.on("languageChanged", (lng) => {
    document.documentElement.setAttribute("lang", lng);
  });
}

export default i18n;
