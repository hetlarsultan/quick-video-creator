import { Icons, IconName } from './Icons';

interface FeatureCardProps {
  title: string;
  subtitle: string;
  icon: string;
  onPress: () => void;
}

const iconMap: Record<string, IconName> = {
  Video: 'Video',
  ImageIcon: 'Image',
  Palette: 'Palette',
  Globe: 'Globe',
  Mic: 'Mic',
};

export function FeatureCard({ title, subtitle, icon, onPress }: FeatureCardProps) {
  const IconComp = Icons[iconMap[icon] || 'Sparkles'];
  return (
    <button
      onClick={onPress}
      className="min-w-[220px] rounded-2xl bg-card p-5 text-right transition-all hover:scale-[1.02] hover:glow-primary border border-border"
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
        <IconComp className="h-5 w-5 text-primary" />
      </div>
      <h3 className="text-sm font-bold text-foreground mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed">{subtitle}</p>
    </button>
  );
}
