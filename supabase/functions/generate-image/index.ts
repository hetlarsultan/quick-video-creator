import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, style } = await req.json();

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "يرجى تقديم وصف صالح" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build a clean prompt - style is already embedded in the prompt from client
    const finalPrompt = style && !prompt.toLowerCase().includes(style.toLowerCase())
      ? `${prompt}. Art style: ${style}`
      : prompt;

    console.log("Generating image with prompt:", finalPrompt);

    // Try with flash-image first, fallback to pro if safety blocked
    const models = ["google/gemini-2.5-flash-image", "google/gemini-3.1-flash-image-preview"];
    
    for (const model of models) {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "user",
              content: finalPrompt,
            },
          ],
          modalities: ["image", "text"],
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: "تم تجاوز حد الطلبات، حاول مرة أخرى لاحقاً" }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: "يرجى إضافة رصيد لحساب Lovable AI" }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const errorText = await response.text();
        console.error(`AI Gateway error (${model}):`, response.status, errorText);
        continue; // Try next model
      }

      const data = await response.json();
      const finishReason = data.choices?.[0]?.native_finish_reason || data.choices?.[0]?.finish_reason;
      const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      const textResponse = data.choices?.[0]?.message?.content || "";

      // If blocked by safety, try next model
      if (finishReason === "IMAGE_SAFETY" || !imageUrl) {
        console.log(`Model ${model} blocked (${finishReason}), trying next...`);
        continue;
      }

      return new Response(
        JSON.stringify({ imageUrl, description: textResponse }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // All models failed - return friendly error
    return new Response(
      JSON.stringify({ error: "تعذر إنتاج الصورة. جرّب وصفاً مختلفاً أو أبسط." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-image error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "خطأ غير معروف" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
