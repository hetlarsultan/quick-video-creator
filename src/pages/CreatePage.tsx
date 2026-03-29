import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Video, Image, Palette, Globe, Mic, Sparkles, Play } from 'lucide-react';
import { durationOptions, quickPrompts, styleOptions } from '@/lib/data';
import { useProjects } from '@/lib/ProjectsContext';
import { buildProjectTitle, Project, ProjectType } from '@/lib/storage';
import { canProduce, addUsedSeconds } from '@/lib/usage';
import { toast } from 'sonner';

const typeOptions: { label: string; value: ProjectType; icon: React.ElementType }[] = [
  { label: 'نص ➜ فيديو', value: 'text-to-video', icon: Video },
  { label: 'صور ➜ فيديو', value: 'image-to-video', icon: Image },
  { label: 'نص ➜ صور', value: 'text-to-image', icon: Palette },
  { label: 'مشاهد تلقائية', value: 'scene-generator', icon: Globe },
  { label: 'نص ➜ صوت', value: 'text-to-audio', icon: Mic },
];

export default function CreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preset = searchParams.get('preset') as ProjectType | null;
  const { addProject, updateProject } = useProjects();

  const [type, setType] = useState<ProjectType>(preset || 'text-to-video');
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(10);
  const [style, setStyle] = useState(styleOptions[0]);
  const [processing, setProcessing] = useState(false);

  const example = useMemo(() => quickPrompts[Math.floor(Math.random() * quickPrompts.length)], []);

  const handleGenerate = () => {
    if (!prompt.trim()) {
      toast.error('اكتب فكرة أو وصفاً لإنتاج المحتوى.');
      return;
    }
    if (!canProduce(duration)) {
      toast.error('رصيدك المجاني غير كافٍ. الحد الأقصى 20 دقيقة.');
      return;
    }

    const id = `${Date.now()}`;
    const project: Project = {
      id,
      title: buildProjectTitle(type, prompt),
      type,
      prompt,
      createdAt: Date.now(),
      status: 'processing',
      durationSec: duration,
      style,
      outputs: [],
    };
    addProject(project);
    setProcessing(true);
    setPrompt('');

    addUsedSeconds(duration);

    setTimeout(() => {
      updateProject(id, {
        status: 'ready',
        outputs: ['1080p.mp4', 'storyboard.png', 'audio.wav'],
      });
      setProcessing(false);
      navigate(`/project/${id}`);
    }, 2000);
  };

  return (
    <div className="px-5 pb-24 pt-8">
      <h1 className="text-2xl font-black text-foreground">ابدأ الإنشاء الآن</h1>
      <p className="mt-2 text-sm text-muted-foreground">اختر نوع المشروع واضبط التفاصيل بضغطة واحدة.</p>

      <h2 className="mt-6 mb-3 text-base font-bold text-foreground">نوع التحويل</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {typeOptions.map((option) => {
          const active = option.value === type;
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              onClick={() => setType(option.value)}
              className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition-all ${active ? 'gradient-primary text-primary-foreground border-primary glow-primary' : 'bg-card text-foreground border-border hover:bg-accent'}`}
            >
              <Icon className="h-4 w-4" />
              {option.label}
            </button>
          );
        })}
      </div>

      <h2 className="mt-6 mb-3 text-base font-bold text-foreground">الوصف النصي</h2>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={example}
        rows={3}
        className="w-full rounded-2xl bg-card border border-border p-4 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
      />
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => setPrompt(example)}
          className="flex items-center gap-1.5 rounded-xl bg-card border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-accent transition-colors"
        >
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          اقتراح سريع
        </button>
      </div>

      <h2 className="mt-6 mb-3 text-base font-bold text-foreground">الإعدادات</h2>
      <div className="space-y-4">
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">المدة (ثانية)</label>
          <div className="flex gap-2">
            {durationOptions.map((d) => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-all ${d === duration ? 'gradient-primary text-primary-foreground' : 'bg-card text-foreground border border-border hover:bg-accent'}`}
              >
                {d}s
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">الطابع</label>
          <div className="flex gap-2 flex-wrap">
            {styleOptions.map((s) => (
              <button
                key={s}
                onClick={() => setStyle(s)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${s === style ? 'gradient-primary text-primary-foreground' : 'bg-card text-foreground border border-border hover:bg-accent'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={processing}
        className="mt-8 w-full rounded-2xl gradient-primary py-4 text-base font-bold text-primary-foreground flex items-center justify-center gap-2 glow-primary disabled:opacity-50 transition-all hover:scale-[1.01]"
      >
        {processing ? (
          <>
            <div className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
            جاري الإنتاج...
          </>
        ) : (
          <>
            <Play className="h-4 w-4" />
            ابدأ الإنتاج
          </>
        )}
      </button>
    </div>
  );
}
