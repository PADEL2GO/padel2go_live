import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { 
  HelpCircle, 
  Gift, 
  Zap, 
  Trophy, 
  Users, 
  Calendar, 
  Instagram, 
  Star,
  Sparkles,
  Check,
  Clock,
  ChevronRight,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { supabase } from "@/integrations/supabase/client";

interface RewardDefinition {
  key: string;
  title: string;
  description: string | null;
  category: string;
  points_rule: {
    type: string;
    value?: number;
    percentage?: number;
    table?: Record<string, number>;
  };
  awarding_mode: string;
  approval_required: boolean;
  display_rule_text: string | null;
  caps: Record<string, unknown> | null;
}

const categoryIcons: Record<string, React.ElementType> = {
  BOOKING: Calendar,
  LOGIN: Star,
  REFERRAL: Users,
  SOCIAL: Instagram,
  PROFILE: Trophy,
  SKILL: Zap,
};

function formatPointsRule(rule: RewardDefinition["points_rule"], t: TFunction): string {
  if (rule.type === "fixed" && rule.value) {
    return t("rewardCatalogDrawer.ruleFixed", { value: rule.value });
  }
  if (rule.type === "percentage_of_price" && rule.percentage) {
    return t("rewardCatalogDrawer.rulePercentage", { percentage: rule.percentage });
  }
  if (rule.type === "duration_table" && rule.table) {
    const entries = Object.entries(rule.table);
    return entries.map(([mins, pts]) => t("rewardCatalogDrawer.ruleDuration", { mins, pts })).join(", ");
  }
  return t("rewardCatalogDrawer.ruleVariable");
}

interface RewardCatalogDrawerProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function RewardCatalogDrawer({ open, onOpenChange }: RewardCatalogDrawerProps) {
  const { t } = useTranslation("p2g");
  const [definitions, setDefinitions] = useState<RewardDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);

  // Use external or internal state
  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  useEffect(() => {
    if (isOpen && definitions.length === 0) {
      fetchCatalog();
    }
  }, [isOpen]);

  const fetchCatalog = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("p2g-points-api/catalog", {
        method: "GET",
      });
      if (error) throw error;
      setDefinitions(data?.definitions || []);
    } catch (error) {
      console.error("Error fetching catalog:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const groupedDefinitions = definitions.reduce((acc, def) => {
    const category = def.category || "OTHER";
    if (!acc[category]) acc[category] = [];
    acc[category].push(def);
    return acc;
  }, {} as Record<string, RewardDefinition[]>);

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline" className="gap-2 border-primary/30 hover:bg-primary/10">
          <HelpCircle className="h-4 w-4" />
          <span className="hidden sm:inline">{t("rewardCatalogDrawer.trigger")}</span>
          <span className="sm:hidden">{t("rewardCatalogDrawer.info")}</span>
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="border-b border-border/50 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle className="flex items-center gap-2 text-xl">
                <Sparkles className="h-5 w-5 text-primary" />
                {t("rewardCatalogDrawer.title")}
              </DrawerTitle>
              <DrawerDescription className="mt-1">
                {t("rewardCatalogDrawer.description")}
              </DrawerDescription>
            </div>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <ScrollArea className="flex-1 p-4 max-h-[60vh]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Skill Credits Explanation */}
              <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/30">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-green-500/20">
                      <Zap className="h-5 w-5 text-green-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-green-400">{t("rewardCatalogDrawer.skillTitle")}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t("rewardCatalogDrawer.skillText")}
                      </p>
                      <div className="mt-3 p-2 bg-background/50 rounded-lg">
                        <code className="text-xs text-green-400">
                          {t("rewardCatalogDrawer.skillFormula")}
                        </code>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Reward Categories */}
              {Object.entries(groupedDefinitions).map(([category, defs]) => {
                const Icon = categoryIcons[category] || Gift;
                const label = t(`rewardCatalogDrawer.categoryLabels.${category}`, { defaultValue: category });

                return (
                  <div key={category} className="space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {label}
                    </h3>
                    <div className="space-y-2">
                      <AnimatePresence>
                        {defs.map((def, index) => (
                          <motion.div
                            key={def.key}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            <Card className="border-border/50 hover:border-primary/30 transition-colors">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h4 className="font-medium text-sm">{def.title}</h4>
                                      {def.awarding_mode === "AUTO_CLAIM" && (
                                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px] px-1.5 py-0">
                                          <Check className="h-2.5 w-2.5 mr-0.5" />
                                          {t("rewardCatalogDrawer.auto")}
                                        </Badge>
                                      )}
                                      {def.approval_required && (
                                        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[10px] px-1.5 py-0">
                                          <Clock className="h-2.5 w-2.5 mr-0.5" />
                                          {t("rewardCatalogDrawer.approval")}
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                      {def.display_rule_text || def.description || t("rewardCatalogDrawer.fallbackRuleText")}
                                    </p>
                                  </div>
                                  <div className="shrink-0 text-right">
                                    <span className="font-bold text-primary text-sm">
                                      {formatPointsRule(def.points_rule, t)}
                                    </span>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                );
              })}

              {definitions.length === 0 && !isLoading && (
                <div className="text-center py-8 text-muted-foreground">
                  <Gift className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>{t("rewardCatalogDrawer.empty")}</p>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}
