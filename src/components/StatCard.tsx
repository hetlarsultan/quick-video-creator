interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  gradient?: string;
}

export function StatCard({ label, value, icon, gradient = 'gradient-primary' }: StatCardProps) {
  return (
    <div className="rounded-2xl bg-card border border-border p-4 flex items-center gap-3 card-hover">
      <div className={`h-10 w-10 rounded-xl ${gradient} flex items-center justify-center text-lg flex-shrink-0`}>
        {icon}
      </div>
      <div>
        <p className="text-lg font-black text-foreground">{value}</p>
        <p className="text-[11px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
