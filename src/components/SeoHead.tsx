import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LANGUAGE_DOMAINS, SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/i18n";

/**
 * Global SEO head: emits canonical URL, hreflang alternates for both
 * production domains, x-default, and og:locale on every route.
 *
 * Mounted once at the App root so individual pages only need to set
 * their own title / meta description via their own <Helmet> usage.
 */
const SeoHead = () => {
  const { pathname, search } = useLocation();
  const { i18n } = useTranslation();

  const currentLang: SupportedLanguage = i18n.language?.startsWith("en") ? "en" : "de";
  const path = `${pathname}${search}`;
  const canonical = `https://${LANGUAGE_DOMAINS[currentLang]}${path}`;
  const ogLocale = currentLang === "en" ? "en_US" : "de_DE";
  const ogLocaleAlternate = currentLang === "en" ? "de_DE" : "en_US";

  return (
    <Helmet>
      <html lang={currentLang} />
      <link rel="canonical" href={canonical} />
      {SUPPORTED_LANGUAGES.map((lang) => (
        <link
          key={lang}
          rel="alternate"
          hrefLang={lang}
          href={`https://${LANGUAGE_DOMAINS[lang]}${path}`}
        />
      ))}
      <link
        rel="alternate"
        hrefLang="x-default"
        href={`https://${LANGUAGE_DOMAINS.en}${path}`}
      />
      <meta property="og:locale" content={ogLocale} />
      <meta property="og:locale:alternate" content={ogLocaleAlternate} />
      <meta property="og:url" content={canonical} />
    </Helmet>
  );
};

export default SeoHead;
