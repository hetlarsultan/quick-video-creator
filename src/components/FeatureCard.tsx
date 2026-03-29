import { Icons, IconName } from './Icons';

interface FeatureCardProps {
  title: string;
  subtitle: string;
  icon: string;
  gradient?: string;
  onPress: () => void;
}

const iconMap: Record<string, IconName> = {
  Video: 'Video',
  ImageIcon: 'Image',
  Palette: 'Palette',
  Globe: 'Globe',
  Mic: 'Mic',
};

export function FeatureCard({ title, subtitle, icon, gradient = 'gradient-primary', onPress }: FeatureCardProps) {
  const IconComp = Icons[iconMap[icon] || 'Sparkles'];
  return (
    <button
      onClick={onPress}
      className="min-w-[200px] rounded-2xl bg-card p-5 text-right transition-all duration-300 hover:scale-[1.03] border border-border hover:border-primary/30 group"
    >
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${gradient} transition-transform duration-300 group-hover:scale-110`}>
        <IconComp className="h-5 w-5 text-primary-foreground" />
      </div>
      <h3 className="text-sm font-bold text-foreground mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed">{subtitle}</p>
    </button>
  );
}
