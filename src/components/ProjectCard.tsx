import { Project } from '@/lib/storage';
import { CheckCircle, Clock } from 'lucide-react';

interface ProjectCardProps {
  project: Project;
  onPress: () => void;
}

export function ProjectCard({ project, onPress }: ProjectCardProps) {
  return (
    <button
      onClick={onPress}
      className="flex w-full items-center gap-3 rounded-2xl bg-card p-3 text-right transition-all hover:bg-accent border border-border"
    >
      <div className="h-16 w-16 rounded-xl gradient-primary flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-bold text-foreground truncate">{project.title}</h4>
        <p className="text-xs text-muted-foreground truncate mt-1">{project.prompt || 'بدون وصف'}</p>
        <div className="flex items-center gap-1.5 mt-1.5">
          {project.status === 'ready' ? (
            <CheckCircle className="h-3.5 w-3.5 text-success" />
          ) : (
            <Clock className="h-3.5 w-3.5 text-warning" />
          )}
          <span className="text-[11px] text-muted-foreground">
            {project.status === 'ready' ? 'جاهز' : 'قيد المعالجة'}
          </span>
        </div>
      </div>
    </button>
  );
}
