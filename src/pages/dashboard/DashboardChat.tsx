import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { MessageCircle, Send, ArrowLeft, Trophy, TrendingUp } from "lucide-react";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import { de } from "date-fns/locale";
import Navigation from "@/components/Navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { useFriendships, Friend } from "@/hooks/useFriendships";
import {
  useConversations,
  useChatWith,
  useSendMessage,
  useMarkChatRead,
  useChatRealtime,
} from "@/hooks/useChat";
import { cn } from "@/lib/utils";

function formatMessageTime(iso: string) {
  const d = new Date(iso);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return `Gestern ${format(d, "HH:mm")}`;
  return format(d, "dd.MM.yyyy HH:mm");
}

function getInitials(friend: Friend) {
  return (
    friend.displayName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() ||
    friend.username?.[0]?.toUpperCase() ||
    "?"
  );
}

export default function DashboardChat() {
  const { user } = useAuth();
  const { friends, isLoadingFriends } = useFriendships();
  const { data: conversations } = useConversations();
  const sendMessage = useSendMessage();
  const markRead = useMarkChatRead();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get("with");

  useChatRealtime();

  const selectedFriend = useMemo(
    () => friends.find((f) => f.id === selectedId) || null,
    [friends, selectedId],
  );

  // Mark messages from this friend as read whenever the chat opens / receives new messages
  const { data: messages } = useChatWith(selectedId || undefined);
  const unreadFromFriend = useMemo(() => {
    if (!user || !selectedId) return 0;
    return messages.filter(
      (m) => m.sender_id === selectedId && m.read_at === null,
    ).length;
  }, [messages, user, selectedId]);

  useEffect(() => {
    if (selectedId && unreadFromFriend > 0) {
      markRead.mutate(selectedId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, unreadFromFriend]);

  // Auto-scroll to bottom on new messages
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, selectedId]);

  if (!user) return <Navigate to="/auth" replace />;

  // Build sidebar entries: friends sorted by last message time, friends without chats below
  const sidebarFriends = useMemo(() => {
    const lookup = new Map(conversations.map((c) => [c.friendId, c]));
    return [...friends].sort((a, b) => {
      const ca = lookup.get(a.id)?.lastMessageAt;
      const cb = lookup.get(b.id)?.lastMessageAt;
      if (ca && cb) return new Date(cb).getTime() - new Date(ca).getTime();
      if (ca) return -1;
      if (cb) return 1;
      return (a.displayName || a.username || "").localeCompare(
        b.displayName || b.username || "",
      );
    });
  }, [friends, conversations]);

  const conversationLookup = useMemo(
    () => new Map(conversations.map((c) => [c.friendId, c])),
    [conversations],
  );

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-background pt-20">
        <div className="container max-w-6xl mx-auto px-4 py-6">
          <div className="mb-4">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageCircle className="w-6 h-6 text-primary" />
              Chat
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Schreibe mit deinen Freunden — Nachrichten kommen live an.
            </p>
          </div>

          <div className="grid lg:grid-cols-[320px_1fr] gap-4 border border-border/50 rounded-2xl overflow-hidden bg-card min-h-[70vh]">
            {/* Sidebar — hidden on mobile when a chat is open */}
            <aside
              className={cn(
                "border-r border-border/50 bg-background/40",
                selectedId && "hidden lg:block",
              )}
            >
              <div className="p-3 border-b border-border/50">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  Freunde ({friends.length})
                </p>
              </div>
              {isLoadingFriends ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 rounded-lg bg-muted/30 animate-pulse" />
                  ))}
                </div>
              ) : friends.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  Noch keine Freunde. Füge welche hinzu, um zu chatten.
                </div>
              ) : (
                <ScrollArea className="h-[60vh] lg:h-[65vh]">
                  <ul className="divide-y divide-border/30">
                    {sidebarFriends.map((friend) => {
                      const conv = conversationLookup.get(friend.id);
                      const isActive = friend.id === selectedId;
                      return (
                        <li key={friend.id}>
                          <button
                            type="button"
                            onClick={() => setSearchParams({ with: friend.id })}
                            className={cn(
                              "w-full px-3 py-3 flex items-center gap-3 text-left hover:bg-primary/5 transition-colors",
                              isActive && "bg-primary/10",
                            )}
                          >
                            <Avatar className="w-10 h-10 shrink-0">
                              <AvatarImage src={friend.avatarUrl || undefined} />
                              <AvatarFallback className="bg-muted text-foreground font-semibold text-sm">
                                {getInitials(friend)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-medium text-sm truncate text-foreground">
                                  {friend.displayName || friend.username || "Unbekannt"}
                                </p>
                                {conv && (
                                  <span className="text-[10px] text-muted-foreground shrink-0">
                                    {formatDistanceToNow(new Date(conv.lastMessageAt), {
                                      locale: de,
                                      addSuffix: false,
                                    })}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center justify-between gap-2 mt-0.5">
                                <p className="text-xs text-muted-foreground truncate">
                                  {conv
                                    ? `${conv.lastSenderIsMe ? "Du: " : ""}${conv.lastMessage}`
                                    : "Noch keine Nachrichten"}
                                </p>
                                {conv && conv.unreadCount > 0 && !isActive && (
                                  <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                                    {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </ScrollArea>
              )}
            </aside>

            {/* Chat panel */}
            <section
              className={cn(
                "flex flex-col min-h-[70vh]",
                !selectedId && "hidden lg:flex",
              )}
            >
              {!selectedFriend ? (
                <div className="flex-1 flex items-center justify-center text-center p-8">
                  <div>
                    <MessageCircle className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-muted-foreground">
                      Wähle einen Freund aus der Liste, um zu chatten.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Header with stats */}
                  <header className="border-b border-border/50 p-3 sm:p-4 flex items-center gap-3 bg-background/40">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="lg:hidden shrink-0"
                      onClick={() => setSearchParams({})}
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <Avatar className="w-10 h-10 shrink-0">
                      <AvatarImage src={selectedFriend.avatarUrl || undefined} />
                      <AvatarFallback className="bg-muted text-foreground font-semibold text-sm">
                        {getInitials(selectedFriend)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {selectedFriend.displayName ||
                          selectedFriend.username ||
                          "Unbekannt"}
                      </p>
                      {selectedFriend.username && (
                        <p className="text-xs text-muted-foreground truncate">
                          @{selectedFriend.username}
                        </p>
                      )}
                    </div>
                    {/* High-level stats — Skill Level + AI Rank */}
                    <div className="hidden sm:flex items-center gap-3 text-xs">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
                        <TrendingUp className="w-3.5 h-3.5 text-primary" />
                        <span className="text-muted-foreground">Skill</span>
                        <span className="font-bold text-primary">
                          {selectedFriend.skillLevel.toFixed(1)}
                        </span>
                      </div>
                      {selectedFriend.aiRank !== null && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                          <Trophy className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-muted-foreground">Rank</span>
                          <span className="font-bold text-amber-500">
                            #{selectedFriend.aiRank}
                          </span>
                        </div>
                      )}
                    </div>
                  </header>

                  {/* Messages */}
                  <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 bg-background/20"
                    style={{ maxHeight: "60vh" }}
                  >
                    {messages.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-sm text-muted-foreground py-12">
                        Schreibe die erste Nachricht
                      </div>
                    ) : (
                      messages.map((m) => {
                        const mine = m.sender_id === user.id;
                        return (
                          <div
                            key={m.id}
                            className={cn(
                              "flex",
                              mine ? "justify-end" : "justify-start",
                            )}
                          >
                            <div
                              className={cn(
                                "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm shadow-sm",
                                mine
                                  ? "bg-primary text-primary-foreground rounded-br-sm"
                                  : "bg-muted text-foreground rounded-bl-sm",
                              )}
                            >
                              <p className="whitespace-pre-wrap break-words">{m.content}</p>
                              <p
                                className={cn(
                                  "text-[10px] mt-1 text-right",
                                  mine
                                    ? "text-primary-foreground/70"
                                    : "text-muted-foreground",
                                )}
                              >
                                {formatMessageTime(m.created_at)}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Input */}
                  <ChatInput
                    onSend={(content) =>
                      sendMessage.mutate({ recipientId: selectedFriend.id, content })
                    }
                    sending={sendMessage.isPending}
                  />
                </>
              )}
            </section>
          </div>
        </div>
      </main>
    </>
  );
}

function ChatInput({
  onSend,
  sending,
}: {
  onSend: (content: string) => void;
  sending: boolean;
}) {
  const [text, setText] = useState("");

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    onSend(trimmed);
    setText("");
  };

  return (
    <div className="border-t border-border/50 p-3 sm:p-4 bg-background/40">
      <div className="flex items-end gap-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Nachricht schreiben… (Enter zum Senden, Shift+Enter für Zeilenumbruch)"
          rows={1}
          maxLength={2000}
          className="resize-none min-h-[44px] max-h-32 bg-background"
        />
        <Button
          onClick={submit}
          disabled={!text.trim() || sending}
          size="icon"
          className="shrink-0 h-11 w-11"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
