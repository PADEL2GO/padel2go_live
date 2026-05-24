import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NavLink } from "react-router-dom";
import { CheckCircle2, Circle, X, ChevronDown, ChevronUp, Rocket, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ONBOARDING_POINTS } from "@/lib/bookingCredits";

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  to: string;
  cta: string;
  done: boolean;
  bonus: number;
  walletFlag: keyof typeof WALLET_FLAGS;
}

const WALLET_FLAGS = {
  profile: "onboarding_profile_credited",
  booking: "onboarding_booking_credited",
  friend:  "onboarding_friend_credited",
} as const;

interface OnboardingChecklistProps {
  hasDisplayName: boolean;
  hasAvatar: boolean;
  hasBooking: boolean;
  hasFriend: boolean;
}

const DISMISSED_KEY = "p2g_onboarding_dismissed";

export function OnboardingChecklist({
  hasDisplayName,
  hasAvatar,
  hasBooking,
  hasFriend,
}: OnboardingChecklistProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISSED_KEY) === "true");
  const [collapsed, setCollapsed] = useState(false);
  const [credited, setCredited] = useState<Record<string, boolean>>({});

  const items: ChecklistItem[] = [
    {
      id: "profile",
      label: "Profil vervollständigen",
      description: "Füge deinen Namen und ein Profilbild hinzu.",
      to: "/account",
      cta: "Zum Profil",
      done: hasDisplayName && hasAvatar,
      bonus: ONBOARDING_POINTS.profile,
      walletFlag: "profile",
    },
    {
      id: "booking",
      label: "Ersten Court buchen",
      description: "Such dir einen Court und buche deine erste Session.",
      to: "/dashboard/booking",
      cta: "Court buchen",
      done: hasBooking,
      bonus: ONBOARDING_POINTS.booking,
      walletFlag: "booking",
    },
    {
      id: "friend",
      label: "Freund hinzufügen",
      description: "Verbinde dich mit Mitspielern in der P2G Community.",
      to: "/dashboard/friends",
      cta: "Freunde finden",
      done: hasFriend,
      bonus: ONBOARDING_POINTS.friend,
      walletFlag: "friend",
    },
  ];

  // Award credits via the server-side claim_onboarding_bonus RPC.
  // The RPC verifies eligibility from authoritative tables, creates the wallet
  // row if missing, and is idempotent — safe to call on every render where
  // conditions look met.
  useEffect(() => {
    if (!user) return;

    const sync = async () => {
      // 1. Fetch current claimed state for the UI (separate from claim attempts).
      const { data: wallet } = await supabase
        .from("wallets")
        .select("onboarding_profile_credited, onboarding_booking_credited, onboarding_friend_credited")
        .eq("user_id", user.id)
        .maybeSingle();

      const claimed = {
        profile: wallet?.onboarding_profile_credited ?? false,
        booking: wallet?.onboarding_booking_credited ?? false,
        friend:  wallet?.onboarding_friend_credited  ?? false,
      };
      setCredited({
        onboarding_profile_credited: claimed.profile,
        onboarding_booking_credited: claimed.booking,
        onboarding_friend_credited:  claimed.friend,
      });

      // 2. For any unclaimed-but-eligible flag, ask the RPC to claim it.
      //    The RPC re-verifies eligibility server-side so we can't be tricked
      //    into awarding bonuses by stale client state.
      const tryClaim = async (
        flag: typeof WALLET_FLAGS[keyof typeof WALLET_FLAGS],
        label: string,
      ) => {
        const { data, error } = await supabase.rpc("claim_onboarding_bonus" as never, {
          p_flag: flag,
        } as never) as unknown as {
          data: { credited?: boolean; points?: number; reason?: string } | null;
          error: { message: string } | null;
        };

        if (error) {
          console.warn("[onboarding] claim failed", flag, error.message);
          return;
        }
        if (data?.credited && data.points) {
          setCredited(prev => ({ ...prev, [flag]: true }));
          toast.success(`+${data.points} Punkte`, { description: `${label} abgeschlossen!` });
          queryClient.invalidateQueries({ queryKey: ["account-data"] });
        }
      };

      if (hasDisplayName && hasAvatar && !claimed.profile) {
        await tryClaim("onboarding_profile_credited", "Profil vervollständigt");
      }
      if (hasFriend && !claimed.friend) {
        await tryClaim("onboarding_friend_credited", "Ersten Freund hinzugefügt");
      }
      if (hasBooking && !claimed.booking) {
        await tryClaim("onboarding_booking_credited", "Erste Buchung abgeschlossen");
      }
    };

    sync();
  }, [user, hasDisplayName, hasAvatar, hasBooking, hasFriend, queryClient]);

  const completedCount = items.filter((i) => i.done).length;
  const allDone = completedCount === items.length;
  const progress = Math.round((completedCount / items.length) * 100);

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0 }}
        className="rounded-2xl bg-card border border-primary/20 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Rocket className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold">Willkommen bei PADEL2GO!</p>
              <p className="text-xs text-muted-foreground">
                {allDone
                  ? "Du bist startklar 🎉"
                  : `${completedCount} von ${items.length} erledigt`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>
              <span className="text-xs font-medium text-primary">{progress}%</span>
            </div>
            <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setCollapsed(c => !c)}>
              {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-foreground" onClick={handleDismiss}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Checklist */}
        <AnimatePresence>
          {!collapsed && (
            <motion.ul
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="divide-y divide-border/50"
            >
              {items.map((item) => {
                const alreadyCredited = credited[WALLET_FLAGS[item.walletFlag]] ?? false;

                return (
                  <li
                    key={item.id}
                    className={`flex items-center justify-between gap-4 px-5 py-3 transition-colors ${
                      item.done ? "opacity-50" : "hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {item.done ? (
                        <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      ) : (
                        <Circle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className={`text-sm font-medium ${item.done ? "line-through" : ""}`}>
                          {item.label}
                        </p>
                        {!item.done && (
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        )}
                        {item.bonus > 0 && (
                          <p className={`text-xs font-semibold flex items-center gap-1 mt-0.5 ${
                            alreadyCredited ? "text-muted-foreground line-through" : "text-primary"
                          }`}>
                            <Coins className="w-3 h-3" />
                            +{item.bonus} Punkte
                            {alreadyCredited && " (bereits erhalten)"}
                          </p>
                        )}
                      </div>
                    </div>
                    {!item.done && (
                      <NavLink to={item.to} className="shrink-0">
                        <Button variant="outline" size="sm" className="text-xs h-7 px-3">
                          {item.cta}
                        </Button>
                      </NavLink>
                    )}
                  </li>
                );
              })}
            </motion.ul>
          )}
        </AnimatePresence>

        {allDone && !collapsed && (
          <div className="px-5 py-3 text-center">
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={handleDismiss}>
              Checkliste ausblenden
            </Button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
