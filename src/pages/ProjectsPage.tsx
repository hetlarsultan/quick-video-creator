import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Heart } from 'lucide-react';
import { SegmentedControl } from '@/components/SegmentedControl';
import { ProjectCard } from '@/components/ProjectCard';
import { useProjects } from '@/lib/ProjectsContext';

type Filter = 'all' | 'ready' | 'processing' | 'favorites';

export default function ProjectsPage() {
  const { projects, loading, isFavorite } = useProjects();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let result = projects;
    if (filter === 'favorites') result = result.filter(p => isFavorite(p.id));
    else if (filter !== 'all') result = result.filter(p => p.status === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(p => p.title.toLowerCase().includes(q) || p.prompt.toLowerCase().includes(q));
    }
    return result;
  }, [projects, filter, search, isFavorite]);

  return (
    <div className="px-5 pb-24 pt-8">
      <h1 className="text-2xl font-black text-foreground">مشاريعي</h1>
      <p className="mt-1 mb-4 text-sm text-muted-foreground">كل مشاريعك محفوظة — <span className="text-gradient font-bold">مجاني للأبد</span></p>

      {/* Search */}
      <div className="flex items-center gap-2 rounded-2xl bg-card border border-border p-2.5 mb-4">
        <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث في مشاريعك..."
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      </div>

      {/* Filter */}
      <SegmentedControl
        options={[
          { label: 'الكل', value: 'all' },
          { label: 'جاهز', value: 'ready' },
          { label: 'معالجة', value: 'processing' },
          { label: '❤️', value: 'favorites' },
        ]}
        value={filter}
        onChange={(v) => setFilter(v as Filter)}
      />

      {/* Projects List */}
      <div className="flex flex-col gap-3 mt-4">
        {filtered.map((project) => (
          <ProjectCard key={project.id} project={project} onPress={() => navigate(`/project/${project.id}`)} />
        ))}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-12">
            <span className="text-4xl block mb-3">{filter === 'favorites' ? '❤️' : '📂'}</span>
            <p className="text-sm text-muted-foreground">
              {filter === 'favorites' ? 'لا توجد مفضلات بعد' : search ? 'لا توجد نتائج' : 'لا يوجد مشاريع في هذا القسم'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
