import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Row = {
  id: number;
  tool_name: string;
  status: string;
  duration_ms: number | null;
  error: string | null;
  created_at: string;
  input: Record<string, unknown>;
};

export default function MCPLogsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);

  async function load() {
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) { setAuthed(false); return; }
    setAuthed(true);
    const { data } = await supabase
      .from("mcp_call_logs")
      .select("id,tool_name,status,duration_ms,error,created_at,input")
      .order("created_at", { ascending: false })
      .limit(100);
    setRows((data as Row[]) ?? []);
  }

  useEffect(() => { load(); }, []);

  if (authed === false) {
    return (
      <div dir="rtl" className="p-6 pb-24">
        <Card className="p-6 space-y-3">
          <p>سجّل الدخول لعرض سجل استدعاءات MCP الخاص بك.</p>
          <Button onClick={() => navigate("/login?next=/mcp-logs")}>تسجيل الدخول</Button>
        </Card>
      </div>
    );
  }

  return (
    <div dir="rtl" className="p-4 pb-24 space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">سجل استدعاءات MCP</h1>
        <Button size="sm" variant="outline" onClick={load}>تحديث</Button>
      </div>
      {rows === null && <p className="text-sm text-muted-foreground">جارٍ التحميل…</p>}
      {rows && rows.length === 0 && (
        <Card className="p-4 text-sm text-muted-foreground">لا توجد استدعاءات بعد.</Card>
      )}
      {rows?.map((r) => (
        <Card key={r.id} className="p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="font-mono text-sm">{r.tool_name}</div>
            <Badge
              variant={r.status === "success" ? "default" : r.status === "rate_limited" ? "secondary" : "destructive"}
            >
              {r.status}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground flex justify-between">
            <span>{new Date(r.created_at).toLocaleString("ar")}</span>
            <span>{r.duration_ms ?? "—"} ms</span>
          </div>
          {r.error && <div className="text-xs text-destructive break-words">{r.error}</div>}
          {r.input && Object.keys(r.input).length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground">المدخلات</summary>
              <pre className="mt-1 whitespace-pre-wrap break-all bg-muted p-2 rounded">
                {JSON.stringify(r.input, null, 2)}
              </pre>
            </details>
          )}
        </Card>
      ))}
    </div>
  );
}