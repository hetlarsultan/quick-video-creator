import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Project, loadProjects, saveProjects } from './storage';

interface ProjectsContextValue {
  projects: Project[];
  loading: boolean;
  addProject: (project: Project) => void;
  updateProject: (id: string, patch: Partial<Project>) => void;
  clearProjects: () => void;
}

const ProjectsContext = createContext<ProjectsContextValue | null>(null);

export function ProjectsProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setProjects(loadProjects());
    setLoading(false);
  }, []);

  const persist = (next: Project[]) => {
    setProjects(next);
    saveProjects(next);
  };

  const value = useMemo<ProjectsContextValue>(
    () => ({
      projects,
      loading,
      addProject: (project) => persist([project, ...projects]),
      updateProject: (id, patch) =>
        persist(projects.map((item) => (item.id === id ? { ...item, ...patch } : item))),
      clearProjects: () => persist([]),
    }),
    [projects, loading]
  );

  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>;
}

export function useProjects() {
  const ctx = useContext(ProjectsContext);
  if (!ctx) throw new Error('ProjectsProvider missing');
  return ctx;
}
