import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getClientId } from '@/lib/ai';

interface VeoEventRow {
  id: number;
  kind: string;
  project_id: string | null;
  payload: any;
  created_at: string;
}

const KIND_LABEL: Record<string, string> = {
  start: '🚀 بدء',
  stage: '⚙️ مرحلة',
  success: '✅ نجاح',
  cancel: '⏹️ إلغاء',
  timeout: '⏱️ انتهاء مهلة',
  fallback: '🛟 وضع آمن',
  resume: '🔁 استئناف',
  rate_limited: '🚦 حد الطلبات',
  error: '⚠️ خطأ',
};

export default function LogsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<VeoEventRow[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      let q = supabase
        .from('veo_events')
        .select('id,kind,project_id,payload,created_at')
        .eq('client_id', getClientId())
        .order('created_at', { ascending: false })
        .limit(100);
      if (filter !== 'all') q = q.eq('kind', filter);
      const { data } = await q;
      setRows((data as VeoEventRow[]) || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter]);

  return (
    <div className="px-5 pb-24 pt-8">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowRight className="h-4 w-4" /> رجوع
        </button>
        <button onClick={load} className="p-2 rounded-xl hover:bg-accent" aria-label="تحديث">
          <RefreshCw className={`h-4 w-4 text-primary ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      <h1 className="text-2xl font-black text-foreground">📜 سجل أحداث Veo</h1>
      <p className="mt-1 text-sm text-muted-foreground">آخر 100 حدث لهذا الجهاز.</p>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {['all', ...Object.keys(KIND_LABEL)].map(k => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
              filter === k ? 'gradient-primary text-primary-foreground' : 'bg-card text-foreground border border-border hover:bg-accent'
            }`}
          >
            {k === 'all' ? '🔎 الكل' : KIND_LABEL[k] || k}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        {rows.length === 0 && !loading && (
          <div className="text-center py-8 rounded-xl bg-card border border-border">
            <span className="text-3xl block mb-2">🗂️</span>
            <p className="text-sm text-muted-foreground">لا توجد أحداث بعد.</p>
          </div>
        )}
        {rows.map(r => (
          <div key={r.id} className="rounded-xl bg-card border border-border p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-foreground">{KIND_LABEL[r.kind] || r.kind}</span>
              <span className="text-[11px] text-muted-foreground">
                {new Date(r.created_at).toLocaleString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit' })}
              </span>
            </div>
            {r.payload && Object.keys(r.payload).length > 0 && (
              <pre className="mt-1 text-[11px] text-muted-foreground whitespace-pre-wrap break-all bg-secondary/50 rounded p-2 max-h-32 overflow-auto">
                {JSON.stringify(r.payload, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}