import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigins = new Set((Deno.env.get("ALLOWED_ORIGINS") ?? "https://parabs.github.io,http://localhost:3000")
  .split(",").map((value) => value.trim()).filter(Boolean));

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  const originAllowed = !origin || allowedOrigins.has(origin);
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
  if (origin && originAllowed) headers["Access-Control-Allow-Origin"] = origin;
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { ...headers, "Content-Type": "application/json" },
  });
  if (!originAllowed) return json({ error: "Origin is not allowed." }, 403);
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return json({ error: "Supabase function environment is not fully configured." }, 500);
  const token = req.headers.get("Authorization")?.replace(/^Bearer\\s+/i, "");
  if (!token) return json({ error: "Authentication required." }, 401);

  const auth = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userResult, error: userError } = await auth.auth.getUser(token);
  if (userError || !userResult.user) return json({ error: "Your session is invalid or expired." }, 401);

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return json({ error: "Request body must be valid JSON." }, 400); }

  const societyId = String(body.societyId ?? "");
  const email = String(body.email ?? "").trim().toLowerCase();
  const roleCode = String(body.roleCode ?? "").trim();
  const validUntil = body.validUntil ? String(body.validUntil) : null;
  const reason = String(body.reason ?? "Role assigned by Society Admin").trim();
  if (!societyId || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email) || !roleCode) {
    return json({ error: "Society, valid email and role are required." }, 400);
  }
  if (email === (userResult.user.email ?? "").toLowerCase()) {
    return json({ error: "You cannot assign an additional role to your own account." }, 403);
  }
  const { data: access, error: accessError } = await auth.rpc("get_my_society_access");
  if (accessError || !Array.isArray(access)) return json({ error: "Could not verify your society membership." }, 403);
  const membership = access.find((item: any) => item.society_id === societyId);
  if (!membership || !membership.permissions.includes("society.members.manage") || !membership.permissions.includes("society.roles.manage")) {
    return json({ error: "You do not have both membership and role management permissions for this society." }, 403);
  }

  (auth.rest as unknown as { headers: Record<string, string> }).headers['x-society-id'] = societyId;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: roles, error: rolesError } = await admin.from("society_roles")
    .select("role_id,role_code").eq("society_id", societyId).eq("role_code", roleCode).limit(1);
  if (rolesError) return json({ error: "Could not verify the requested role." }, 500);
  if (!roles?.length) return json({ error: "The requested role is not configured for this society." }, 400);

  const { data: userList, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) return json({ error: "Could not check whether this Google account already exists." }, 500);
  let target = userList.users.find((user) => (user.email ?? "").toLowerCase() === email);
  let inviteSent = false;
  if (!target) {
    const redirectTo = Deno.env.get("SITE_URL") ?? "https://parabs.github.io/SocietyOS-Inspector/";
    const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
    if (inviteError || !inviteData.user) {
      return json({ error: inviteError?.message ?? "Invitation could not be sent." }, 400);
    }
    target = inviteData.user;
    inviteSent = true;
  }

  const { data: grant, error: grantError } = await auth.rpc("grant_society_role", {
    p_society_id: societyId,
    p_user_id: target.id,
    p_role_code: roleCode,
    p_valid_from: new Date().toISOString().slice(0, 10),
    p_valid_until: validUntil,
    p_reason: reason,
  });
  if (grantError) {
    return json({
      error: inviteSent
        ? `Invitation email was sent, but role assignment failed: ${grantError.message}`
        : `Role assignment failed: ${grantError.message}`,
      inviteSent,
    }, 400);
  }

  return json({
    success: true,
    inviteSent,
    membershipStatus: target.confirmed_at ? "active" : "invited",
    roleCode,
    society: membership.display_name,
  });
});
