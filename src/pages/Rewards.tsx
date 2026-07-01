import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import SectionDivider from "@/components/SectionDivider";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import { supabase } from "@/integrations/supabase/client";
import { 
  Gift, Star, Trophy, Zap, ArrowRight, Sparkles,
  Calendar, Target, CheckCircle, Ticket, ShoppingBag,
  Download, Coins, CircleDollarSign, Loader2, Gem, Brain
} from "lucide-react";
import rewardsHero from "@/assets/rewards-hero.jpg";

import SkewLevelCards from "@/components/ui/skew-level-cards";

interface ExpertLevelDB {
  id: number;
  name: string;
  min_points: number;
  max_points: number | null;
  sort_order: number;
  gradient: string | null;
  emoji: string | null;
  description: string | null;
  perks: string[] | null;
}

const redeemOptionIcons = [CircleDollarSign, ShoppingBag, Ticket, Gift, Gem, Calendar];

// Tiers Section mit DB-Daten
const TiersSection = () => {
  const { t, i18n } = useTranslation("rewards");
  const numberLocale = i18n.language === "en" ? "en-US" : "de-DE";
  const [levels, setLevels] = useState<ExpertLevelDB[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLevels = async () => {
      try {
        const { data, error } = await supabase
          .from("expert_levels_config")
          .select("*")
          .order("sort_order", { ascending: true });
        if (error) throw error;
        setLevels(data || []);
      } catch (err) {
        console.error("Failed to load expert levels:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLevels();
  }, []);

  const tiers = levels.map(level => ({
    name: level.name,
    points: level.max_points === null
      ? `${level.min_points.toLocaleString(numberLocale)}+`
      : `${level.min_points.toLocaleString(numberLocale)} – ${level.max_points.toLocaleString(numberLocale)}`,
    benefits: level.perks || []
  }));

  if (isLoading) {
    return (
      <section className="py-14 md:py-24">
        <div className="container mx-auto px-4">
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-14 md:py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
            {t("tiers.titlePrefix")}<span className="text-primary">2</span>{t("tiers.titleMid")}{" "}
            <span className="text-gradient-lime">{t("tiers.titleHighlight")}</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            {t("tiers.subtitle")}
          </p>
        </motion.div>

        <SkewLevelCards tiers={tiers} />
      </div>
    </section>
  );
};

const Rewards = () => {
  const { t } = useTranslation("rewards");

  const steps = t("steps.items", { returnObjects: true }) as Array<{
    step: string; title: string; description: string;
  }>;

  const redeemOptions = (t("redeem.options", { returnObjects: true }) as Array<{
    category: string; items: string[];
  }>).map((option, idx) => ({ ...option, icon: redeemOptionIcons[idx] }));

  return (
    <>
      <Helmet>
        <title>{t("meta.title")}</title>
        <meta name="description" content={t("meta.description")} />
      </Helmet>

      <Navigation />
      
      <main className="min-h-screen bg-background pt-20">
        {/* Hero Section */}
        <section className="relative min-h-[80vh] md:min-h-screen flex items-start justify-center overflow-hidden">
          {/* Hintergrundbild */}
          <img src={rewardsHero} alt="" className="absolute inset-0 w-full h-full object-cover object-center z-0" />
          {/* Abdunklungs-Overlay */}
          <div className="absolute inset-0 bg-black/65 z-[1]" />
          {/* Farbverlauf unten */}
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent z-[2]" />

          <div className="container mx-auto px-4 relative z-10 pt-[20vh]">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-4xl mx-auto text-center"
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white mb-6">
                <Coins className="w-4 h-4" />
                <span className="text-sm font-medium">{t("hero.badge")}</span>
              </span>

              <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6 text-white">
                {t("hero.titlePrefix")}<span className="text-primary">2</span>{t("hero.titleMid")}{" "}
                <span className="text-gradient-lime">{t("hero.titleHighlight")}</span>
              </h1>

              <p className="text-lg md:text-xl text-white/80 mb-8 max-w-2xl mx-auto">
                {t("hero.description")}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                <Button variant="hero" size="xl" className="group" asChild>
                  <NavLink to="/app-booking">
                    <Download className="mr-2 h-5 w-5" />
                    {t("hero.ctaDownload")}
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform ml-2" />
                  </NavLink>
                </Button>
                <Button variant="heroOutline" size="xl" asChild>
                  <NavLink to="/auth">
                    <Coins className="mr-2 h-5 w-5" />
                    {t("hero.ctaRegister")}
                  </NavLink>
                </Button>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-4 max-w-lg mx-auto">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                  className="p-2 md:p-4 rounded-xl bg-white/10 border border-white/20 backdrop-blur-sm"
                >
                  <Coins className="w-6 h-6 text-primary mx-auto mb-1" />
                  <div className="text-lg font-bold text-white">{t("hero.stat1Value")}</div>
                  <div className="text-xs text-white/60">{t("hero.stat1Label")}</div>
                </motion.div>
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.4, type: "spring" }}
                  className="p-2 md:p-4 rounded-xl bg-white/10 border border-white/20 backdrop-blur-sm"
                >
                  <Brain className="w-6 h-6 text-primary mx-auto mb-1" />
                  <div className="text-lg font-bold text-white">{t("hero.stat2Value")}</div>
                  <div className="text-xs text-white/60">{t("hero.stat2Label")}</div>
                </motion.div>
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: "spring" }}
                  className="p-2 md:p-4 rounded-xl bg-white/10 border border-white/20 backdrop-blur-sm"
                >
                  <Trophy className="w-6 h-6 text-primary mx-auto mb-1" />
                  <div className="text-lg font-bold text-white">{t("hero.stat3Value")}</div>
                  <div className="text-xs text-white/60">{t("hero.stat3Label")}</div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>

        <SectionDivider variant="glow" />

        {/* How it Works Section - NACH OBEN VERSCHOBEN */}
        <section className="py-12 md:py-16 lg:py-24">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center max-w-3xl mx-auto mb-12"
            >
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
                {t("howItWorks.titlePrefix")} <span className="text-gradient-lime">{t("howItWorks.titleHighlight")}</span>
              </h2>
              <p className="text-lg text-muted-foreground">
                {t("howItWorks.subtitle")}
              </p>
            </motion.div>

            <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {steps.map((step, idx) => (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="relative p-6 rounded-2xl bg-card/50 border border-border/50 text-center"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                    <span className="text-xl font-bold text-primary">{step.step}</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                  
                  {idx < steps.length - 1 && (
                    <div className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2">
                      <ArrowRight className="w-6 h-6 text-muted-foreground/30" />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <SectionDivider variant="gradient" />

        {/* P2G Points Verdienen Section (Formel) */}
        <section className="py-16 md:py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
          
          <div className="container mx-auto px-4 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center max-w-3xl mx-auto mb-12"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary mb-6">
                <Zap className="w-4 h-4" />
                <span className="text-sm font-medium">{t("earn.badge")}</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
                <span className="text-gradient-lime">{t("earn.titleHighlight")}</span> {t("earn.titleSuffix")}
              </h2>
              <p className="text-lg text-muted-foreground">
                {t("earn.subtitle")}
              </p>
            </motion.div>

            {/* Formula Visualization */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="max-w-4xl mx-auto mb-12"
            >
              <div className="p-5 md:p-8 rounded-3xl bg-card/80 border border-border/50 backdrop-blur-sm">
                <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 mb-8">
                  <div className="flex flex-col items-center p-3 md:p-4 rounded-xl bg-primary/10 min-w-[80px] md:min-w-[140px]">
                    <Target className="w-8 h-8 text-primary mb-2" />
                    <span className="text-sm text-muted-foreground">{t("earn.matchScoreLabel")}</span>
                    <span className="text-2xl font-bold text-primary">{t("earn.matchScoreValue")}</span>
                  </div>
                  
                  <span className="text-xl md:text-3xl font-bold text-muted-foreground">×</span>
                  
                  <div className="flex flex-col items-center p-3 md:p-4 rounded-xl bg-accent/10 min-w-[80px] md:min-w-[140px]">
                    <Trophy className="w-8 h-8 text-accent mb-2" />
                    <span className="text-sm text-muted-foreground">{t("earn.skillLevelLabel")}</span>
                    <span className="text-2xl font-bold text-accent">{t("earn.skillLevelValue")}</span>
                  </div>
                  
                  <span className="text-xl md:text-3xl font-bold text-muted-foreground">=</span>
                  
                  <div className="flex flex-col items-center p-3 md:p-4 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 min-w-[80px] md:min-w-[140px] border border-primary/30">
                    <Coins className="w-8 h-8 text-primary mb-2" />
                    <span className="text-sm text-muted-foreground">{t("earn.pointsLabel")}</span>
                    <span className="text-2xl font-bold text-gradient-lime">{t("earn.pointsValue")}</span>
                  </div>
                </div>

                {/* Example Calculation */}
                <div className="grid md:grid-cols-3 gap-4 pt-6 border-t border-border/50">
                  <div className="p-4 rounded-xl bg-background/50 text-center">
                    <p className="text-sm text-muted-foreground mb-1">{t("earn.example1Label")}</p>
                    <p className="font-mono text-lg">
                      <span className="text-primary">75</span> × <span className="text-accent">5</span> = <span className="font-bold text-primary">375 Points</span>
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-background/50 text-center">
                    <p className="text-sm text-muted-foreground mb-1">{t("earn.example2Label")}</p>
                    <p className="font-mono text-lg">
                      <span className="text-primary">90</span> × <span className="text-accent">7</span> = <span className="font-bold text-primary">630 Points</span>
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-background/50 text-center">
                    <p className="text-sm text-muted-foreground mb-1">{t("earn.example3Label")}</p>
                    <p className="font-mono text-lg">
                      <span className="text-primary">95</span> × <span className="text-accent">10</span> = <span className="font-bold text-primary">950 Points</span>
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Redeem Options */}
        <section className="py-12 md:py-16 lg:py-24">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center max-w-3xl mx-auto mb-12"
            >
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
                {t("redeem.titlePrefix")} <span className="text-gradient-lime">{t("redeem.titleHighlight")}</span> {t("redeem.titleSuffix")}
              </h2>
              <p className="text-lg text-muted-foreground">
                {t("redeem.subtitle")}
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {redeemOptions.map((option, idx) => {
                const Icon = option.icon;
                return (
                  <motion.div
                    key={option.category}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.08 }}
                    whileHover={{ y: -4, scale: 1.02 }}
                    className="group relative p-6 rounded-2xl bg-card/30 backdrop-blur-sm border border-white/10 hover:border-primary/30 transition-all duration-300 overflow-hidden"
                  >
                    {/* Subtle gradient glow on hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-lg shadow-primary/10 group-hover:shadow-primary/20 transition-shadow">
                          <Icon className="w-6 h-6 text-primary" />
                        </div>
                        <h3 className="text-xl font-bold">{option.category}</h3>
                      </div>
                      <ul className="space-y-2.5">
                        {option.items.map((item) => (
                          <li key={item} className="flex items-center gap-2.5 text-sm text-muted-foreground group-hover:text-foreground/80 transition-colors">
                            <CheckCircle className="w-4 h-4 text-primary/70 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        <SectionDivider variant="gradient" />

        {/* Tiers */}
        <TiersSection />
      </main>

      <Footer />
    </>
  );
};

export default Rewards;
