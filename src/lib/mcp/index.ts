import { defineMcp } from "@lovable.dev/mcp-js";
import analyzePromptTool from "./tools/analyze-prompt";
import generateImageTool from "./tools/generate-image";

export default defineMcp({
  name: "agon-video-mcp",
  title: "Agon Video Studio MCP",
  version: "0.1.0",
  instructions:
    "Tools for the Agon animated video studio. Use `analyze_video_prompt` to plan a scene-by-scene shot list from a description, and `generate_scene_image` to render an individual scene image.",
  tools: [analyzePromptTool, generateImageTool],
});