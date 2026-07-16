import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "analyze_video_prompt",
  title: "Analyze video prompt",
  description:
    "Analyze an Arabic or English video description and return a scene-by-scene shot plan (character, environment, camera moves, actions, narration) suitable for animated video production.",
  inputSchema: {
    prompt: z.string().min(1).describe("The video description to analyze."),
    sceneCount: z.number().int().min(1).max(8).default(4).describe("Number of scenes to plan."),
    type: z
      .enum(["text-to-video", "image-to-video"])
      .default("text-to-video")
      .describe("Kind of video generation."),
  },
  annotations: { readOnlyHint: true, idempotentHint: false, openWorldHint: true },
  handler: async ({ prompt, sceneCount, type }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) {
      return {
        content: [{ type: "text", text: "LOVABLE_API_KEY is not configured on the server." }],
        isError: true,
      };
    }

    const systemPrompt = `You are a creative AI director for animated video production. Given a user's video description, return a JSON object with:
1. "character": one of "realistic", "cartoon", "fantasy", "none".
2. "environment": one of "animated-nature", "night-city", "space", "underwater", "desert", "forest", "indoor", "school", "park".
3. "scenes": array of ${sceneCount} objects each with description, action (idle|talking|walking|running|fighting|chasing|emotional|dramatic|dancing), camera (static|pan-left|pan-right|zoom-in|zoom-out|shake|dolly|tilt-up|tilt-down|beat-pulse), intensity 0..1, characterDirection (left|right|center).
4. "narrationText": short Arabic narration (2-3 sentences).
Return ONLY valid JSON, no markdown.`;

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Video description: "${prompt}"\nVideo type: ${type}` },
          ],
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        return {
          content: [{ type: "text", text: `AI gateway error ${res.status}: ${t}` }],
          isError: true,
        };
      }
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content ?? "";
      const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      let parsed: unknown;
      try {
        parsed = JSON.parse(jsonStr);
      } catch {
        return {
          content: [{ type: "text", text: content }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(parsed, null, 2) }],
        structuredContent: parsed as Record<string, unknown>,
      };
    } catch (e) {
      return {
        content: [{ type: "text", text: e instanceof Error ? e.message : "Unknown error" }],
        isError: true,
      };
    }
  },
});