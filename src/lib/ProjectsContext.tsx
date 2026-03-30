import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { Project, loadProjects, saveProjects } from './storage';

interface ProjectsContextValue {
  projects: Project[];
  loading: boolean;
  favorites: Set<string>;
  addProject: (project: Project) => void;
  updateProject: (id: string, patch: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  clearProjects: () => void;
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  stats: { total: number; ready: number; processing: number; totalDuration: number };
}

const ProjectsContext = createContext<ProjectsContextValue | null>(null);

const FAVORITES_KEY = 'agon_favorites_v1';

function loadFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function saveFavorites(favs: Set<string>) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favs]));
}

export function ProjectsProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    setProjects(loadProjects());
    setFavorites(loadFavorites());
    setLoading(false);
  }, []);

  const persist = useCallback((updater: (prev: Project[]) => Project[]) => {
    setProjects(prev => {
      const next = updater(prev);
      saveProjects(next);
      return next;
    });
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      saveFavorites(next);
      return next;
    });
  }, []);

  const stats = useMemo(() => ({
    total: projects.length,
    ready: projects.filter(p => p.status === 'ready').length,
    processing: projects.filter(p => p.status === 'processing').length,
    totalDuration: projects.reduce((sum, p) => sum + p.durationSec, 0),
  }), [projects]);

  const value = useMemo<ProjectsContextValue>(
    () => ({
      projects,
      loading,
      favorites,
      addProject: (project) => persist(prev => [project, ...prev]),
      updateProject: (id, patch) =>
        persist(prev => prev.map((item) => (item.id === id ? { ...item, ...patch } : item))),
      deleteProject: (id) => persist(prev => prev.filter(item => item.id !== id)),
      clearProjects: () => persist(() => []),
      toggleFavorite,
      isFavorite: (id) => favorites.has(id),
      stats,
    }),
    [projects, loading, favorites, persist, toggleFavorite, stats]
  );

  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>;
}

export function useProjects() {
  const ctx = useContext(ProjectsContext);
  if (!ctx) throw new Error('ProjectsProvider missing');
  return ctx;
}
