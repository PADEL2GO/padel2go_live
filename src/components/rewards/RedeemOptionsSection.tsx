import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import {
  Gift, ArrowRight, Sparkles, Ticket, ShoppingBag, Gem, Coins, Download,
  Calendar, CircleDollarSign
} from "lucide-react";

const redeemOptions = [
  { tKey: "equipment", icon: ShoppingBag, highlight: true },
  { tKey: "vending", icon: CircleDollarSign, highlight: true },
  { tKey: "courtCredits", icon: Calendar },
  { tKey: "eventTickets", icon: Ticket },
  { tKey: "partnerRewards", icon: Gift },
  { tKey: "merchandise", icon: Gem }
];

export function RedeemOptionsSection() {
  const { t } = useTranslation("p2g");
  return (
    <section className="py-16 md:py-24 bg-card/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t("redeemOptionsSection.headingPrefix")} <span className="text-gradient-lime">{t("redeemOptionsSection.headingHighlight")}</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            {t("redeemOptionsSection.subtitle")}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {redeemOptions.map((option, index) => (
            <motion.div
              key={option.tKey}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02, y: -5 }}
              className={`p-6 rounded-2xl border transition-all cursor-pointer ${
                option.highlight 
                  ? 'bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30 shadow-lg shadow-primary/10' 
                  : 'bg-background border-border hover:border-primary/30'
              }`}
            >
              {option.highlight && (
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-primary uppercase tracking-wide">{t("redeemOptionsSection.highlightLabel")}</span>
                </div>
              )}
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 ${
                option.highlight ? 'bg-primary' : 'bg-primary/10'
              }`}>
                <option.icon className={`w-7 h-7 ${option.highlight ? 'text-primary-foreground' : 'text-primary'}`} />
              </div>
              <h3 className="text-xl font-bold mb-4">{t(`redeemOptionsSection.options.${option.tKey}.category`)}</h3>
              <ul className="space-y-2">
                {(t(`redeemOptionsSection.options.${option.tKey}.items`, { returnObjects: true }) as string[]).map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-muted-foreground">
                    <Coins className="w-4 h-4 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Button variant="hero" size="lg" className="group" asChild>
            <NavLink to="/app-booking">
              <Download className="mr-2 h-5 w-5" />
              {t("redeemOptionsSection.cta")}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform ml-2" />
            </NavLink>
          </Button>
        </div>
      </div>
    </section>
  );
}
