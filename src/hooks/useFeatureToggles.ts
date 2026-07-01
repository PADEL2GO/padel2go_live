import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FeatureToggles {
  app_launched: boolean;
  lobbies_enabled: boolean;
  league_enabled: boolean;
  events_enabled: boolean;
  p2g_enabled: boolean;
  marketplace_enabled: boolean;
  isLoading: boolean;
}

// Shared React Query cache: the 7 consumers (RequireAppLaunched, Footer,
// DashboardNavigation, dashboard pages) now share a single cached fetch of the
// rarely-changing feature flags instead of each firing its own DB round trip.
export const useFeatureToggles = () => {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["feature-toggles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("feature_app_launched, feature_lobbies_enabled, feature_league_enabled, feature_events_enabled, feature_p2g_enabled, feature_marketplace_enabled")
        .eq("id", "global")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // feature flags rarely change
  });

  return {
    app_launched: data?.feature_app_launched ?? false,
    lobbies_enabled: data?.feature_lobbies_enabled ?? false,
    league_enabled: data?.feature_league_enabled ?? false,
    events_enabled: data?.feature_events_enabled ?? false,
    p2g_enabled: data?.feature_p2g_enabled ?? false,
    marketplace_enabled: (data as any)?.feature_marketplace_enabled ?? false,
    isLoading,
    refetch,
  };
};
