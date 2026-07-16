import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

function safeNext(next: string | null): string {
  if (!next) return "/";
  if (!next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

export default function LoginPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = safeNext(params.get("next"));
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate(next, { replace: true });
    });
  }, [navigate, next]);

  const returnUrl = `${window.location.origin}${next}`;

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: returnUrl },
        });
        if (error) throw error;
        toast.success("تم إنشاء الحساب");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate(next, { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطأ في المصادقة");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: returnUrl });
    if (result.error) {
      toast.error("فشل تسجيل الدخول عبر Google");
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    navigate(next, { replace: true });
  }

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center p-6 pb-24">
      <Card className="w-full max-w-md p-6 space-y-5">
        <div className="text-center">
          <h1 className="text-2xl font-bold">{mode === "signin" ? "تسجيل الدخول" : "إنشاء حساب"}</h1>
          <p className="text-sm text-muted-foreground mt-1">مطلوب لاستخدام أدوات MCP</p>
        </div>
        <Button type="button" variant="outline" className="w-full" disabled={busy} onClick={handleGoogle}>
          متابعة عبر Google
        </Button>
        <div className="text-center text-xs text-muted-foreground">أو</div>
        <form onSubmit={handleEmail} className="space-y-3">
          <Input type="email" placeholder="البريد" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input type="password" placeholder="كلمة المرور" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          <Button type="submit" className="w-full" disabled={busy}>
            {mode === "signin" ? "دخول" : "تسجيل"}
          </Button>
        </form>
        <button
          className="w-full text-sm text-primary underline"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "ليس لدي حساب — إنشاء حساب" : "لدي حساب — تسجيل الدخول"}
        </button>
      </Card>
    </div>
  );
}