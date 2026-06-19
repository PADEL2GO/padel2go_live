import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import { LogoCloud } from "@/components/ui/logo-cloud";
import {
  ArrowRight, Package, Apple, GlassWater, Sparkles,
  TrendingUp, Handshake, Monitor, MapPin, Trophy, Gift, Zap,
  BarChart3, Repeat, ShoppingCart, Heart, ChevronRight,
  Building2, Users, Target, Megaphone, MessageCircle, CalendarCheck,
} from "lucide-react";
import {
  PartnerConceptSection,
  PartnerBenchmarksSection,
  TouchpointCarousel,
} from "@/components/partner";
import { usePartnerTiles } from "@/hooks/usePartnerTiles";
import { usePartnerTouchpoints } from "@/hooks/usePartnerTouchpoints";
import BrandName from "@/components/BrandName";
import {
  WhatsAppIcon,
  WHATSAPP_NUMBER_DISPLAY,
  useWhatsAppUrl,
} from "@/components/WhatsAppBusiness";

const CONTAINER = "container mx-auto px-4 sm:px-6";
const CONTENT = "max-w-6xl mx-auto";
const SECTION = "py-20 md:py-28";

const useCaseStyles = [
  { key: "retail", icon: Package, accent: "#C7F011", glow: "rgba(199,240,17,0.12)", border: "rgba(199,240,17,0.25)" },
  { key: "nutrition", icon: Apple, accent: "#38bdf8", glow: "rgba(56,189,248,0.12)", border: "rgba(56,189,248,0.25)" },
  { key: "drinks", icon: GlassWater, accent: "#fb923c", glow: "rgba(251,146,60,0.12)", border: "rgba(251,146,60,0.25)" },
  { key: "lifestyle", icon: Sparkles, accent: "#a78bfa", glow: "rgba(167,139,250,0.12)", border: "rgba(167,139,250,0.25)" },
];

const touchpointStyles = [
  { key: "court", icon: MapPin, accent: "#C7F011" },
  { key: "app", icon: Monitor, accent: "#38bdf8" },
  { key: "rewards", icon: Gift, accent: "#fbbf24" },
  { key: "vending", icon: Zap, accent: "#fb923c" },
  { key: "events", icon: Trophy, accent: "#a78bfa" },
];

const kpiStyles = [
  { key: "retention", icon: Repeat, accent: "#C7F011", glow: "rgba(199,240,17,0.15)", border: "rgba(199,240,17,0.3)" },
  { key: "kpi", icon: BarChart3, accent: "#38bdf8", glow: "rgba(56,189,248,0.12)", border: "rgba(56,189,248,0.25)" },
  { key: "basket", icon: ShoppingCart, accent: "#fbbf24", glow: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.25)" },
  { key: "utilization", icon: Heart, accent: "#f472b6", glow: "rgba(244,114,182,0.12)", border: "rgba(244,114,182,0.25)" },
  { key: "players", icon: Users, accent: "#34d399", glow: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.25)" },
  { key: "market", icon: TrendingUp, accent: "#fb923c", glow: "rgba(251,146,60,0.12)", border: "rgba(251,146,60,0.25)" },
];

const chipIcons: Record<string, typeof Building2> = {
  clubs: Building2,
  kpis: TrendingUp,
  players: Users,
  league: Trophy,
};

type UseCaseItem = { key: string; title: string; description: string };
type TouchpointItem = { key: string; label: string };
type KpiItem = { key: string; value: string; label: string; desc: string };
type ChipItem = { key: string; text: string };
type WhatsappBenefit = { title: string; desc: string };

const whatsappBenefitIcons = [Zap, MessageCircle, CalendarCheck];

const FuerPartner = () => {
  const { t } = useTranslation("partner");
  const { data: partnerTiles } = usePartnerTiles();
  const { data: touchpointSlides = [] } = usePartnerTouchpoints();
  const whatsappUrl = useWhatsAppUrl(t("whatsapp.message"));

  const partnerLogos = (partnerTiles || [])
    .filter(t => t.logo_url)
    .map(t => ({ src: t.logo_url!, alt: t.name }));

  const heroChips = t("hero.chips", { returnObjects: true }) as ChipItem[];
  const touchpointItems = t("touchpoints.items", { returnObjects: true }) as TouchpointItem[];
  const useCaseItems = t("useCases.items", { returnObjects: true }) as UseCaseItem[];
  const kpiItems = t("kpi.items", { returnObjects: true }) as KpiItem[];
  const whatsappBenefits = t("whatsapp.benefits", { returnObjects: true }) as WhatsappBenefit[];

  return (
    <>
      <Helmet>
        <title>{t("meta.title")}</title>
        <meta name="description" content={t("meta.description")} />
      </Helmet>

      <Navigation />

      <main className="min-h-screen bg-background pt-20 overflow-x-hidden">

        {/* ═══ HERO ═══════════════════════════════════════════════════════════ */}
        <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-black via-background to-background z-0" />
          {/* Radial lime glow */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] z-[1] pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(199,240,17,0.14) 0%, transparent 65%)" }}
          />
          {/* Grid pattern overlay */}
          <div
            className="absolute inset-0 z-[1] pointer-events-none opacity-[0.04]"
            style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "60px 60px" }}
          />

          <div className={`${CONTAINER} relative z-10 w-full py-24`}>
            <div className={CONTENT}>
              <motion.div
                initial={{ opacity: 0, y: 48 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="text-center max-w-4xl mx-auto"
              >
                {/* Badge */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15, duration: 0.5 }}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#C7F011]/15 border border-[#C7F011]/35 text-[#C7F011] mb-8"
                >
                  <Handshake className="w-4 h-4" />
                  <span className="text-sm font-bold tracking-widest uppercase">{t("hero.badge")}</span>
                </motion.div>

                <h1 className="text-5xl sm:text-6xl md:text-7xl font-black leading-[0.95] tracking-tight mb-7 text-white">
                  {t("hero.titleLine1")}{" "}
                  <span className="text-[#C7F011]">{t("hero.titleHighlight")}</span>
                  <br />
                  {t("hero.titleLine2")}
                </h1>

                <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed font-light">
                  {t("hero.description")}
                </p>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
                  <a
                    href="#termin"
                    className="inline-flex items-center justify-center gap-3 px-9 py-4 rounded-full bg-[#C7F011] text-black font-black text-base hover:bg-[#d4f530] transition-all min-h-[52px] shadow-[0_0_40px_rgba(199,240,17,0.4)] hover:shadow-[0_0_60px_rgba(199,240,17,0.6)] w-full sm:w-auto"
                  >
                    <Megaphone className="w-5 h-5" />
                    {t("hero.ctaPrimary")}
                    <ArrowRight className="w-5 h-5" />
                  </a>
                  <NavLink
                    to="/faq-kontakt?reason=partner"
                    className="inline-flex items-center justify-center gap-3 px-9 py-4 rounded-full bg-white/8 border border-white/20 text-white hover:bg-white/15 hover:border-white/35 transition-all font-semibold text-base backdrop-blur-sm min-h-[52px] w-full sm:w-auto"
                  >
                    {t("hero.ctaSecondary")}
                  </NavLink>
                </div>

                {/* Trust chips */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex flex-wrap items-center justify-center gap-2"
                >
                  {heroChips.map(c => {
                    const Icon = chipIcons[c.key] ?? Building2;
                    return (
                      <span
                        key={c.key}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/50 border border-white/12 text-white/55 text-xs font-medium backdrop-blur-sm"
                      >
                        <Icon className="w-3.5 h-3.5 text-[#C7F011]" />
                        {c.text}
                      </span>
                    );
                  })}
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ═══ UNSERE PARTNER ═════════════════════════════════════════════════ */}
        <section className="py-12 border-y border-white/8 overflow-hidden"
          style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.015) 0%, transparent 100%)" }}>
          <div className={`${CONTAINER} mb-8 text-center`}>
            <p className="text-white/35 text-xs font-bold tracking-widest uppercase">{t("partners.eyebrow")}</p>
          </div>
          {partnerLogos.length > 0 ? (
            <LogoCloud logos={partnerLogos} variant="dark" />
          ) : (
            <div className="flex justify-center gap-10 opacity-20 px-8">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 w-24 rounded bg-white/20" />
              ))}
            </div>
          )}
        </section>

        {/* ═══ TOUCHPOINTS – 5 PILL ICONS ════════════════════════════════════ */}
        <section className={SECTION}>
          <div className={CONTAINER}>
            <div className={CONTENT}>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center max-w-2xl mx-auto mb-14"
              >
                <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#C7F011]/12 border border-[#C7F011]/25 text-[#C7F011] mb-6">
                  <Target className="w-4 h-4" />
                  <span className="text-sm font-bold tracking-wider uppercase">{t("touchpoints.badge")}</span>
                </span>
                <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-4">
                  {t("touchpoints.titlePrefix")}{" "}
                  <span className="text-[#C7F011]">{t("touchpoints.titleBrand")}</span>
                  {t("touchpoints.titleSuffix") ? <> {t("touchpoints.titleSuffix")}</> : null}
                </h2>
                <p className="text-white/50 text-lg">{t("touchpoints.description")}</p>
              </motion.div>

              {/* Touchpoint pills */}
              <div className="flex flex-wrap justify-center gap-3 mb-14">
                {touchpointStyles.map((style, i) => {
                  const item = touchpointItems.find(it => it.key === style.key);
                  if (!item) return null;
                  const Icon = style.icon;
                  return (
                    <motion.div
                      key={style.key}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.08 }}
                      className="flex items-center gap-3 px-5 py-3 rounded-full border backdrop-blur-sm transition-all duration-300"
                      style={{ borderColor: style.accent + "40", background: style.accent + "0f" }}
                      whileHover={{ scale: 1.05 }}
                    >
                      <Icon className="w-5 h-5" style={{ color: style.accent }} />
                      <span className="font-semibold text-white text-sm">{item.label}</span>
                    </motion.div>
                  );
                })}
              </div>

              {/* Carousel */}
              <TouchpointCarousel slides={touchpointSlides} />
            </div>
          </div>
        </section>

        {/* ═══ USE CASES ══════════════════════════════════════════════════════ */}
        <section className={`${SECTION} relative`}
          style={{ background: "linear-gradient(180deg, transparent 0%, rgba(199,240,17,0.03) 50%, transparent 100%)" }}>
          <div className={CONTAINER}>
            <div className={CONTENT}>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center max-w-2xl mx-auto mb-14"
              >
                <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-4">
                  {t("useCases.titlePrefix")}{" "}
                  <span className="text-[#C7F011]">{t("useCases.titleHighlight")}</span>
                </h2>
                <p className="text-white/50 text-lg">{t("useCases.description")}</p>
              </motion.div>

              <div className="grid sm:grid-cols-2 gap-5">
                {useCaseStyles.map((style, i) => {
                  const item = useCaseItems.find(it => it.key === style.key);
                  if (!item) return null;
                  const Icon = style.icon;
                  return (
                    <motion.div
                      key={style.key}
                      initial={{ opacity: 0, y: 40 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                      className="relative p-7 rounded-3xl border transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 group"
                      style={{ background: `linear-gradient(135deg, ${style.glow} 0%, rgba(255,255,255,0.02) 100%)`, borderColor: style.border }}
                      whileHover={{ boxShadow: `0 8px 40px ${style.glow}` }}
                    >
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
                        style={{ background: style.accent + "18", border: `1px solid ${style.accent}30` }}
                      >
                        <Icon className="w-7 h-7" style={{ color: style.accent }} />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                      <p className="text-white/50 text-sm leading-relaxed">{item.description}</p>
                      <ChevronRight
                        className="absolute bottom-6 right-6 w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: style.accent }}
                      />
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ═══ CONCEPT ════════════════════════════════════════════════════════ */}
        <PartnerConceptSection />

        {/* ═══ KPI GRID ═══════════════════════════════════════════════════════ */}
        <section className={SECTION}>
          <div className={CONTAINER}>
            <div className={CONTENT}>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center max-w-2xl mx-auto mb-14"
              >
                <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#C7F011]/12 border border-[#C7F011]/25 text-[#C7F011] mb-6">
                  <BarChart3 className="w-4 h-4" />
                  <span className="text-sm font-bold tracking-wider uppercase">{t("kpi.badge")}</span>
                </span>
                <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-4">
                  {t("kpi.titlePrefix")}{" "}
                  <span className="text-[#C7F011]">{t("kpi.titleHighlight")}</span>{" "}
                  {t("kpi.titleSuffix")}
                </h2>
              </motion.div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {kpiStyles.map((style, i) => {
                  const item = kpiItems.find(it => it.key === style.key);
                  if (!item) return null;
                  const Icon = style.icon;
                  return (
                    <motion.div
                      key={style.key}
                      initial={{ opacity: 0, y: 40 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.08, duration: 0.6 }}
                      className="p-7 rounded-3xl border transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1"
                      style={{ background: `linear-gradient(135deg, ${style.glow} 0%, rgba(255,255,255,0.02) 100%)`, borderColor: style.border }}
                      whileHover={{ boxShadow: `0 8px 40px ${style.glow}` }}
                    >
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                        style={{ background: style.accent + "18", border: `1px solid ${style.accent}30` }}
                      >
                        <Icon className="w-6 h-6" style={{ color: style.accent }} />
                      </div>
                      <div className="text-3xl font-black text-white mb-1" style={{ color: style.accent }}>{item.value}</div>
                      <div className="text-sm font-bold text-white mb-2">{item.label}</div>
                      <p className="text-white/45 text-xs leading-relaxed">{item.desc}</p>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ═══ WHATSAPP BUSINESS CTA ══════════════════════════════════════════ */}
        <section
          id="termin"
          className={`${SECTION} relative overflow-hidden bg-gradient-to-b from-background via-[#25D366]/[0.04] to-background`}
        >
          <div
            className="absolute inset-0 opacity-[0.025] pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, #25D366 1px, transparent 0)",
              backgroundSize: "24px 24px",
            }}
          />
          <div className={`${CONTAINER} relative z-10`}>
            <div className={CONTENT}>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center max-w-2xl mx-auto mb-10 md:mb-12"
              >
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#25D366]/10 border border-[#25D366]/30 text-[#1FB855] text-sm font-bold tracking-wide uppercase mb-5">
                  <WhatsAppIcon className="w-4 h-4" />
                  {t("whatsapp.badge")}
                </span>
                <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-4">
                  {t("whatsapp.title")}{" "}
                  <span className="text-[#C7F011]">{t("whatsapp.titleHighlight")}</span>
                </h2>
                <p className="text-white/55 text-lg leading-relaxed">
                  {t("whatsapp.intro")}
                </p>
              </motion.div>

              {/* CTA – same WhatsApp Business element as the Clubs section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.15 }}
                className="flex flex-col items-center mb-10"
              >
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-[#25D366] text-white hover:bg-[#1FB855] transition-colors font-semibold text-lg shadow-lg shadow-[#25D366]/40"
                >
                  <WhatsAppIcon className="w-5 h-5" />
                  {t("whatsapp.cta")}
                </a>
                <p className="text-xs text-white/50 mt-3">
                  {WHATSAPP_NUMBER_DISPLAY} · {t("whatsapp.ctaCaption")}
                </p>
              </motion.div>

              {/* Benefits */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.25 }}
                className="grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto"
              >
                {whatsappBenefits.map((b, i) => {
                  const Icon = whatsappBenefitIcons[i];
                  return (
                    <div
                      key={b.title}
                      className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 text-center hover:border-[#25D366]/30 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-xl bg-[#25D366]/10 flex items-center justify-center mx-auto mb-3">
                        <Icon className="w-5 h-5 text-[#1FB855]" />
                      </div>
                      <p className="font-bold text-sm mb-1 text-white">{b.title}</p>
                      <p className="text-xs text-white/50">{b.desc}</p>
                    </div>
                  );
                })}
              </motion.div>

              <p className="text-center text-sm text-white/50 mt-10">
                {t("whatsapp.emailPrefix")}{" "}
                <NavLink to="/faq-kontakt?reason=partner" className="text-[#C7F011] hover:underline">
                  {t("whatsapp.emailLink")}
                </NavLink>
              </p>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </>
  );
};

export default FuerPartner;
