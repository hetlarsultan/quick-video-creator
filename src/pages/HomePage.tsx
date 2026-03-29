import { useNavigate } from 'react-router-dom';
import { FeatureCard } from '@/components/FeatureCard';
import { ProjectCard } from '@/components/ProjectCard';
import { UsageBanner } from '@/components/UsageBanner';
import { featureCards } from '@/lib/data';
import { useProjects } from '@/lib/ProjectsContext';

export default function HomePage() {
  const navigate = useNavigate();
  const { projects, loading } = useProjects();

  return (
    <div className="px-5 pb-24 pt-8">
      <h1 className="text-2xl font-black text-foreground">استوديو الذكاء الاصطناعي</h1>
      <p className="mt-2 text-sm text-muted-foreground">حوّل أفكارك إلى فيديو وصور وصوت في دقائق.</p>

      <div className="mt-5">
        <UsageBanner />
      </div>

      <h2 className="mt-6 mb-3 text-lg font-bold text-foreground">الميزات الرئيسية</h2>
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-none">
        {featureCards.map((card) => (
          <FeatureCard
            key={card.id}
            title={card.title}
            subtitle={card.subtitle}
            icon={card.icon}
            onPress={() => navigate(`/create?preset=${card.type}`)}
          />
        ))}
      </div>

      <h2 className="mt-6 mb-3 text-lg font-bold text-foreground">أحدث المشاريع</h2>
      <div className="flex flex-col gap-3">
        {projects.slice(0, 5).map((project) => (
          <ProjectCard key={project.id} project={project} onPress={() => navigate(`/project/${project.id}`)} />
        ))}
        {!loading && projects.length === 0 && (
          <p className="text-center text-sm text-muted-foreground mt-6">لا توجد مشاريع بعد. أنشئ أول فيديو الآن.</p>
        )}
      </div>
    </div>
  );
}
