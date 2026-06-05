import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Download, ExternalLink, FileText, MessageCircle, ArrowLeft } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import LanguageSwitch from "@/components/LanguageSwitch";
import { useQrSections, type QrSection } from "@/hooks/useQrSections";
import { localized } from "@/lib/localized";
import { useWhatsAppUrl, WhatsAppIcon } from "@/components/WhatsAppBusiness";
import padel2goLogo from "@/assets/padel2go-logo.png";

const formatSize = (bytes: number | null | undefined): string => {
  if (!bytes || bytes <= 0) return "";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  const kb = bytes / 1024;
  return `${Math.max(1, Math.round(kb))} KB`;
};

const FileButtons = ({
  url,
  name,
  size,
  langCode,
  t,
}: {
  url: string | null;
  name: string | null;
  size: number | null;
  langCode: "de" | "en";
  t: (key: string, opts?: Record<string, unknown>) => string;
}) => {
  if (!url) return null;
  const sizeLabel = formatSize(size);
  const downloadName = name ?? `padel2go-${langCode}.pdf`;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity px-4 py-2.5 text-sm font-semibold shadow-md shadow-primary/20"
      >
        <ExternalLink className="w-4 h-4" />
        {langCode === "de" ? t("buttons.viewDe") : t("buttons.viewEn")}
      </a>
      <a
        href={url}
        download={downloadName}
        className="inline-flex items-center gap-2 rounded-full border border-border bg-background hover:bg-accent transition-colors px-4 py-2.5 text-sm font-semibold"
      >
        <Download className="w-4 h-4" />
        {langCode === "de" ? t("buttons.downloadDe") : t("buttons.downloadEn")}
      </a>
      {sizeLabel && (
        <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
          <FileText className="w-3 h-3" />
          {sizeLabel} · PDF
        </span>
      )}
    </div>
  );
};

const SectionCard = ({
  section,
  index,
  whatsappUrl,
}: {
  section: QrSection;
  index: number;
  whatsappUrl: string;
}) => {
  const { t, i18n } = useTranslation("qr");
  const title = localized(section, "title", i18n.language);
  const description = localized(section, "description", i18n.language);
  const hasAnyFile = Boolean(section.file_de_url || section.file_en_url);

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08, duration: 0.45 }}
      className="rounded-3xl border border-border bg-card p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow"
    >
      <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2 tracking-tight">
        {title}
      </h2>
      {description && (
        <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-5">
          {description}
        </p>
      )}

      {hasAnyFile ? (
        <div className="flex flex-col gap-3">
          <FileButtons
            url={section.file_de_url}
            name={section.file_de_name}
            size={section.file_de_size_bytes}
            langCode="de"
            t={t}
          />
          <FileButtons
            url={section.file_en_url}
            name={section.file_en_name}
            size={section.file_en_size_bytes}
            langCode="en"
            t={t}
          />
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border/70 bg-muted/30 p-5 text-center">
          <p className="text-sm font-semibold text-foreground mb-1">
            {t("empty.title")}
          </p>
          <p className="text-xs text-muted-foreground mb-4">{t("empty.body")}</p>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-[#25D366] text-white hover:bg-[#1FB855] transition-colors px-4 py-2 text-sm font-semibold"
          >
            <WhatsAppIcon className="w-4 h-4" />
            {t("empty.contactCta")}
          </a>
        </div>
      )}
    </motion.article>
  );
};

const QrLanding = () => {
  const { t } = useTranslation("qr");
  const whatsappUrl = useWhatsAppUrl();
  const { data: sections = [], isLoading } = useQrSections();

  return (
    <>
      <Helmet>
        <title>{t("meta.title")}</title>
        <meta name="description" content={t("meta.description")} />
        <meta name="robots" content="noindex,nofollow" />
        <meta property="og:title" content={t("meta.title")} />
        <meta property="og:description" content={t("meta.description")} />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
        {/* Top bar: logo + language switch */}
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/80 border-b border-border/50">
          <div className="container mx-auto px-4">
            <div className="h-14 md:h-16 flex items-center justify-between">
              <NavLink to="/" className="flex items-center">
                <img src={padel2goLogo} alt="PADEL2GO" className="h-7 md:h-8 w-auto" />
              </NavLink>
              <LanguageSwitch variant="navigation" />
            </div>
          </div>
        </header>

        {/* Hero */}
        <section className="container mx-auto px-4 pt-10 pb-8 md:pt-16 md:pb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl mx-auto text-center"
          >
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold tracking-wide uppercase mb-5">
              {t("hero.eyebrow")}
            </span>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
              {t("hero.title")}{" "}
              <span className="text-gradient-lime">{t("hero.titleHighlight")}</span>
            </h1>
            <p className="text-base md:text-lg text-muted-foreground">
              {t("hero.subtitle")}
            </p>
          </motion.div>
        </section>

        {/* Sections */}
        <section className="container mx-auto px-4 pb-16 md:pb-24">
          <div className="max-w-2xl mx-auto grid gap-4 md:gap-6">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-3xl border border-border bg-card p-6 md:p-8 h-40 animate-pulse"
                />
              ))
            ) : sections.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">{t("empty.body")}</p>
            ) : (
              sections.map((section, index) => (
                <SectionCard
                  key={section.id}
                  section={section}
                  index={index}
                  whatsappUrl={whatsappUrl}
                />
              ))
            )}
          </div>
        </section>

        {/* Slim footer (no full site footer here — minimal landing) */}
        <footer className="border-t border-border/50">
          <div className="container mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <NavLink to="/" className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors">
              <ArrowLeft className="w-3 h-3" />
              {t("footer.back")}
            </NavLink>
            <div className="flex items-center gap-4">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-[#1FB855] transition-colors"
              >
                <MessageCircle className="w-3 h-3" />
                WhatsApp
              </a>
              <NavLink to="/impressum" className="hover:text-foreground transition-colors">
                {t("footer.imprint")}
              </NavLink>
              <NavLink to="/datenschutz" className="hover:text-foreground transition-colors">
                {t("footer.privacy")}
              </NavLink>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default QrLanding;
