import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

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
  handler: async ({ prompt, style }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) {
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
        return {
          content: [{ type: "text", text: imageUrl }],
          structuredContent: { imageUrl, model },
        };
      } catch {
        continue;
      }
    }
    return {
      content: [{ type: "text", text: "Could not generate image. Try a different prompt." }],
      isError: true,
    };
  },
});