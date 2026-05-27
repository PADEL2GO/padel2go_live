import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import {
  MessageCircle,
  Send,
  ArrowLeft,
  Trophy,
  TrendingUp,
  Users as UsersIcon,
  Plus,
  UserPlus,
  UserMinus,
  LogOut as LogOutIcon,
  Trash2,
} from "lucide-react";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import { de } from "date-fns/locale";
import Navigation from "@/components/Navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useFriendships, Friend } from "@/hooks/useFriendships";
import {
  useConversations,
  useChatWith,
  useGroupChat,
  useChatGroups,
  useGroupMembers,
  useSendMessage,
  useMarkChatRead,
  useMarkGroupRead,
  useAddGroupMember,
  useRemoveGroupMember,
  useLeaveGroup,
  useDeleteGroup,
  GroupMember,
} from "@/hooks/useChat";
import { CreateGroupDialog } from "@/components/chat/CreateGroupDialog";
import { cn } from "@/lib/utils";

function formatMessageTime(iso: string) {
  const d = new Date(iso);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return `Gestern ${format(d, "HH:mm")}`;
  return format(d, "dd.MM.yyyy HH:mm");
}

function initialsFor(name: string | null, fallback: string | null) {
  return (
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() ||
    fallback?.[0]?.toUpperCase() ||
    "?"
  );
}

export default function DashboardChat() {
  const { user } = useAuth();
  const { friends, isLoadingFriends } = useFriendships();
  const { data: conversations } = useConversations();
  const { data: groups = [] } = useChatGroups();
  const sendMessage = useSendMessage();
  const markRead = useMarkChatRead();
  const markGroupRead = useMarkGroupRead();
  const [searchParams, setSearchParams] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  const selectedFriendId = searchParams.get("with");
  const selectedGroupId = searchParams.get("group");
  const isGroupChat = !!selectedGroupId;

  // Realtime subscription lives in DashboardNavigation (always mounted on dashboard)
  // so we don't duplicate it here.

  const selectedFriend = useMemo(
    () => friends.find((f) => f.id === selectedFriendId) || null,
    [friends, selectedFriendId],
  );
  const selectedGroup = useMemo(
    () => groups.find((g) => g.id === selectedGroupId) || null,
    [groups, selectedGroupId],
  );

  const { data: directMessages } = useChatWith(selectedFriendId || undefined);
  const { data: groupMessages } = useGroupChat(selectedGroupId || undefined);
  const messages = isGroupChat ? groupMessages : directMessages;

  // Mark conversation as read on open / on new incoming messages.
  // Guard with isPending so we don't re-fire the mutation while it's in flight.
  useEffect(() => {
    if (!user) return;
    if (selectedFriendId && !markRead.isPending) {
      const unread = directMessages.filter(
        (m) => m.sender_id === selectedFriendId && m.read_at === null,
      ).length;
      if (unread > 0) markRead.mutate(selectedFriendId);
    } else if (selectedGroupId && !markGroupRead.isPending) {
      markGroupRead.mutate(selectedGroupId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFriendId, selectedGroupId, directMessages.length, groupMessages.length]);

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, selectedFriendId, selectedGroupId]);

  if (!user) return <Navigate to="/auth" replace />;

  const selectDirect = (friendId: string) =>
    setSearchParams({ with: friendId });
  const selectGroup = (groupId: string) =>
    setSearchParams({ group: groupId });
  const clearSelection = () => setSearchParams({});

  const hasSelection = !!(selectedFriendId || selectedGroupId);

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-background pt-20">
        <div className="container max-w-6xl mx-auto px-4 py-6">
          <div className="mb-4 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <MessageCircle className="w-6 h-6 text-primary" />
                Chat
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Schreibe mit Freunden und Gruppen — Nachrichten kommen live an.
              </p>
            </div>
            <Button onClick={() => setCreateOpen(true)} size="sm">
              <Plus className="w-4 h-4 mr-1.5" />
              Neue Gruppe
            </Button>
          </div>

          <div className="grid lg:grid-cols-[320px_1fr] gap-4 border border-border/50 rounded-2xl overflow-hidden bg-card min-h-[70vh]">
            {/* Sidebar */}
            <aside
              className={cn(
                "border-r border-border/50 bg-background/40",
                hasSelection && "hidden lg:block",
              )}
            >
              <Sidebar
                friends={friends}
                groups={groups}
                conversations={conversations}
                isLoadingFriends={isLoadingFriends}
                selectedFriendId={selectedFriendId}
                selectedGroupId={selectedGroupId}
                onSelectFriend={selectDirect}
                onSelectGroup={selectGroup}
              />
            </aside>

            {/* Chat panel */}
            <section
              className={cn(
                "flex flex-col min-h-[70vh]",
                !hasSelection && "hidden lg:flex",
              )}
            >
              {!selectedFriend && !selectedGroup ? (
                <EmptyChat />
              ) : isGroupChat && selectedGroup ? (
                <GroupChatView
                  group={selectedGroup}
                  messages={messages}
                  scrollRef={scrollRef}
                  myId={user.id}
                  isCreator={selectedGroup.created_by === user.id}
                  onBack={clearSelection}
                  onManage={() => setManageOpen(true)}
                  onSend={(content) =>
                    sendMessage.mutate({ groupId: selectedGroup.id, content })
                  }
                  sending={sendMessage.isPending}
                />
              ) : selectedFriend ? (
                <DirectChatView
                  friend={selectedFriend}
                  messages={messages}
                  scrollRef={scrollRef}
                  myId={user.id}
                  onBack={clearSelection}
                  onSend={(content) =>
                    sendMessage.mutate({ recipientId: selectedFriend.id, content })
                  }
                  sending={sendMessage.isPending}
                />
              ) : null}
            </section>
          </div>
        </div>
      </main>

      <CreateGroupDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={selectGroup}
      />

      {selectedGroup && (
        <ManageGroupDialog
          open={manageOpen}
          onOpenChange={setManageOpen}
          groupId={selectedGroup.id}
          isCreator={selectedGroup.created_by === user.id}
          onClosed={clearSelection}
        />
      )}
    </>
  );
}

// ──────────────────────────────────────────────────────────
// Sidebar
// ──────────────────────────────────────────────────────────

function Sidebar({
  friends,
  groups,
  conversations,
  isLoadingFriends,
  selectedFriendId,
  selectedGroupId,
  onSelectFriend,
  onSelectGroup,
}: {
  friends: Friend[];
  groups: Array<{ id: string; name: string; avatar_url: string | null }>;
  conversations: ReturnType<typeof useConversations>["data"];
  isLoadingFriends: boolean;
  selectedFriendId: string | null;
  selectedGroupId: string | null;
  onSelectFriend: (id: string) => void;
  onSelectGroup: (id: string) => void;
}) {
  const conversationLookup = useMemo(() => {
    const map = new Map<string, (typeof conversations)[number]>();
    for (const c of conversations) map.set(`${c.kind}:${c.key}`, c);
    return map;
  }, [conversations]);

  const friendsSorted = useMemo(() => {
    return [...friends].sort((a, b) => {
      const ca = conversationLookup.get(`direct:${a.id}`)?.lastMessageAt;
      const cb = conversationLookup.get(`direct:${b.id}`)?.lastMessageAt;
      if (ca && cb) return new Date(cb).getTime() - new Date(ca).getTime();
      if (ca) return -1;
      if (cb) return 1;
      return (a.displayName || a.username || "").localeCompare(
        b.displayName || b.username || "",
      );
    });
  }, [friends, conversationLookup]);

  const groupsSorted = useMemo(() => {
    return [...groups].sort((a, b) => {
      const ca = conversationLookup.get(`group:${a.id}`)?.lastMessageAt;
      const cb = conversationLookup.get(`group:${b.id}`)?.lastMessageAt;
      const ta = ca ? new Date(ca).getTime() : 0;
      const tb = cb ? new Date(cb).getTime() : 0;
      return tb - ta;
    });
  }, [groups, conversationLookup]);

  if (isLoadingFriends) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 rounded-lg bg-muted/30 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <ScrollArea className="h-[65vh] lg:h-[68vh]">
      {/* Groups section */}
      {groupsSorted.length > 0 && (
        <>
          <div className="px-3 pt-3 pb-1.5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Gruppen ({groupsSorted.length})
            </p>
          </div>
          <ul className="divide-y divide-border/30">
            {groupsSorted.map((g) => {
              const conv = conversationLookup.get(`group:${g.id}`);
              const isActive = g.id === selectedGroupId;
              return (
                <li key={g.id}>
                  <button
                    type="button"
                    onClick={() => onSelectGroup(g.id)}
                    className={cn(
                      "w-full px-3 py-3 flex items-center gap-3 text-left hover:bg-primary/5 transition-colors",
                      isActive && "bg-primary/10",
                    )}
                  >
                    <Avatar className="w-10 h-10 shrink-0 bg-primary/15">
                      <AvatarImage src={g.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/15 text-primary">
                        <UsersIcon className="w-5 h-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-sm truncate text-foreground">
                          {g.name}
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
        </>
      )}

      {/* Direct chats */}
      <div className="px-3 pt-3 pb-1.5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
          Freunde ({friendsSorted.length})
        </p>
      </div>

      {friendsSorted.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-muted-foreground">
          Noch keine Freunde. Füge welche hinzu, um zu chatten.
        </div>
      ) : (
        <ul className="divide-y divide-border/30">
          {friendsSorted.map((friend) => {
            const conv = conversationLookup.get(`direct:${friend.id}`);
            const isActive = friend.id === selectedFriendId;
            return (
              <li key={friend.id}>
                <button
                  type="button"
                  onClick={() => onSelectFriend(friend.id)}
                  className={cn(
                    "w-full px-3 py-3 flex items-center gap-3 text-left hover:bg-primary/5 transition-colors",
                    isActive && "bg-primary/10",
                  )}
                >
                  <Avatar className="w-10 h-10 shrink-0">
                    <AvatarImage src={friend.avatarUrl || undefined} />
                    <AvatarFallback className="bg-muted text-foreground font-semibold text-sm">
                      {initialsFor(friend.displayName, friend.username)}
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
      )}
    </ScrollArea>
  );
}

// ──────────────────────────────────────────────────────────
// Direct chat view (1:1)
// ──────────────────────────────────────────────────────────

function DirectChatView({
  friend,
  messages,
  scrollRef,
  myId,
  onBack,
  onSend,
  sending,
}: {
  friend: Friend;
  messages: ReturnType<typeof useChatWith>["data"];
  scrollRef: React.RefObject<HTMLDivElement>;
  myId: string;
  onBack: () => void;
  onSend: (content: string) => void;
  sending: boolean;
}) {
  return (
    <>
      <header className="border-b border-border/50 p-3 sm:p-4 flex items-center gap-3 bg-background/40">
        <Button variant="ghost" size="icon" className="lg:hidden shrink-0" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Avatar className="w-10 h-10 shrink-0">
          <AvatarImage src={friend.avatarUrl || undefined} />
          <AvatarFallback className="bg-muted text-foreground font-semibold text-sm">
            {initialsFor(friend.displayName, friend.username)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate">
            {friend.displayName || friend.username || "Unbekannt"}
          </p>
          {friend.username && (
            <p className="text-xs text-muted-foreground truncate">
              @{friend.username}
            </p>
          )}
        </div>
        <div className="hidden sm:flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
            <TrendingUp className="w-3.5 h-3.5 text-primary" />
            <span className="text-muted-foreground">Skill</span>
            <span className="font-bold text-primary">
              {friend.skillLevel.toFixed(1)}
            </span>
          </div>
          {friend.aiRank !== null && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-muted-foreground">Rank</span>
              <span className="font-bold text-amber-500">#{friend.aiRank}</span>
            </div>
          )}
        </div>
      </header>

      <MessagesList
        messages={messages}
        myId={myId}
        scrollRef={scrollRef}
        showSenderName={false}
      />
      <ChatInput onSend={onSend} sending={sending} />
    </>
  );
}

// ──────────────────────────────────────────────────────────
// Group chat view
// ──────────────────────────────────────────────────────────

function GroupChatView({
  group,
  messages,
  scrollRef,
  myId,
  isCreator,
  onBack,
  onManage,
  onSend,
  sending,
}: {
  group: { id: string; name: string; avatar_url: string | null };
  messages: ReturnType<typeof useGroupChat>["data"];
  scrollRef: React.RefObject<HTMLDivElement>;
  myId: string;
  isCreator: boolean;
  onBack: () => void;
  onManage: () => void;
  onSend: (content: string) => void;
  sending: boolean;
}) {
  const { data: members = [] } = useGroupMembers(group.id);
  const leaveGroup = useLeaveGroup();
  const deleteGroup = useDeleteGroup();

  const memberLookup = useMemo(() => {
    const m = new Map<string, GroupMember>();
    for (const x of members) m.set(x.user_id, x);
    return m;
  }, [members]);

  return (
    <>
      <header className="border-b border-border/50 p-3 sm:p-4 bg-background/40">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="lg:hidden shrink-0" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Avatar className="w-10 h-10 shrink-0 bg-primary/15">
            <AvatarImage src={group.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/15 text-primary">
              <UsersIcon className="w-5 h-5" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">{group.name}</p>
            <p className="text-xs text-muted-foreground">
              {members.length} {members.length === 1 ? "Mitglied" : "Mitglieder"}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                Optionen
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onManage}>
                <UsersIcon className="w-4 h-4 mr-2" />
                Mitglieder verwalten
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {isCreator ? (
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => {
                    if (confirm("Gruppe wirklich löschen? Alle Nachrichten gehen verloren.")) {
                      deleteGroup.mutate(group.id);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Gruppe löschen
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => {
                    if (confirm("Gruppe verlassen?")) leaveGroup.mutate(group.id);
                  }}
                >
                  <LogOutIcon className="w-4 h-4 mr-2" />
                  Gruppe verlassen
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Member avatar strip */}
        {members.length > 0 && (
          <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
            {members.map((m) => (
              <button
                key={m.user_id}
                type="button"
                onClick={() => {
                  if (m.username) window.location.href = `/u/${m.username}`;
                }}
                className="shrink-0 flex flex-col items-center gap-1 group"
                title={m.displayName || m.username || ""}
              >
                <Avatar className="w-8 h-8 ring-1 ring-border group-hover:ring-primary transition-colors">
                  <AvatarImage src={m.avatarUrl || undefined} />
                  <AvatarFallback className="text-[10px]">
                    {initialsFor(m.displayName, m.username)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-[10px] text-muted-foreground max-w-[60px] truncate">
                  {m.user_id === myId
                    ? "Du"
                    : m.displayName?.split(" ")[0] || m.username || "—"}
                </span>
              </button>
            ))}
          </div>
        )}
      </header>

      <MessagesList
        messages={messages}
        myId={myId}
        scrollRef={scrollRef}
        showSenderName
        memberLookup={memberLookup}
      />
      <ChatInput onSend={onSend} sending={sending} />
    </>
  );
}

// ──────────────────────────────────────────────────────────
// Shared message list / input / empty
// ──────────────────────────────────────────────────────────

function MessagesList({
  messages,
  myId,
  scrollRef,
  showSenderName,
  memberLookup,
}: {
  messages: ReturnType<typeof useChatWith>["data"];
  myId: string;
  scrollRef: React.RefObject<HTMLDivElement>;
  showSenderName: boolean;
  memberLookup?: Map<string, GroupMember>;
}) {
  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 bg-background/20"
      style={{ maxHeight: "55vh" }}
    >
      {messages.length === 0 ? (
        <div className="h-full flex items-center justify-center text-sm text-muted-foreground py-12">
          Schreibe die erste Nachricht
        </div>
      ) : (
        messages.map((m) => {
          const mine = m.sender_id === myId;
          const sender = memberLookup?.get(m.sender_id);
          const senderName =
            sender?.displayName || sender?.username || "Unbekannt";
          return (
            <div
              key={m.id}
              className={cn("flex", mine ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm shadow-sm",
                  mine
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted text-foreground rounded-bl-sm",
                )}
              >
                {showSenderName && !mine && (
                  <p className="text-[10px] font-semibold text-primary mb-0.5">
                    {senderName}
                  </p>
                )}
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
                <p
                  className={cn(
                    "text-[10px] mt-1 text-right",
                    mine ? "text-primary-foreground/70" : "text-muted-foreground",
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

function EmptyChat() {
  return (
    <div className="flex-1 flex items-center justify-center text-center p-8">
      <div>
        <MessageCircle className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-muted-foreground">
          Wähle eine Konversation aus der Liste — oder erstelle eine neue Gruppe.
        </p>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Manage members dialog (creator-only adds; everyone can leave)
// ──────────────────────────────────────────────────────────

function ManageGroupDialog({
  open,
  onOpenChange,
  groupId,
  isCreator,
  onClosed,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  isCreator: boolean;
  onClosed: () => void;
}) {
  const { user } = useAuth();
  const { friends } = useFriendships();
  const { data: members = [] } = useGroupMembers(groupId);
  const addMember = useAddGroupMember();
  const removeMember = useRemoveGroupMember();

  const memberIdSet = useMemo(
    () => new Set(members.map((m) => m.user_id)),
    [members],
  );
  const addableFriends = useMemo(
    () => friends.filter((f) => !memberIdSet.has(f.id)),
    [friends, memberIdSet],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mitglieder verwalten</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <p className="text-sm font-medium mb-2">
              Aktuelle Mitglieder ({members.length})
            </p>
            <ul className="divide-y divide-border/30 rounded-lg border border-border/50 max-h-56 overflow-y-auto">
              {members.map((m) => (
                <li
                  key={m.user_id}
                  className="flex items-center gap-3 p-2.5"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={m.avatarUrl || undefined} />
                    <AvatarFallback className="text-xs">
                      {initialsFor(m.displayName, m.username)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {m.user_id === user?.id
                        ? "Du"
                        : m.displayName || m.username || "Unbekannt"}
                    </p>
                    {m.username && (
                      <p className="text-xs text-muted-foreground truncate">
                        @{m.username}
                      </p>
                    )}
                  </div>
                  {isCreator && m.user_id !== user?.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => removeMember.mutate({ groupId, userId: m.user_id })}
                      aria-label="Entfernen"
                    >
                      <UserMinus className="w-4 h-4" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {isCreator && (
            <div>
              <p className="text-sm font-medium mb-2">
                Freunde hinzufügen ({addableFriends.length})
              </p>
              {addableFriends.length === 0 ? (
                <p className="text-xs text-muted-foreground py-3 text-center">
                  Alle deine Freunde sind bereits Mitglieder.
                </p>
              ) : (
                <ul className="divide-y divide-border/30 rounded-lg border border-border/50 max-h-56 overflow-y-auto">
                  {addableFriends.map((f) => (
                    <li key={f.id} className="flex items-center gap-3 p-2.5">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={f.avatarUrl || undefined} />
                        <AvatarFallback className="text-xs">
                          {initialsFor(f.displayName, f.username)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {f.displayName || f.username || "Unbekannt"}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addMember.mutate({ groupId, userId: f.id })}
                      >
                        <UserPlus className="w-4 h-4 mr-1" />
                        Hinzufügen
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {!isCreator && (
            <p className="text-xs text-muted-foreground">
              Nur der Ersteller dieser Gruppe kann Mitglieder hinzufügen oder entfernen.
              Du kannst die Gruppe jederzeit über das Optionen-Menü verlassen.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
