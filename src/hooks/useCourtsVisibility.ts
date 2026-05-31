import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";

/**
 * Combines the global `feature_courts_public_enabled` flag with the user's
 * admin status to decide whether bookable/online courts should be visible.
 *
 * - canSeeCourts: true if admin OR the flag is on
 * - publicEnabled: raw flag value (used for admin "preview mode" badges)
 * - isAdmin: admin status (so callers can render admin-only hints)
 */
export function useCourtsVisibility() {
  const { isAdmin, loading: adminLoading } = useAdminAuth();

  const { data: publicEnabled, isLoading: settingsLoading } = useQuery({
    queryKey: ["site-settings", "feature_courts_public_enabled"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("feature_courts_public_enabled")
        .eq("id", "global")
        .maybeSingle();
      if (error) throw error;
      return ((data as any)?.feature_courts_public_enabled ?? false) as boolean;
    },
    staleTime: 30_000,
  });

  return {
    canSeeCourts: isAdmin || !!publicEnabled,
    publicEnabled: !!publicEnabled,
    isAdmin,
    loading: adminLoading || settingsLoading,
  };
}
