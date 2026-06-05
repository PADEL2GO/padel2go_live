import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { localized } from "@/lib/localized";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import SectionDivider from "@/components/SectionDivider";
import { SiteVisual } from "@/components/SiteVisual";
import { Button } from "@/components/ui/button";
import SyntheticHero from "@/components/ui/synthetic-hero";
import { InfiniteSlider } from "@/components/ui/infinite-slider";
import { NavLink } from "@/components/NavLink";
import BrandName from "@/components/BrandName";
import { LocationTeasersSection } from "@/components/LocationTeasersSection";
import { ArticleFeed } from "@/components/news/ArticleFeed";
import {
  ArrowRight,
  Users,
  Building2,
  Handshake,
  Calendar,
  Zap,
  Gamepad2,
  Search,
  FileCheck,
  Wrench,
  Wifi,
  PartyPopper,
  Settings,
  Camera,
  Trophy,
  ShoppingBag,
  CheckCircle,
} from "lucide-react";
import wingfieldLogo from "@/assets/partners/wingfield.png";
import { usePartnerTiles } from "@/hooks/usePartnerTiles";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { EXPERT_LEVELS, getExpertLevelEmoji } from "@/lib/expertLevels";

// ── Animated icon helper ──────────────────────────────────────────────────────
const AnimatedIcon = ({
  children,
  animation = "pulse",
}: {
  children: React.ReactNode;
  animation?: "pulse" | "spin" | "bounce" | "glow" | "blink";
}) => {
  const animations = {
    pulse:  { scale: [1, 1.15, 1],      transition: { duration: 2, repeat: Infinity } },
    spin:   { rotate: [0, 360],          transition: { duration: 8, repeat: Infinity, ease: "linear" as const } },
    bounce: { y: [0, -5, 0],            transition: { duration: 1.5, repeat: Infinity } },
    glow:   { opacity: [0.6, 1, 0.6],   transition: { duration: 2, repeat: Infinity } },
    blink:  { opacity: [1, 0.3, 1],     transition: { duration: 0.8, repeat: Infinity } },
  };
  return (
    <motion.div animate={animations[animation]} className="inline-flex">
      {children}
    </motion.div>
  );
};

// ── Partner components (admin-managed via partner_tiles table) ────────────────
const PartnerGrid = ({ tiles }: { tiles: import("@/hooks/usePartnerTiles").PartnerTile[] }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-5xl mx-auto">
    {tiles.map((tile, index) => {
      const card = (
        <motion.div
          key={tile.id}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.05 }}
          className={`rounded-2xl p-3 md:p-6 h-20 md:h-36 flex items-center justify-center border border-border/30 transition-all duration-200 ${
            tile.website_url ? "hover:scale-105 hover:shadow-lg cursor-pointer" : ""
          }`}
          style={{ backgroundColor: tile.bg_color || "#FFFFFF" }}
        >
          {tile.logo_url ? (
            <img src={tile.logo_url} alt={tile.name} className="h-10 md:h-20 w-auto object-contain" />
          ) : (
            <span className="text-sm font-medium text-muted-foreground">{tile.name}</span>
          )}
        </motion.div>
      );
      return tile.website_url ? (
        <a key={tile.id} href={tile.website_url} target="_blank" rel="noopener noreferrer">{card}</a>
      ) : (
        <div key={tile.id}>{card}</div>
      );
    })}
  </div>
);

const LocalPartnerSection = ({ tiles }: { tiles: import("@/hooks/usePartnerTiles").PartnerTile[] }) => {
  const { t, i18n } = useTranslation("index");
  if (!tiles.length) return null;
  const fallback = t("partners.regionFallback");
  const grouped = tiles.reduce<Record<string, typeof tiles>>((acc, tile) => {
    const region = tile.region || fallback;
    if (!acc[region]) acc[region] = [];
    acc[region].push(tile);
    return acc;
  }, {});
  return (
    <div className="space-y-10 max-w-5xl mx-auto">
      {Object.entries(grouped).map(([region, regionTiles]) => (
        <div key={region}>
          <h4 className="text-lg font-semibold text-muted-foreground mb-4">{t("partners.regionLabel")} {region}</h4>
          <div className="grid gap-4">
            {regionTiles.map((tile, index) => {
              const inner = (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex flex-col sm:flex-row items-center gap-4 sm:gap-6 rounded-2xl border border-border/30 p-4 transition-all duration-200 ${
                    tile.website_url ? "hover:shadow-lg hover:scale-[1.02] cursor-pointer" : ""
                  }`}
                >
                  <div
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                    style={{ backgroundColor: tile.bg_color || "#FFFFFF" }}
                  >
                    {tile.logo_url ? (
                      <img src={tile.logo_url} alt={tile.name} className="h-12 sm:h-16 w-auto object-contain" />
                    ) : (
                      <span className="text-sm font-medium text-muted-foreground">{tile.name}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-center sm:text-left">
                    <p className="font-semibold text-foreground">{tile.name}</p>
                    {localized(tile, "description", i18n.language) && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{localized(tile, "description", i18n.language)}</p>
                    )}
                  </div>
                </motion.div>
              );
              return tile.website_url ? (
                <a key={tile.id} href={tile.website_url} target="_blank" rel="noopener noreferrer">{inner}</a>
              ) : (
                <div key={tile.id}>{inner}</div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

const PartnerSections = () => {
  const { t } = useTranslation("index");
  const { data: tiles, isLoading } = usePartnerTiles();
  const equipmentTiles = tiles?.filter(t => t.partner_type !== "local") || [];
  const localTiles = tiles?.filter(t => t.partner_type === "local") || [];
  const partnerTitlePart2 = t("partners.titlePart2");
  return (
    <>
      <section className="py-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <p className="text-sm text-muted-foreground mb-2">{t("partners.kicker")}</p>
            <h3 className="text-2xl md:text-3xl font-bold tracking-tight">
              {t("partners.titlePart1")} <BrandName />
              {partnerTitlePart2 ? ` ${partnerTitlePart2}` : ""}
            </h3>
          </motion.div>
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-28 md:h-36 rounded-2xl" />
              ))}
            </div>
          ) : equipmentTiles.length > 0 ? (
            <PartnerGrid tiles={equipmentTiles} />
          ) : null}
          <div className="text-center mt-10">
            <Button variant="outline" size="lg" asChild>
              <NavLink to="/fuer-partner">
                {t("partners.becomePartner")}
                <ArrowRight className="w-4 h-4 ml-2" />
              </NavLink>
            </Button>
          </div>
        </div>
      </section>

      {localTiles.length > 0 && (
        <section className="py-16 bg-card/30">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <p className="text-sm text-muted-foreground mb-2">{t("partners.localKicker")}</p>
              <h3 className="text-2xl md:text-3xl font-bold tracking-tight">{t("partners.localTitle")}</h3>
            </motion.div>
            <LocalPartnerSection tiles={localTiles} />
          </div>
        </section>
      )}
    </>
  );
};

// ── Ecosystem section visual config (non-translatable: icon + footer JSX) ─────
type EcosystemCardConfig = {
  step: number;
  icon: typeof Camera;
  footer: React.ReactNode;
};

type EcosystemCardCopy = {
  title: string;
  label: string;
  description: string;
  bullets: string[];
};

// ── Page ──────────────────────────────────────────────────────────────────────
const Index = () => {
  const { user, isLoading } = useAuth();
  const { t } = useTranslation("index");

  if (!isLoading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  const ecosystemConfig: EcosystemCardConfig[] = [
    {
      step: 1,
      icon: Camera,
      footer: (
        <div className="flex items-center gap-2 pt-4 border-t border-border/50">
          <img src={wingfieldLogo} alt="Wingfield" className="h-4 opacity-60" />
          <span className="text-xs text-muted-foreground">{t("ecosystem.poweredBy")}</span>
        </div>
      ),
    },
    {
      step: 2,
      icon: Trophy,
      footer: null,
    },
    {
      step: 3,
      icon: ShoppingBag,
      footer: (
        <div className="pt-4 border-t border-border/50">
          <Button variant="outline" size="sm" className="w-full" asChild>
            <NavLink to="/fuer-spieler">
              {t("ecosystem.morePlatform")} <ArrowRight className="w-4 h-4 ml-2" />
            </NavLink>
          </Button>
        </div>
      ),
    },
  ];

  const ecosystemCopy = t("ecosystem.cards", { returnObjects: true }) as EcosystemCardCopy[];
  const vereinStepsCopy = t("vereinSteps.steps", { returnObjects: true }) as { title: string; desc: string }[];
  const audienceCopy = t("audience.cards", { returnObjects: true }) as { title: string; desc: string; highlight: string; cta: string }[];

  return (
    <>
      <Helmet>
        <title>{t("meta.title")}</title>
        <meta name="description" content={t("meta.description")} />
      </Helmet>

      <Navigation />

      <main className="min-h-screen bg-background">

        {/* ── HERO ──────────────────────────────────────────────── */}
        <SyntheticHero
          title={t("hero.title")}
          description={
            <>
              {t("hero.descriptionLine1")}
              <br />
              {t("hero.descriptionLine2")}
            </>
          }
          badgeLabel={t("hero.badgeLabel")}
          badgeText={t("hero.badgeText")}
          showCountdown={true}
          countdownTargetDate={new Date("2026-07-01T00:00:00")}
          showLogo={true}
        >
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mt-8">
            <Button
              size="lg"
              className="w-full sm:w-auto text-base px-6 py-4 md:text-lg md:px-8 md:py-6 min-h-[48px]"
              asChild
            >
              <NavLink to="/booking">
                <Calendar className="w-5 h-5 mr-2" />
                {t("hero.ctaPrimary")}
              </NavLink>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto text-base px-6 py-4 md:text-lg md:px-8 md:py-6 min-h-[48px]"
              asChild
            >
              <NavLink to="/fuer-vereine">
                <Building2 className="w-5 h-5 mr-2" />
                {t("hero.ctaSecondary")}
              </NavLink>
            </Button>
          </div>
        </SyntheticHero>

        {/* ── SO KOMMT PADEL IN EUREN VEREIN ────────────────────── */}
        <section className="py-14 md:py-20">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center max-w-3xl mx-auto mb-14"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary mb-6">
                <Building2 className="w-4 h-4" />
                <span className="text-sm font-medium">{t("vereinSteps.badge")}</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">
                {t("vereinSteps.titlePart1")}{" "}
                <span className="text-gradient-lime">{t("vereinSteps.titlePart2")}</span>
              </h2>
              <p className="text-base md:text-lg text-muted-foreground">
                {t("vereinSteps.subtitle")}
              </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { icon: Search,       animation: "pulse" as const,  visualKey: "home.verein-steps.step-1", step: 1 },
                { icon: FileCheck,    animation: "blink" as const,  visualKey: "home.verein-steps.step-2", step: 2 },
                { icon: Wrench,       animation: "bounce" as const, visualKey: "home.verein-steps.step-3", step: 3 },
                { icon: Wifi,         animation: "glow" as const,   visualKey: "home.verein-steps.step-4", step: 4 },
                { icon: PartyPopper,  animation: "bounce" as const, visualKey: "home.verein-steps.step-5", step: 5 },
                { icon: Settings,     animation: "spin" as const,   visualKey: "home.verein-steps.step-6", step: 6 },
              ].map((cfg, index) => {
                const item = { ...cfg, title: vereinStepsCopy[index].title, desc: vereinStepsCopy[index].desc };
                return (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.08 * index }}
                  className="group relative"
                >
                  <div className="overflow-hidden rounded-2xl mb-5 bg-card border border-border/50 h-36 md:h-44">
                    <SiteVisual
                      visualKey={item.visualKey}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      fallbackClassName="w-full h-full bg-card"
                    />
                  </div>
                  <div className="text-center px-2">
                    <div className="relative inline-block mb-4">
                      <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto">
                        <AnimatedIcon animation={item.animation}>
                          <item.icon className="w-6 h-6 text-primary-foreground" />
                        </AnimatedIcon>
                      </div>
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-card border border-border rounded-full flex items-center justify-center text-xs font-bold">
                        {item.step}
                      </span>
                    </div>
                    <h3 className="text-base md:text-lg font-bold mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                </motion.div>
                );
              })}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mt-12"
            >
              <Button size="lg" variant="lime" asChild>
                <NavLink to="/fuer-vereine">
                  <Building2 className="w-5 h-5 mr-2" />
                  {t("vereinSteps.cta")}
                </NavLink>
              </Button>
            </motion.div>
          </div>
        </section>

        <SectionDivider variant="glow" />

        {/* ── LOCATION ROLLOUT ──────────────────────────────────── */}
        <LocationTeasersSection />

        {/* ── NEWS / ARTICLES ───────────────────────────────────── */}
        <ArticleFeed surface="logged_out" placement="public" />

        <SectionDivider variant="glow" />

        {/* ── PLATFORM ECOSYSTEM ────────────────────────────────── */}
        <section className="py-14 md:py-20">
          <div className="container mx-auto px-4">

            {/* Section header */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center max-w-3xl mx-auto mb-12"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary mb-6">
                <Zap className="w-4 h-4" />
                <span className="text-sm font-medium">{t("ecosystem.badgePart1")} <BrandName /> {t("ecosystem.badgePart2")}</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">
                {t("ecosystem.titlePart1")}{" "}
                <span className="text-gradient-lime">{t("ecosystem.titlePart2")}</span>
              </h2>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                {t("ecosystem.description")}
              </p>
            </motion.div>

            {/* Step flow indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="flex items-center justify-center gap-2 md:gap-4 mb-10 flex-wrap"
            >
              {ecosystemConfig.map((s, i) => (
                <div key={s.step} className="flex items-center gap-2 md:gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">
                      {s.step}
                    </div>
                    <span className="text-sm font-medium text-foreground whitespace-nowrap">{ecosystemCopy[i].label}</span>
                  </div>
                  {i < ecosystemConfig.length - 1 && (
                    <ArrowRight className="w-4 h-4 text-primary/40 shrink-0" />
                  )}
                </div>
              ))}
            </motion.div>

            {/* 3 cards – 1 col on mobile, 3 col on desktop */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {ecosystemConfig.map((item, index) => {
                const Icon = item.icon;
                const copy = ecosystemCopy[index];
                return (
                  <motion.div
                    key={item.step}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 * index }}
                    className="flex flex-col p-6 md:p-8 rounded-3xl bg-card border border-border hover:border-primary/30 transition-colors duration-300"
                  >
                    {/* Step number + icon */}
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                        {t("ecosystem.stepLabel")} {item.step}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-bold mb-3">{copy.title}</h3>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                      {copy.description}
                    </p>

                    {/* Bullets */}
                    <ul className="space-y-2 mb-6">
                      {copy.bullets.map(b => (
                        <li key={b} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          {b}
                        </li>
                      ))}
                    </ul>

                    {/* Footer (Wingfield badge or CTA) */}
                    {item.footer && <div className="mt-auto">{item.footer}</div>}
                  </motion.div>
                );
              })}
            </div>

            {/* Expert levels slider – below all 3 cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="mt-12"
            >
              <p className="text-center text-sm text-muted-foreground mb-4">
                {t("ecosystem.pathLabelPart1")}{" "}
                <span className="text-gradient-lime font-semibold">{t("ecosystem.pathLabelPart2")}</span>
              </p>
              <InfiniteSlider
                duration={25}
                gap={12}
                className="[--slider-mask:linear-gradient(to_right,transparent_0%,black_10%,black_90%,transparent_100%)]"
              >
                {EXPERT_LEVELS.map(level => (
                  <div
                    key={level.name}
                    className={`px-5 py-3 rounded-xl bg-gradient-to-r ${level.gradient} text-white shadow-lg flex items-center gap-3 shrink-0`}
                  >
                    <span className="text-3xl">{getExpertLevelEmoji(level.name)}</span>
                    <span className="text-sm font-semibold whitespace-nowrap">{level.name}</span>
                  </div>
                ))}
              </InfiniteSlider>
            </motion.div>

          </div>
        </section>

        <SectionDivider variant="glow" />

        {/* ── FÜR WEN IST PADEL2GO ──────────────────────────────── */}
        <section className="py-14 md:py-20 bg-card/30 relative overflow-hidden">
          <div className="absolute inset-0 z-0">
            <SiteVisual
              visualKey="home.fuer-wen.background"
              alt="Hintergrund"
              className="w-full h-full object-cover opacity-10"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-card/80 to-card/80 z-[1]" />

          <div className="container mx-auto px-4 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center max-w-2xl mx-auto mb-10"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary mb-6">
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium">{t("audience.badge")}</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">
                {t("audience.titlePart1")} <BrandName />?
              </h2>
              <p className="text-base md:text-lg text-muted-foreground">{t("audience.subtitle")}</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  icon: Gamepad2,
                  animation: "bounce" as const,
                  href: "/fuer-spieler",
                },
                {
                  icon: Building2,
                  animation: "pulse" as const,
                  href: "/fuer-vereine",
                },
                {
                  icon: Handshake,
                  animation: "glow" as const,
                  href: "/fuer-partner",
                },
              ].map((cfg, i) => {
                const copy = audienceCopy[i];
                const card = { ...cfg, title: copy.title, desc: copy.desc, highlight: copy.highlight || null, cta: copy.cta };
                return (
                <motion.div
                  key={card.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 * (i + 1) }}
                  className="group flex flex-col p-6 md:p-8 rounded-3xl bg-background border border-border hover:border-primary/30 transition-colors duration-300"
                >
                  <motion.div
                    className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                  >
                    <AnimatedIcon animation={card.animation}>
                      <card.icon className="w-6 h-6 text-primary" />
                    </AnimatedIcon>
                  </motion.div>
                  <h3 className="text-xl font-bold mb-3">{card.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-6 flex-1">
                    {card.desc.split(card.highlight ?? "___NOMATCH___").map((part, j, arr) =>
                      j < arr.length - 1 ? (
                        <span key={j}>
                          {part}
                          <span className="text-primary font-semibold">{card.highlight}</span>
                        </span>
                      ) : (
                        <span key={j}>{part}</span>
                      )
                    )}
                  </p>
                  <Button variant="outline" className="w-full mt-auto" asChild>
                    <NavLink to={card.href}>
                      {card.cta}
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </NavLink>
                  </Button>
                </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        <SectionDivider variant="glow" />

        {/* ── PARTNERS ──────────────────────────────────────────── */}
        <PartnerSections />


      </main>

      <Footer />
    </>
  );
};

export default Index;
