import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import BrandName from "@/components/BrandName";
import { NavLink } from "@/components/NavLink";
import { usePartnerTiles } from "@/hooks/usePartnerTiles";
import {
  Heart, Target, Users, Zap, Globe, Handshake,
  Sparkles, TrendingUp, MapPin, Cpu, Linkedin,
  Instagram, Mail, ArrowRight, ChevronRight,
} from "lucide-react";
import florianImg from "@/assets/team/florian-steinfelder.jpg";
import davidImg from "@/assets/team/david-klemm.jpg";

const CONTAINER = "container mx-auto px-4 sm:px-6";
const CONTENT = "max-w-5xl mx-auto";
const SECTION = "py-20 md:py-28";

const valueStyles = [
  { icon: Heart,      accent: "#f472b6", glow: "rgba(244,114,182,0.12)", border: "rgba(244,114,182,0.25)" },
  { icon: Users,      accent: "#C7F011", glow: "rgba(199,240,17,0.12)",  border: "rgba(199,240,17,0.25)" },
  { icon: Sparkles,   accent: "#a78bfa", glow: "rgba(167,139,250,0.12)", border: "rgba(167,139,250,0.25)" },
  { icon: Handshake,  accent: "#38bdf8", glow: "rgba(56,189,248,0.12)",  border: "rgba(56,189,248,0.25)" },
  { icon: TrendingUp, accent: "#fbbf24", glow: "rgba(251,191,36,0.12)",  border: "rgba(251,191,36,0.25)" },
  { icon: Zap,        accent: "#fb923c", glow: "rgba(251,146,60,0.12)",  border: "rgba(251,146,60,0.25)" },
];

const heroChipIcons = [Heart, Users, Zap, Globe];

const visionCardStyles = [
  { icon: Globe, accent: "#C7F011", glow: "rgba(199,240,17,0.12)", border: "rgba(199,240,17,0.25)" },
  { icon: Zap,   accent: "#38bdf8", glow: "rgba(56,189,248,0.12)", border: "rgba(56,189,248,0.25)" },
];

const futureGoalStyles = [
  { icon: MapPin, accent: "#C7F011", glow: "rgba(199,240,17,0.12)", border: "rgba(199,240,17,0.25)" },
  { icon: Cpu,    accent: "#38bdf8", glow: "rgba(56,189,248,0.12)", border: "rgba(56,189,248,0.25)" },
  { icon: Globe,  accent: "#a78bfa", glow: "rgba(167,139,250,0.12)", border: "rgba(167,139,250,0.25)" },
];

const UeberUns = () => {
  const { t } = useTranslation("ueberuns");
  const { data: partnerTiles } = usePartnerTiles(true);
  const wingfieldTile = partnerTiles?.find(t => t.slug === "wingfield");

  const heroChips = t("hero.chips", { returnObjects: true }) as Array<{ text: string }>;
  const timeline = t("timeline", { returnObjects: true }) as Array<{ year: string; label: string; desc: string }>;
  const valuesList = t("values.list", { returnObjects: true }) as Array<{ title: string; description: string }>;
  const visionCards = t("vision.cards", { returnObjects: true }) as Array<{ title: string; desc: string }>;
  const futureGoals = t("future.goals", { returnObjects: true }) as Array<{ title: string; description: string }>;

  return (
    <>
      <Helmet>
        <title>{t("meta.title")}</title>
        <meta name="description" content={t("meta.description")} />
      </Helmet>

      <Navigation />

      <main className="min-h-screen bg-background pt-20 overflow-x-hidden">

        {/* ═══ HERO ═══════════════════════════════════════════════════════════ */}
        <section className="relative min-h-[75vh] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-black via-background to-background z-0" />
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] z-[1] pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(199,240,17,0.13) 0%, transparent 65%)" }}
          />
          <div
            className="absolute inset-0 z-[1] pointer-events-none opacity-[0.035]"
            style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "60px 60px" }}
          />

          <div className={`${CONTAINER} relative z-10 w-full py-24`}>
            <motion.div
              initial={{ opacity: 0, y: 48 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="text-center max-w-4xl mx-auto"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15, duration: 0.5 }}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#C7F011]/15 border border-[#C7F011]/35 text-[#C7F011] mb-8"
              >
                <Heart className="w-4 h-4" />
                <span className="text-sm font-bold tracking-widest uppercase">{t("hero.badge")}</span>
              </motion.div>

              <h1 className="text-5xl sm:text-6xl md:text-7xl font-black leading-[0.95] tracking-tight mb-7 text-white">
                {t("hero.titleLine1")}
                <br />
                <span className="text-[#C7F011]">{t("hero.titleLine2")}</span>
              </h1>

              <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed font-light">
                {t("hero.description")}
              </p>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex flex-wrap items-center justify-center gap-2"
              >
                {heroChips.map((c, i) => {
                  const Icon = heroChipIcons[i] ?? Heart;
                  return (
                    <span
                      key={c.text}
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
        </section>

        {/* ═══ STORY BLOCK ════════════════════════════════════════════════════ */}
        <section className={SECTION}
          style={{ background: "linear-gradient(180deg, transparent 0%, rgba(199,240,17,0.03) 50%, transparent 100%)" }}>
          <div className={CONTAINER}>
            <div className={`${CONTENT} grid lg:grid-cols-2 gap-12 lg:gap-20 items-center`}>
              <motion.div
                initial={{ opacity: 0, x: -40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
              >
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#C7F011]/12 border border-[#C7F011]/25 text-[#C7F011] mb-6 text-sm font-bold tracking-wider uppercase">
                  <Sparkles className="w-4 h-4" />
                  {t("story.badge")}
                </span>
                <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-6 leading-tight">
                  {t("story.titleLine1")}<br />
                  <span className="text-[#C7F011]">{t("story.titleLine2")}</span>
                </h2>
                <div className="space-y-4 text-white/60 leading-relaxed text-base">
                  {(t("story.paragraphs", { returnObjects: true }) as string[]).map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                  <p className="text-white/80 font-medium">
                    {t("story.highlight")}
                  </p>
                </div>
              </motion.div>

              {/* Timeline */}
              <motion.div
                initial={{ opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
                className="space-y-4"
              >
                {timeline.map((step, i) => (
                  <motion.div
                    key={step.year}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex gap-5 p-5 rounded-2xl border border-white/8 bg-white/[0.02] hover:border-[#C7F011]/30 hover:bg-[#C7F011]/5 transition-all duration-300 group"
                  >
                    <div className="shrink-0 w-14 h-14 rounded-xl bg-[#C7F011]/10 border border-[#C7F011]/25 flex items-center justify-center group-hover:bg-[#C7F011]/15 transition-colors">
                      <span className="text-[#C7F011] font-black text-xs leading-none text-center">{step.year}</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-white mb-1">{step.label}</h4>
                      <p className="text-white/45 text-sm leading-relaxed">{step.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        {/* ═══ TEAM ═══════════════════════════════════════════════════════════ */}
        <section className={SECTION}>
          <div className={CONTAINER}>
            <div className={CONTENT}>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center max-w-xl mx-auto mb-14"
              >
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#C7F011]/12 border border-[#C7F011]/25 text-[#C7F011] mb-6 text-sm font-bold tracking-wider uppercase">
                  <Users className="w-4 h-4" />
                  {t("team.badge")}
                </span>
                <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-4">
                  {t("team.titleLine1")}<br />
                  <span className="text-[#C7F011]">{t("team.titleLine2")}</span>
                </h2>
              </motion.div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Florian */}
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  className="relative p-7 md:p-10 rounded-3xl border border-[#C7F011]/20 bg-gradient-to-br from-[#C7F011]/8 to-transparent hover:border-[#C7F011]/40 transition-all duration-300 group"
                  style={{ boxShadow: "0 0 0 transparent" }}
                  whileHover={{ boxShadow: "0 8px 40px rgba(199,240,17,0.08)" }}
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 rounded-full bg-[#C7F011]/20 blur-xl scale-110 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <img
                        src={florianImg}
                        alt="Florian Steinfelder"
                        className="relative w-28 h-28 rounded-full object-cover border-2 border-[#C7F011]/40"
                      />
                    </div>
                    <h3 className="text-xl font-black text-white tracking-wide mb-1">{t("team.florian.name")}</h3>
                    <p className="text-[#C7F011] text-sm font-bold mb-4 tracking-wider uppercase">{t("team.florian.role")}</p>
                    <div className="flex justify-center gap-4 mb-6">
                      <a href="https://www.linkedin.com/in/floriansteinfelder" target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-[#C7F011] transition-colors">
                        <Linkedin className="w-5 h-5" />
                      </a>
                      <a href="https://www.instagram.com/padel2go.official" target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-[#C7F011] transition-colors">
                        <Instagram className="w-5 h-5" />
                      </a>
                      <a href="mailto:contact@padel2go.eu" className="text-white/30 hover:text-[#C7F011] transition-colors">
                        <Mail className="w-5 h-5" />
                      </a>
                    </div>
                    <p className="text-white/55 text-sm leading-relaxed">
                      {t("team.florian.bio")}
                    </p>
                  </div>
                </motion.div>

                {/* David */}
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1, duration: 0.6 }}
                  className="relative p-7 md:p-10 rounded-3xl border border-[#38bdf8]/20 bg-gradient-to-br from-[#38bdf8]/8 to-transparent hover:border-[#38bdf8]/40 transition-all duration-300 group"
                  whileHover={{ boxShadow: "0 8px 40px rgba(56,189,248,0.08)" }}
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 rounded-full bg-[#38bdf8]/20 blur-xl scale-110 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <img
                        src={davidImg}
                        alt="David Klemm"
                        className="relative w-28 h-28 rounded-full object-cover border-2 border-[#38bdf8]/40"
                      />
                    </div>
                    <h3 className="text-xl font-black text-white tracking-wide mb-1">{t("team.david.name")}</h3>
                    <p className="text-[#38bdf8] text-sm font-bold mb-4 tracking-wider uppercase">{t("team.david.role")}</p>
                    <div className="flex justify-center gap-4 mb-6">
                      <a href="https://www.linkedin.com/in/davidklemm" target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-[#38bdf8] transition-colors">
                        <Linkedin className="w-5 h-5" />
                      </a>
                      <a href="https://www.instagram.com/padel2go.official" target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-[#38bdf8] transition-colors">
                        <Instagram className="w-5 h-5" />
                      </a>
                      <a href="mailto:contact@padel2go.eu" className="text-white/30 hover:text-[#38bdf8] transition-colors">
                        <Mail className="w-5 h-5" />
                      </a>
                    </div>
                    <p className="text-white/55 text-sm leading-relaxed">
                      {t("team.david.bio")}
                    </p>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ WERTE ══════════════════════════════════════════════════════════ */}
        <section className={SECTION}
          style={{ background: "linear-gradient(180deg, transparent 0%, rgba(199,240,17,0.025) 50%, transparent 100%)" }}>
          <div className={CONTAINER}>
            <div className={CONTENT}>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center max-w-xl mx-auto mb-14"
              >
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#C7F011]/12 border border-[#C7F011]/25 text-[#C7F011] mb-6 text-sm font-bold tracking-wider uppercase">
                  <Heart className="w-4 h-4" />
                  {t("values.badge")}
                </span>
                <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white">
                  {t("values.titlePrefix")} <span className="text-[#C7F011]">{t("values.titleHighlight")}</span>
                </h2>
              </motion.div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {valuesList.map((v, i) => {
                  const style = valueStyles[i] ?? valueStyles[0];
                  const Icon = style.icon;
                  return (
                    <motion.div
                      key={v.title}
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
                      <h3 className="text-lg font-bold text-white mb-2">{v.title}</h3>
                      <p className="text-white/50 text-sm leading-relaxed">{v.description}</p>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ═══ VISION ═════════════════════════════════════════════════════════ */}
        <section className={SECTION}>
          <div className={CONTAINER}>
            <div className={`${CONTENT} relative`}>
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] pointer-events-none"
                style={{ background: "radial-gradient(ellipse, rgba(199,240,17,0.07) 0%, transparent 70%)" }}
              />
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="relative text-center max-w-3xl mx-auto mb-14"
              >
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#C7F011]/12 border border-[#C7F011]/25 text-[#C7F011] mb-6 text-sm font-bold tracking-wider uppercase">
                  <Target className="w-4 h-4" />
                  {t("vision.badge")}
                </span>
                <h2 className="text-4xl md:text-6xl font-black tracking-tight text-white mb-6 leading-tight">
                  {t("vision.titleLine1Prefix")}{" "}
                  <span className="text-[#C7F011]">{t("vision.titleLine1Highlight")}</span>
                  <br />
                  {t("vision.titleLine2")}
                </h2>
                <p className="text-white/55 text-lg leading-relaxed max-w-2xl mx-auto">
                  {t("vision.description")}
                </p>
              </motion.div>

              {/* Vision cards */}
              <div className="grid md:grid-cols-2 gap-5 max-w-3xl mx-auto relative">
                {visionCards.map((c, i) => {
                  const style = visionCardStyles[i] ?? visionCardStyles[0];
                  const Icon = style.icon;
                  return (
                    <motion.div
                      key={c.title}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.12 }}
                      className="p-7 rounded-3xl border transition-all duration-300"
                      style={{ background: `linear-gradient(135deg, ${style.glow} 0%, rgba(255,255,255,0.02) 100%)`, borderColor: style.border }}
                      whileHover={{ boxShadow: `0 8px 40px ${style.glow}` }}
                    >
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: style.accent + "18", border: `1px solid ${style.accent}30` }}>
                        <Icon className="w-6 h-6" style={{ color: style.accent }} />
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2">{c.title}</h3>
                      <p className="text-white/50 text-sm leading-relaxed">{c.desc}</p>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ═══ ZUKUNFT ════════════════════════════════════════════════════════ */}
        <section className={SECTION}
          style={{ background: "linear-gradient(180deg, transparent 0%, rgba(199,240,17,0.025) 50%, transparent 100%)" }}>
          <div className={CONTAINER}>
            <div className={CONTENT}>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center max-w-xl mx-auto mb-14"
              >
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#C7F011]/12 border border-[#C7F011]/25 text-[#C7F011] mb-6 text-sm font-bold tracking-wider uppercase">
                  <TrendingUp className="w-4 h-4" />
                  {t("future.badge")}
                </span>
                <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white">
                  {t("future.titlePrefix")} <span className="text-[#C7F011]">{t("future.titleHighlight")}</span>
                </h2>
              </motion.div>

              <div className="grid md:grid-cols-3 gap-5">
                {futureGoals.map((g, i) => {
                  const style = futureGoalStyles[i] ?? futureGoalStyles[0];
                  const Icon = style.icon;
                  const isAnalytics = i === 1;
                  return (
                    <motion.div
                      key={g.title}
                      initial={{ opacity: 0, y: 40 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1, duration: 0.6 }}
                      className="p-7 rounded-3xl border transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1"
                      style={{ background: `linear-gradient(135deg, ${style.glow} 0%, rgba(255,255,255,0.02) 100%)`, borderColor: style.border }}
                      whileHover={{ boxShadow: `0 8px 40px ${style.glow}` }}
                    >
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ background: style.accent + "18", border: `1px solid ${style.accent}30` }}>
                        <Icon className="w-6 h-6" style={{ color: style.accent }} />
                      </div>
                      <h3 className="text-lg font-bold text-white mb-3">{g.title}</h3>
                      {isAnalytics && wingfieldTile && (
                        <div className="mb-3">
                          <a href={wingfieldTile.website_url || "#"} target="_blank" rel="noopener noreferrer">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white hover:opacity-90 transition-opacity" style={{ backgroundColor: wingfieldTile.bg_color || "#3FBB7D" }}>
                              {wingfieldTile.logo_url ? <img alt="Wingfield" className="h-3.5 w-auto" src={wingfieldTile.logo_url} /> : <span>Wingfield</span>}
                            </span>
                          </a>
                        </div>
                      )}
                      <p className="text-white/50 text-sm leading-relaxed">{g.description}</p>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ═══ CTA ════════════════════════════════════════════════════════════ */}
        <section className={`${SECTION} relative overflow-hidden`}>
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(199,240,17,0.1) 0%, transparent 65%)" }}
          />
          <div className={`${CONTAINER} relative z-10`}>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center max-w-2xl mx-auto"
            >
              <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-5">
                {t("cta.titleLine1")}<br />
                <span className="text-[#C7F011]">{t("cta.titleLine2")}</span>
              </h2>
              <p className="text-white/55 text-lg mb-10 leading-relaxed">
                {t("cta.description")}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <NavLink
                  to="/faq-kontakt"
                  className="inline-flex items-center justify-center gap-3 px-9 py-4 rounded-full bg-[#C7F011] text-black font-black text-base hover:bg-[#d4f530] transition-all shadow-[0_0_30px_rgba(199,240,17,0.3)] w-full sm:w-auto"
                >
                  {t("cta.primaryButton")}
                  <ArrowRight className="w-5 h-5" />
                </NavLink>
                <NavLink
                  to="/fuer-vereine"
                  className="inline-flex items-center justify-center gap-3 px-9 py-4 rounded-full bg-white/8 border border-white/20 text-white hover:bg-white/15 hover:border-white/35 transition-all font-semibold w-full sm:w-auto"
                >
                  {t("cta.secondaryButton")}
                  <ChevronRight className="w-5 h-5" />
                </NavLink>
              </div>
            </motion.div>
          </div>
        </section>

      </main>

      <Footer />
    </>
  );
};

export default UeberUns;
