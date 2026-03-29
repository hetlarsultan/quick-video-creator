import { Project } from '@/lib/storage';
import { CheckCircle, Clock, Heart } from 'lucide-react';
import { useProjects } from '@/lib/ProjectsContext';

interface ProjectCardProps {
  project: Project;
  onPress: () => void;
}

const typeEmoji: Record<string, string> = {
  'text-to-video': '🎬',
  'image-to-video': '📸',
  'text-to-image': '🎨',
  'scene-generator': '🌍',
  'text-to-audio': '🎙️',
};

export function ProjectCard({ project, onPress }: ProjectCardProps) {
  const { toggleFavorite, isFavorite } = useProjects();
  const fav = isFavorite(project.id);

  return (
    <div className="flex w-full items-center gap-3 rounded-2xl bg-card p-3 border border-border card-hover group">
      <button onClick={onPress} className="flex items-center gap-3 flex-1 min-w-0 text-right">
        <div className="h-14 w-14 rounded-xl gradient-card flex items-center justify-center text-2xl flex-shrink-0">
          {typeEmoji[project.type] || '📁'}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-foreground truncate">{project.title}</h4>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{project.prompt || 'بدون وصف'}</p>
          <div className="flex items-center gap-2 mt-1">
            {project.status === 'ready' ? (
              <span className="flex items-center gap-1 text-[11px] text-success"><CheckCircle className="h-3 w-3" /> جاهز</span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] text-warning"><Clock className="h-3 w-3" /> قيد المعالجة</span>
            )}
            <span className="text-[10px] text-muted-foreground">{project.durationSec}s</span>
          </div>
        </div>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); toggleFavorite(project.id); }}
        className="p-2 rounded-xl transition-colors hover:bg-accent"
      >
        <Heart className={`h-4 w-4 transition-colors ${fav ? 'fill-destructive text-destructive' : 'text-muted-foreground'}`} />
      </button>
    </div>
  );
}
