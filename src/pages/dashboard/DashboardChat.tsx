import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  Calendar,
  MapPin,
  Loader2,
  Check,
  X,
} from "lucide-react";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import { de, enUS } from "date-fns/locale";
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
import { useMyLobbies, useRespondLobbyInvite } from "@/hooks/useLobbies";
import { ProfileLink } from "@/components/profile/ProfileLink";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/queryKeys";
import type { ChatMessage, LobbyInviteMetadata } from "@/hooks/useChat";
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

function formatMessageTime(
  iso: string,
  t: (key: string, opts?: Record<string, unknown>) => string,
) {
  const d = new Date(iso);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return t("chatPage.time.yesterday", { time: format(d, "HH:mm") });
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
  const { t } = useTranslation("social");
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
                {t("chatPage.title")}
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                {t("chatPage.subtitle")}
              </p>
            </div>
            <Button onClick={() => setCreateOpen(true)} size="sm">
              <Plus className="w-4 h-4 mr-1.5" />
              {t("chatPage.newGroup")}
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
  const { t, i18n } = useTranslation("social");
  const dateLocale = i18n.language === "en" ? enUS : de;
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
              {t("chatPage.sidebar.groups", { count: groupsSorted.length })}
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
                              locale: dateLocale,
                              addSuffix: false,
                            })}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p className="text-xs text-muted-foreground truncate">
                          {conv
                            ? `${conv.lastSenderIsMe ? t("chatPage.sidebar.youPrefix") : ""}${conv.lastMessage}`
                            : t("chatPage.sidebar.noMessages")}
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
          {t("chatPage.sidebar.friends", { count: friendsSorted.length })}
        </p>
      </div>

      {friendsSorted.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-muted-foreground">
          {t("chatPage.sidebar.noFriends")}
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
                  <ProfileLink username={friend.username} stopPropagation className="shrink-0">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={friend.avatarUrl || undefined} />
                      <AvatarFallback className="bg-muted text-foreground font-semibold text-sm">
                        {initialsFor(friend.displayName, friend.username)}
                      </AvatarFallback>
                    </Avatar>
                  </ProfileLink>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm truncate text-foreground">
                        {friend.displayName || friend.username || t("common.unknown")}
                      </p>
                      {conv && (
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {formatDistanceToNow(new Date(conv.lastMessageAt), {
                            locale: dateLocale,
                            addSuffix: false,
                          })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-xs text-muted-foreground truncate">
                        {conv
                          ? `${conv.lastSenderIsMe ? t("chatPage.sidebar.youPrefix") : ""}${conv.lastMessage}`
                          : t("chatPage.sidebar.noMessages")}
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
  const { t } = useTranslation("social");
  return (
    <>
      <header className="border-b border-border/50 p-3 sm:p-4 flex items-center gap-3 bg-background/40">
        <Button variant="ghost" size="icon" className="lg:hidden shrink-0" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <ProfileLink username={friend.username} className="shrink-0">
          <Avatar className="w-10 h-10">
            <AvatarImage src={friend.avatarUrl || undefined} />
            <AvatarFallback className="bg-muted text-foreground font-semibold text-sm">
              {initialsFor(friend.displayName, friend.username)}
            </AvatarFallback>
          </Avatar>
        </ProfileLink>
        <ProfileLink username={friend.username} className="flex-1 min-w-0 block">
          <p className="font-medium text-foreground truncate hover:underline">
            {friend.displayName || friend.username || t("common.unknown")}
          </p>
          {friend.username && (
            <p className="text-xs text-muted-foreground truncate">
              @{friend.username}
            </p>
          )}
        </ProfileLink>
        <div className="hidden sm:flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
            <TrendingUp className="w-3.5 h-3.5 text-primary" />
            <span className="text-muted-foreground">{t("chatPage.direct.skill")}</span>
            <span className="font-bold text-primary">
              {friend.skillLevel.toFixed(1)}
            </span>
          </div>
          {friend.aiRank !== null && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-muted-foreground">{t("chatPage.direct.rank")}</span>
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
  const { t } = useTranslation("social");
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
              {members.length} {members.length === 1 ? t("chatPage.group.memberSingular") : t("chatPage.group.memberPlural")}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                {t("chatPage.group.options")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onManage}>
                <UsersIcon className="w-4 h-4 mr-2" />
                {t("chatPage.group.manageMembers")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {isCreator ? (
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => {
                    if (confirm(t("chatPage.group.confirmDelete"))) {
                      deleteGroup.mutate(group.id);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t("chatPage.group.delete")}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => {
                    if (confirm(t("chatPage.group.confirmLeave"))) leaveGroup.mutate(group.id);
                  }}
                >
                  <LogOutIcon className="w-4 h-4 mr-2" />
                  {t("chatPage.group.leave")}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Member avatar strip */}
        {members.length > 0 && (
          <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
            {members.map((m) => (
              <ProfileLink
                key={m.user_id}
                username={m.username}
                disabled={m.user_id === myId}
                className="shrink-0 flex flex-col items-center gap-1 group"
                ariaLabel={t("chatPage.group.openProfileAria", { name: m.displayName || m.username || t("common.player") })}
              >
                <Avatar className="w-8 h-8 ring-1 ring-border group-hover:ring-primary transition-colors">
                  <AvatarImage src={m.avatarUrl || undefined} />
                  <AvatarFallback className="text-[10px]">
                    {initialsFor(m.displayName, m.username)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-[10px] text-muted-foreground max-w-[60px] truncate">
                  {m.user_id === myId
                    ? t("common.you")
                    : m.displayName?.split(" ")[0] || m.username || "—"}
                </span>
              </ProfileLink>
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
  const { t } = useTranslation("social");
  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 bg-background/20"
      style={{ maxHeight: "55vh" }}
    >
      {messages.length === 0 ? (
        <div className="h-full flex items-center justify-center text-sm text-muted-foreground py-12">
          {t("chatPage.messages.empty")}
        </div>
      ) : (
        messages.map((m) => {
          const mine = m.sender_id === myId;
          const sender = memberLookup?.get(m.sender_id);
          const senderName =
            sender?.displayName || sender?.username || t("common.unknown");

          if (m.kind === "lobby_invite" && m.metadata) {
            return (
              <LobbyInviteBubble
                key={m.id}
                message={m as ChatMessage}
                mine={mine}
                senderName={!mine && showSenderName ? senderName : null}
              />
            );
          }

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
                  {formatMessageTime(m.created_at, t)}
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
  const { t } = useTranslation("social");
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
          placeholder={t("chatPage.input.placeholder")}
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
  const { t } = useTranslation("social");
  return (
    <div className="flex-1 flex items-center justify-center text-center p-8">
      <div>
        <MessageCircle className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-muted-foreground">
          {t("chatPage.emptyState")}
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
  const { t } = useTranslation("social");
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
          <DialogTitle>{t("chatPage.manageDialog.title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <p className="text-sm font-medium mb-2">
              {t("chatPage.manageDialog.currentMembers", { count: members.length })}
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
                        ? t("common.you")
                        : m.displayName || m.username || t("common.unknown")}
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
                      aria-label={t("chatPage.manageDialog.removeAria")}
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
                {t("chatPage.manageDialog.addFriends", { count: addableFriends.length })}
              </p>
              {addableFriends.length === 0 ? (
                <p className="text-xs text-muted-foreground py-3 text-center">
                  {t("chatPage.manageDialog.allMembers")}
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
                          {f.displayName || f.username || t("common.unknown")}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addMember.mutate({ groupId, userId: f.id })}
                      >
                        <UserPlus className="w-4 h-4 mr-1" />
                        {t("chatPage.manageDialog.add")}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {!isCreator && (
            <p className="text-xs text-muted-foreground">
              {t("chatPage.manageDialog.creatorHint")}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────────────────
// Lobby-invite bubble — Accept/Decline directly inside the chat thread
// ──────────────────────────────────────────────────────────

function LobbyInviteBubble({
  message,
  mine,
  senderName,
}: {
  message: ChatMessage;
  mine: boolean;
  senderName: string | null;
}) {
  const { t, i18n } = useTranslation("social");
  const meta = message.metadata as LobbyInviteMetadata;
  const respond = useRespondLobbyInvite();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: myLobbies } = useMyLobbies();
  const [localChoice, setLocalChoice] = useState<"accepted" | "declined" | null>(null);

  // Persisted accept-state derived from server data — survives reload.
  const alreadyJoined = !!myLobbies && (
    (myLobbies.joined || []).some((l: any) => l.id === meta.lobby_id) ||
    (myLobbies.hosted || []).some((l: any) => l.id === meta.lobby_id)
  );
  const resolved: "accepted" | "declined" | null = alreadyJoined
    ? "accepted"
    : localChoice;

  const startStr = (() => {
    try {
      return new Date(meta.start_time).toLocaleString(
        i18n.language === "en" ? "en-US" : "de-DE",
        {
          weekday: "short", day: "2-digit", month: "2-digit",
          hour: "2-digit", minute: "2-digit",
        },
      );
    } catch {
      return meta.start_time;
    }
  })();

  const handleRespond = async (response: "accepted" | "declined") => {
    try {
      await respond.mutateAsync({ inviteId: meta.invite_id, response });
      setLocalChoice(response);
      // The mutation hook already invalidates myLobbies/lobbies; the line below
      // is a belt-and-braces invalidate in case the cache key shape ever drifts.
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.myLobbies] });
    } catch {
      // toast already shown by the hook
    }
  };

  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl border bg-card text-card-foreground shadow-sm p-3 space-y-2",
          mine ? "rounded-br-sm border-primary/30" : "rounded-bl-sm border-border",
        )}
      >
        {senderName && (
          <p className="text-[10px] font-semibold text-primary">{senderName}</p>
        )}
        <div className="flex items-start gap-2">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <UsersIcon className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">{t("chatPage.invite.title")}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 shrink-0" /> {meta.location_name}
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3 shrink-0" /> {startStr}
            </p>
          </div>
        </div>

        {/* Action area — only the recipient may accept/decline */}
        {!mine && (
          <div className="pt-1">
            {resolved === "accepted" ? (
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-primary">{t("chatPage.invite.joined")}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => navigate(`/lobbies/${meta.lobby_id}`)}
                >
                  {t("chatPage.invite.openLobby")}
                </Button>
              </div>
            ) : resolved === "declined" ? (
              <p className="text-xs text-muted-foreground">{t("chatPage.invite.declined")}</p>
            ) : (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="lime"
                  className="h-8 flex-1"
                  disabled={respond.isPending}
                  onClick={() => handleRespond("accepted")}
                >
                  {respond.isPending && respond.variables?.response === "accepted" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 mr-1" /> {t("chatPage.invite.accept")}
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 flex-1"
                  disabled={respond.isPending}
                  onClick={() => handleRespond("declined")}
                >
                  {respond.isPending && respond.variables?.response === "declined" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <X className="w-3.5 h-3.5 mr-1" /> {t("chatPage.invite.decline")}
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {mine && (
          <p className="text-[10px] text-muted-foreground italic pt-1">
            {t("chatPage.invite.sent")}
          </p>
        )}

        <p className="text-[10px] text-right text-muted-foreground">
          {formatMessageTime(message.created_at, t)}
        </p>
      </div>
    </div>
  );
}
