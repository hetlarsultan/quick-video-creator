import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Details = {
  client?: { name?: string; redirect_uri?: string };
  scope?: string;
  scopes?: string[];
  redirect_url?: string;
  redirect_to?: string;
};

// Beta namespace typing shim
const authOauth = () =>
  (supabase.auth as unknown as {
    oauth: {
      getAuthorizationDetails: (id: string) => Promise<{ data: Details | null; error: { message: string } | null }>;
      approveAuthorization: (id: string) => Promise<{ data: Details | null; error: { message: string } | null }>;
      denyAuthorization: (id: string) => Promise<{ data: Details | null; error: { message: string } | null }>;
    };
  }).oauth;

export default function OAuthConsentPage() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<Details | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError("Missing authorization_id");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/login?next=" + encodeURIComponent(next);
        return;
      }
      try {
        const { data, error } = await authOauth().getAuthorizationDetails(authorizationId);
        if (!active) return;
        if (error) return setError(error.message);
        const immediate = data?.redirect_url ?? data?.redirect_to;
        if (immediate && !data?.client) {
          window.location.href = immediate;
          return;
        }
        setDetails(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to load authorization");
      }
    })();
    return () => { active = false; };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    try {
      const { data, error } = approve
        ? await authOauth().approveAuthorization(authorizationId)
        : await authOauth().denyAuthorization(authorizationId);
      if (error) { setBusy(false); return setError(error.message); }
      const target = data?.redirect_url ?? data?.redirect_to;
      if (!target) { setBusy(false); return setError("No redirect returned by authorization server."); }
      window.location.href = target;
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : "Authorization failed");
    }
  }

  if (error) return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center p-6">
      <Card className="max-w-md p-6"><p className="text-destructive">{error}</p></Card>
    </div>
  );
  if (!details) return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center p-6">
      <Card className="max-w-md p-6">جارٍ التحميل…</Card>
    </div>
  );

  const clientName = details.client?.name ?? "تطبيق خارجي";
  const scopes = details.scopes ?? (details.scope ? details.scope.split(" ") : []);

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center p-6 pb-24">
      <Card className="w-full max-w-md p-6 space-y-4">
        <h1 className="text-xl font-bold">ربط {clientName} بحسابك</h1>
        <p className="text-sm text-muted-foreground">
          يستطيع {clientName} استدعاء أدوات هذا التطبيق نيابةً عنك أثناء تسجيل الدخول.
        </p>
        {details.client?.redirect_uri && (
          <p className="text-xs text-muted-foreground break-all">
            سيعود إلى: {details.client.redirect_uri}
          </p>
        )}
        {scopes.length > 0 && (
          <ul className="text-sm list-disc pr-5 space-y-1">
            {scopes.map((s) => <li key={s}>{s}</li>)}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">
          لا يتخطى هذا صلاحيات التطبيق أو سياسات الأمان الخاصة به.
        </p>
        <div className="flex gap-2">
          <Button disabled={busy} onClick={() => decide(true)} className="flex-1">موافقة</Button>
          <Button disabled={busy} variant="outline" onClick={() => decide(false)} className="flex-1">إلغاء</Button>
        </div>
      </Card>
    </div>
  );
}