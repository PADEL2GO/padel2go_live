import { useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface ChatMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
}

export interface ConversationSummary {
  friendId: string;
  lastMessage: string;
  lastMessageAt: string;
  lastSenderIsMe: boolean;
  unreadCount: number;
}

// All my messages (sent + received). Single source of truth for sidebar + chat panel.
function useAllMyMessages() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["chat-messages", user?.id],
    queryFn: async (): Promise<ChatMessage[]> => {
      const { data, error } = await (supabase as any)
        .from("chat_messages")
        .select("*")
        .or(`sender_id.eq.${user!.id},recipient_id.eq.${user!.id}`)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data ?? []) as ChatMessage[];
    },
    enabled: !!user,
    staleTime: 10_000,
  });
}

// Live subscription — invalidates the cache on every INSERT / UPDATE
export function useChatRealtime() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`chat-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_messages",
          filter: `recipient_id=eq.${user.id}`,
        },
        () => queryClient.invalidateQueries({ queryKey: ["chat-messages", user.id] }),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_messages",
          filter: `sender_id=eq.${user.id}`,
        },
        () => queryClient.invalidateQueries({ queryKey: ["chat-messages", user.id] }),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);
}

// Sidebar overview: per friend → last message + unread count
export function useConversations(): {
  data: ConversationSummary[];
  isLoading: boolean;
} {
  const { user } = useAuth();
  const { data: messages = [], isLoading } = useAllMyMessages();

  const conversations = useMemo<ConversationSummary[]>(() => {
    if (!user) return [];

    const byFriend = new Map<string, ChatMessage[]>();
    for (const m of messages) {
      const friendId = m.sender_id === user.id ? m.recipient_id : m.sender_id;
      if (!byFriend.has(friendId)) byFriend.set(friendId, []);
      byFriend.get(friendId)!.push(m);
    }

    const out: ConversationSummary[] = [];
    for (const [friendId, msgs] of byFriend) {
      const last = msgs[msgs.length - 1];
      const unread = msgs.filter(
        (m) => m.recipient_id === user.id && m.read_at === null,
      ).length;
      out.push({
        friendId,
        lastMessage: last.content,
        lastMessageAt: last.created_at,
        lastSenderIsMe: last.sender_id === user.id,
        unreadCount: unread,
      });
    }

    out.sort(
      (a, b) =>
        new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
    );
    return out;
  }, [messages, user]);

  return { data: conversations, isLoading };
}

// Messages with a single friend, in chronological order
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
        (m.sender_id === user.id && m.recipient_id === friendId) ||
        (m.sender_id === friendId && m.recipient_id === user.id),
    );
  }, [messages, user, friendId]);

  return { data: filtered, isLoading };
}

// Total unread across all chats — for navigation badge
export function useUnreadChatCount(): number {
  const { user } = useAuth();
  const { data: messages = [] } = useAllMyMessages();
  return useMemo(() => {
    if (!user) return 0;
    return messages.filter(
      (m) => m.recipient_id === user.id && m.read_at === null,
    ).length;
  }, [messages, user]);
}

export function useSendMessage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      recipientId,
      content,
    }: {
      recipientId: string;
      content: string;
    }) => {
      const trimmed = content.trim();
      if (!trimmed) throw new Error("Nachricht darf nicht leer sein");
      if (trimmed.length > 2000) throw new Error("Nachricht zu lang (max. 2000 Zeichen)");

      const { error } = await (supabase as any).from("chat_messages").insert({
        sender_id: user!.id,
        recipient_id: recipientId,
        content: trimmed,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-messages", user?.id] });
    },
    onError: (e: Error) => {
      toast.error(e.message || "Nachricht konnte nicht gesendet werden");
    },
  });
}

// Mark all messages from one friend as read
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
