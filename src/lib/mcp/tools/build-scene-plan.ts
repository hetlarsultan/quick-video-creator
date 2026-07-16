import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { checkRateLimit, logCall, requireAuth } from "../_shared";

const ACTIONS = ["idle","talking","walking","running","fighting","chasing","emotional","dramatic","dancing"] as const;
const CAMERAS = ["static","pan-left","pan-right","zoom-in","zoom-out","shake","dolly","tilt-up","tilt-down","beat-pulse"] as const;

const sceneSchema = z.object({
  description: z.string().default(""),
  action: z.string().default("idle"),
  camera: z.string().default("static"),
  intensity: z.number().min(0).max(1).default(0.5),
  characterDirection: z.enum(["left","right","center"]).default("center"),
});

const analyzeSchema = z.object({
  character: z.enum(["realistic","cartoon","fantasy","none"]).default("cartoon"),
  environment: z.string().default("animated-nature"),
  scenes: z.array(sceneSchema).min(1),
  narrationText: z.string().default(""),
});

export default defineTool({
  name: "build_scene_plan",
  title: "Build executable scene plan",
  description:
    "Convert the raw output of `analyze_video_prompt` into a normalized, execution-ready JSON scene plan (validated actions, cameras, per-scene durations, cumulative timing, and a full render manifest).",
  inputSchema: {
    analysis: z.record(z.string(), z.any()).describe("The structuredContent returned by analyze_video_prompt."),
    fps: z.number().int().min(12).max(60).default(30),
    secondsPerScene: z.number().min(1).max(20).default(4),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ analysis, fps, secondsPerScene }, ctx) => {
    const started = Date.now();
    const auth = requireAuth(ctx);
    if ("error" in auth) return { content: [{ type: "text", text: auth.error }], isError: true };
    const rl = await checkRateLimit(auth.userId, "build_scene_plan");
    if (rl) {
      await logCall({ userId: auth.userId, clientId: auth.clientId, toolName: "build_scene_plan", status: "rate_limited", durationMs: Date.now() - started, error: rl, input: { fps, secondsPerScene } });
      return { content: [{ type: "text", text: rl }], isError: true };
    }
    const parsed = analyzeSchema.safeParse(analysis);
    if (!parsed.success) {
      await logCall({ userId: auth.userId, clientId: auth.clientId, toolName: "build_scene_plan", status: "error", durationMs: Date.now() - started, error: "invalid analysis input", input: { fps, secondsPerScene } });
      return { content: [{ type: "text", text: "Invalid analysis payload: " + parsed.error.message }], isError: true };
    }
    const a = parsed.data;
    let cursor = 0;
    const scenes = a.scenes.map((s, i) => {
      const action = (ACTIONS as readonly string[]).includes(s.action) ? s.action : "idle";
      const camera = (CAMERAS as readonly string[]).includes(s.camera) ? s.camera : "static";
      const durationMs = Math.round(secondsPerScene * 1000);
      const scene = {
        index: i,
        description: s.description.trim(),
        action,
        camera,
        intensity: s.intensity,
        characterDirection: s.characterDirection,
        startMs: cursor,
        endMs: cursor + durationMs,
        durationMs,
        frames: Math.round(secondsPerScene * fps),
        imagePrompt: `${s.description}. Character: ${a.character}. Environment: ${a.environment}. Cinematic.`,
      };
      cursor += durationMs;
      return scene;
    });
    const plan = {
      version: 1,
      character: a.character,
      environment: a.environment,
      narrationText: a.narrationText,
      fps,
      totalDurationMs: cursor,
      sceneCount: scenes.length,
      scenes,
    };
    await logCall({ userId: auth.userId, clientId: auth.clientId, toolName: "build_scene_plan", status: "success", durationMs: Date.now() - started, input: { fps, secondsPerScene, sceneCount: scenes.length } });
    return {
      content: [{ type: "text", text: JSON.stringify(plan, null, 2) }],
      structuredContent: plan,
    };
  },
});