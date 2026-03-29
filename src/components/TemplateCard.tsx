import { useNavigate } from 'react-router-dom';

interface TemplateCardProps {
  id: string;
  title: string;
  prompt: string;
  emoji: string;
  type: string;
}

export function TemplateCard({ title, prompt, emoji, type }: TemplateCardProps) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(`/create?preset=${type}&template=${encodeURIComponent(prompt)}`)}
      className="min-w-[160px] rounded-2xl bg-card border border-border p-4 text-right transition-all duration-300 hover:scale-[1.03] hover:border-primary/30 group"
    >
      <span className="text-3xl block mb-3 transition-transform duration-300 group-hover:scale-110 inline-block">{emoji}</span>
      <h4 className="text-sm font-bold text-foreground">{title}</h4>
      <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">{prompt}</p>
    </button>
  );
}
