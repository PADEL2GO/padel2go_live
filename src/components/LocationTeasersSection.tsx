import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, CalendarClock, ExternalLink, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocationTeasers } from "@/hooks/useLocationTeasers";
import { localized } from "@/lib/localized";
import SectionDivider from "@/components/SectionDivider";

export function LocationTeasersSection() {
  const { t, i18n } = useTranslation("index");
  const { data: teasers, isLoading } = useLocationTeasers();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading || !teasers || teasers.length === 0) return null;

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <>
      <section className="py-16 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
        <div className="container mx-auto px-4 relative z-10">
          {/* Header */}
          <motion.div
            className="text-center mb-12 md:mb-16"
            initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <MapPin className="w-4 h-4" />
              {t("locationTeasers.eyebrow")}
            </span>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground mb-4" style={{ lineHeight: 1.1 }}>
              {t("locationTeasers.titlePart1")}<span className="text-primary">2</span>{t("locationTeasers.titlePart2")}
            </h2>
            <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto" style={{ textWrap: "pretty" }}>
              {t("locationTeasers.subtitle")}
            </p>
          </motion.div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {teasers.map((teaser, i) => {
              const isExpanded = expandedId === teaser.id;
              const title = localized(teaser, "title", i18n.language);
              const description = localized(teaser, "description", i18n.language);

              return (
                <motion.div
                  key={teaser.id}
                  className="group relative rounded-2xl overflow-hidden bg-card border border-border shadow-md hover:shadow-xl transition-shadow duration-300"
                  initial={{ opacity: 0, y: 24, filter: "blur(4px)" }}
                  whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{
                    duration: 0.6,
                    delay: i * 0.1,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  {/* Image */}
                  <div className="aspect-[16/10] overflow-hidden bg-muted">
                    {teaser.image_url ? (
                      <img
                        src={teaser.image_url}
                        alt={title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <MapPin className="w-12 h-12 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    {teaser.city && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary mb-2">
                        <MapPin className="w-3.5 h-3.5" />
                        {localized(teaser, "city", i18n.language)}
                      </span>
                    )}
                    <h3 className="text-lg font-semibold text-foreground mb-1.5" style={{ lineHeight: 1.2 }}>
                      {title}
                    </h3>

                    {/* Expandable description */}
                    {teaser.description && (
                      <div className="mb-3">
                        <AnimatePresence initial={false}>
                          {isExpanded ? (
                            <motion.p
                              key="full"
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: "easeInOut" }}
                              className="text-sm text-muted-foreground overflow-hidden"
                              style={{ textWrap: "pretty" }}
                            >
                              {description}
                            </motion.p>
                          ) : (
                            <p className="text-sm text-muted-foreground line-clamp-2" style={{ textWrap: "pretty" }}>
                              {description}
                            </p>
                          )}
                        </AnimatePresence>
                        <button
                          onClick={() => toggleExpand(teaser.id)}
                          className="inline-flex items-center gap-1 text-xs text-primary font-medium mt-1 hover:underline"
                        >
                          {isExpanded ? t("locationTeasers.less") : t("locationTeasers.more")}
                          <ChevronDown
                            className={`w-3.5 h-3.5 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
                          />
                        </button>
                      </div>
                    )}

                    {/* Date & Club Link */}
                    <div className="flex flex-wrap items-center gap-2">
                      {teaser.expected_date && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-primary/15 text-primary px-2.5 py-1 rounded-full">
                          <CalendarClock className="w-3.5 h-3.5" />
                          {localized(teaser, "expected_date", i18n.language)}
                        </span>
                      )}
                      {teaser.club_url && (
                        <a
                          href={teaser.club_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-medium bg-secondary text-foreground px-2.5 py-1 rounded-full hover:bg-secondary/80 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          {t("locationTeasers.toClub")}
                        </a>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>
      <SectionDivider variant="glow" />
    </>
  );
}
