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

    const systemPrompt = `You are a creative AI director for animated video production. Given a user's video description, analyze it and return a JSON object with:

1. "character": The best character type. One of: "realistic", "cartoon", "fantasy", "none"

2. "environment": The best background/environment. One of: "animated-nature", "night-city", "space", "underwater", "desert", "forest", "indoor", "school", "park"

3. "scenes": An array of ${sceneCount || 4} scene objects. Each scene object has:
   - "description": Detailed image generation prompt for this scene moment
   - "action": The character action type. One of: "idle", "talking", "walking", "running", "fighting", "chasing", "emotional", "dramatic"
   - "camera": Camera movement. One of: "static", "pan-left", "pan-right", "zoom-in", "zoom-out", "shake", "dolly", "tilt-up", "tilt-down"
   - "intensity": Action intensity from 0.0 to 1.0 (0.3=calm, 0.7=energetic, 1.0=extreme)
   - "characterDirection": Which way the character faces/moves. One of: "left", "right", "center"

   Rules for scenes:
   - Progress like a real film: establishing → action → climax → resolution
   - Match action to what's happening (running=running, fight=fighting, dialog=talking)
   - Use camera shake for impacts, zoom-in for drama, pan for movement
   - Vary intensity: start moderate, peak at climax, resolve

4. "narrationText": A short Arabic narration script (2-3 sentences) telling the story.

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
          JSON.stringify({ error: "تم تجاوز حد الطلبات، حاول لاحقاً", fallback: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "يرجى إضافة رصيد", fallback: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    let parsed;
    try {
      const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response:", content);
      parsed = {
        character: "cartoon",
        environment: "animated-nature",
        scenes: [
          { description: `Opening shot: ${prompt}, wide angle, dramatic lighting`, action: "idle", camera: "zoom-in", intensity: 0.4, characterDirection: "center" },
          { description: `Action scene: ${prompt}, dynamic movement`, action: "walking", camera: "pan-right", intensity: 0.6, characterDirection: "right" },
          { description: `Dramatic moment: ${prompt}, close-up, cinematic`, action: "dramatic", camera: "dolly", intensity: 0.8, characterDirection: "center" },
          { description: `Final scene: ${prompt}, warm resolution`, action: "idle", camera: "zoom-out", intensity: 0.3, characterDirection: "center" },
        ],
        narrationText: prompt,
      };
    }

    // Normalize scenes to ensure they have motion data
    if (parsed.scenes && Array.isArray(parsed.scenes)) {
      parsed.scenes = parsed.scenes.map((s: any, i: number) => {
        if (typeof s === 'string') {
          // Old format: just a string description
          const actions = ['idle', 'talking', 'dramatic', 'idle'];
          const cameras = ['zoom-in', 'pan-right', 'dolly', 'zoom-out'];
          return {
            description: s,
            action: actions[i % actions.length],
            camera: cameras[i % cameras.length],
            intensity: 0.3 + (i / parsed.scenes.length) * 0.5,
            characterDirection: 'center',
          };
        }
        return {
          description: s.description || s,
          action: s.action || 'idle',
          camera: s.camera || 'static',
          intensity: s.intensity ?? 0.5,
          characterDirection: s.characterDirection || 'center',
        };
      });
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
