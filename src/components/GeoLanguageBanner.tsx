import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Globe, X } from "lucide-react";
import {
  buildAlternateUrl,
  type SupportedLanguage,
} from "@/i18n";

const DISMISS_KEY = "padel2go.geoBannerDismissed";

const BANNER_COPY: Record<
  SupportedLanguage,
  { message: string; switchCta: string; stayCta: string }
> = {
  en: {
    message: "This site is also available in English.",
    switchCta: "Switch to English",
    stayCta: "Stay in German",
  },
  de: {
    message: "Diese Seite gibt es auch auf Deutsch.",
    switchCta: "Auf Deutsch wechseln",
    stayCta: "Stay in English",
  },
};

const GeoLanguageBanner = () => {
  const { i18n } = useTranslation();
  const [target, setTarget] = useState<SupportedLanguage | null>(null);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      if (window.localStorage.getItem(DISMISS_KEY) === "1") return;

      const current = (i18n.language?.startsWith("en") ? "en" : "de") as SupportedLanguage;
      const browser = (navigator.language || "").toLowerCase();
      const browserLang: SupportedLanguage | null = browser.startsWith("en")
        ? "en"
        : browser.startsWith("de")
        ? "de"
        : null;

      if (browserLang && browserLang !== current) setTarget(browserLang);
    } catch {
      /* navigator/localStorage may be unavailable */
    }
  }, [i18n.language]);

  if (!target) return null;

  const copy = BANNER_COPY[target];

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setTarget(null);
  };

  const switchLanguage = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    const url = buildAlternateUrl(target);
    if (url.startsWith("http")) {
      window.location.assign(url);
    } else {
      void i18n.changeLanguage(target);
      setTarget(null);
    }
  };

  return (
    <div
      role="region"
      aria-label="Language suggestion"
      className="fixed top-0 left-0 right-0 z-[60] bg-primary text-primary-foreground shadow-sm"
    >
      <div className="container mx-auto px-4 py-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm">
        <div className="flex items-center gap-2 font-medium">
          <Globe className="w-4 h-4" aria-hidden="true" />
          <span>{copy.message}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={switchLanguage}
            className="px-3 py-1 rounded-full bg-primary-foreground/15 hover:bg-primary-foreground/25 font-semibold transition-colors"
          >
            {copy.switchCta}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="px-3 py-1 rounded-full hover:bg-primary-foreground/10 transition-colors"
          >
            {copy.stayCta}
          </button>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="p-1 rounded-full hover:bg-primary-foreground/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default GeoLanguageBanner;
