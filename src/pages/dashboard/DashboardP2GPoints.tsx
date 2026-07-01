import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useP2GPoints } from "@/hooks/useP2GPoints";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { ComingSoonOverlay } from "@/components/ComingSoonOverlay";
import { Coins } from "lucide-react";
import { 
  P2GPointsHeaderSimple, 
  SkillLast5Section,
  LastGameCard, 
  MyGamesSection,
  FriendsActivityFeed,
} from "@/components/p2g";

export default function DashboardP2GPoints() {
  const { t } = useTranslation("p2g");
  const {
    summary, 
    isSummaryLoading, 
    lastGameData,
    isLastGameLoading,
    matchHistory,
    isSkillsLoading,
  } = useP2GPoints();

  const { p2g_enabled, isLoading: featuresLoading } = useFeatureToggles();
  const { isAdmin } = useAdminAuth();

  const showComingSoon = !featuresLoading && !p2g_enabled && !isAdmin;

  return (
    <DashboardLayout>
      <Helmet>
        <title>{t("meta.p2gPoints.title")}</title>
        <meta name="description" content={t("meta.p2gPoints.description")} />
      </Helmet>

      {showComingSoon ? (
        <ComingSoonOverlay
          title={t("comingSoon.p2gPoints.title")}
          description={t("comingSoon.p2gPoints.description")}
          icon={Coins}
        >
          <div className="container mx-auto px-4 py-6 md:py-8 space-y-6 md:space-y-8">
            <P2GPointsHeaderSimple summary={summary} isLoading={isSummaryLoading} />
            <SkillLast5Section />
          </div>
        </ComingSoonOverlay>
      ) : (
        <div className="container mx-auto px-4 py-6 md:py-8 space-y-6 md:space-y-8">
          <P2GPointsHeaderSimple summary={summary} isLoading={isSummaryLoading} />
          <div className="space-y-6">
            <SkillLast5Section />
            <LastGameCard 
              lastGame={lastGameData?.last_game || null}
              skillLevel={lastGameData?.skill_level || 0}
              isLoading={isLastGameLoading}
            />
            <FriendsActivityFeed />
            <MyGamesSection 
              matchHistory={matchHistory}
              isLoading={isSkillsLoading}
            />
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}