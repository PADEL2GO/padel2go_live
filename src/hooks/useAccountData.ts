import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { PlayerAnalyticsData } from "@/components/analytics/types";
import type { Profile, Wallet, SkillStats, AnalyticsState } from "@/components/account/types";

// Re-export types for convenience
export type { Profile, Wallet, SkillStats, AnalyticsState };

const DEFAULT_PROFILE: Profile = {
  username: null,
  display_name: null,
  age: null,
  avatar_url: null,
  games_played_self: 0,
  skill_self_rating: 5,
  shipping_address_line1: null,
  shipping_postal_code: null,
  shipping_city: null,
  shipping_country: null,
};

const DEFAULT_WALLET: Wallet = {
  play_credits: 0,
  reward_credits: 0,
  lifetime_credits: 0,
  last_game_credits: null,
  last_game_date: null,
};
const DEFAULT_SKILL_STATS: SkillStats = { skill_level: 0, ai_rank: null, last_ai_update: null };
const DEFAULT_ANALYTICS: AnalyticsState = { hasAiData: false, data: null };

interface AccountData {
  profile: Profile;
  wallet: Wallet;
  skillStats: SkillStats;
  analytics: AnalyticsState;
}

const DEFAULT_ACCOUNT_DATA: AccountData = {
  profile: DEFAULT_PROFILE,
  wallet: DEFAULT_WALLET,
  skillStats: DEFAULT_SKILL_STATS,
  analytics: DEFAULT_ANALYTICS,
};

interface UseAccountDataResult {
  loading: boolean;
  profile: Profile;
  setProfile: React.Dispatch<React.SetStateAction<Profile>>;
  wallet: Wallet;
  updateWallet: (updates: Partial<Wallet>) => void;
  skillStats: SkillStats;
  analytics: AnalyticsState;
  refetch: () => Promise<void>;
}

async function fetchAccountData(userId: string): Promise<AccountData> {
  const result: AccountData = {
    profile: DEFAULT_PROFILE,
    wallet: DEFAULT_WALLET,
    skillStats: DEFAULT_SKILL_STATS,
    analytics: DEFAULT_ANALYTICS,
  };

  try {
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError) throw profileError;
    if (profileData) {
      result.profile = {
        username: profileData.username,
        display_name: profileData.display_name,
        age: profileData.age,
        avatar_url: profileData.avatar_url,
        games_played_self: profileData.games_played_self ?? 0,
        skill_self_rating: profileData.skill_self_rating ?? 5,
        shipping_address_line1: profileData.shipping_address_line1 ?? null,
        shipping_postal_code: profileData.shipping_postal_code ?? null,
        shipping_city: profileData.shipping_city ?? null,
        shipping_country: profileData.shipping_country ?? null,
      };
    }

    const { data: walletData, error: walletError } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (walletError) throw walletError;
    if (walletData) {
      result.wallet = {
        play_credits: walletData.play_credits,
        reward_credits: walletData.reward_credits,
        lifetime_credits: walletData.lifetime_credits ?? 0,
        last_game_credits: walletData.last_game_credits ?? null,
        last_game_date: walletData.last_game_date ?? null,
      };
    }

    const { data: skillData, error: skillError } = await supabase
      .from("skill_stats")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (skillError) throw skillError;
    if (skillData) {
      result.skillStats = {
        skill_level: skillData.skill_level ?? 0,
        ai_rank: skillData.ai_rank,
        last_ai_update: skillData.last_ai_update,
      };
    }

    const { data: analyticsData, error: analyticsError } = await supabase
      .from("ai_player_analytics")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!analyticsError && analyticsData) {
      const hasData = analyticsData.has_ai_data && analyticsData.data && Object.keys(analyticsData.data).length > 0;
      result.analytics = {
        hasAiData: hasData,
        data: hasData ? (analyticsData.data as unknown as PlayerAnalyticsData) : null,
      };
    }
  } catch (error: any) {
    console.error("Error fetching user data:", error);
    toast.error("Fehler", { description: "Konnte Profildaten nicht laden." });
  }

  return result;
}

export function useAccountData(user: User | null): UseAccountDataResult {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["account-data", user?.id],
    queryFn: () => fetchAccountData(user!.id),
    enabled: !!user,
  });

  const setProfile = useCallback<React.Dispatch<React.SetStateAction<Profile>>>(
    (action) => {
      queryClient.setQueryData<AccountData>(["account-data", user?.id], (prev) => {
        const base = prev ?? DEFAULT_ACCOUNT_DATA;
        const profile = typeof action === "function" ? action(base.profile) : action;
        return { ...base, profile };
      });
    },
    [queryClient, user?.id]
  );

  const updateWallet = useCallback(
    (updates: Partial<Wallet>) => {
      queryClient.setQueryData<AccountData>(["account-data", user?.id], (prev) => {
        const base = prev ?? DEFAULT_ACCOUNT_DATA;
        return { ...base, wallet: { ...base.wallet, ...updates } };
      });
    },
    [queryClient, user?.id]
  );

  const refetch = useCallback(async () => {
    await query.refetch();
  }, [query.refetch]);

  return {
    loading: !!user && query.isLoading,
    profile: query.data?.profile ?? DEFAULT_PROFILE,
    setProfile,
    wallet: query.data?.wallet ?? DEFAULT_WALLET,
    updateWallet,
    skillStats: query.data?.skillStats ?? DEFAULT_SKILL_STATS,
    analytics: query.data?.analytics ?? DEFAULT_ANALYTICS,
    refetch,
  };
}
