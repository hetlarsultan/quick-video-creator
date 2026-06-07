import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
const VEO_MODEL = "veo-3.0-fast-generate-preview";
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 3;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { prompt, aspectRatio, durationSec, clientId } = await req.json();
    if (!prompt) {
      return new Response(JSON.stringify({ error: "وصف مطلوب" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const KEY = Deno.env.get("GEMINI_API_KEY");
    if (!KEY) {
      return new Response(JSON.stringify({ error: "no_key", fallback: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 🚦 Server-side rate limit (per client) via Supabase
    const SUPA_URL = Deno.env.get("SUPABASE_URL");
    const SRV_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (clientId && SUPA_URL && SRV_KEY) {
      try {
        const admin = createClient(SUPA_URL, SRV_KEY);
        const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
        const { count } = await admin
          .from("veo_rate_limits")
          .select("id", { count: "exact", head: true })
          .eq("client_id", clientId)
          .gte("started_at", since);
        if ((count ?? 0) >= RATE_MAX) {
          return new Response(
            JSON.stringify({ error: "rate_limited", retryInMs: RATE_WINDOW_MS }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        await admin.from("veo_rate_limits").insert({ client_id: clientId });
        // best-effort cleanup of old rows for this client
        admin.from("veo_rate_limits").delete().eq("client_id", clientId).lt("started_at", since).then(() => {});
      } catch (e) {
        console.warn("rate limit check failed", e);
      }
    }

    const res = await fetch(`${GEMINI_BASE}/models/${VEO_MODEL}:predictLongRunning?key=${KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          aspectRatio: aspectRatio || "16:9",
          durationSeconds: Math.max(4, Math.min(8, durationSec || 8)),
          personGeneration: "allow_all",
        },
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      console.error("veo-start:", res.status, t);
      return new Response(JSON.stringify({ error: "start_failed", fallback: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const json = await res.json();
    return new Response(JSON.stringify({ operationName: json.name }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e), fallback: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});