import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
// Veo 3.0 fast preview — best speed/quality trade-off available in Gemini API
const VEO_MODEL = "veo-3.0-fast-generate-preview";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, aspectRatio, durationSec } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return new Response(
        JSON.stringify({ error: "يرجى تقديم وصف صالح" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY غير مهيأ", fallback: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Submit long-running generation
    const startRes = await fetch(
      `${GEMINI_BASE}/models/${VEO_MODEL}:predictLongRunning?key=${GEMINI_API_KEY}`,
      {
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
      }
    );

    if (!startRes.ok) {
      const t = await startRes.text();
      console.error("Veo start error:", startRes.status, t);
      return new Response(
        JSON.stringify({ error: "تعذر بدء إنتاج الفيديو", fallback: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const startJson = await startRes.json();
    const opName: string = startJson.name;
    if (!opName) {
      return new Response(
        JSON.stringify({ error: "لم يتم استلام معرّف العملية", fallback: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Poll for completion (max ~140s to stay below edge timeout)
    const deadline = Date.now() + 140_000;
    let done = false;
    let videoUri: string | null = null;
    let mimeType = "video/mp4";

    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 5000));
      const pollRes = await fetch(
        `${GEMINI_BASE}/${opName}?key=${GEMINI_API_KEY}`,
        { method: "GET" }
      );
      if (!pollRes.ok) continue;
      const pollJson = await pollRes.json();
      if (pollJson.done) {
        done = true;
        const samples =
          pollJson.response?.generateVideoResponse?.generatedSamples ||
          pollJson.response?.videos ||
          [];
        const sample = samples[0];
        videoUri =
          sample?.video?.uri ||
          sample?.uri ||
          pollJson.response?.generatedSamples?.[0]?.video?.uri ||
          null;
        mimeType = sample?.video?.mimeType || sample?.mimeType || "video/mp4";
        break;
      }
    }

    if (!done) {
      return new Response(
        JSON.stringify({ error: "انتهت مهلة إنتاج الفيديو، حاول مجدداً", fallback: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!videoUri) {
      return new Response(
        JSON.stringify({ error: "لم يُرجِع Veo فيديو", fallback: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Download the video bytes (Gemini requires API key on the URI)
    const sep = videoUri.includes("?") ? "&" : "?";
    const dl = await fetch(`${videoUri}${sep}key=${GEMINI_API_KEY}`);
    if (!dl.ok) {
      const t = await dl.text();
      console.error("Veo download error:", dl.status, t);
      return new Response(
        JSON.stringify({ error: "تعذر تنزيل الفيديو", fallback: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const buf = new Uint8Array(await dl.arrayBuffer());
    // Base64 encode in chunks to avoid call-stack issues
    let binary = "";
    const CHUNK = 0x8000;
    for (let i = 0; i < buf.length; i += CHUNK) {
      binary += String.fromCharCode(...buf.subarray(i, i + CHUNK));
    }
    const b64 = btoa(binary);
    const dataUrl = `data:${mimeType};base64,${b64}`;

    return new Response(
      JSON.stringify({ videoUrl: dataUrl, mimeType }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-video-veo error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "خطأ غير معروف", fallback: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});