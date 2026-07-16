import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { checkRateLimit, logCall, requireAuth } from "../_shared";

export default defineTool({
  name: "generate_scene_image",
  title: "Generate scene image",
  description:
    "Generate a single scene image via Lovable AI (Gemini image models). Returns a data URL for the produced image.",
  inputSchema: {
    prompt: z.string().min(1).describe("Image description."),
    style: z.string().optional().describe("Optional art style, e.g. 'cinematic', 'cartoon'."),
  },
  annotations: { readOnlyHint: true, idempotentHint: false, openWorldHint: true },
  handler: async ({ prompt, style }, ctx) => {
    const started = Date.now();
    const auth = requireAuth(ctx);
    if ("error" in auth) {
      return { content: [{ type: "text", text: auth.error }], isError: true };
    }
    const rl = await checkRateLimit(auth.userId, "generate_scene_image");
    if (rl) {
      await logCall({ userId: auth.userId, clientId: auth.clientId, toolName: "generate_scene_image", status: "rate_limited", durationMs: Date.now() - started, error: rl, input: { prompt, style } });
      return { content: [{ type: "text", text: rl }], isError: true };
    }
    const key = process.env.LOVABLE_API_KEY;
    if (!key) {
      await logCall({ userId: auth.userId, clientId: auth.clientId, toolName: "generate_scene_image", status: "error", durationMs: Date.now() - started, error: "missing LOVABLE_API_KEY", input: { prompt, style } });
      return {
        content: [{ type: "text", text: "LOVABLE_API_KEY is not configured on the server." }],
        isError: true,
      };
    }
    const finalPrompt =
      style && !prompt.toLowerCase().includes(style.toLowerCase())
        ? `${prompt}. Art style: ${style}`
        : prompt;

    const models = [
      "google/gemini-3-pro-image-preview",
      "google/gemini-3.1-flash-image-preview",
      "google/gemini-2.5-flash-image",
    ];

    for (const model of models) {
      try {
        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: finalPrompt }],
            modalities: ["image", "text"],
          }),
        });
        if (!res.ok) continue;
        const data = await res.json();
        const finishReason =
          data.choices?.[0]?.native_finish_reason || data.choices?.[0]?.finish_reason;
        const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        if (finishReason === "IMAGE_SAFETY" || !imageUrl) continue;
        await logCall({ userId: auth.userId, clientId: auth.clientId, toolName: "generate_scene_image", status: "success", durationMs: Date.now() - started, input: { prompt, style, model } });
        return {
          content: [{ type: "text", text: imageUrl }],
          structuredContent: { imageUrl, model },
        };
      } catch {
        continue;
      }
    }
    await logCall({ userId: auth.userId, clientId: auth.clientId, toolName: "generate_scene_image", status: "error", durationMs: Date.now() - started, error: "all image models failed", input: { prompt, style } });
    return {
      content: [{ type: "text", text: "Could not generate image. Try a different prompt." }],
      isError: true,
    };
  },
});