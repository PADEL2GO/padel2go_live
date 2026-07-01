import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import { toast } from "sonner";
import {
  ArrowRight,
  Smartphone,
  Calendar,
  Trophy,
  Users,
  Download,
  Apple,
  Play as PlayIcon
} from "lucide-react";

const Play = () => {
  const { t } = useTranslation("play");

  const handleAppStoreClick = (store: "App Store" | "Google Play") => {
    toast.info(t("toast.comingSoon", { store }), {
      description: t("toast.comingSoonDescription"),
    });
  };

  return (
    <>
      <Helmet>
        <title>{t("meta.title")}</title>
        <meta name="description" content={t("meta.description")} />
      </Helmet>

      <Navigation />
      
      <main className="min-h-screen bg-background pt-20">
        {/* Hero Section */}
        <section className="relative py-24 md:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-hero" />
          <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          
          <div className="container mx-auto px-4 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-4xl mx-auto text-center"
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary mb-8">
                <PlayIcon className="w-4 h-4" />
                <span className="text-sm font-medium">{t("hero.badge")}</span>
              </span>

              <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold leading-tight mb-8">
                {t("hero.titlePrefix")}{" "}
                <span className="text-gradient-lime">{t("hero.titleHighlight")}</span>
              </h1>

              <p className="text-lg md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-10">
                {t("hero.subtitle")}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
                <Button variant="hero" size="xl" className="group" asChild>
                  <NavLink to="/booking">
                    <Calendar className="w-5 h-5" />
                    {t("hero.primaryCta")}
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </NavLink>
                </Button>
              </div>

              <p className="text-sm text-muted-foreground mb-6">
                {t("hero.accountNote")} <NavLink to="/auth" className="text-primary hover:underline">{t("hero.registerLink")}</NavLink>
              </p>
            </motion.div>
          </div>
        </section>

        {/* App Teaser Section */}
        <section className="py-14 md:py-24 bg-card/30">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="max-w-5xl mx-auto"
            >
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div>
                  <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
                    {t("app.titlePrefix")}{" "}
                    <span className="text-gradient-lime">{t("app.titleHighlight")}</span>
                  </h2>

                  <div className="space-y-4 text-lg text-muted-foreground mb-8">
                    <div className="flex items-start gap-3">
                      <Calendar className="w-6 h-6 text-primary mt-1 shrink-0" />
                      <p>{t("app.features.0")}</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Trophy className="w-6 h-6 text-primary mt-1 shrink-0" />
                      <p>{t("app.features.1")}</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Users className="w-6 h-6 text-primary mt-1 shrink-0" />
                      <p>{t("app.features.2")}</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button
                      variant="outline"
                      size="lg"
                      className="group"
                      onClick={() => handleAppStoreClick("App Store")}
                    >
                      <Apple className="w-5 h-5" />
                      App Store
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      className="group"
                      onClick={() => handleAppStoreClick("Google Play")}
                    >
                      <Download className="w-5 h-5" />
                      Google Play
                    </Button>
                  </div>
                </div>

                {/* Phone Mockup */}
                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="flex justify-center"
                >
                  <div className="relative">
                    <div className="w-72 h-[560px] bg-gradient-to-b from-card to-card/50 rounded-[3rem] border-4 border-border shadow-2xl overflow-hidden">
                      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-6 bg-background rounded-full" />
                      <div className="p-6 pt-14 space-y-4">
                        <div className="h-10 bg-primary/20 rounded-xl flex items-center px-4">
                          <Smartphone className="w-5 h-5 text-primary mr-2" />
                          <div className="h-3 w-32 bg-primary/30 rounded" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="h-24 bg-primary/10 rounded-xl p-3">
                            <Calendar className="w-6 h-6 text-primary mb-2" />
                            <div className="h-2 w-12 bg-primary/30 rounded mb-1" />
                            <div className="h-2 w-16 bg-primary/20 rounded" />
                          </div>
                          <div className="h-24 bg-primary/10 rounded-xl p-3">
                            <Trophy className="w-6 h-6 text-primary mb-2" />
                            <div className="h-2 w-12 bg-primary/30 rounded mb-1" />
                            <div className="h-2 w-16 bg-primary/20 rounded" />
                          </div>
                        </div>
                        <div className="h-32 bg-primary/10 rounded-xl p-4">
                          <div className="h-3 w-20 bg-primary/30 rounded mb-3" />
                          <div className="space-y-2">
                            <div className="h-6 bg-primary/20 rounded" />
                            <div className="h-6 bg-primary rounded" />
                            <div className="h-6 bg-primary/20 rounded" />
                          </div>
                        </div>
                        <div className="h-14 bg-primary rounded-xl flex items-center justify-center">
                          <span className="text-primary-foreground font-semibold">{t("app.phoneCta")}</span>
                        </div>
                      </div>
                    </div>
                    <div className="absolute -bottom-4 -right-4 w-48 h-48 bg-primary/20 rounded-full blur-3xl" />
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Web Booking CTA */}
        <section className="py-14 md:py-24">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="max-w-3xl mx-auto text-center"
            >
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
                {t("web.title")}
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                {t("web.description")}
              </p>
              <Button variant="lime" size="xl" className="group" asChild>
                <NavLink to="/booking">
                  {t("web.cta")}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </NavLink>
              </Button>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default Play;
