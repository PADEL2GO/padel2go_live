import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  ChevronDown,
  Mail,
  Phone,
  MessageCircle,
  Send,
  Users,
  Building2,
  Handshake,
  Newspaper,
  FileText,
  Calendar,
  CheckCircle2,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import {
  WhatsAppIcon,
  WHATSAPP_NUMBER_DISPLAY,
  useWhatsAppUrl,
} from "@/components/WhatsAppBusiness";

const reasonIcons: Record<string, LucideIcon> = {
  spieler: Users,
  verein: Building2,
  partner: Handshake,
  presse: Newspaper,
  "ki-kamera": FileText,
};

const categoryIcons: Record<string, LucideIcon> = {
  spieler: Users,
  verein: Building2,
  partner: Handshake,
};

type ContactReason = { value: string; label: string };
type FaqQuestion = { q: string; a: string };
type FaqCategory = { key: string; label: string; questions: FaqQuestion[] };

const FaqKontakt = () => {
  const [searchParams] = useSearchParams();
  const { t } = useTranslation("faqkontakt");
  const whatsappUrl = useWhatsAppUrl();

  const [openQuestion, setOpenQuestion] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    organization: "",
    reason: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reasons = t("contact.reasons", { returnObjects: true }) as ContactReason[];
  const faqCategories = t("faq.categories", { returnObjects: true }) as FaqCategory[];
  const vereineBullets = t("contact.vereine.bullets", { returnObjects: true }) as string[];
  const partnerBullets = t("contact.partner.bullets", { returnObjects: true }) as string[];

  useEffect(() => {
    const reasonParam = searchParams.get("reason");
    if (reasonParam && ["spieler", "verein", "partner", "presse", "ki-kamera"].includes(reasonParam)) {
      setFormData((prev) => ({ ...prev, reason: reasonParam }));
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase.functions.invoke("send-contact-email", { body: formData });

      if (error) {
        console.error("Error sending email:", error);
        toast.error(t("contact.toasts.errorTitle"), {
          description: t("contact.toasts.errorDescription"),
        });
        return;
      }

      toast.success(t("contact.toasts.successTitle"), {
        description: t("contact.toasts.successDescription"),
      });

      setFormData({
        name: "",
        email: "",
        organization: "",
        reason: searchParams.get("reason") || "",
        message: "",
      });
    } catch (error) {
      console.error("Error sending email:", error);
      toast.error(t("contact.toasts.errorTitle"), {
        description: t("contact.toasts.errorRetry"),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>{t("meta.title")}</title>
        <meta name="description" content={t("meta.description")} />
      </Helmet>

      <Navigation />

      <main className="min-h-screen bg-background pt-20">
        <section className="relative py-14 md:py-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-hero" />
          <div className="container mx-auto px-4 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-3xl mx-auto text-center"
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary mb-6">
                <MessageCircle className="w-4 h-4" />
                <span className="text-sm font-medium">{t("hero.badge")}</span>
              </span>

              <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                {t("hero.title")}{" "}
                <span className="text-gradient-lime">{t("hero.titleHighlight")}</span>
              </h1>

              <p className="text-xl text-muted-foreground">{t("hero.description")}</p>
            </motion.div>
          </div>
        </section>

        <section className="py-14 md:py-24">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center max-w-2xl mx-auto mb-10 md:mb-16"
            >
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
                {t("contact.heading")} <span className="text-gradient-lime">{t("contact.headingHighlight")}</span>
              </h2>
              <p className="text-muted-foreground">{t("contact.intro")}</p>
            </motion.div>

            <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto items-stretch">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="order-2 lg:order-1 flex"
              >
                <div className="bg-card border border-border rounded-2xl p-8 flex flex-col w-full">
                  <h3 className="text-xl font-bold mb-6">{t("contact.form.heading")}</h3>

                  <form onSubmit={handleSubmit} className="space-y-5 flex-1 flex flex-col">
                    <div>
                      <label className="block text-sm font-medium mb-3">{t("contact.form.iAm")}</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {reasons.map((reason) => {
                          const ReasonIcon = reasonIcons[reason.value] || FileText;
                          const isSelected = formData.reason === reason.value;
                          return (
                            <button
                              key={reason.value}
                              type="button"
                              onClick={() => setFormData({ ...formData, reason: reason.value })}
                              className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-left ${
                                isSelected
                                  ? "border-primary bg-primary/10 text-foreground"
                                  : "border-border hover:border-primary/50 text-muted-foreground"
                              }`}
                            >
                              <ReasonIcon className={`w-4 h-4 ${isSelected ? "text-primary" : ""}`} />
                              <span className="text-sm font-medium">{reason.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">{t("contact.form.nameLabel")}</label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary focus:outline-none transition-colors"
                          placeholder={t("contact.form.namePlaceholder")}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">{t("contact.form.emailLabel")}</label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary focus:outline-none transition-colors"
                          placeholder={t("contact.form.emailPlaceholder")}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">{t("contact.form.organizationLabel")}</label>
                      <input
                        type="text"
                        value={formData.organization}
                        onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary focus:outline-none transition-colors"
                        placeholder={t("contact.form.organizationPlaceholder")}
                      />
                    </div>

                    <div className="flex-1 flex flex-col">
                      <label className="block text-sm font-medium mb-2">{t("contact.form.messageLabel")}</label>
                      <textarea
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary focus:outline-none transition-colors resize-none flex-1 min-h-[120px]"
                        placeholder={t("contact.form.messagePlaceholder")}
                        required
                      />
                    </div>

                    <Button type="submit" variant="lime" size="lg" className="w-full group" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          {t("contact.form.submitting")}
                        </>
                      ) : (
                        <>
                          {t("contact.form.submit")}
                          <Send className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </Button>
                  </form>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="order-1 lg:order-2 space-y-6"
              >
                <div className="bg-card border border-border rounded-2xl p-6">
                  <h3 className="text-xl font-bold mb-4">{t("contact.direct.heading")}</h3>
                  <div className="space-y-4">
                    <a
                      href="mailto:contact@padel2go.eu"
                      className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors"
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Mail className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">contact@padel2go.eu</p>
                        <p className="text-sm">{t("contact.direct.emailCaption")}</p>
                      </div>
                    </a>
                    <a
                      href="tel:+4917632350759"
                      className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors"
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Phone className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">+49 176 32350759</p>
                        <p className="text-sm">{t("contact.direct.phoneCaption")}</p>
                      </div>
                    </a>
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-muted-foreground hover:text-[#1FB855] transition-colors"
                    >
                      <div className="w-10 h-10 rounded-xl bg-[#25D366]/15 flex items-center justify-center shrink-0">
                        <WhatsAppIcon className="w-5 h-5 text-[#25D366]" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{WHATSAPP_NUMBER_DISPLAY}</p>
                        <p className="text-sm">{t("contact.direct.whatsappCaption")}</p>
                      </div>
                    </a>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold">{t("contact.vereine.heading")}</h3>
                  </div>
                  <p className="text-muted-foreground mb-4">{t("contact.vereine.body")}</p>
                  <ul className="space-y-2 mb-4">
                    {vereineBullets.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant="outline"
                    className="w-full border-primary/30 hover:bg-primary/10"
                    onClick={() => setFormData((prev) => ({ ...prev, reason: "verein" }))}
                  >
                    {t("contact.vereine.cta")}
                  </Button>
                </div>

                <div className="bg-gradient-to-br from-accent/5 to-accent/10 border border-accent/20 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-accent" />
                    </div>
                    <h3 className="text-xl font-bold">{t("contact.partner.heading")}</h3>
                  </div>
                  <p className="text-muted-foreground mb-4">{t("contact.partner.body")}</p>
                  <ul className="space-y-2 mb-4">
                    {partnerBullets.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-accent" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant="outline"
                    className="w-full border-accent/30 hover:bg-accent/10"
                    onClick={() => setFormData((prev) => ({ ...prev, reason: "partner" }))}
                  >
                    {t("contact.partner.cta")}
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="py-14 md:py-24 bg-card/30">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center max-w-2xl mx-auto mb-16"
            >
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
                {t("faq.heading")} <span className="text-gradient-lime">{t("faq.headingHighlight")}</span>
              </h2>
              <p className="text-muted-foreground">{t("faq.intro")}</p>
            </motion.div>

            <div className="max-w-4xl mx-auto space-y-16">
              {faqCategories.map((category, catIndex) => {
                const CategoryIcon = categoryIcons[category.key] || Users;
                return (
                  <motion.div
                    key={category.key}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: catIndex * 0.1 }}
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <CategoryIcon className="w-5 h-5 text-primary" />
                      </div>
                      <h3 className="text-xl font-bold">{category.label}</h3>
                    </div>

                    <div className="space-y-3">
                      {category.questions.map((faq, index) => {
                        const questionId = `${catIndex}-${index}`;
                        const isOpen = openQuestion === questionId;

                        return (
                          <div key={questionId} className="border border-border rounded-xl overflow-hidden bg-card/50">
                            <button
                              onClick={() => setOpenQuestion(isOpen ? null : questionId)}
                              className="w-full flex items-center justify-between p-5 text-left hover:bg-secondary/50 transition-colors"
                            >
                              <span className="font-medium pr-4">{faq.q}</span>
                              <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`} />
                            </button>
                            <motion.div
                              initial={false}
                              animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="px-5 pb-5 text-muted-foreground border-t border-border/50 pt-4">
                                {faq.a}
                              </div>
                            </motion.div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default FaqKontakt;
