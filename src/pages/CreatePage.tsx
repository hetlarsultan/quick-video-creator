import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Video, Image, Palette, Globe, Mic, Sparkles, Play, Zap } from 'lucide-react';
import { durationOptions, quickPrompts, styleOptions, templates } from '@/lib/data';
import { useProjects } from '@/lib/ProjectsContext';
import { buildProjectTitle, Project, ProjectType } from '@/lib/storage';
import { generateImage } from '@/lib/ai';
import { toast } from 'sonner';
import ImagePicker from '@/components/ImagePicker';

const typeOptions: { label: string; value: ProjectType; icon: React.ElementType; emoji: string }[] = [
  { label: 'نص ➜ فيديو', value: 'text-to-video', icon: Video, emoji: '🎬' },
  { label: 'صور ➜ فيديو', value: 'image-to-video', icon: Image, emoji: '📸' },
  { label: 'نص ➜ صور', value: 'text-to-image', icon: Palette, emoji: '🎨' },
  { label: 'مشاهد تلقائية', value: 'scene-generator', icon: Globe, emoji: '🌍' },
  { label: 'نص ➜ صوت', value: 'text-to-audio', icon: Mic, emoji: '🎙️' },
];

export default function CreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preset = searchParams.get('preset') as ProjectType | null;
  const templatePrompt = searchParams.get('template');
  const { addProject, updateProject } = useProjects();

  const [type, setType] = useState<ProjectType>(preset || 'text-to-video');
  const [prompt, setPrompt] = useState(templatePrompt ? decodeURIComponent(templatePrompt) : '');
  const [duration, setDuration] = useState(10);
  const [style, setStyle] = useState(styleOptions[0]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sourceImage, setSourceImage] = useState<string | null>(null);

  useEffect(() => {
    if (preset) setType(preset);
    if (templatePrompt) setPrompt(decodeURIComponent(templatePrompt));
  }, [preset, templatePrompt]);

  const example = useMemo(() => quickPrompts[Math.floor(Math.random() * quickPrompts.length)], []);

  const relevantTemplates = templates.filter(t => t.type === type);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('اكتب فكرة أو وصفاً لإنتاج المحتوى.');
      return;
    }
    if (type === 'image-to-video' && !sourceImage) {
      toast.error('اختر صورة أولاً لتحويلها إلى فيديو.');
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
      sourceImageUrl: type === 'image-to-video' ? sourceImage || undefined : undefined,
    };
    addProject(project);
    setProcessing(true);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) { clearInterval(interval); return 90; }
        return prev + Math.random() * 10;
      });
    }, 400);

    try {
      const isImageType = type === 'text-to-image';
      
      if (isImageType) {
        const result = await generateImage(prompt, style);
        clearInterval(interval);
        setProgress(100);
        updateProject(id, {
          status: 'ready',
          outputs: ['generated-image.png'],
          generatedImageUrl: result.imageUrl,
        });
        toast.success('تم إنتاج الصورة بنجاح بالذكاء الاصطناعي! 🎨');
      } else {
        await new Promise(resolve => setTimeout(resolve, 2500));
        clearInterval(interval);
        setProgress(100);
        updateProject(id, {
          status: 'ready',
          outputs: type === 'text-to-audio' ? ['audio.wav'] : ['1080p.mp4', 'storyboard.png'],
        });
        toast.success('تم الإنتاج بنجاح!');
      }
      
      setTimeout(() => {
        setProcessing(false);
        setPrompt('');
        setProgress(0);
        setSourceImage(null);
        navigate(`/project/${id}`);
      }, 500);
    } catch (err: any) {
      clearInterval(interval);
      setProcessing(false);
      setProgress(0);
      updateProject(id, { status: 'ready' });
      toast.error(err.message || 'حدث خطأ أثناء الإنتاج');
    }
  };

  return (
    <div className="px-5 pb-24 pt-8">
      <h1 className="text-2xl font-black text-foreground">ابدأ الإنشاء الآن</h1>
      <p className="mt-1 text-sm text-muted-foreground">اختر نوع المشروع واضبط التفاصيل — <span className="text-gradient font-bold">مجاني تماماً</span></p>

      {/* Type Selection */}
      <h2 className="mt-6 mb-3 text-base font-bold text-foreground">نوع التحويل</h2>
      <div className="grid grid-cols-2 gap-2">
        {typeOptions.map((option) => {
          const active = option.value === type;
          return (
            <button
              key={option.value}
              onClick={() => setType(option.value)}
              className={`flex items-center gap-2 rounded-2xl border px-3 py-3 text-sm font-semibold transition-all duration-200 ${active ? 'gradient-primary text-primary-foreground border-primary glow-primary scale-[1.02]' : 'bg-card text-foreground border-border hover:bg-accent hover:border-primary/20'}`}
            >
              <span className="text-lg">{option.emoji}</span>
              {option.label}
            </button>
          );
        })}
      </div>

      {/* Image Picker for image-to-video */}
      {type === 'image-to-video' && (
        <>
          <h2 className="mt-5 mb-2 text-base font-bold text-foreground">اختر الصورة</h2>
          <ImagePicker
            selectedImage={sourceImage}
            onImageSelect={setSourceImage}
            onClear={() => setSourceImage(null)}
          />
        </>
      )}

      {/* Quick Templates */}
      {relevantTemplates.length > 0 && (
        <>
          <h2 className="mt-5 mb-2 text-sm font-bold text-foreground flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-warning" /> قوالب سريعة
          </h2>
          <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-5 px-5 pb-1">
            {relevantTemplates.map(t => (
              <button
                key={t.id}
                onClick={() => { setPrompt(t.prompt); setDuration(t.duration); setStyle(t.style); }}
                className="min-w-[140px] rounded-xl bg-card border border-border p-3 text-right hover:border-primary/30 transition-all"
              >
                <span className="text-xl">{t.emoji}</span>
                <p className="text-xs font-bold text-foreground mt-1">{t.title}</p>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Prompt */}
      <h2 className="mt-5 mb-2 text-base font-bold text-foreground">الوصف النصي</h2>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={example}
        rows={3}
        className="w-full rounded-2xl bg-card border border-border p-4 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
      />
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => setPrompt(example)}
          className="flex items-center gap-1.5 rounded-xl bg-card border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-accent transition-colors"
        >
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          اقتراح سريع
        </button>
        <button
          onClick={() => setPrompt('')}
          className="rounded-xl bg-card border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent transition-colors"
        >
          مسح
        </button>
      </div>

      {/* Settings */}
      <h2 className="mt-5 mb-3 text-base font-bold text-foreground">الإعدادات</h2>
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

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={processing}
        className="mt-8 w-full rounded-2xl gradient-primary py-4 text-base font-bold text-primary-foreground flex flex-col items-center justify-center gap-2 glow-primary disabled:opacity-70 transition-all hover:scale-[1.01]"
      >
        {processing ? (
          <>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
              جاري الإنتاج... {Math.round(progress)}%
            </div>
            <div className="w-full h-1.5 rounded-full bg-primary-foreground/20 mt-1 overflow-hidden">
              <div className="h-full rounded-full bg-primary-foreground transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            ابدأ الإنتاج — مجاناً
          </div>
        )}
      </button>
    </div>
  );
}
