import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Video, Image, Palette, Globe, Mic, Sparkles, Play, Zap, User, Wand2 } from 'lucide-react';
import { durationOptions, quickPrompts, styleOptions, templates } from '@/lib/data';
import { useProjects } from '@/lib/ProjectsContext';
import { buildProjectTitle, Project, ProjectType } from '@/lib/storage';
import { generateImage } from '@/lib/ai';
import { generateAnimatedVideo, SceneMotion } from '@/lib/animated-video';
import { speakText, generateSpeechBlob } from '@/lib/tts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ImagePicker from '@/components/ImagePicker';

const typeOptions: { label: string; value: ProjectType; icon: React.ElementType; emoji: string }[] = [
  { label: 'نص ➜ فيديو', value: 'text-to-video', icon: Video, emoji: '🎬' },
  { label: 'صور ➜ فيديو', value: 'image-to-video', icon: Image, emoji: '📸' },
  { label: 'نص ➜ صور', value: 'text-to-image', icon: Palette, emoji: '🎨' },
  { label: 'مشاهد تلقائية', value: 'scene-generator', icon: Globe, emoji: '🌍' },
  { label: 'نص ➜ صوت', value: 'text-to-audio', icon: Mic, emoji: '🎙️' },
];

const characterOptions = [
  { label: 'تلقائي (AI)', value: 'auto', emoji: '🤖' },
  { label: 'بدون شخصية', value: 'none', emoji: '🚫' },
  { label: 'شخصية حقيقية', value: 'realistic', emoji: '🧑' },
  { label: 'شخصية كرتونية', value: 'cartoon', emoji: '🧸' },
  { label: 'شخصية خيالية', value: 'fantasy', emoji: '🧙' },
];

const sceneOptions = [
  { label: 'تلقائي (AI)', value: 'auto', emoji: '🤖' },
  { label: 'بدون خلفية', value: 'none', emoji: '⬛' },
  { label: 'طبيعة متحركة', value: 'animated-nature', emoji: '🌿' },
  { label: 'مدينة ليلية', value: 'night-city', emoji: '🌃' },
  { label: 'فضاء', value: 'space', emoji: '🚀' },
  { label: 'تحت الماء', value: 'underwater', emoji: '🌊' },
];

function buildSinglePrompt(type: ProjectType, prompt: string, style: string, character: string, scene: string): string {
  let aiPrompt = `Create a high quality image: ${prompt}`;
  const charMap: Record<string, string> = {
    realistic: 'Include a realistic human character',
    cartoon: 'Include a cute cartoon character in anime style',
    fantasy: 'Include a magical fantasy character with special effects',
  };
  if (character !== 'none' && character !== 'auto' && charMap[character]) {
    aiPrompt += `. ${charMap[character]}`;
  }
  const sceneMap: Record<string, string> = {
    'animated-nature': 'with animated nature background, flowing leaves, moving clouds',
    'night-city': 'with neon-lit night city background, glowing lights',
    'space': 'with deep space background, stars, galaxies, nebulas',
    'underwater': 'with underwater ocean background, coral reefs, bubbles',
  };
  if (scene !== 'none' && scene !== 'auto' && sceneMap[scene]) {
    aiPrompt += `. Set in ${sceneMap[scene]}`;
  }
  return aiPrompt;
}

const isVideoType = (type: ProjectType) =>
  ['text-to-video', 'image-to-video', 'scene-generator'].includes(type);

interface AISceneData {
  description: string;
  action?: string;
  camera?: string;
  intensity?: number;
  characterDirection?: string;
}

interface AIAnalysis {
  character: string;
  environment: string;
  scenes: AISceneData[];
  narrationText: string;
}

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
  const [statusText, setStatusText] = useState('');
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [character, setCharacter] = useState('auto');
  const [scene, setScene] = useState('auto');
  const [enableNarration, setEnableNarration] = useState(true);
  const [enableTalking, setEnableTalking] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    if (preset) setType(preset);
    if (templatePrompt) setPrompt(decodeURIComponent(templatePrompt));
  }, [preset, templatePrompt]);

  const example = useMemo(() => quickPrompts[Math.floor(Math.random() * quickPrompts.length)], []);
  const relevantTemplates = templates.filter(t => t.type === type);
  const showCharacterScene = ['text-to-video', 'scene-generator', 'text-to-image', 'image-to-video'].includes(type);

  // AI Analysis: auto-detect character, environment, scenes
  const handleAnalyze = async () => {
    if (!prompt.trim()) {
      toast.error('اكتب وصفاً أولاً ليحلله الذكاء الاصطناعي');
      return;
    }
    setAnalyzing(true);
    try {
      const sceneCount = type === 'scene-generator' ? 4 : 3;
      const { data, error } = await supabase.functions.invoke('analyze-prompt', {
        body: { prompt, type, sceneCount },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setAiAnalysis(data);
      // Auto-apply AI suggestions
      if (character === 'auto' && data.character) {
        // Show what AI chose (keep selection on 'auto' so user sees it's AI-driven)
      }
      toast.success(`✨ تم التحليل! شخصية: ${getCharLabel(data.character)} | بيئة: ${getSceneLabel(data.environment)}`);
    } catch (err: any) {
      console.error('Analysis error:', err);
      toast.error('فشل التحليل، سيتم استخدام الإعدادات الافتراضية');
    } finally {
      setAnalyzing(false);
    }
  };

  const getCharLabel = (v: string) => characterOptions.find(c => c.value === v)?.label || v;
  const getSceneLabel = (v: string) => sceneOptions.find(s => s.value === v)?.label || v;

  const getEffectiveCharacter = () => {
    if (character !== 'auto') return character;
    return aiAnalysis?.character || 'cartoon';
  };

  const getEffectiveScene = () => {
    if (scene !== 'auto') return scene;
    return aiAnalysis?.environment || 'animated-nature';
  };

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

    const effectiveChar = getEffectiveCharacter();
    const effectiveScene = getEffectiveScene();

    try {
      if (isVideoType(type)) {
        // Step 1: AI Analysis if not done yet
        let analysis = aiAnalysis;
        if (!analysis && (character === 'auto' || scene === 'auto')) {
          setStatusText('🧠 جاري تحليل الوصف بالذكاء الاصطناعي...');
          try {
            const sceneCount = type === 'scene-generator' ? 4 : 3;
            const { data } = await supabase.functions.invoke('analyze-prompt', {
              body: { prompt, type, sceneCount },
            });
            if (data && !data.error) {
              analysis = data;
              setAiAnalysis(data);
            }
          } catch {
            console.warn('Auto-analysis failed, using defaults');
          }
          setProgress(10);
        }

        // Step 2: Generate scene images
        const sceneCount = type === 'scene-generator' ? 4 : 3;
        const capDuration = Math.min(duration, 15);
        let sceneImageUrls: string[] = [];

        // Use AI-generated scene prompts if available
        const scenePrompts = analysis?.scenes?.length
          ? analysis.scenes.slice(0, sceneCount)
          : buildDefaultScenePrompts(prompt, style, effectiveChar, effectiveScene, sceneCount);

        if (type === 'image-to-video' && sourceImage) {
          setStatusText('🎨 جاري إنتاج مشاهد متحركة من الصورة...');
          sceneImageUrls.push(sourceImage);

          for (let i = 0; i < Math.min(2, scenePrompts.length); i++) {
            setStatusText(`🎬 إنتاج المشهد ${i + 2}...`);
            try {
              const result = await generateImage(scenePrompts[i], style);
              sceneImageUrls.push(result.imageUrl);
            } catch {
              console.warn(`Scene ${i + 2} failed, skipping`);
            }
            setProgress(15 + ((i + 1) / sceneCount) * 20);
          }
        } else {
          for (let i = 0; i < scenePrompts.length; i++) {
            setStatusText(`🎬 إنتاج المشهد ${i + 1} من ${scenePrompts.length}...`);
            try {
              const result = await generateImage(scenePrompts[i], style);
              sceneImageUrls.push(result.imageUrl);
            } catch (err) {
              console.warn(`Scene ${i + 1} failed:`, err);
              if (sceneImageUrls.length === 0 && i === scenePrompts.length - 1) {
                throw new Error('فشل إنتاج جميع المشاهد. جرّب وصفاً أبسط.');
              }
            }
            setProgress(15 + ((i + 1) / scenePrompts.length) * 25);
          }
        }

        if (sceneImageUrls.length === 0) {
          throw new Error('فشل إنتاج المشاهد. جرّب وصفاً مختلفاً.');
        }

        // Step 3: Generate speech audio for merging
        let audioBlob: Blob | null = null;
        if (enableNarration) {
          setStatusText('🎤 جاري إنتاج الصوت...');
          const narrationText = analysis?.narrationText || prompt;
          audioBlob = await generateSpeechBlob(narrationText);
          setProgress(50);
        }

        // Step 4: Generate animated video with audio
        setStatusText('🎬 جاري إنتاج الفيديو المتحرك مع الصوت...');

        const videoBlob = await generateAnimatedVideo({
          sceneImages: sceneImageUrls,
          durationSec: capDuration,
          prompt,
          enableTalking: enableTalking && effectiveChar !== 'none',
          audioBlob,
          onProgress: (pct) => setProgress(55 + pct * 0.4),
        });

        const videoUrl = URL.createObjectURL(videoBlob);
        setProgress(100);
        setStatusText('✅ تم الإنتاج بنجاح! 🎬');

        updateProject(id, {
          status: 'ready',
          outputs: ['video.webm', ...sceneImageUrls.map((_, i) => `scene-${i + 1}.png`)],
          generatedImageUrl: sceneImageUrls[0],
          generatedVideoUrl: videoUrl,
        });

        toast.success(`تم إنتاج فيديو متحرك بـ ${sceneImageUrls.length} مشاهد${audioBlob ? ' مع صوت! 🔊' : '! 🎬'}`);
      } else if (type === 'text-to-audio') {
        setStatusText('🎤 جاري إنتاج الصوت...');
        const aiPrompt = buildSinglePrompt(type, prompt, style, effectiveChar, effectiveScene);
        const result = await generateImage(aiPrompt, style);
        setProgress(50);

        speakText(prompt);
        setProgress(100);
        setStatusText('✅ تم إنتاج الصوت!');

        updateProject(id, {
          status: 'ready',
          outputs: ['audio.wav'],
          generatedImageUrl: result.imageUrl,
        });
        toast.success('تم إنتاج الصوت بنجاح! 🎙️');
      } else {
        // text-to-image
        setStatusText('🎨 جاري إنتاج الصورة...');
        const aiPrompt = buildSinglePrompt(type, prompt, style, effectiveChar, effectiveScene);
        const result = await generateImage(aiPrompt, style);
        setProgress(100);
        setStatusText('✅ تم الإنتاج!');

        updateProject(id, {
          status: 'ready',
          outputs: ['generated-image.png'],
          generatedImageUrl: result.imageUrl,
        });
        toast.success('تم إنتاج الصورة بنجاح! 🎨');
      }

      setTimeout(() => {
        setProcessing(false);
        setPrompt('');
        setProgress(0);
        setStatusText('');
        setSourceImage(null);
        setAiAnalysis(null);
        navigate(`/project/${id}`);
      }, 600);
    } catch (err: any) {
      setProcessing(false);
      setProgress(0);
      setStatusText('');
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

      {/* Character & Scene Options */}
      {showCharacterScene && (
        <>
          <h2 className="mt-5 mb-2 text-base font-bold text-foreground flex items-center gap-1.5">
            <User className="h-4 w-4 text-primary" /> الشخصيات والبيئة
          </h2>
          
          <label className="text-sm text-muted-foreground mb-2 block">نوع الشخصية</label>
          <div className="flex gap-2 flex-wrap mb-3">
            {characterOptions.map(c => (
              <button
                key={c.value}
                onClick={() => setCharacter(c.value)}
                className={`rounded-xl px-3 py-2 text-xs font-semibold transition-all flex items-center gap-1 ${c.value === character ? 'gradient-primary text-primary-foreground' : 'bg-card text-foreground border border-border hover:bg-accent'}`}
              >
                <span>{c.emoji}</span> {c.label}
              </button>
            ))}
          </div>

          <label className="text-sm text-muted-foreground mb-2 block">الخلفية والبيئة</label>
          <div className="flex gap-2 flex-wrap mb-3">
            {sceneOptions.map(s => (
              <button
                key={s.value}
                onClick={() => setScene(s.value)}
                className={`rounded-xl px-3 py-2 text-xs font-semibold transition-all flex items-center gap-1 ${s.value === scene ? 'gradient-primary text-primary-foreground' : 'bg-card text-foreground border border-border hover:bg-accent'}`}
              >
                <span>{s.emoji}</span> {s.label}
              </button>
            ))}
          </div>

          {/* AI Analysis indicator */}
          {aiAnalysis && (
            <div className="rounded-xl bg-primary/10 border border-primary/20 p-3 mb-2">
              <p className="text-xs font-semibold text-primary mb-1">🤖 اقتراح الذكاء الاصطناعي:</p>
              <p className="text-xs text-foreground">
                الشخصية: <strong>{getCharLabel(aiAnalysis.character)}</strong> | 
                البيئة: <strong>{getSceneLabel(aiAnalysis.environment)}</strong> |
                المشاهد: <strong>{aiAnalysis.scenes?.length || 0}</strong>
              </p>
            </div>
          )}
        </>
      )}

      {/* Narration, Talking, Audio toggles */}
      {(isVideoType(type) || type === 'text-to-audio') && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-3 rounded-xl bg-card border border-border p-3">
            <button
              onClick={() => setEnableNarration(!enableNarration)}
              className={`w-10 h-6 rounded-full transition-all relative ${enableNarration ? 'bg-primary' : 'bg-muted'}`}
            >
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-primary-foreground transition-all ${enableNarration ? 'right-1' : 'left-1'}`} />
            </button>
            <div>
              <span className="text-sm font-semibold text-foreground">🔊 دمج الصوت في الفيديو</span>
              <p className="text-xs text-muted-foreground">سيتم دمج الرواية الصوتية مباشرة في ملف الفيديو</p>
            </div>
          </div>

          {isVideoType(type) && (
            <div className="flex items-center gap-3 rounded-xl bg-card border border-border p-3">
              <button
                onClick={() => setEnableTalking(!enableTalking)}
                className={`w-10 h-6 rounded-full transition-all relative ${enableTalking ? 'bg-primary' : 'bg-muted'}`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-primary-foreground transition-all ${enableTalking ? 'right-1' : 'left-1'}`} />
              </button>
              <div>
                <span className="text-sm font-semibold text-foreground">🗣️ تحريك الشخصية (فم وحركة)</span>
                <p className="text-xs text-muted-foreground">ستتحرك الشخصية وكأنها تتكلم مع تزامن حركة الفم</p>
              </div>
            </div>
          )}

          {isVideoType(type) && (
            <div className="rounded-xl bg-accent/50 border border-border p-3">
              <p className="text-xs text-muted-foreground">
                🎬 سيتم إنتاج <strong className="text-foreground">{type === 'scene-generator' ? '4' : '3'} مشاهد متتابعة</strong> بالذكاء الاصطناعي ودمجها في فيديو متحرك سينمائي
                {enableNarration && <span className="text-primary font-semibold"> مع صوت مدمج 🔊</span>}
              </p>
            </div>
          )}
        </div>
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
                onClick={() => setPrompt(t.prompt)}
                className="shrink-0 rounded-xl bg-card border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-accent transition-all"
              >
                {t.emoji} {t.title}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Prompt */}
      <h2 className="mt-6 mb-2 text-base font-bold text-foreground flex items-center gap-1.5">
        <Sparkles className="h-4 w-4 text-primary" /> صف ما تريد إنتاجه
      </h2>
      <textarea
        className="w-full h-28 rounded-2xl bg-card border border-border p-4 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
        placeholder={example}
        value={prompt}
        onChange={(e) => {
          setPrompt(e.target.value);
          setAiAnalysis(null); // Reset analysis when prompt changes
        }}
        disabled={processing}
      />

      {/* AI Analyze Button */}
      {showCharacterScene && prompt.trim() && !processing && (
        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          className="mt-2 w-full rounded-xl bg-accent border border-border py-2.5 text-sm font-semibold text-foreground flex items-center justify-center gap-2 hover:bg-primary/10 hover:border-primary/30 transition-all disabled:opacity-50"
        >
          <Wand2 className={`h-4 w-4 text-primary ${analyzing ? 'animate-spin' : ''}`} />
          {analyzing ? 'جاري التحليل بالذكاء الاصطناعي...' : '🤖 تحليل تلقائي (اختيار الشخصية والبيئة والمشاهد)'}
        </button>
      )}

      {/* Style */}
      <h2 className="mt-5 mb-2 text-sm font-bold text-foreground">الطابع البصري</h2>
      <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-5 px-5 pb-1">
        {styleOptions.map(s => (
          <button
            key={s}
            onClick={() => setStyle(s)}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-all ${s === style ? 'gradient-primary text-primary-foreground' : 'bg-card text-foreground border border-border hover:bg-accent'}`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Duration (for video/audio) */}
      {(isVideoType(type) || type === 'text-to-audio') && (
        <>
          <h2 className="mt-5 mb-2 text-sm font-bold text-foreground">المدة</h2>
          <div className="flex gap-2">
            {durationOptions.map(d => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${d === duration ? 'gradient-primary text-primary-foreground' : 'bg-card text-foreground border border-border hover:bg-accent'}`}
              >
                {d}ث
              </button>
            ))}
          </div>
        </>
      )}

      {/* Processing Overlay */}
      {processing && (
        <div className="mt-6 rounded-2xl bg-card border border-border p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-semibold text-foreground">{statusText || 'جاري الإنتاج...'}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full gradient-primary transition-all duration-300 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">{progress}%</p>
        </div>
      )}

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={processing}
        className="mt-6 w-full rounded-2xl gradient-primary py-4 text-base font-bold text-primary-foreground flex items-center justify-center gap-2 glow-primary hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-60"
      >
        {processing ? (
          <>
            <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            جاري الإنتاج...
          </>
        ) : (
          <>
            <Play className="h-4 w-4" />
            ابدأ الإنتاج الآن — مجاناً
          </>
        )}
      </button>
    </div>
  );
}

/** Fallback scene prompts when AI analysis isn't available */
function buildDefaultScenePrompts(
  prompt: string,
  style: string,
  character: string,
  scene: string,
  count: number
): string[] {
  const charDesc: Record<string, string> = {
    realistic: 'a realistic human character',
    cartoon: 'a cute cartoon character in anime style',
    fantasy: 'a magical fantasy character with glowing effects',
  };
  const sceneDesc: Record<string, string> = {
    'animated-nature': 'lush green nature with flowers, trees, flowing wind',
    'night-city': 'neon-lit futuristic city at night, glowing signs',
    'space': 'deep space with stars, nebulas, planets',
    'underwater': 'underwater ocean with coral, fish, light rays',
  };
  const charText = character !== 'none' ? `, featuring ${charDesc[character] || ''}` : '';
  const sceneText = scene !== 'none' ? `, set in ${sceneDesc[scene] || ''}` : '';

  const moments = [
    `Opening shot, establishing the scene: ${prompt}${charText}${sceneText}. Wide angle, dramatic lighting. Style: ${style}`,
    `Action moment, mid-scene: ${prompt}${charText}${sceneText}. Dynamic pose, movement blur. Close-up angle. Style: ${style}`,
    `Dramatic close-up with emotion: ${prompt}${charText}${sceneText}. Detailed expression, cinematic depth of field. Style: ${style}`,
    `Climax scene with peak action: ${prompt}${charText}${sceneText}. Dynamic composition, energy effects. Style: ${style}`,
    `Final scene, resolution: ${prompt}${charText}${sceneText}. Warm lighting, peaceful mood, golden hour. Style: ${style}`,
  ];
  return moments.slice(0, count);
}
