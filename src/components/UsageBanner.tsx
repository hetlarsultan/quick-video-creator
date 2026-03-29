import { getRemainingSeconds, formatTime, MAX_FREE_MINUTES, getUsedSeconds } from '@/lib/usage';

export function UsageBanner() {
  const remaining = getRemainingSeconds();
  const used = getUsedSeconds();
  const total = MAX_FREE_MINUTES * 60;
  const pct = Math.min(100, (used / total) * 100);

  return (
    <div className="rounded-2xl bg-card border border-border p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">الرصيد المجاني</span>
        <span className="text-sm font-bold text-primary">{formatTime(remaining)} متبقي</span>
      </div>
      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full gradient-primary transition-all duration-500"
          style={{ width: `${100 - pct}%` }}
        />
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">
        {MAX_FREE_MINUTES} دقيقة مجانية لإنتاج الفيديو
      </p>
    </div>
  );
}
