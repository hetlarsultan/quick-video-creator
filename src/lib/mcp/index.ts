import { auth, defineMcp } from "@lovable.dev/mcp-js";
import analyzePromptTool from "./tools/analyze-prompt";
import generateImageTool from "./tools/generate-image";
import buildScenePlanTool from "./tools/build-scene-plan";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "agon-video-mcp",
  title: "Agon Video Studio MCP",
  version: "0.2.0",
  instructions:
    "Tools for the Agon animated video studio. Use `analyze_video_prompt` to plan a shot list, `build_scene_plan` to turn that plan into a validated execution-ready JSON, and `generate_scene_image` to render an individual scene image. All tools require the caller to sign in via OAuth.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [analyzePromptTool, buildScenePlanTool, generateImageTool],
});