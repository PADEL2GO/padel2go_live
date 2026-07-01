import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import SectionDivider from "@/components/SectionDivider";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Calendar, Target, Users, Trophy, Wallet, MapPin, CreditCard, Play, ArrowRight, Brain, Video, Activity, BarChart3, UserPlus, Clock, Camera } from "lucide-react";
import appIcon from "@/assets/p2g-app-icon.png";
import badgeAppStore from "@/assets/badge-app-store.png";
import badgeGooglePlay from "@/assets/badge-google-play.png";
import wingfieldLogo from "@/assets/partners/wingfield.png";
import appBookingHero from "@/assets/app-booking-hero.jpg";

/**
 * APP & BOOKING - Seite
 * 
 * Zusammenfassung:
 * Diese Seite präsentiert die Padel2Go App als Game-Changing Padel Experience.
 * 
 * Sektionen:
 * 1. Hero: Game-Changing Padel Experience mit einer App + Store Badges
 * 2. Was die App kann: Buchung, Score-Tracking, Spielerprofile, League (Coming Soon), P2G Wallet, Matching (Coming Soon)
 * 3. Booking-Flow in 3 Steps
 * 4. AI & Stats (mit Wingfield): Live-Kamera-Analyse
 */

const appFeatureMeta = [
  { icon: Calendar, comingSoon: false },
  { icon: Target, comingSoon: false },
  { icon: Users, comingSoon: false },
  { icon: Trophy, comingSoon: true },
  { icon: Wallet, comingSoon: false },
  { icon: UserPlus, comingSoon: true }
];

const bookingStepMeta = [
  { step: "1", icon: MapPin },
  { step: "2", icon: Calendar },
  { step: "3", icon: CreditCard }
];

const aiFeatureMeta = [
  { icon: Camera },
  { icon: Activity },
  { icon: BarChart3 },
  { icon: Video },
  { icon: Brain },
  { icon: Target }
];

const AppBooking = () => {
  const { t } = useTranslation("appbooking");

  const appFeatures = (t("features.items", { returnObjects: true }) as Array<{ title: string; description: string }>)
    .map((item, i) => ({ ...appFeatureMeta[i], ...item }));

  const bookingSteps = (t("steps.items", { returnObjects: true }) as Array<{ title: string; description: string }>)
    .map((item, i) => ({ ...bookingStepMeta[i], ...item }));

  const aiFeatures = (t("ai.items", { returnObjects: true }) as Array<{ title: string; description: string }>)
    .map((item, i) => ({ ...aiFeatureMeta[i], ...item }));

  return <>
      <Helmet>
        <title>{t("meta.title")}</title>
        <meta name="description" content={t("meta.description")} />
      </Helmet>

      <Navigation />
      
      <main className="min-h-screen bg-background pt-20">
        {/* Sektion 1: Hero */}
        <section className="relative min-h-[80vh] md:min-h-screen flex items-start justify-center overflow-hidden">
          {/* Hintergrundbild */}
          <img src={appBookingHero} alt="" className="absolute inset-0 w-full h-full object-cover object-center z-0" />
          {/* Abdunklungs-Overlay */}
          <div className="absolute inset-0 bg-black/55 z-[1]" />
          {/* Farbverlauf unten */}
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent z-[2]" />

          <div className="container mx-auto px-4 relative z-10 pt-[20vh]">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white mb-6">
                  <Smartphone className="w-4 h-4" />
                  <span className="text-sm font-medium">{t("hero.badgePrefix")}<span className="text-primary">2</span>{t("hero.badgeSuffix")}</span>
                </span>

                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6 text-white">
                  {t("hero.titlePrefix")}{" "}
                  <span className="text-gradient-lime">{t("hero.titleHighlight")}</span>{" "}
                  {t("hero.titleSuffix")}
                </h1>

                <p className="text-xl text-white/80 mb-8">
                  {t("hero.description")}
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <Button variant="hero" size="xl" className="group" asChild>
                    <NavLink to="/booking">
                      <Play className="w-5 h-5" />
                      {t("hero.bookNow")}
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </NavLink>
                  </Button>

                  {/* Store Badges */}
                  <div className="flex items-center gap-4">
                    <a 
                      href="https://apps.apple.com/app/padel2go" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="hover:opacity-80 hover:scale-105 transition-all"
                    >
                      <img src={badgeAppStore} alt={t("hero.appStoreAlt")} className="h-20 sm:h-24 md:h-32 lg:h-40 w-auto" />
                    </a>
                    <a 
                      href="https://play.google.com/store/apps/details?id=com.padel2go" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="hover:opacity-80 hover:scale-105 transition-all"
                    >
                      <img src={badgeGooglePlay} alt={t("hero.googlePlayAlt")} className="h-20 sm:h-24 md:h-32 lg:h-40 w-auto" />
                    </a>
                  </div>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="flex justify-center">
                {/* App Icon */}
                <div className="relative">
                  <div className="absolute -inset-4 bg-primary/20 rounded-3xl blur-2xl" />
                  <img
                    src={appIcon}
                    alt={t("hero.appIconAlt")}
                    className="relative w-48 h-48 md:w-64 md:h-64 lg:w-80 lg:h-80 rounded-3xl shadow-2xl"
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <SectionDivider variant="glow" />

        {/* Sektion 2: Was die App kann */}
        <section className="py-14 md:py-24 bg-card/30">
          <div className="container mx-auto px-4">
            <motion.div initial={{
            opacity: 0,
            y: 30
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true
          }} className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
                {t("features.titlePrefix")} <span><span className="text-foreground">PADEL</span><span className="text-primary">2</span><span className="text-foreground">GO</span></span> {t("features.titleSuffix")}
              </h2>
              <p className="text-lg text-muted-foreground">
                {t("features.subtitle")}
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {appFeatures.map((feature, index) => <motion.div key={feature.title} initial={{
              opacity: 0,
              y: 30
            }} whileInView={{
              opacity: 1,
              y: 0
            }} viewport={{
              once: true
            }} transition={{
              delay: index * 0.1
            }} className={`p-6 rounded-2xl bg-background border ${feature.comingSoon ? 'border-dashed border-border' : 'border-border hover:border-primary/30'} transition-all duration-300 group relative`}>
                  {feature.comingSoon && (
                    <Badge variant="secondary" className="absolute top-4 right-4 text-xs">
                      {t("comingSoon")}
                    </Badge>
                  )}
                  <div className={`w-12 h-12 rounded-xl ${feature.comingSoon ? 'bg-muted' : 'bg-primary/10 group-hover:bg-primary/20'} flex items-center justify-center mb-4 transition-colors`}>
                    <feature.icon className={`w-6 h-6 ${feature.comingSoon ? 'text-muted-foreground' : 'text-primary'}`} />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </motion.div>)}
            </div>
          </div>
        </section>

        <SectionDivider variant="glow" />

        {/* Sektion 3: Booking-Flow in 3 Steps */}
        <section className="py-14 md:py-24">
          <div className="container mx-auto px-4">
            <motion.div initial={{
            opacity: 0,
            y: 30
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true
          }} className="text-center max-w-2xl mx-auto mb-10 md:mb-16">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4">
                {t("steps.titlePrefix")} <span className="text-gradient-lime">{t("steps.titleHighlight")}</span>
              </h2>
              <p className="text-lg text-muted-foreground">
                {t("steps.subtitle")}
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {bookingSteps.map((item, index) => <motion.div key={item.step} initial={{
              opacity: 0,
              y: 30
            }} whileInView={{
              opacity: 1,
              y: 0
            }} viewport={{
              once: true
            }} transition={{
              delay: index * 0.15
            }} className="relative">
                  {/* Connection line */}
                  {index < bookingSteps.length - 1 && <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary/50 to-primary/10" />}
                  
                  <div className="p-8 rounded-2xl bg-card border border-border text-center relative h-full flex flex-col">
                    <div className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-primary text-primary-foreground font-bold text-lg md:text-2xl flex items-center justify-center mx-auto mb-4 md:mb-6">
                      {item.step}
                    </div>
                    <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <item.icon className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                    <p className="text-muted-foreground flex-grow">{item.description}</p>
                  </div>
                </motion.div>)}
            </div>
          </div>
        </section>

        <SectionDivider variant="glow" />

        {/* Sektion 4: AI & Stats mit Wingfield */}
        <section className="py-14 md:py-24 bg-card/30">
          <div className="container mx-auto px-4">
            <motion.div initial={{
            opacity: 0,
            y: 30
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true
          }} className="text-center max-w-3xl mx-auto mb-6">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary mb-6">
                <Brain className="w-4 h-4" />
                <span className="text-sm font-medium">{t("comingSoon")}</span>
              </span>

              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
                <span className="text-gradient-lime">{t("ai.titleHighlight")}</span> {t("ai.titleSuffix")}
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                {t("ai.description")}
              </p>

              {/* Wingfield Partner Logo */}
              <div className="flex items-center justify-center gap-4 mb-8">
                <span className="text-sm text-muted-foreground">{t("ai.inCooperationWith")}</span>
                <img 
                  src={wingfieldLogo} 
                  alt="Wingfield" 
                  className="h-10 rounded-lg"
                />
              </div>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {aiFeatures.map((feature, index) => <motion.div key={feature.title} initial={{
              opacity: 0,
              y: 30
            }} whileInView={{
              opacity: 1,
              y: 0
            }} viewport={{
              once: true
            }} transition={{
              delay: index * 0.1
            }} className="p-6 rounded-2xl bg-background border border-border border-dashed hover:border-primary/30 transition-all duration-300 group">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                </motion.div>)}
            </div>

            <motion.div initial={{
            opacity: 0
          }} whileInView={{
            opacity: 1
          }} viewport={{
            once: true
          }} className="mt-12 p-6 rounded-2xl bg-background/50 border border-primary/20 max-w-3xl mx-auto">
              <div className="flex items-center gap-4 mb-4">
                <Camera className="w-8 h-8 text-primary" />
                <h3 className="text-xl font-bold">{t("ai.howItWorksTitle")}</h3>
              </div>
              <p className="text-muted-foreground">
                {t("ai.howItWorksText")}
              </p>
            </motion.div>

            <motion.p initial={{
            opacity: 0
          }} whileInView={{
            opacity: 1
          }} viewport={{
            once: true
          }} className="text-center text-muted-foreground mt-8 max-w-2xl mx-auto">
              {t("ai.footnote")}
            </motion.p>
          </div>
        </section>
      </main>

      <Footer />
    </>;
};
export default AppBooking;
