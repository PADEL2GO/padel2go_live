import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import {
  Gift, Trophy, ArrowRight, Coins, DollarSign, Download
} from "lucide-react";

export function RewardsHeroSection() {
  const { t } = useTranslation("p2g");
  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/10" />
      <div className="absolute top-20 right-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-10 left-10 w-72 h-72 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto text-center"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary mb-6">
            <Coins className="w-4 h-4" />
            <span className="text-sm font-medium">{t("rewardsHeroSection.badge")}</span>
          </span>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
            {t("rewardsHeroSection.headingPrefix")}{" "}
            <span className="text-gradient-lime">{t("rewardsHeroSection.headingHighlight")}</span>
          </h1>

          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            {t("rewardsHeroSection.subtitle")}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button variant="hero" size="xl" className="group" asChild>
              <NavLink to="/app-booking">
                <Download className="mr-2 h-5 w-5" />
                {t("rewardsHeroSection.downloadApp")}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform ml-2" />
              </NavLink>
            </Button>
            <Button variant="heroOutline" size="xl" asChild>
              <NavLink to="/fuer-spieler">
                <Coins className="mr-2 h-5 w-5" />
                {t("rewardsHeroSection.startCollecting")}
              </NavLink>
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
              className="p-4 rounded-xl bg-card/50 border border-border"
            >
              <DollarSign className="w-6 h-6 text-primary mx-auto mb-1" />
              <div className="text-2xl font-bold">50+</div>
              <div className="text-xs text-muted-foreground">{t("rewardsHeroSection.stats.creditsPerMatch")}</div>
            </motion.div>
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: "spring" }}
              className="p-4 rounded-xl bg-card/50 border border-border"
            >
              <Gift className="w-6 h-6 text-primary mx-auto mb-1" />
              <div className="text-2xl font-bold">100+</div>
              <div className="text-xs text-muted-foreground">{t("rewardsHeroSection.stats.rewards")}</div>
            </motion.div>
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: "spring" }}
              className="p-4 rounded-xl bg-card/50 border border-border"
            >
              <Trophy className="w-6 h-6 text-primary mx-auto mb-1" />
              <div className="text-2xl font-bold">8</div>
              <div className="text-xs text-muted-foreground">{t("rewardsHeroSection.stats.levels")}</div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
