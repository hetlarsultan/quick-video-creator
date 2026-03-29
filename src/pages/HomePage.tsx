import { useNavigate } from 'react-router-dom';
import { FeatureCard } from '@/components/FeatureCard';
import { ProjectCard } from '@/components/ProjectCard';
import { TemplateCard } from '@/components/TemplateCard';
import { StatCard } from '@/components/StatCard';
import { featureCards, templates, tips } from '@/lib/data';
import { useProjects } from '@/lib/ProjectsContext';
import { Sparkles, Lightbulb, ArrowLeft } from 'lucide-react';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 6) return 'مساء الخير 🌙';
  if (h < 12) return 'صباح الخير ☀️';
  if (h < 17) return 'مرحباً 👋';
  return 'مساء الخير 🌅';
}

export default function HomePage() {
  const navigate = useNavigate();
  const { projects, loading, stats } = useProjects();

  return (
    <div className="px-5 pb-24 pt-6">
      {/* Hero */}
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">{getGreeting()}</p>
        <h1 className="text-2xl font-black text-foreground mt-1">استوديو الذكاء الاصطناعي</h1>
        <p className="mt-1 text-sm text-muted-foreground">حوّل أفكارك إلى فيديو وصور وصوت — <span className="text-gradient font-bold">مجاني للأبد</span></p>
      </div>

      {/* Free Banner */}
      <div className="rounded-2xl gradient-primary p-5 glow-primary mb-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full animate-shimmer" />
        <div className="relative flex items-start gap-3">
          <Sparkles className="h-6 w-6 text-primary-foreground flex-shrink-0 animate-float" />
          <div>
            <h3 className="text-sm font-black text-primary-foreground">مجاني بالكامل — بلا حدود</h3>
            <p className="text-xs text-primary-foreground/70 mt-1 leading-relaxed">جميع الميزات مفتوحة. أنتج فيديو وصور وصوت بدون أي رسوم أو قيود.</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats.total > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          <StatCard label="إجمالي المشاريع" value={stats.total} icon="📁" gradient="gradient-primary" />
          <StatCard label="جاهز للتحميل" value={stats.ready} icon="✅" gradient="gradient-success" />
        </div>
      )}

      {/* Features */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-foreground">الميزات الرئيسية</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-none">
        {featureCards.map((card) => (
          <FeatureCard
            key={card.id}
            title={card.title}
            subtitle={card.subtitle}
            icon={card.icon}
            gradient={card.gradient}
            onPress={() => navigate(`/create?preset=${card.type}`)}
          />
        ))}
      </div>

      {/* Templates */}
      <div className="flex items-center justify-between mt-6 mb-3">
        <h2 className="text-lg font-bold text-foreground">قوالب جاهزة</h2>
        <button onClick={() => navigate('/create')} className="text-xs text-primary font-semibold flex items-center gap-1">
          عرض الكل <ArrowLeft className="h-3 w-3" />
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-none">
        {templates.map((t) => (
          <TemplateCard key={t.id} {...t} />
        ))}
      </div>

      {/* Tips */}
      <div className="mt-6 mb-3">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-warning" />
          نصائح سريعة
        </h2>
      </div>
      <div className="space-y-2">
        {tips.map((tip, i) => (
          <div key={i} className="rounded-xl bg-card border border-border p-3 flex items-start gap-3">
            <span className="text-warning text-sm mt-0.5">💡</span>
            <div>
              <h4 className="text-xs font-bold text-foreground">{tip.title}</h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">{tip.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Projects */}
      <div className="flex items-center justify-between mt-6 mb-3">
        <h2 className="text-lg font-bold text-foreground">أحدث المشاريع</h2>
        {projects.length > 0 && (
          <button onClick={() => navigate('/projects')} className="text-xs text-primary font-semibold flex items-center gap-1">
            عرض الكل <ArrowLeft className="h-3 w-3" />
          </button>
        )}
      </div>
      <div className="flex flex-col gap-3">
        {projects.slice(0, 4).map((project) => (
          <ProjectCard key={project.id} project={project} onPress={() => navigate(`/project/${project.id}`)} />
        ))}
        {!loading && projects.length === 0 && (
          <div className="text-center py-10">
            <span className="text-4xl mb-3 block">🎬</span>
            <p className="text-sm text-muted-foreground">لا توجد مشاريع بعد</p>
            <button onClick={() => navigate('/create')} className="mt-3 gradient-primary rounded-xl px-6 py-2 text-sm font-bold text-primary-foreground">
              أنشئ أول مشروع
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
