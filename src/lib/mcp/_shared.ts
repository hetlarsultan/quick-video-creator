import { createClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";

const RATE_LIMIT_PER_MIN = 20;

function admin() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function checkRateLimit(userId: string, toolName: string): Promise<string | null> {
  const db = admin();
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count, error } = await db
    .from("mcp_rate_limits")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("tool_name", toolName)
    .gte("called_at", since);
  if (error) return null;
  if ((count ?? 0) >= RATE_LIMIT_PER_MIN) {
    return `Rate limit exceeded: max ${RATE_LIMIT_PER_MIN} calls/min for ${toolName}. Try again shortly.`;
  }
  await db.from("mcp_rate_limits").insert({ user_id: userId, tool_name: toolName });
  return null;
}

export async function logCall(params: {
  userId: string;
  clientId?: string;
  toolName: string;
  status: "success" | "error" | "rate_limited";
  durationMs: number;
  error?: string;
  input: Record<string, unknown>;
}) {
  try {
    await admin().from("mcp_call_logs").insert({
      user_id: params.userId,
      client_id: params.clientId ?? null,
      tool_name: params.toolName,
      status: params.status,
      duration_ms: params.durationMs,
      error: params.error ?? null,
      input: params.input,
    });
  } catch {
    /* silent */
  }
}

export function requireAuth(ctx: ToolContext) {
  if (!ctx.isAuthenticated()) {
    return { error: "Authentication required. Sign in to use this tool." };
  }
  return { userId: ctx.getUserId()!, clientId: ctx.getClientId() };
}