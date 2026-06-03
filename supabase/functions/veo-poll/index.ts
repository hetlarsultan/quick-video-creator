import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { operationName } = await req.json();
    if (!operationName) {
      return new Response(JSON.stringify({ error: "operationName مطلوب" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const KEY = Deno.env.get("GEMINI_API_KEY");
    if (!KEY) {
      return new Response(JSON.stringify({ error: "no_key", fallback: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const res = await fetch(`${GEMINI_BASE}/${operationName}?key=${KEY}`);
    if (!res.ok) {
      return new Response(JSON.stringify({ done: false, stage: "queued" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const json = await res.json();
    if (!json.done) {
      // Try to derive a dynamic stage label from metadata if Gemini exposes it
      const meta = json.metadata || {};
      const state = meta.state || meta.status || "RUNNING";
      const progressPct = typeof meta.progressPercent === "number" ? meta.progressPercent : null;
      let stage = "جاري التوليد…";
      const s = String(state).toUpperCase();
      if (s.includes("PENDING") || s.includes("QUEUE")) stage = "في الطابور…";
      else if (s.includes("PROCESS") || s.includes("RUNNING")) stage = "Veo يولّد الإطارات…";
      else if (s.includes("ENCOD") || s.includes("FINALIZ")) stage = "الترميز والإنهاء…";
      return new Response(JSON.stringify({ done: false, stage, state: s, progressPct }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    // Done — extract video URI and download
    const samples =
      json.response?.generateVideoResponse?.generatedSamples ||
      json.response?.videos ||
      json.response?.generatedSamples ||
      [];
    const sample = samples[0];
    const uri =
      sample?.video?.uri ||
      sample?.uri ||
      null;
    const mimeType = sample?.video?.mimeType || sample?.mimeType || "video/mp4";
    if (!uri) {
      return new Response(JSON.stringify({ done: true, error: "no_video", fallback: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const sep = uri.includes("?") ? "&" : "?";
    const dl = await fetch(`${uri}${sep}key=${KEY}`);
    if (!dl.ok) {
      return new Response(JSON.stringify({ done: true, error: "download_failed", fallback: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const buf = new Uint8Array(await dl.arrayBuffer());
    let bin = "";
    const CHUNK = 0x8000;
    for (let i = 0; i < buf.length; i += CHUNK) bin += String.fromCharCode(...buf.subarray(i, i + CHUNK));
    const dataUrl = `data:${mimeType};base64,${btoa(bin)}`;
    return new Response(JSON.stringify({ done: true, videoUrl: dataUrl, mimeType }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ done: false, error: String(e), fallback: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});