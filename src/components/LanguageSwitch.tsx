import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import {
  SUPPORTED_LANGUAGES,
  buildAlternateUrl,
  type SupportedLanguage,
} from "@/i18n";

interface LanguageSwitchProps {
  variant?: "navigation" | "footer";
  className?: string;
}

const LanguageSwitch = ({ variant = "navigation", className = "" }: LanguageSwitchProps) => {
  const { i18n } = useTranslation("common");
  const current = (i18n.language?.startsWith("en") ? "en" : "de") as SupportedLanguage;

  const handleClick = (lang: SupportedLanguage) => {
    if (lang === current) return;
    const url = buildAlternateUrl(lang);
    if (url.startsWith("http")) {
      window.location.assign(url);
    } else {
      void i18n.changeLanguage(lang);
    }
  };

  const sizing =
    variant === "navigation"
      ? "text-xs px-1 py-0.5 gap-1"
      : "text-xs px-1.5 py-0.5 gap-1.5";

  return (
    <div
      className={`inline-flex items-center rounded-full border border-border/60 bg-background/60 backdrop-blur-xl ${sizing} ${className}`}
      role="group"
      aria-label="Sprache wechseln / Switch language"
    >
      <Globe className="w-3.5 h-3.5 text-muted-foreground ml-1" aria-hidden="true" />
      {SUPPORTED_LANGUAGES.map((lang) => {
        const isActive = lang === current;
        return (
          <button
            key={lang}
            type="button"
            onClick={() => handleClick(lang)}
            aria-pressed={isActive}
            aria-label={lang === "en" ? "Switch to English" : "Auf Deutsch wechseln"}
            className={`uppercase font-semibold tracking-wide rounded-full px-2 py-0.5 transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {lang}
          </button>
        );
      })}
    </div>
  );
};

export default LanguageSwitch;
