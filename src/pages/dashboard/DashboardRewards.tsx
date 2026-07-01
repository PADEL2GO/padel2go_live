import { useState, useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAccountData } from "@/hooks/useAccountData";
import { useRewards } from "@/hooks/useRewards";
import { useMarketplaceItems } from "@/hooks/useMarketplaceItems";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AnimatedCounter } from "@/components/rewards/AnimatedCounter";
import { RewardCard } from "@/components/rewards/RewardCard";
import { 
  Coins, 
  Trophy, 
  Star, 
  TrendingUp, 
  Loader2, 
  Gamepad2, 
  Users, 
  Target,
  ArrowRight,
  Sparkles,
  ShoppingBag,
  Gift,
  Instagram,
  Send,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getSkillBadge } from "@/lib/expertLevels";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const DashboardRewards = () => {
  const { t } = useTranslation("p2g");
  const { user } = useAuth();
  const { wallet, updateWallet, loading: accountLoading } = useAccountData(user);
  const { 
    claimable, 
    isLoading: rewardsLoading,
    claimReward,
    isClaiming,
    triggerDailyLogin,
    submitInstagramTag,
    isInstagramTagPending,
  } = useRewards();
  const { data: marketplaceItems } = useMarketplaceItems();
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [isPulsing, setIsPulsing] = useState(false);
  const dailyLoginTriggered = useRef(false);
  const prevCreditsRef = useRef<number | null>(null);
  
  // Instagram submission state
  const [instagramDialogOpen, setInstagramDialogOpen] = useState(false);
  const [instagramHandle, setInstagramHandle] = useState("");
  const [postUrl, setPostUrl] = useState("");

  const isLoading = accountLoading || rewardsLoading;
  
  // Calculate total balance from wallet (play_credits + reward_credits)
  const totalCredits = (wallet?.play_credits || 0) + (wallet?.reward_credits || 0);
  const lifetimeCredits = wallet?.lifetime_credits || 0;
  
  // Trigger pulse animation when credits increase
  useEffect(() => {
    if (prevCreditsRef.current !== null && totalCredits > prevCreditsRef.current) {
      setIsPulsing(true);
      const timer = setTimeout(() => setIsPulsing(false), 1000);
      return () => clearTimeout(timer);
    }
    prevCreditsRef.current = totalCredits;
  }, [totalCredits]);
  
  // Use lifetimeCredits for level progression instead of skillLevel
  const skillBadge = getSkillBadge(lifetimeCredits);

  const topItems = marketplaceItems?.slice(0, 3) || [];

  // Auto-trigger daily login on page load
  useEffect(() => {
    if (!user || dailyLoginTriggered.current || isLoading) return;
    
    dailyLoginTriggered.current = true;
    
    triggerDailyLogin()
      .then((result) => {
        if (result.success) {
          toast.success(t("rewardsPage.dailyLogin.successTitle"), {
            description: t("rewardsPage.dailyLogin.successDescription"),
            icon: <Sparkles className="w-4 h-4 text-primary" />,
          });
        }
        // Silent if already claimed today
      })
      .catch(() => {
        // Silent error - don't bother user
      });
  }, [user, isLoading, triggerDailyLogin]);

  const handleClaim = async (rewardId: string) => {
    setClaimingId(rewardId);
    try {
      const result = await claimReward(rewardId);
      
      // Optimistic update - counter animates immediately
      updateWallet({ 
        reward_credits: result.newBalance,
        lifetime_credits: (wallet?.lifetime_credits || 0) + result.points
      });
      
      toast.success(t("rewardsPage.claim.success", { points: result.points }), {
        icon: <Sparkles className="w-4 h-4 text-primary" />,
      });
    } catch (error) {
      toast.error(t("rewardsPage.claim.errorTitle"), {
        description: t("rewardsPage.claim.errorDescription"),
      });
    } finally {
      setClaimingId(null);
    }
  };

  const handleInstagramSubmit = async () => {
    if (!instagramHandle.trim() && !postUrl.trim()) {
      toast.error(t("rewardsPage.instagram.validationError"));
      return;
    }

    try {
      const result = await submitInstagramTag({ 
        instagramHandle: instagramHandle.trim() || undefined, 
        postUrl: postUrl.trim() || undefined 
      });
      
      if (result.success) {
        toast.success(t("rewardsPage.instagram.successTitle"), {
          description: t("rewardsPage.instagram.successDescription"),
          icon: <Instagram className="w-4 h-4 text-pink-500" />,
        });
        setInstagramDialogOpen(false);
        setInstagramHandle("");
        setPostUrl("");
      } else {
        toast.error(t("rewardsPage.instagram.failedTitle"), {
          description: result.reason || t("rewardsPage.instagram.failedDescription"),
        });
      }
    } catch (error) {
      toast.error(t("rewardsPage.instagram.errorTitle"), {
        description: t("rewardsPage.instagram.errorDescription"),
      });
    }
  };

  const earnMethods = [
    { icon: Gamepad2, title: t("rewardsPage.earnMethods.play.title"), description: t("rewardsPage.earnMethods.play.description"), color: "text-primary" },
    { icon: Trophy, title: t("rewardsPage.earnMethods.firstBooking.title"), description: t("rewardsPage.earnMethods.firstBooking.description"), color: "text-yellow-500" },
    { icon: Users, title: t("rewardsPage.earnMethods.inviteFriends.title"), description: t("rewardsPage.earnMethods.inviteFriends.description"), color: "text-blue-500" },
    { icon: Target, title: t("rewardsPage.earnMethods.completeProfile.title"), description: t("rewardsPage.earnMethods.completeProfile.description"), color: "text-purple-500" },
    { icon: Instagram, title: t("rewardsPage.earnMethods.tagInstagram.title"), description: t("rewardsPage.earnMethods.tagInstagram.description"), color: "text-pink-500" },
  ];

  return (
    <DashboardLayout>
      <Helmet>
        <title>{t("meta.rewards.title")}</title>
      </Helmet>

      <div className="container mx-auto px-4 py-6 md:py-8 space-y-6 md:space-y-8">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Hero Credit Section with Animated Counter */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative rounded-2xl overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/10 to-background" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.4),transparent_50%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,hsl(var(--primary)/0.2),transparent_50%)]" />
              
              <div className="relative z-10 p-8 md:p-12 text-center">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="inline-flex items-center gap-2 mb-2"
                >
                  <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                </motion.div>
                
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ 
                    scale: isPulsing ? [1, 1.1, 1] : 1, 
                    opacity: 1 
                  }}
                  transition={{ 
                    delay: isPulsing ? 0 : 0.3,
                    scale: isPulsing ? { duration: 0.4, ease: "easeOut" } : {}
                  }}
                  className={`text-5xl md:text-7xl font-bold text-foreground mb-2 transition-all duration-300 ${
                    isPulsing ? "drop-shadow-[0_0_30px_hsl(var(--primary)/0.6)]" : ""
                  }`}
                >
                  <AnimatedCounter value={totalCredits} duration={0.8} />
                </motion.div>
                
                <p className="text-lg text-muted-foreground mb-1">{t("rewardsPage.pointsAvailable")}</p>
                <p className="text-sm text-muted-foreground/70 mb-4">
                  {t("rewardsPage.lifetime", { count: lifetimeCredits.toLocaleString() })}
                </p>

                {/* Quick Stats */}
                {claimable.length > 0 && (
                  <div className="flex items-center justify-center gap-6 mb-6">
                    <div className="flex items-center gap-2 text-green-500">
                      <Gift className="w-4 h-4" />
                      <span className="text-sm font-medium">{t("rewardsPage.claimableCount", { count: claimable.length })}</span>
                    </div>
                  </div>
                )}
                
                <Button variant="lime" size="lg" asChild className="shadow-lg shadow-primary/25">
                  <NavLink to="/dashboard/marketplace" className="gap-2">
                    <ShoppingBag className="w-5 h-5" />
                    {t("rewardsPage.redeemInMarketplace")}
                    <ArrowRight className="w-4 h-4" />
                  </NavLink>
                </Button>
              </div>
            </motion.div>

            {/* Instagram Submission Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <Card className="bg-gradient-to-br from-pink-500/10 to-purple-500/10 border-pink-500/20">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center">
                        <Instagram className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{t("rewardsPage.instagramCard.title")}</h3>
                        <p className="text-sm text-muted-foreground">
                          {t("rewardsPage.instagramCard.subtitle")}
                        </p>
                      </div>
                    </div>
                    
                    <Dialog open={instagramDialogOpen} onOpenChange={setInstagramDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="border-pink-500/30 hover:bg-pink-500/10">
                          <Instagram className="w-4 h-4 mr-2" />
                          {t("rewardsPage.instagramCard.submitBonus")}
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <Instagram className="w-5 h-5 text-pink-500" />
                            {t("rewardsPage.instagramDialog.title")}
                          </DialogTitle>
                          <DialogDescription>
                            {t("rewardsPage.instagramDialog.description")}
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="instagramHandle">{t("rewardsPage.instagramDialog.handleLabel")}</Label>
                            <Input
                              id="instagramHandle"
                              placeholder={t("rewardsPage.instagramDialog.handlePlaceholder")}
                              value={instagramHandle}
                              onChange={(e) => setInstagramHandle(e.target.value)}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="postUrl">{t("rewardsPage.instagramDialog.urlLabel")}</Label>
                            <Input
                              id="postUrl"
                              placeholder="https://instagram.com/p/..."
                              value={postUrl}
                              onChange={(e) => setPostUrl(e.target.value)}
                            />
                          </div>
                        </div>
                        
                        <Button 
                          onClick={handleInstagramSubmit}
                          disabled={isInstagramTagPending}
                          className="w-full"
                        >
                          {isInstagramTagPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4 mr-2" />
                          )}
                          {t("rewardsPage.instagramDialog.submit")}
                        </Button>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Claimable Rewards - only show if any */}
            {claimable.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-3"
              >
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Gift className="w-5 h-5 text-primary" />
                  {t("rewardsPage.claimableHeading")}
                </h2>
                <AnimatePresence mode="popLayout">
                  {claimable.map((reward) => (
                    <RewardCard
                      key={reward.id}
                      reward={reward}
                      variant="claimable"
                      onClaim={handleClaim}
                      isClaiming={isClaiming && claimingId === reward.id}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}

            {/* Level Progress - now using lifetimeCredits */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-card/50 backdrop-blur-sm border-border/50 overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center gap-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${skillBadge.current.color} flex items-center justify-center text-3xl shadow-lg`}>
                        {skillBadge.current.icon}
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t("rewardsPage.level.yourLevel")}</p>
                        <p className="text-2xl font-bold">{skillBadge.current.name}</p>
                        <p className="text-sm text-primary font-medium">{t("rewardsPage.level.points", { count: lifetimeCredits.toLocaleString() })}</p>
                      </div>
                    </div>

                    {skillBadge.next && (
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">{t("rewardsPage.level.progressTo", { level: skillBadge.next.name })}</span>
                          <span className="text-sm font-medium text-primary">{Math.round(skillBadge.progress)}%</span>
                        </div>
                        <Progress value={skillBadge.progress} className="h-3" />
                        <p className="text-xs text-muted-foreground mt-2">
                          {t("rewardsPage.level.remainingPrefix")} <span className="text-primary font-semibold">{skillBadge.pointsToNext}</span> {t("rewardsPage.level.remainingSuffix")}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Credit Breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="grid grid-cols-2 gap-4"
            >
              <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Coins className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-3xl font-bold">{wallet?.play_credits || 0}</p>
                  <p className="text-sm text-muted-foreground">{t("rewardsPage.playCredits")}</p>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center mx-auto mb-3">
                    <Trophy className="w-6 h-6 text-yellow-500" />
                  </div>
                  <p className="text-3xl font-bold">{wallet?.reward_credits || 0}</p>
                  <p className="text-sm text-muted-foreground">{t("rewardsPage.rewardCredits")}</p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Top Rewards Preview */}
            {topItems.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Star className="w-5 h-5 text-primary" />
                    {t("rewardsPage.topRewards.heading")}
                  </h2>
                  <Button variant="ghost" size="sm" asChild>
                    <NavLink to="/dashboard/marketplace" className="gap-1 text-muted-foreground hover:text-primary">
                      {t("rewardsPage.topRewards.showAll")} <ArrowRight className="w-4 h-4" />
                    </NavLink>
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {topItems.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                    >
                      <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-colors overflow-hidden group">
                        <div className="aspect-square bg-gradient-to-br from-secondary to-muted overflow-hidden">
                          {item.image_url ? (
                            <img 
                              src={item.image_url} 
                              alt={item.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ShoppingBag className="w-8 h-8 text-muted-foreground/50" />
                            </div>
                          )}
                        </div>
                        <CardContent className="p-3">
                          <p className="font-medium text-sm truncate">{item.name}</p>
                          <p className="text-primary font-semibold text-sm">{t("rewardsPage.topRewards.creditCost", { count: item.credit_cost })}</p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* How to Earn Credits */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                {t("rewardsPage.howToEarnHeading")}
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {earnMethods.map((method, index) => (
                  <motion.div
                    key={method.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                  >
                    <Card className="bg-card/50 backdrop-blur-sm border-border/50 h-full">
                      <CardContent className="p-4 text-center">
                        <div className={`w-10 h-10 rounded-xl bg-secondary flex items-center justify-center mx-auto mb-3 ${method.color}`}>
                          <method.icon className="w-5 h-5" />
                        </div>
                        <p className="font-medium text-sm">{method.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{method.description}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardRewards;
