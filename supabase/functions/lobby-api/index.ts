import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const allowedOrigins = [
  "https://www.padel2go-official.de",
  "https://padel2go-official.de",
  "https://padel2go.lovable.app",
  "https://padel2go.de",
  "http://localhost:5173",
  "http://localhost:8080",
];

const getCorsHeaders = (origin: string | null) => {
  const isAllowed = origin && allowedOrigins.some(allowed => 
    origin === allowed || 
    origin.endsWith('.lovable.app') ||
    origin.endsWith('.lovableproject.com')
  );
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : allowedOrigins[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[LOBBY-API] ${step}${detailsStr}`);
};

// Reservation TTL in minutes

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { action } = body;

    logStep("Action received", { action });

    // Actions that require auth
    const authActions = ['create_lobby', 'join_lobby', 'leave_lobby', 'cancel_lobby', 'get_my_lobbies', 'admin_cancel_lobbies_for_court'];
    
    let user = null;
    if (authActions.includes(action)) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Authorization required" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
      if (userError || !userData.user) {
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      user = userData.user;
      logStep("User authenticated", { userId: user.id });
    }

    switch (action) {
      // ============================================
      // CREATE LOBBY
      // ============================================
      case "create_lobby": {
        const { 
          booking_id, location_id, court_id, start_time, end_time,
          capacity = 4, skill_min, skill_max, price_total_cents, 
          is_private = false, description 
        } = body;

        if (!location_id || !court_id || !start_time || !end_time || !price_total_cents) {
          return new Response(JSON.stringify({ error: "Missing required fields" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Get user's skill level for default range
        const { data: userSkill } = await supabaseAdmin
          .from("skill_stats")
          .select("skill_level")
          .eq("user_id", user!.id)
          .single();

        const userLevel = userSkill?.skill_level || 5;
        const finalSkillMin = skill_min ?? Math.max(1, userLevel - 1);
        const finalSkillMax = skill_max ?? Math.min(10, userLevel + 1);

        const pricePerPlayer = Math.ceil(price_total_cents / capacity);

        // Create lobby
        const { data: lobby, error: lobbyError } = await supabaseAdmin
          .from("lobbies")
          .insert({
            host_user_id: user!.id,
            booking_id,
            location_id,
            court_id,
            start_time,
            end_time,
            capacity,
            skill_min: finalSkillMin,
            skill_max: finalSkillMax,
            price_total_cents,
            price_per_player_cents: pricePerPlayer,
            is_private,
            description,
          })
          .select()
          .single();

        if (lobbyError) {
          logStep("Failed to create lobby", { error: lobbyError.message });
          return new Response(JSON.stringify({ error: lobbyError.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Add host as paid member (they already paid for the booking)
        await supabaseAdmin.from("lobby_members").insert({
          lobby_id: lobby.id,
          user_id: user!.id,
          status: "paid",
          paid_at: new Date().toISOString(),
        });

        // Create lobby_created event
        await supabaseAdmin.from("lobby_events").insert({
          lobby_id: lobby.id,
          actor_id: user!.id,
          event_type: "lobby_created",
          metadata: { capacity, skill_range: `${finalSkillMin}-${finalSkillMax}` },
        });

        logStep("Lobby created", { lobbyId: lobby.id });

        return new Response(JSON.stringify({ lobby }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ============================================
      // LIST LOBBIES
      // ============================================
      case "list_lobbies": {
        const { 
          location_id, date_from, date_to, skill_min, skill_max, 
          only_available = true, limit = 50 
        } = body;

        let query = supabaseAdmin
          .from("lobbies")
          .select(`
            *,
            locations (name, slug, city),
            courts (name),
            lobby_members (id, user_id, status, profiles:user_id (display_name, avatar_url, username))
          `)
          .eq("status", "open")
          .eq("is_private", false)
          .order("start_time", { ascending: true })
          .limit(limit);

        if (location_id) {
          query = query.eq("location_id", location_id);
        }

        if (date_from) {
          query = query.gte("start_time", date_from);
        }

        if (date_to) {
          query = query.lte("start_time", date_to);
        }

        if (skill_min) {
          query = query.gte("skill_max", skill_min);
        }

        if (skill_max) {
          query = query.lte("skill_min", skill_max);
        }

        const { data: lobbies, error: lobbiesError } = await query;

        if (lobbiesError) {
          return new Response(JSON.stringify({ error: lobbiesError.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Collect all member user_ids for one-shot skill lookup
        const allUserIds = Array.from(
          new Set(
            (lobbies ?? []).flatMap((l: any) =>
              (l.lobby_members ?? []).map((m: any) => m.user_id),
            ),
          ),
        );

        let skillMap = new Map<string, number>();
        if (allUserIds.length > 0) {
          const { data: skillStats } = await supabaseAdmin
            .from("skill_stats")
            .select("user_id, skill_level")
            .in("user_id", allUserIds);
          skillMap = new Map((skillStats ?? []).map((s: any) => [s.user_id, s.skill_level]));
        }

        // Calculate member counts, avg skill, and shape `members` like get_lobby
        const lobbiesWithStats = (lobbies || []).map((lobby: any) => {
          const rawMembers = lobby.lobby_members ?? [];
          const activeMembers = rawMembers.filter(
            (m: any) => ["paid", "joined", "reserved"].includes(m.status),
          );
          const paidMembers = activeMembers.filter((m: any) => m.status === "paid");

          const members = activeMembers.map((m: any) => ({
            ...m,
            skill_level: skillMap.get(m.user_id) ?? 5,
          }));

          const avgSkill = paidMembers.length > 0
            ? Math.round(
                paidMembers.reduce(
                  (sum: number, m: any) => sum + (skillMap.get(m.user_id) ?? 5),
                  0,
                ) / paidMembers.length * 10,
              ) / 10
            : null;

          return {
            ...lobby,
            members,
            members_count: activeMembers.length,
            paid_count: paidMembers.length,
            spots_available: lobby.capacity - activeMembers.length,
            avg_skill: avgSkill,
          };
        });

        const filtered = only_available
          ? lobbiesWithStats.filter((l: any) => l.spots_available > 0)
          : lobbiesWithStats;

        return new Response(JSON.stringify({ lobbies: filtered }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ============================================
      // GET LOBBY DETAILS
      // ============================================
      case "get_lobby": {
        const { lobby_id } = body;

        if (!lobby_id) {
          return new Response(JSON.stringify({ error: "lobby_id required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: lobby, error: lobbyError } = await supabaseAdmin
          .from("lobbies")
          .select(`
            *,
            locations (name, slug, city, address),
            courts (name)
          `)
          .eq("id", lobby_id)
          .single();

        if (lobbyError || !lobby) {
          return new Response(JSON.stringify({ error: "Lobby not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Get members with profile info
        const { data: members } = await supabaseAdmin
          .from("lobby_members")
          .select("*, profiles:user_id (display_name, avatar_url, username)")
          .eq("lobby_id", lobby_id)
          .in("status", ["paid", "joined", "reserved"]);

        // Get skill levels
        const userIds = (members || []).map((m: any) => m.user_id);
        const { data: skillStats } = await supabaseAdmin
          .from("skill_stats")
          .select("user_id, skill_level")
          .in("user_id", userIds);

        const skillMap = new Map((skillStats || []).map((s: any) => [s.user_id, s.skill_level]));

        const membersWithSkill = (members || []).map((m: any) => ({
          ...m,
          skill_level: skillMap.get(m.user_id) || 5,
        }));

        // Calculate avg skill
        const paidMembers = membersWithSkill.filter((m: any) => m.status === 'paid');
        const avgSkill = paidMembers.length > 0
          ? Math.round(paidMembers.reduce((sum: number, m: any) => sum + m.skill_level, 0) / paidMembers.length * 10) / 10
          : lobby.skill_min;

        return new Response(JSON.stringify({ 
          lobby: {
            ...lobby,
            members: membersWithSkill,
            members_count: membersWithSkill.length,
            paid_count: paidMembers.length,
            avg_skill: avgSkill,
            spots_available: lobby.capacity - membersWithSkill.length,
          }
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ============================================
      // JOIN LOBBY (free — host pays the whole court)
      // ============================================
      case "join_lobby": {
        const { lobby_id } = body;

        if (!lobby_id) {
          return new Response(JSON.stringify({ error: "lobby_id required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: lobby, error: lobbyError } = await supabaseAdmin
          .from("lobbies")
          .select("*")
          .eq("id", lobby_id)
          .eq("status", "open")
          .single();

        if (lobbyError || !lobby) {
          return new Response(JSON.stringify({ error: "Lobby nicht gefunden oder nicht mehr offen" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: existingMember } = await supabaseAdmin
          .from("lobby_members")
          .select("id, status")
          .eq("lobby_id", lobby_id)
          .eq("user_id", user!.id)
          .maybeSingle();

        if (existingMember && ["paid", "joined", "reserved"].includes(existingMember.status)) {
          return new Response(JSON.stringify({ error: "Du bist bereits Teil dieser Lobby" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Skill range check
        const { data: userSkill } = await supabaseAdmin
          .from("skill_stats")
          .select("skill_level")
          .eq("user_id", user!.id)
          .maybeSingle();

        const userLevel = userSkill?.skill_level || 5;
        if (userLevel < lobby.skill_min || userLevel > lobby.skill_max) {
          return new Response(JSON.stringify({
            error: `Dein Skill-Level (${userLevel}) liegt nicht im gewünschten Bereich (${lobby.skill_min}–${lobby.skill_max})`,
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Capacity check
        const { data: activeMembers } = await supabaseAdmin
          .from("lobby_members")
          .select("id")
          .eq("lobby_id", lobby_id)
          .in("status", ["paid", "joined", "reserved"]);

        if ((activeMembers?.length || 0) >= lobby.capacity) {
          return new Response(JSON.stringify({ error: "Lobby ist voll" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Insert / update straight to joined — no payment, no reservation
        let memberId: string;
        if (existingMember) {
          await supabaseAdmin
            .from("lobby_members")
            .update({ status: "joined", reserved_until: null })
            .eq("id", existingMember.id);
          memberId = existingMember.id;
        } else {
          const { data: newMember, error: memberError } = await supabaseAdmin
            .from("lobby_members")
            .insert({ lobby_id, user_id: user!.id, status: "joined" })
            .select()
            .single();
          if (memberError) {
            return new Response(JSON.stringify({ error: memberError.message }), {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          memberId = newMember.id;
        }

        // Auto-flip lobby to "full" if capacity reached after this join
        const newCount = (activeMembers?.length || 0) + 1;
        if (newCount >= lobby.capacity) {
          await supabaseAdmin.from("lobbies").update({ status: "full" }).eq("id", lobby_id);
        }

        // Audit event
        await supabaseAdmin.from("lobby_events").insert({
          lobby_id,
          actor_id: user!.id,
          event_type: "member_joined",
          metadata: { member_id: memberId },
        });

        // Notify host + other active members
        const { data: otherMembers } = await supabaseAdmin
          .from("lobby_members")
          .select("user_id")
          .eq("lobby_id", lobby_id)
          .in("status", ["paid", "joined"])
          .neq("user_id", user!.id);

        const { data: userProfile } = await supabaseAdmin
          .from("profiles")
          .select("display_name")
          .eq("user_id", user!.id)
          .maybeSingle();

        const notifyUserIds = [
          lobby.host_user_id,
          ...(otherMembers || []).map((m: any) => m.user_id),
        ].filter((id, i, arr) => id !== user!.id && arr.indexOf(id) === i);

        for (const notifyId of notifyUserIds) {
          await supabaseAdmin.from("notifications").insert({
            user_id: notifyId,
            type: "lobby_member_joined",
            title: "Neuer Spieler beigetreten",
            message: `${userProfile?.display_name || "Ein Spieler"} ist deiner Lobby beigetreten.`,
            entity_type: "lobby",
            entity_id: lobby_id,
            cta_url: `/lobbies/${lobby_id}`,
          });
        }

        logStep("Member joined (free)", { lobbyId: lobby_id, memberId });

        return new Response(JSON.stringify({ ok: true, member_id: memberId }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ============================================
      // LEAVE LOBBY
      // ============================================
      case "leave_lobby": {
        const { lobby_id } = body;

        const { data: member } = await supabaseAdmin
          .from("lobby_members")
          .select("id, status")
          .eq("lobby_id", lobby_id)
          .eq("user_id", user!.id)
          .single();

        if (!member) {
          return new Response(JSON.stringify({ error: "Not a member" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (member.status === "paid") {
          return new Response(JSON.stringify({ error: "Cannot leave after paying. Contact support for refund." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await supabaseAdmin
          .from("lobby_members")
          .update({ status: "cancelled" })
          .eq("id", member.id);

        await supabaseAdmin.from("lobby_events").insert({
          lobby_id,
          actor_id: user!.id,
          event_type: "member_left",
        });

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ============================================
      // CANCEL LOBBY (Host only)
      // ============================================
      case "cancel_lobby": {
        const { lobby_id } = body;

        const { data: lobby } = await supabaseAdmin
          .from("lobbies")
          .select("id, host_user_id")
          .eq("id", lobby_id)
          .single();

        if (!lobby || lobby.host_user_id !== user!.id) {
          return new Response(JSON.stringify({ error: "Not authorized" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await supabaseAdmin
          .from("lobbies")
          .update({ status: "cancelled" })
          .eq("id", lobby_id);

        // Notify all members
        const { data: members } = await supabaseAdmin
          .from("lobby_members")
          .select("user_id")
          .eq("lobby_id", lobby_id)
          .neq("user_id", user!.id);

        for (const member of members || []) {
          await supabaseAdmin.from("notifications").insert({
            user_id: member.user_id,
            type: "lobby_cancelled",
            title: "Lobby abgesagt",
            message: "Eine Lobby, der du beigetreten bist, wurde abgesagt.",
            entity_type: "lobby",
            entity_id: lobby_id,
          });
        }

        await supabaseAdmin.from("lobby_events").insert({
          lobby_id,
          actor_id: user!.id,
          event_type: "lobby_cancelled",
        });

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ============================================
      // ADMIN: CANCEL ALL LOBBIES FOR A COURT
      // ============================================
      case "admin_cancel_lobbies_for_court": {
        const { court_id } = body;

        if (!court_id) {
          return new Response(JSON.stringify({ error: "court_id required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Check if user is admin
        const { data: adminRole } = await supabaseAdmin
          .from("user_roles")
          .select("role")
          .eq("user_id", user!.id)
          .eq("role", "admin")
          .maybeSingle();

        if (!adminRole) {
          return new Response(JSON.stringify({ error: "Admin access required" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Find active lobbies on this court
        const { data: lobbies, error: lobbiesError } = await supabaseAdmin
          .from("lobbies")
          .select("id, host_user_id")
          .eq("court_id", court_id)
          .in("status", ["open", "full"]);

        if (lobbiesError) {
          return new Response(JSON.stringify({ error: lobbiesError.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        let cancelledCount = 0;

        for (const lobby of lobbies || []) {
          // Cancel lobby
          await supabaseAdmin
            .from("lobbies")
            .update({ status: "cancelled" })
            .eq("id", lobby.id);

          // Cancel all members (keep history, but mark as cancelled)
          await supabaseAdmin
            .from("lobby_members")
            .update({ status: "cancelled" })
            .eq("lobby_id", lobby.id);

          // Notify members + host
          const { data: members } = await supabaseAdmin
            .from("lobby_members")
            .select("user_id")
            .eq("lobby_id", lobby.id);

          const notifyUserIds = Array.from(
            new Set([lobby.host_user_id, ...(members || []).map((m: any) => m.user_id)])
          );

          for (const userId of notifyUserIds) {
            await supabaseAdmin.from("notifications").insert({
              user_id: userId,
              type: "lobby_cancelled",
              title: "Lobby abgesagt",
              message: "Diese Lobby wurde wegen Court-Deaktivierung automatisch abgesagt.",
              entity_type: "lobby",
              entity_id: lobby.id,
              cta_url: `/lobbies/${lobby.id}`,
            });
          }

          await supabaseAdmin.from("lobby_events").insert({
            lobby_id: lobby.id,
            actor_id: user!.id,
            event_type: "lobby_cancelled_admin",
            metadata: { reason: "court_deactivated" },
          });

          cancelledCount++;
        }

        return new Response(JSON.stringify({ success: true, cancelledCount }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ============================================
      // GET MY LOBBIES
      // ============================================
      case "get_my_lobbies": {
        // Lobbies where user is host
        const { data: hostedLobbies } = await supabaseAdmin
          .from("lobbies")
          .select(`
            *,
            locations (name, slug),
            courts (name),
            lobby_members (id, status)
          `)
          .eq("host_user_id", user!.id)
          .in("status", ["open", "full"])
          .order("start_time", { ascending: true });

        // Lobbies where user is member
        const { data: memberLobbies } = await supabaseAdmin
          .from("lobby_members")
          .select(`
            lobby_id,
            status,
            lobbies (
              *,
              locations (name, slug),
              courts (name),
              lobby_members (id, status)
            )
          `)
          .eq("user_id", user!.id)
          .in("status", ["paid", "joined", "reserved"]);

        return new Response(JSON.stringify({ 
          hosted: hostedLobbies || [],
          joined: (memberLobbies || []).map((m: any) => ({ ...m.lobbies, my_status: m.status })),
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ============================================
      // INVITE FRIEND TO LOBBY
      // ============================================
      case "invite_to_lobby": {
        const { lobby_id, invitee_ids } = body;
        if (!lobby_id || !Array.isArray(invitee_ids) || invitee_ids.length === 0) {
          return new Response(JSON.stringify({ error: "lobby_id and invitee_ids required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Verify caller is the lobby host
        const { data: lobby } = await supabaseAdmin
          .from("lobbies")
          .select("host_user_id, status, locations(name), start_time")
          .eq("id", lobby_id)
          .single();

        if (!lobby || lobby.host_user_id !== user!.id) {
          return new Response(JSON.stringify({ error: "Nur der Host kann einladen" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (lobby.status !== "open") {
          return new Response(JSON.stringify({ error: "Lobby ist nicht mehr offen" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const inserted: any[] = [];
        const skipped: string[] = [];

        for (const inviteeId of invitee_ids) {
          // Insert (upsert-by-unique-constraint pattern)
          const { data: inv, error: invErr } = await supabaseAdmin
            .from("lobby_invites")
            .insert({
              lobby_id,
              inviter_id: user!.id,
              invitee_id: inviteeId,
            })
            .select()
            .single();

          if (invErr) {
            skipped.push(inviteeId);
            continue;
          }
          inserted.push(inv);

          // Best-effort notification
          const locationName = (lobby as any).locations?.name || "Lobby";
          const startStr = new Date(lobby.start_time).toLocaleString("de-DE", {
            day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
          });
          await supabaseAdmin.from("notifications").insert({
            user_id: inviteeId,
            type: "lobby_invite",
            title: "Lobby-Einladung",
            message: `Du wurdest zu einer Lobby bei ${locationName} am ${startStr} eingeladen.`,
            entity_type: "lobby",
            entity_id: lobby_id,
            cta_url: `/lobbies/${lobby_id}`,
          }).then(() => {}, () => {});
        }

        return new Response(JSON.stringify({ invited: inserted.length, skipped }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ============================================
      // RESPOND TO INVITE  (invitee accept/decline)
      // ============================================
      case "respond_invite": {
        const { invite_id, response } = body;
        if (!invite_id || !["accepted", "declined"].includes(response)) {
          return new Response(JSON.stringify({ error: "invite_id + response (accepted|declined)" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: invite } = await supabaseAdmin
          .from("lobby_invites")
          .select("*")
          .eq("id", invite_id)
          .single();

        if (!invite || invite.invitee_id !== user!.id) {
          return new Response(JSON.stringify({ error: "Einladung nicht gefunden" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (invite.status !== "pending") {
          return new Response(JSON.stringify({ error: "Einladung wurde bereits beantwortet" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await supabaseAdmin
          .from("lobby_invites")
          .update({ status: response, responded_at: new Date().toISOString() })
          .eq("id", invite_id);

        return new Response(JSON.stringify({ ok: true, lobby_id: invite.lobby_id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ============================================
      // CANCEL INVITE  (host pulls back a pending invite)
      // ============================================
      case "cancel_invite": {
        const { invite_id } = body;
        const { data: invite } = await supabaseAdmin
          .from("lobby_invites")
          .select("*")
          .eq("id", invite_id)
          .single();

        if (!invite || invite.inviter_id !== user!.id) {
          return new Response(JSON.stringify({ error: "Einladung nicht gefunden" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await supabaseAdmin
          .from("lobby_invites")
          .update({ status: "cancelled", responded_at: new Date().toISOString() })
          .eq("id", invite_id);

        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ============================================
      // LIST MY PENDING INVITES (invitee view)
      // ============================================
      case "list_my_invites": {
        const { data, error } = await supabaseAdmin
          .from("lobby_invites")
          .select(`
            id, status, created_at, lobby_id, inviter_id,
            lobbies (
              id, start_time, end_time, status, capacity, skill_min, skill_max,
              price_per_player_cents, currency, is_private,
              locations (name, city),
              courts (name)
            )
          `)
          .eq("invitee_id", user!.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false });

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Resolve inviter profiles
        const inviterIds = Array.from(new Set((data ?? []).map((d: any) => d.inviter_id)));
        let inviterMap = new Map<string, any>();
        if (inviterIds.length > 0) {
          const { data: profiles } = await supabaseAdmin
            .from("profiles")
            .select("user_id, display_name, username, avatar_url")
            .in("user_id", inviterIds);
          inviterMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
        }

        const invites = (data ?? []).map((d: any) => ({
          ...d,
          inviter: inviterMap.get(d.inviter_id) ?? null,
        }));

        return new Response(JSON.stringify({ invites }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ============================================
      // LIST INVITES FOR A SPECIFIC LOBBY (host view)
      // ============================================
      case "list_lobby_invites": {
        const { lobby_id } = body;
        const { data: lob } = await supabaseAdmin
          .from("lobbies")
          .select("host_user_id")
          .eq("id", lobby_id)
          .single();
        if (!lob || lob.host_user_id !== user!.id) {
          return new Response(JSON.stringify({ error: "Nur der Host darf das sehen" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data } = await supabaseAdmin
          .from("lobby_invites")
          .select("id, status, created_at, responded_at, invitee_id")
          .eq("lobby_id", lobby_id)
          .order("created_at", { ascending: false });

        const inviteeIds = (data ?? []).map((r: any) => r.invitee_id);
        let profileMap = new Map<string, any>();
        if (inviteeIds.length > 0) {
          const { data: profiles } = await supabaseAdmin
            .from("profiles")
            .select("user_id, display_name, username, avatar_url")
            .in("user_id", inviteeIds);
          profileMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
        }

        const invites = (data ?? []).map((r: any) => ({
          ...r,
          invitee: profileMap.get(r.invitee_id) ?? null,
        }));

        return new Response(JSON.stringify({ invites }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ============================================
      // CLEANUP EXPIRED (Cron) — only past-end-time lobbies now;
      // reservations no longer exist since lobby joins are free.
      // ============================================
      case "cleanup_expired": {
        // Expire old lobbies (past end_time)
        await supabaseAdmin
          .from("lobbies")
          .update({ status: "expired" })
          .eq("status", "open")
          .lt("end_time", new Date().toISOString());

        return new Response(JSON.stringify({ expired_lobbies: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
