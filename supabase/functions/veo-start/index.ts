import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
const VEO_MODEL = "veo-3.0-fast-generate-preview";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { prompt, aspectRatio, durationSec } = await req.json();
    if (!prompt) {
      return new Response(JSON.stringify({ error: "وصف مطلوب" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const KEY = Deno.env.get("GEMINI_API_KEY");
    if (!KEY) {
      return new Response(JSON.stringify({ error: "no_key", fallback: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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