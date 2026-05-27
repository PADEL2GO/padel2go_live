import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { Lobby, LobbyFilters } from "@/types/lobby";
import { QUERY_KEYS } from "@/lib/queryKeys";

export function useLobbies(filters: LobbyFilters = {}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: [QUERY_KEYS.lobbies, filters],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("lobby-api", {
        body: { action: "list_lobbies", ...filters },
      });

      if (error) throw error;
      if (!data?.lobbies) return [];
      return data.lobbies as Lobby[];
    },
    enabled: !!user,
  });

  // Realtime subscription for lobby changes
  useEffect(() => {
    const channel = supabase
      .channel("lobbies-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lobbies" },
        () => {
          queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.lobbies] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lobby_members" },
        () => {
          queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.lobbies] });
          queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.lobbyDetail] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

export function useLobbyDetail(lobbyId: string | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: [QUERY_KEYS.lobbyDetail, lobbyId],
    queryFn: async () => {
      if (!lobbyId) return null;
      
      const { data, error } = await supabase.functions.invoke("lobby-api", {
        body: { action: "get_lobby", lobby_id: lobbyId },
      });

      if (error) throw error;
      return data?.lobby as Lobby | null;
    },
    enabled: !!lobbyId && !!user,
  });

  // Realtime subscription for this specific lobby
  useEffect(() => {
    if (!lobbyId) return;

    const channel = supabase
      .channel(`lobby-${lobbyId}`)
      .on(
        "postgres_changes",
        { 
          event: "*", 
          schema: "public", 
          table: "lobby_members",
          filter: `lobby_id=eq.${lobbyId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.lobbyDetail, lobbyId] });
        }
      )
      .on(
        "postgres_changes",
        { 
          event: "*", 
          schema: "public", 
          table: "lobbies",
          filter: `id=eq.${lobbyId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.lobbyDetail, lobbyId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lobbyId, queryClient]);

  return query;
}

export function useMyLobbies() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [QUERY_KEYS.myLobbies],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("lobby-api", {
        body: { action: "get_my_lobbies" },
      });

      if (error) throw error;
      return {
        hosted: (data?.hosted || []) as Lobby[],
        joined: (data?.joined || []) as Lobby[],
      };
    },
    enabled: !!user,
  });
}

export function useJoinLobby() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lobbyId: string) => {
      const { data, error } = await supabase.functions.invoke("lobby-api", {
        body: { action: "join_lobby", lobby_id: lobbyId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.lobbies] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.lobbyDetail] });
      
      // Redirect to Stripe checkout
      if (data?.checkout_url) {
        window.location.href = data.checkout_url;
      }
    },
    onError: (error: Error) => {
      toast.error("Fehler beim Beitreten", { description: error.message });
    },
  });
}

export function useLeaveLobby() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lobbyId: string) => {
      const { data, error } = await supabase.functions.invoke("lobby-api", {
        body: { action: "leave_lobby", lobby_id: lobbyId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.lobbies] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.lobbyDetail] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.myLobbies] });
      toast.success("Lobby verlassen");
    },
    onError: (error: Error) => {
      toast.error("Fehler", { description: error.message });
    },
  });
}

// ─── Invites ─────────────────────────────────────────────────────────────

export interface PendingLobbyInvite {
  id: string;
  status: "pending";
  created_at: string;
  lobby_id: string;
  inviter_id: string;
  inviter: {
    user_id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
  lobbies: Lobby | null;
}

export interface LobbyInviteForHost {
  id: string;
  status: "pending" | "accepted" | "declined" | "cancelled" | "expired";
  created_at: string;
  responded_at: string | null;
  invitee_id: string;
  invitee: {
    user_id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

export function useMyLobbyInvites() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["lobby-invites-mine", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("lobby-api", {
        body: { action: "list_my_invites" },
      });
      if (error) throw error;
      return (data?.invites ?? []) as PendingLobbyInvite[];
    },
    enabled: !!user,
    staleTime: 15_000,
  });
}

export function useLobbyInvitesForHost(lobbyId: string | undefined) {
  return useQuery({
    queryKey: ["lobby-invites-host", lobbyId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("lobby-api", {
        body: { action: "list_lobby_invites", lobby_id: lobbyId },
      });
      if (error) throw error;
      return (data?.invites ?? []) as LobbyInviteForHost[];
    },
    enabled: !!lobbyId,
  });
}

export function useInviteToLobby() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ lobbyId, inviteeIds }: { lobbyId: string; inviteeIds: string[] }) => {
      const { data, error } = await supabase.functions.invoke("lobby-api", {
        body: { action: "invite_to_lobby", lobby_id: lobbyId, invitee_ids: inviteeIds },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { invited: number; skipped: string[] };
    },
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["lobby-invites-host", vars.lobbyId] });
      toast.success(
        data.invited === 1
          ? "Einladung gesendet"
          : `${data.invited} Einladungen gesendet`,
      );
    },
    onError: (e: Error) => toast.error("Einladung fehlgeschlagen", { description: e.message }),
  });
}

export function useRespondLobbyInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ inviteId, response }: { inviteId: string; response: "accepted" | "declined" }) => {
      const { data, error } = await supabase.functions.invoke("lobby-api", {
        body: { action: "respond_invite", invite_id: inviteId, response },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { ok: true; lobby_id: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lobby-invites-mine"] });
    },
    onError: (e: Error) => toast.error("Fehler", { description: e.message }),
  });
}

export function useCancelLobbyInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (inviteId: string) => {
      const { data, error } = await supabase.functions.invoke("lobby-api", {
        body: { action: "cancel_invite", invite_id: inviteId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lobby-invites-host"] });
      toast.success("Einladung zurückgezogen");
    },
    onError: (e: Error) => toast.error("Fehler", { description: e.message }),
  });
}

export function useCancelLobby() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lobbyId: string) => {
      const { data, error } = await supabase.functions.invoke("lobby-api", {
        body: { action: "cancel_lobby", lobby_id: lobbyId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.lobbies] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.lobbyDetail] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.myLobbies] });
      toast.success("Lobby abgesagt");
    },
    onError: (error: Error) => {
      toast.error("Fehler", { description: error.message });
    },
  });
}
