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
  generatedVideoUrl?: string;
  sourceImageUrl?: string;
}

const STORAGE_KEY = 'agon_projects_v1';
const MAX_INLINE_MEDIA_LENGTH = 150_000;

function isInlineMedia(value?: string) {
  return typeof value === 'string' && value.startsWith('data:');
}

function trimStoredMedia(value?: string) {
  if (!value) return undefined;
  if (!isInlineMedia(value)) return value;
  return value.length <= MAX_INLINE_MEDIA_LENGTH ? value : undefined;
}

function compactProject(project: Project): Project {
  return {
    ...project,
    generatedImageUrl: trimStoredMedia(project.generatedImageUrl),
    sourceImageUrl: trimStoredMedia(project.sourceImageUrl),
    outputs: Array.isArray(project.outputs) ? project.outputs.slice(0, 12) : [],
  };
}

function metadataOnlyProject(project: Project): Project {
  return {
    ...project,
    generatedImageUrl: isInlineMedia(project.generatedImageUrl) ? undefined : project.generatedImageUrl,
    sourceImageUrl: undefined,
    outputs: Array.isArray(project.outputs) ? project.outputs.slice(0, 6) : [],
  };
}

function tryWriteProjects(projects: Project[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function loadProjects(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((item) => compactProject(item as Project)) : [];
  } catch {
    return [];
  }
}

export function saveProjects(projects: Project[]) {
  const compactProjects = projects.map(compactProject);

  try {
    tryWriteProjects(compactProjects);
    return;
  } catch (error) {
    if (!(error instanceof DOMException) || error.name !== 'QuotaExceededError') {
      throw error;
    }
  }

  try {
    tryWriteProjects(compactProjects.map(metadataOnlyProject));
    return;
  } catch (error) {
    if (!(error instanceof DOMException) || error.name !== 'QuotaExceededError') {
      throw error;
    }
  }

  tryWriteProjects(compactProjects.map(metadataOnlyProject).slice(0, 20));
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
