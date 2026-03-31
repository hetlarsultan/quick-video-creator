export type ProjectStatus = 'processing' | 'ready';
export type ProjectType =
  | 'text-to-video'
  | 'image-to-video'
  | 'text-to-image'
  | 'scene-generator'
  | 'text-to-audio';

export interface Project {
  id: string;
  title: string;
  type: ProjectType;
  prompt: string;
  createdAt: number;
  status: ProjectStatus;
  durationSec: number;
  style: string;
  outputs: string[];
  generatedImageUrl?: string;
  sourceImageUrl?: string;
}

const STORAGE_KEY = 'agon_projects_v1';

export function loadProjects(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Project[];
  } catch {
    return [];
  }
}

export function saveProjects(projects: Project[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function buildProjectTitle(type: ProjectType, prompt: string) {
  const map: Record<ProjectType, string> = {
    'text-to-video': 'فيديو من نص',
    'image-to-video': 'فيديو من صور',
    'text-to-image': 'صور من نص',
    'scene-generator': 'مشاهد تلقائية',
    'text-to-audio': 'صوت من نص',
  };
  const base = map[type];
  const trimmed = prompt.trim();
  return trimmed.length > 0 ? `${base}: ${trimmed.slice(0, 28)}` : base;
}
