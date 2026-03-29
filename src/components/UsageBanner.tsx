export function UsageBanner() {
  return (
    <div className="rounded-2xl gradient-primary p-4 glow-primary">
      <div className="flex items-center gap-2">
        <span className="text-2xl">✨</span>
        <div>
          <h3 className="text-sm font-bold text-primary-foreground">مجاني بالكامل — بلا حدود</h3>
          <p className="text-xs text-primary-foreground/70 mt-0.5">استمتع بجميع الميزات مجاناً إلى الأبد.</p>
        </div>
      </div>
    </div>
  );
}
