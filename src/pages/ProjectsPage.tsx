import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SegmentedControl } from '@/components/SegmentedControl';
import { ProjectCard } from '@/components/ProjectCard';
import { useProjects } from '@/lib/ProjectsContext';

export default function ProjectsPage() {
  const { projects, loading } = useProjects();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'ready' | 'processing'>('all');

  const filtered = useMemo(() => {
    if (filter === 'all') return projects;
    return projects.filter((p) => p.status === filter);
  }, [projects, filter]);

  return (
    <div className="px-5 pb-24 pt-8">
      <h1 className="text-2xl font-black text-foreground">مشاريعي</h1>
      <p className="mt-2 mb-4 text-sm text-muted-foreground">كل مشاريعك محفوظة داخل التطبيق بدون حدود.</p>

      <SegmentedControl
        options={[
          { label: 'الكل', value: 'all' },
          { label: 'جاهز', value: 'ready' },
          { label: 'قيد المعالجة', value: 'processing' },
        ]}
        value={filter}
        onChange={(v) => setFilter(v as 'all' | 'ready' | 'processing')}
      />

      <div className="flex flex-col gap-3 mt-4">
        {filtered.map((project) => (
          <ProjectCard key={project.id} project={project} onPress={() => navigate(`/project/${project.id}`)} />
        ))}
        {!loading && filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground mt-10">لا يوجد مشاريع في هذا القسم.</p>
        )}
      </div>
    </div>
  );
}
