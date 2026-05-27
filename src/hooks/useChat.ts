import { useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface ChatMessage {
  id: string;
  sender_id: string;
  recipient_id: string | null;
  group_id: string | null;
  content: string;
  read_at: string | null;
  created_at: string;
}

export interface ChatGroup {
  id: string;
  name: string;
  avatar_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  group_id: string;
  user_id: string;
  joined_at: string;
  last_read_at: string | null;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
}

export type ConversationKind = "direct" | "group";

export interface ConversationSummary {
  kind: ConversationKind;
  key: string; // friendId for direct, groupId for group
  lastMessage: string;
  lastMessageAt: string;
  lastSenderIsMe: boolean;
  unreadCount: number;
}

// ---- Groups -----------------------------------------------------------------

export function useChatGroups() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["chat-groups", user?.id],
    queryFn: async (): Promise<ChatGroup[]> => {
      const { data, error } = await (supabase as any)
        .from("chat_groups")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ChatGroup[];
    },
    enabled: !!user,
    staleTime: 30_000,
  });
}

export function useGroupMembers(groupId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["chat-group-members", groupId],
    queryFn: async (): Promise<GroupMember[]> => {
      const { data: memberRows, error } = await (supabase as any)
        .from("chat_group_members")
        .select("group_id, user_id, joined_at, last_read_at")
        .eq("group_id", groupId);
      if (error) throw error;

      const memberIds = (memberRows ?? []).map((r: any) => r.user_id);
      if (memberIds.length === 0) return [];

      const { data: profiles, error: pErr } = await (supabase as any)
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .in("user_id", memberIds);
      if (pErr) throw pErr;

      const profileMap = new Map(
        (profiles ?? []).map((p: any) => [p.user_id, p]),
      );

      return (memberRows ?? []).map((r: any) => {
        const p = profileMap.get(r.user_id) as any;
        return {
          group_id: r.group_id,
          user_id: r.user_id,
          joined_at: r.joined_at,
          last_read_at: r.last_read_at,
          displayName: p?.display_name ?? null,
          username: p?.username ?? null,
          avatarUrl: p?.avatar_url ?? null,
        } as GroupMember;
      });
    },
    enabled: !!user && !!groupId,
    staleTime: 10_000,
  });
}

export function useCreateGroup() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      memberIds,
    }: {
      name: string;
      memberIds: string[];
    }) => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Gruppenname erforderlich");
      if (memberIds.length === 0) throw new Error("Mindestens 1 Freund hinzufügen");

      const { data: group, error } = await (supabase as any)
        .from("chat_groups")
        .insert({ name: trimmed, created_by: user!.id })
        .select()
        .single();
      if (error) throw error;

      const memberRows = [
        { group_id: group.id, user_id: user!.id }, // creator joins automatically
        ...memberIds.map((uid) => ({ group_id: group.id, user_id: uid })),
      ];

      const { error: mErr } = await (supabase as any)
        .from("chat_group_members")
        .insert(memberRows);
      if (mErr) throw mErr;

      return group as ChatGroup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-groups", user?.id] });
      toast.success("Gruppe erstellt");
    },
    onError: (e: Error) => toast.error(e.message || "Gruppe konnte nicht erstellt werden"),
  });
}

export function useAddGroupMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: string; userId: string }) => {
      const { error } = await (supabase as any)
        .from("chat_group_members")
        .insert({ group_id: groupId, user_id: userId });
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["chat-group-members", vars.groupId] });
      toast.success("Mitglied hinzugefügt");
    },
    onError: (e: Error) => toast.error(e.message || "Hinzufügen fehlgeschlagen"),
  });
}

export function useRemoveGroupMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: string; userId: string }) => {
      const { error } = await (supabase as any)
        .from("chat_group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["chat-group-members", vars.groupId] });
      toast.success("Mitglied entfernt");
    },
    onError: (e: Error) => toast.error(e.message || "Entfernen fehlgeschlagen"),
  });
}

export function useLeaveGroup() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await (supabase as any)
        .from("chat_group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-groups", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["chat-messages", user?.id] });
      toast.success("Gruppe verlassen");
    },
    onError: (e: Error) => toast.error(e.message || "Verlassen fehlgeschlagen"),
  });
}

export function useDeleteGroup() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await (supabase as any)
        .from("chat_groups")
        .delete()
        .eq("id", groupId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-groups", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["chat-messages", user?.id] });
      toast.success("Gruppe gelöscht");
    },
    onError: (e: Error) => toast.error(e.message || "Löschen fehlgeschlagen"),
  });
}

// ---- Messages ---------------------------------------------------------------

// All messages visible to the user — direct + group (RLS filters server-side)
function useAllMyMessages() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["chat-messages", user?.id],
    queryFn: async (): Promise<ChatMessage[]> => {
      const { data, error } = await (supabase as any)
        .from("chat_messages")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ChatMessage[];
    },
    enabled: !!user,
    staleTime: 10_000,
  });
}

// Live subscription — RLS filters which events the user receives
export function useChatRealtime() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`chat-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_messages" },
        () => queryClient.invalidateQueries({ queryKey: ["chat-messages", user.id] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_groups" },
        () => queryClient.invalidateQueries({ queryKey: ["chat-groups", user.id] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_group_members" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["chat-groups", user.id] });
          queryClient.invalidateQueries({ queryKey: ["chat-group-members"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);
}

// Per-group unread = messages newer than my last_read_at and not authored by me
function unreadInGroup(
  messages: ChatMessage[],
  groupId: string,
  lastReadAt: string | null,
  myId: string,
): number {
  const cutoff = lastReadAt ? new Date(lastReadAt).getTime() : 0;
  return messages.filter(
    (m) =>
      m.group_id === groupId &&
      m.sender_id !== myId &&
      new Date(m.created_at).getTime() > cutoff,
  ).length;
}

export function useConversations(): {
  data: ConversationSummary[];
  isLoading: boolean;
} {
  const { user } = useAuth();
  const { data: messages = [], isLoading: msgLoading } = useAllMyMessages();
  const { data: groups = [], isLoading: grpLoading } = useChatGroups();

  // Fetch my membership rows once (for last_read_at)
  const { data: myMemberships = [], isLoading: memLoading } = useQuery({
    queryKey: ["chat-my-memberships", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("chat_group_members")
        .select("group_id, last_read_at")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []) as Array<{ group_id: string; last_read_at: string | null }>;
    },
    enabled: !!user,
    staleTime: 10_000,
  });

  const data = useMemo<ConversationSummary[]>(() => {
    if (!user) return [];
    const out: ConversationSummary[] = [];

    // Direct chats: group messages by friend
    const byFriend = new Map<string, ChatMessage[]>();
    for (const m of messages) {
      if (m.group_id) continue;
      const friendId = m.sender_id === user.id ? m.recipient_id! : m.sender_id;
      if (!byFriend.has(friendId)) byFriend.set(friendId, []);
      byFriend.get(friendId)!.push(m);
    }
    for (const [friendId, msgs] of byFriend) {
      const last = msgs[msgs.length - 1];
      const unread = msgs.filter(
        (m) => m.recipient_id === user.id && m.read_at === null,
      ).length;
      out.push({
        kind: "direct",
        key: friendId,
        lastMessage: last.content,
        lastMessageAt: last.created_at,
        lastSenderIsMe: last.sender_id === user.id,
        unreadCount: unread,
      });
    }

    // Groups: even groups with no messages should appear
    const memLookup = new Map(myMemberships.map((m) => [m.group_id, m.last_read_at]));
    for (const g of groups) {
      const groupMsgs = messages.filter((m) => m.group_id === g.id);
      const last = groupMsgs[groupMsgs.length - 1];
      out.push({
        kind: "group",
        key: g.id,
        lastMessage: last?.content ?? "Noch keine Nachrichten",
        lastMessageAt: last?.created_at ?? g.updated_at,
        lastSenderIsMe: last ? last.sender_id === user.id : false,
        unreadCount: unreadInGroup(messages, g.id, memLookup.get(g.id) ?? null, user.id),
      });
    }

    out.sort(
      (a, b) =>
        new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
    );
    return out;
  }, [messages, groups, myMemberships, user]);

  return { data, isLoading: msgLoading || grpLoading || memLoading };
}

// Messages with a single friend (1:1)
export function useChatWith(friendId: string | undefined): {
  data: ChatMessage[];
  isLoading: boolean;
} {
  const { user } = useAuth();
  const { data: messages = [], isLoading } = useAllMyMessages();

  const filtered = useMemo(() => {
    if (!user || !friendId) return [];
    return messages.filter(
      (m) =>
        m.group_id === null &&
        ((m.sender_id === user.id && m.recipient_id === friendId) ||
          (m.sender_id === friendId && m.recipient_id === user.id)),
    );
  }, [messages, user, friendId]);

  return { data: filtered, isLoading };
}

// Messages in a group
export function useGroupChat(groupId: string | undefined): {
  data: ChatMessage[];
  isLoading: boolean;
} {
  const { data: messages = [], isLoading } = useAllMyMessages();
  const filtered = useMemo(
    () => (groupId ? messages.filter((m) => m.group_id === groupId) : []),
    [messages, groupId],
  );
  return { data: filtered, isLoading };
}

export function useUnreadChatCount(): number {
  const { user } = useAuth();
  const { data: conversations } = useConversations();
  return useMemo(() => {
    if (!user) return 0;
    return conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  }, [conversations, user]);
}

export function useSendMessage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      content: string;
      recipientId?: string;
      groupId?: string;
    }) => {
      const trimmed = input.content.trim();
      if (!trimmed) throw new Error("Nachricht darf nicht leer sein");
      if (trimmed.length > 2000) throw new Error("Nachricht zu lang (max. 2000 Zeichen)");
      if (!input.recipientId && !input.groupId) {
        throw new Error("Empfänger fehlt");
      }

      const payload: any = {
        sender_id: user!.id,
        content: trimmed,
        recipient_id: input.recipientId ?? null,
        group_id: input.groupId ?? null,
      };

      const { error } = await (supabase as any).from("chat_messages").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-messages", user?.id] });
    },
    onError: (e: Error) => toast.error(e.message || "Nachricht konnte nicht gesendet werden"),
  });
}

// Mark 1:1 messages from one friend as read
export function useMarkChatRead() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (friendId: string) => {
      const { error } = await (supabase as any)
        .from("chat_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("sender_id", friendId)
        .eq("recipient_id", user!.id)
        .is("read_at", null);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-messages", user?.id] });
    },
  });
}

// Mark a group as read by bumping my membership last_read_at to now
export function useMarkGroupRead() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await (supabase as any)
        .from("chat_group_members")
        .update({ last_read_at: new Date().toISOString() })
        .eq("group_id", groupId)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-my-memberships", user?.id] });
    },
  });
}
