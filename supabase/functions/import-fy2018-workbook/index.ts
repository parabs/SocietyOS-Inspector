import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const TABLES: Record<string, { conflict: string; required: string[] }> = {
  source_register: { conflict: "source_id", required: ["source_id", "original_file_name"] },
  member_opening_balances: { conflict: "opening_balance_id", required: ["opening_balance_id", "party_id", "financial_year", "opening_balance"] },
  flat_owner_master: { conflict: "flat_owner_id", required: ["flat_owner_id"] },
  account_master: { conflict: "account_id", required: ["account_id", "account_name"] },
  category_master: { conflict: "category_id", required: ["category_id", "category_name"] },
  party_master: { conflict: "party_id", required: ["party_id", "party_name"] },
  rules_master: { conflict: "rule_id", required: ["rule_id", "rule_name"] },
  demand_register: { conflict: "demand_id", required: ["demand_id", "party_id", "demand_amount"] },
  transactions: { conflict: "transaction_id", required: ["transaction_id", "amount"] },
  society_dropdown_options: { conflict: "column_name,option_value", required: ["column_name", "option_value"] },
  society_correction_log: { conflict: "financial_year,rule_item,correction_applied,scope_note", required: ["financial_year", "rule_item", "correction_applied"] },
  party_category_rules: { conflict: "rule_id", required: ["rule_id", "rule_text"] },
};
const ORDER = [
  "source_register", "member_opening_balances", "flat_owner_master", "account_master",
  "category_master", "party_master", "rules_master", "demand_register", "transactions",
  "society_dropdown_options", "society_correction_log", "party_category_rules",
];
const allowedOrigins = new Set((Deno.env.get("ALLOWED_ORIGINS") ?? "https://parabs.github.io,http://localhost:3000")
  .split(",").map((value) => value.trim()).filter(Boolean));

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  const originAllowed = !origin || allowedOrigins.has(origin);
  const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
  if (origin && originAllowed) corsHeaders["Access-Control-Allow-Origin"] = origin;
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
  if (!originAllowed) return json({ error: "Origin is not allowed." }, 403);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return json({ error: "Supabase function environment is not fully configured." }, 500);
  const token = req.headers.get("Authorization")?.replace(/^Bearer\\s+/i, "");
  if (!token) return json({ error: "Sign in with Google through Supabase before importing." }, 401);

  const auth = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userResult, error: userError } = await auth.auth.getUser(token);
  if (userError || !userResult.user) return json({ error: "Your Google/Supabase session is invalid or expired. Sign in again." }, 401);

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return json({ error: "Request body must be valid JSON." }, 400); }

  const { data: access, error: accessError } = await auth.rpc("get_my_society_access");
  if (accessError || !Array.isArray(access)) return json({ error: "Could not verify your active society membership." }, 403);
  const eligible = access.filter((item: any) => Array.isArray(item.permissions) && item.permissions.includes("finance.import.manage"));
  const requestedSocietyId = String(body.societyId ?? "");
  const membership = requestedSocietyId
    ? eligible.find((item: any) => item.society_id === requestedSocietyId)
    : eligible.length === 1 ? eligible[0] : null;
  if (!membership) return json({ error: eligible.length > 1 && !requestedSocietyId
    ? "Select the society for this import."
    : "Your account does not have finance.import.manage for this society." }, 403);
  const societyId = String(membership.society_id);
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  try {
    const action = String(body.action ?? "");
    if (action === "status") {
      const { data: active, error: activeError } = await db.from("society_import_batches")
        .select("id,source_file,financial_year,status,row_counts,started_at,created_by")
        .eq("society_id", societyId).eq("status", "Running")
        .order("started_at", { ascending: false }).limit(1).maybeSingle();
      if (activeError) throw activeError;
      const counts: Record<string, number> = {};
      for (const table of ORDER) {
        const { count, error } = await db.from(table).select("*", { count: "exact", head: true }).eq("society_id", societyId);
        if (error) throw new Error(`Could not inspect ${table}: ${error.message}`);
        counts[table] = count ?? 0;
      }
      return json({ success: true, society: membership.display_name, active, counts });
    }

    if (action === "start") {
      const staleBefore = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const { error: staleError } = await db.from("society_import_batches")
        .update({ status: "Failed", error_summary: "Marked stale after 30 minutes without completion.", completed_at: new Date().toISOString() })
        .eq("society_id", societyId).eq("status", "Running").lt("started_at", staleBefore);
      if (staleError) throw staleError;
      const { data: active, error: activeError } = await db.from("society_import_batches")
        .select("id,source_file,started_at").eq("society_id", societyId).eq("status", "Running").limit(1).maybeSingle();
      if (activeError) throw activeError;
      if (active) return json({ error: `Import ${active.id} is already running for this society.`, active }, 409);

      const selected = Array.isArray(body.tables) ? [...new Set(body.tables.map(String))] : [];
      if (!selected.length || selected.some((table: string) => !ORDER.includes(table))) return json({ error: "Select at least one supported table." }, 400);
      const counts = body.rowCounts && typeof body.rowCounts === "object" ? body.rowCounts as Record<string, unknown> : {};
      const rowCounts: Record<string, unknown> = {};
      for (const table of ORDER) if (selected.includes(table)) {
        const n = Number(counts[table]);
        if (!Number.isInteger(n) || n < 0 || n > 5000) return json({ error: `Invalid selected row count for ${table}.` }, 400);
        rowCounts[table] = { attempted: n, succeeded: 0, status: "Pending" };
      }
      const { data: batch, error } = await db.from("society_import_batches").insert({
        society_id: societyId, source_file: String(body.fileName ?? "FY2018 workbook"),
        financial_year: String(body.financialYear ?? "FY 2018-19"), status: "Running",
        row_counts: rowCounts, created_by: userResult.user.id,
      }).select("id,source_file,started_at").single();
      if (error) {
        if (error.code === "23505") return json({ error: "Another import has just started for this society. Refresh status before retrying." }, 409);
        throw error;
      }
      return json({ success: true, societyId, batchId: batch.id, rowCounts });
    }

    if (action === "batch") {
      const batchId = String(body.batchId ?? "");
      const table = String(body.table ?? "");
      const rows = Array.isArray(body.rows) ? body.rows as Record<string, unknown>[] : [];
      if (!batchId || !TABLES[table]) return json({ error: "batchId and a supported table are required." }, 400);
      if (!rows.length || rows.length > 200) return json({ error: "Each request must contain between 1 and 200 records." }, 400);
      const { data: batch, error: batchError } = await db.from("society_import_batches")
        .select("id,status,row_counts").eq("id", batchId).eq("society_id", societyId).single();
      if (batchError || !batch) return json({ error: "Import batch was not found for this society." }, 404);
      if (batch.status !== "Running") return json({ error: `Import batch is ${batch.status}, not Running.` }, 409);
      const progress = batch.row_counts as Record<string, any>;
      if (!Object.hasOwn(progress, table)) return json({ error: `Table ${table} was not selected for this import.` }, 400);
      const nextSucceeded = Number(progress[table].succeeded ?? 0) + rows.length;
      if (nextSucceeded > Number(progress[table].attempted)) return json({ error: `This batch would exceed the planned row count for ${table}; no rows were written.` }, 409);
      for (const [i, row] of rows.entries()) {
        if (!row || typeof row !== "object" || Array.isArray(row)) return json({ error: `${table} row ${i + 1} must be an object.` }, 400);
        const missing = TABLES[table].required.filter((key) => row[key] === null || row[key] === undefined || String(row[key]).trim() === "");
        if (missing.length) return json({ error: `${table} row ${i + 1} is missing required value(s): ${missing.join(", ")}.` }, 400);
      }
      if (table === "transactions") {
        const ids = rows.map((row) => String(row.transaction_id ?? ""));
        if (ids.some((id) => !id) || new Set(ids).size !== ids.length) return json({ error: "Transaction_ID is blank or duplicated in this batch." }, 400);
      }
      const group = rows.map((row) => {
        const normalized: Record<string, unknown> = { ...row, society_id: societyId };
        if (table === "transactions") normalized.bank_verified = String(row.bank_verified ?? "Pending");
        if (["society_dropdown_options", "society_correction_log", "party_category_rules"].includes(table)) normalized.import_batch_id = batchId;
        return normalized;
      });
      const { error: writeError } = await db.from(table).upsert(group, { onConflict: TABLES[table].conflict });
      if (writeError) return json({ error: `Write failed for ${table}: ${writeError.message}` }, 400);
      progress[table] = { ...progress[table], succeeded: nextSucceeded, status: nextSucceeded === Number(progress[table].attempted) ? "Completed" : "Running" };
      const { data: updated, error: updateError } = await db.from("society_import_batches")
        .update({ row_counts: progress }).eq("id", batchId).eq("society_id", societyId).eq("status", "Running")
        .select("id").maybeSingle();
      if (updateError) throw updateError;
      if (!updated) return json({ error: "Import batch changed state during this request; inspect status before retrying." }, 409);
      return json({ success: true, societyId, batchId, table, attempted: Number(progress[table].attempted), succeeded: nextSucceeded, status: progress[table].status });
    }

    if (action === "finish") {
      const batchId = String(body.batchId ?? "");
      const requestedSuccess = body.success === true;
      const { data: batch, error } = await db.from("society_import_batches")
        .select("id,status,row_counts").eq("id", batchId).eq("society_id", societyId).single();
      if (error || !batch) return json({ error: "Import batch was not found for this society." }, 404);
      if (batch.status !== "Running") return json({ error: `Import batch is already ${batch.status}.` }, 409);
      const counts = batch.row_counts as Record<string, any>;
      const incomplete = Object.entries(counts).filter(([, value]) => Number((value as any).succeeded) !== Number((value as any).attempted));
      const success = requestedSuccess && incomplete.length === 0;
      const { data: updated, error: updateError } = await db.from("society_import_batches")
        .update({
          status: success ? "Completed" : "Failed",
          error_summary: success ? null : String(body.error ?? (incomplete.length ? `Incomplete tables: ${incomplete.map(([name]) => name).join(", ")}` : "Import stopped after an error.")),
          row_counts: counts, completed_at: new Date().toISOString(),
        }).eq("id", batchId).eq("society_id", societyId).eq("status", "Running")
        .select("id").maybeSingle();
      if (updateError) throw updateError;
      if (!updated) return json({ error: "Import batch changed state before it could be finished." }, 409);
      return json({ success, status: success ? "Completed" : "Failed", societyId, rowCounts: counts });
    }
    return json({ error: "Unsupported action. Use status, start, batch, or finish." }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
