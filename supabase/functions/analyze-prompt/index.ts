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
    const { prompt, type, sceneCount } = await req.json();

    if (!prompt || typeof prompt !== "string") {
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

    const systemPrompt = `You are a creative AI director for video production. Given a user's video description, analyze it and return a JSON object with:

1. "character": The best character type. One of: "realistic", "cartoon", "fantasy", "none"
   - Use "realistic" for real-world scenarios, people, animals
   - Use "cartoon" for fun, kids, cute, or animated content  
   - Use "fantasy" for magical, sci-fi, mythical content
   - Use "none" for landscapes, abstract, or no-character scenes

2. "environment": The best background/environment. One of: "animated-nature", "night-city", "space", "underwater", "desert", "forest", "indoor", "school", "park"

3. "scenes": An array of ${sceneCount || 4} scene descriptions for image generation. Each scene should:
   - Show a DIFFERENT moment/action/angle progressing the story
   - Include the character description matching the chosen type
   - Include the environment/background details
   - Be detailed enough for AI image generation
   - Progress like a real film: establishing shot → action → climax → resolution

4. "narrationText": A short Arabic narration script (2-3 sentences) that tells the story of the video, suitable for text-to-speech.

Return ONLY valid JSON, no markdown.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Video description: "${prompt}"\nVideo type: ${type || "text-to-video"}` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "تم تجاوز حد الطلبات، حاول لاحقاً" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "يرجى إضافة رصيد" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "خطأ في التحليل" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse JSON from response (handle markdown code blocks)
    let parsed;
    try {
      const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response:", content);
      // Return sensible defaults
      parsed = {
        character: "cartoon",
        environment: "animated-nature",
        scenes: [
          `Opening shot: ${prompt}, wide angle, dramatic lighting`,
          `Action scene: ${prompt}, dynamic movement, close angle`,
          `Dramatic moment: ${prompt}, detailed close-up, cinematic`,
          `Final scene: ${prompt}, warm resolution, golden hour`,
        ],
        narrationText: prompt,
      };
    }

    return new Response(
      JSON.stringify(parsed),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("analyze-prompt error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "خطأ غير معروف" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
