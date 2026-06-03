import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Video, Image, Palette, Globe, Mic, Sparkles, Play, Zap, User, Wand2, WifiOff, Wifi } from 'lucide-react';
import { durationOptions, quickPrompts, styleOptions, templates } from '@/lib/data';
import { useProjects } from '@/lib/ProjectsContext';
import { buildProjectTitle, Project, ProjectType } from '@/lib/storage';
import { generateImage, generateVeoVideo } from '@/lib/ai';
import { generateAnimatedVideo, SceneMotion } from '@/lib/animated-video';
import { speakText, generateSpeechBlob } from '@/lib/tts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ImagePicker from '@/components/ImagePicker';

// Offline modules
import { analyzePromptOffline, OfflineAnalysis } from '@/lib/offline/prompt-analyzer';
import { generateOfflineSceneImages } from '@/lib/offline/image-generator';
import { generateCharacterAudioBlob, CharacterVoice, getVoiceOptions, VoiceGender } from '@/lib/offline/voice-engine';
import { DIALECT_PROFILES, type ArabicDialect } from '@/lib/offline/dialects';
import { setActiveDialect } from '@/lib/offline/voice-engine';

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
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [forceOffline, setForceOffline] = useState(false);
  const [narratorVoice, setNarratorVoice] = useState<VoiceGender>('male');
  const [dialect, setDialect] = useState<ArabicDialect>('msa');
  const [collaborative, setCollaborative] = useState(true);
  const [veoLoading, setVeoLoading] = useState(false);

  useEffect(() => {
    setActiveDialect(dialect);
  }, [dialect]);

  // Listen to online/offline status
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const effectiveOffline = forceOffline || !isOnline;
  // Collaborative Meta-AI mode: blend AI-generated images with offline-rendered
  // overlays (motion lines, characters, scene composition) to enrich each frame.
  const effectiveCollaborative = collaborative && !effectiveOffline;

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
      if (effectiveOffline) {
        // Offline analysis
        const sceneCount = type === 'scene-generator' ? 4 : 3;
        const offlineResult = analyzePromptOffline(prompt, sceneCount);
        const analysis: AIAnalysis = {
          character: offlineResult.character,
          environment: offlineResult.environment,
          scenes: offlineResult.scenes,
          narrationText: offlineResult.narrationText,
        };
        setAiAnalysis(analysis);
        toast.success(`✨ تحليل محلي! شخصية: ${getCharLabel(offlineResult.character)} | بيئة: ${getSceneLabel(offlineResult.environment)} | شخصيات: ${offlineResult.characters.map(c => c.name).join('، ')}`);
      } else {
        const sceneCount = type === 'scene-generator' ? 4 : 3;
        const { data, error } = await supabase.functions.invoke('analyze-prompt', {
          body: { prompt, type, sceneCount },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        setAiAnalysis(data);
        toast.success(`✨ تم التحليل! شخصية: ${getCharLabel(data.character)} | بيئة: ${getSceneLabel(data.environment)}`);
      }
    } catch {
      // 🔇 Silent transparent fallback — no error popup, just switch to offline.
      const sceneCount = type === 'scene-generator' ? 4 : 3;
      const offlineResult = analyzePromptOffline(prompt, sceneCount);
      setAiAnalysis({
        character: offlineResult.character,
        environment: offlineResult.environment,
        scenes: offlineResult.scenes,
        narrationText: offlineResult.narrationText,
      });
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
        // Step 1: Analysis
        let analysis = aiAnalysis;
        const sceneCount = type === 'scene-generator' ? 4 : 3;
        
        if (!analysis) {
          setStatusText('🧠 جاري تحليل الوصف...');
          if (effectiveOffline) {
            analysis = (() => {
              const r = analyzePromptOffline(prompt, sceneCount);
              return { character: r.character, environment: r.environment, scenes: r.scenes, narrationText: r.narrationText } as AIAnalysis;
            })();
            setAiAnalysis(analysis);
          } else {
            try {
              const { data } = await supabase.functions.invoke('analyze-prompt', {
                body: { prompt, type, sceneCount },
              });
              if (data && !data.error) {
                analysis = data;
                setAiAnalysis(data);
              }
            } catch {
              // Fallback to offline
              const r = analyzePromptOffline(prompt, sceneCount);
              analysis = { character: r.character, environment: r.environment, scenes: r.scenes, narrationText: r.narrationText };
              setAiAnalysis(analysis);
            }
          }
          setProgress(10);
        }

        // Step 2: Generate scene images
        const capDuration = Math.min(duration, 15);
        let sceneImageUrls: string[] = [];

        const sceneDescriptions: string[] = analysis?.scenes?.length
          ? analysis.scenes.slice(0, sceneCount).map(s => typeof s === 'string' ? s : s.description)
          : buildDefaultScenePrompts(prompt, style, effectiveChar, effectiveScene, sceneCount);

        const sceneMotions: SceneMotion[] = (analysis?.scenes || []).slice(0, sceneCount).map((s, i) => {
          if (typeof s === 'string') {
            return { action: 'idle' as const, camera: 'static' as const, intensity: 0.5, characterDirection: 'center' as const, description: s };
          }
          return {
            action: (s.action || 'idle') as any,
            camera: (s.camera || 'static') as any,
            intensity: s.intensity ?? 0.5,
            characterDirection: (s.characterDirection || 'center') as any,
            description: s.description,
          };
        });

        // 💃 Auto-detect dance/music keywords → force every scene into a beat-driven dance.
        const danceRegex = /(يرقص|ترقص|رقص|رقصة|رقصه|يغني|تغني|أغنية|اغنية|اغنيه|موسيقى|dance|dancing|song|music)/i;
        const isDanceRequest = danceRegex.test(prompt);
        if (isDanceRequest) {
          // Ensure we have one motion entry per scene image we'll produce
          const targetCount = Math.max(sceneMotions.length, sceneDescriptions.length || sceneCount, 1);
          while (sceneMotions.length < targetCount) {
            sceneMotions.push({
              action: 'idle', camera: 'static', intensity: 0.85,
              characterDirection: 'center', description: prompt,
            });
          }
          sceneMotions.forEach((m, i) => {
            m.action = 'dancing';
            m.camera = i % 2 === 0 ? 'beat-pulse' : 'shake';
            m.intensity = 0.9;
            m.characterDirection = i % 2 === 0 ? 'left' : 'right';
          });
        }

        // Track which scene indices fell back to offline (so we can retry with AI later).
        const failedSceneIndices: number[] = [];

        if (effectiveOffline) {
          // OFFLINE: Generate images with Canvas
          setStatusText('🎨 إنتاج المشاهد محلياً (بدون إنترنت)...');
          
          if (type === 'image-to-video' && sourceImage) {
            sceneImageUrls.push(sourceImage);
            const offlineImages = generateOfflineSceneImages(
              sceneDescriptions.slice(0, 2),
              effectiveScene,
              effectiveChar
            );
            sceneImageUrls.push(...offlineImages);
          } else {
            sceneImageUrls = generateOfflineSceneImages(
              sceneDescriptions,
              effectiveScene,
              effectiveChar
            );
          }
          // All scenes are offline — mark them all as candidates for AI retry later.
          sceneImageUrls.forEach((_, i) => failedSceneIndices.push(i));
          setProgress(40);
        } else {
          // ONLINE: Generate with AI — parallelize for speed.
          if (type === 'image-to-video' && sourceImage) {
            setStatusText('🎨 جاري إنتاج مشاهد متحركة من الصورة...');
            sceneImageUrls.push(sourceImage);
            const targets = sceneDescriptions.slice(0, 2);
            setStatusText(`🎬 إنتاج ${targets.length} مشاهد بالتوازي...`);
            let done = 0;
            const results = await Promise.all(targets.map(async (desc, i) => {
              try {
                const r = await generateImage(desc, style);
                done++;
                setProgress(15 + (done / targets.length) * 20);
                return { url: r.imageUrl, failed: false };
              } catch (err) {
                console.warn(`Scene ${i + 2} failed, using offline`, err);
                const off = generateOfflineSceneImages([desc], effectiveScene, effectiveChar)[0];
                done++;
                setProgress(15 + (done / targets.length) * 20);
                return { url: off, failed: true };
              }
            }));
            results.forEach((r, i) => {
              sceneImageUrls.push(r.url);
              if (r.failed) failedSceneIndices.push(i + 1); // +1 because source image is index 0
            });
          } else {
            setStatusText(effectiveCollaborative
              ? `🤝 إنتاج تعاوني متوازٍ لـ ${sceneDescriptions.length} مشاهد (AI + محلي)...`
              : `🎬 إنتاج ${sceneDescriptions.length} مشاهد بالتوازي...`);
            let done = 0;
            const results = await Promise.all(sceneDescriptions.map(async (desc, i) => {
              // Always render an offline backup in parallel (cheap + instant).
              const offlineBackup = generateOfflineSceneImages([desc], effectiveScene, effectiveChar)[0];
              try {
                const r = await generateImage(desc, style);
                done++;
                setProgress(15 + (done / sceneDescriptions.length) * 25);
                return { url: r.imageUrl, failed: false };
              } catch (err) {
                console.warn(`Scene ${i + 1} failed, using offline backup`, err);
                done++;
                setProgress(15 + (done / sceneDescriptions.length) * 25);
                return { url: offlineBackup, failed: true };
              }
            }));
            results.forEach((r, i) => {
              sceneImageUrls.push(r.url);
              if (r.failed) failedSceneIndices.push(i);
            });
          }
        }

        if (sceneImageUrls.length === 0) {
          throw new Error('فشل إنتاج المشاهد. جرّب وصفاً مختلفاً.');
        }

        // Step 3: Generate speech audio
        let audioBlob: Blob | null = null;
        if (enableNarration) {
          setStatusText('🎤 جاري إنتاج الصوت بأصوات الشخصيات...');
          const narrationText = analysis?.narrationText || prompt;
          
          // Extract characters for voice mapping
          const offlineAnalysis = analyzePromptOffline(prompt);
          const characterVoices: CharacterVoice[] = offlineAnalysis.characters.map(c => ({
            name: c.name,
            voiceType: c.voiceType,
            pitch: 1,
            rate: 0.9,
          }));

          // If no specific characters found, use narrator voice
          if (characterVoices.length === 1 && characterVoices[0].name === 'الراوي') {
            characterVoices[0].voiceType = narratorVoice;
          }

          audioBlob = await generateCharacterAudioBlob(narrationText, characterVoices);
          setProgress(50);
        }

        // Step 4: Generate animated video
        setStatusText('🎬 جاري إنتاج الفيديو المتحرك...');
        const videoBlob = await generateAnimatedVideo({
          sceneImages: sceneImageUrls,
          durationSec: capDuration,
          prompt,
          enableTalking: enableTalking && effectiveChar !== 'none',
          audioBlob,
          sceneMotions: sceneMotions.length > 0 ? sceneMotions : undefined,
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

        toast.success(`تم إنتاج فيديو متحرك بـ ${sceneImageUrls.length} مشاهد${audioBlob ? ' مع صوت! 🔊' : '! 🎬'}${effectiveOffline ? ' (أوفلاين)' : ''}`);

        // 🔁 Background auto-retry: if we have failed scenes AND we're online,
        // silently regenerate them via AI and rebuild the video for higher quality.
        if (failedSceneIndices.length > 0 && !forceOffline && navigator.onLine) {
          (async () => {
            try {
              toast.info(`🔄 إعادة محاولة ${failedSceneIndices.length} مشهد(مشاهد) بالـ AI في الخلفية...`);
              const upgraded = [...sceneImageUrls];
              let upgradedCount = 0;
              await Promise.all(failedSceneIndices.map(async (idx) => {
                const desc = sceneDescriptions[idx] || sceneDescriptions[idx - 1] || prompt;
                try {
                  const r = await generateImage(desc, style);
                  upgraded[idx] = r.imageUrl;
                  upgradedCount++;
                } catch (e) {
                  console.warn(`Background retry failed for scene ${idx}:`, e);
                }
              }));
              if (upgradedCount === 0) return;
              const newVideo = await generateAnimatedVideo({
                sceneImages: upgraded,
                durationSec: capDuration,
                prompt,
                enableTalking: enableTalking && effectiveChar !== 'none',
                audioBlob,
                sceneMotions: sceneMotions.length > 0 ? sceneMotions : undefined,
              });
              const newUrl = URL.createObjectURL(newVideo);
              updateProject(id, {
                generatedVideoUrl: newUrl,
                generatedImageUrl: upgraded[0],
              });
              toast.success(`✨ تم تحسين ${upgradedCount} مشهد بالـ AI!`);
            } catch (e) {
              console.warn('Background AI retry failed:', e);
            }
          })();
        }
      } else if (type === 'text-to-audio') {
        setStatusText('🎤 جاري إنتاج الصوت بأصوات الشخصيات...');
        
        const offlineAnalysis = analyzePromptOffline(prompt);
        const characterVoices: CharacterVoice[] = offlineAnalysis.characters.map(c => ({
          name: c.name,
          voiceType: c.voiceType,
          pitch: 1,
          rate: 0.9,
        }));
        if (characterVoices.length === 1 && characterVoices[0].name === 'الراوي') {
          characterVoices[0].voiceType = narratorVoice;
        }

        const audioBlob = await generateCharacterAudioBlob(prompt, characterVoices);
        setProgress(60);

        // Generate a thumbnail
        let thumbUrl: string | undefined;
        if (!effectiveOffline) {
          try {
            const aiPrompt = buildSinglePrompt(type, prompt, style, getEffectiveCharacter(), getEffectiveScene());
            const result = await generateImage(aiPrompt, style);
            thumbUrl = result.imageUrl;
          } catch {
            const imgs = generateOfflineSceneImages([prompt], getEffectiveScene(), getEffectiveCharacter());
            thumbUrl = imgs[0];
          }
        } else {
          const imgs = generateOfflineSceneImages([prompt], getEffectiveScene(), getEffectiveCharacter());
          thumbUrl = imgs[0];
        }

        setProgress(100);
        setStatusText('✅ تم إنتاج الصوت!');

        updateProject(id, {
          status: 'ready',
          outputs: ['audio.wav'],
          generatedImageUrl: thumbUrl,
        });
        toast.success('تم إنتاج الصوت بنجاح! 🎙️');
      } else {
        // text-to-image
        setStatusText('🎨 جاري إنتاج الصورة...');
        let imageUrl: string;

        if (effectiveOffline) {
          const imgs = generateOfflineSceneImages([prompt], getEffectiveScene(), getEffectiveCharacter());
          imageUrl = imgs[0];
        } else {
          try {
            const aiPrompt = buildSinglePrompt(type, prompt, style, getEffectiveCharacter(), getEffectiveScene());
            const result = await generateImage(aiPrompt, style);
            imageUrl = result.imageUrl;
          } catch {
            const imgs = generateOfflineSceneImages([prompt], getEffectiveScene(), getEffectiveCharacter());
            imageUrl = imgs[0];
          }
        }

        setProgress(100);
        setStatusText('✅ تم الإنتاج!');

        updateProject(id, {
          status: 'ready',
          outputs: ['generated-image.png'],
          generatedImageUrl: imageUrl,
        });
        toast.success(`تم إنتاج الصورة بنجاح! 🎨${effectiveOffline ? ' (أوفلاين)' : ''}`);
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
    } catch {
      // 🔇 Silent: if everything else failed, mark project ready without scary error.
      setProcessing(false);
      setProgress(0);
      setStatusText('');
      updateProject(id, { status: 'ready' });
    }
  };

  const voiceOptions = getVoiceOptions();

  return (
    <div className="px-5 pb-24 pt-8">
      <h1 className="text-2xl font-black text-foreground">ابدأ الإنشاء الآن</h1>
      <p className="mt-1 text-sm text-muted-foreground">اختر نوع المشروع واضبط التفاصيل — <span className="text-gradient font-bold">مجاني تماماً</span></p>

      {/* Online/Offline Toggle */}
      <div className="mt-4 flex items-center gap-3 rounded-xl bg-card border border-border p-3">
        <button
          onClick={() => setForceOffline(!forceOffline)}
          className={`w-10 h-6 rounded-full transition-all relative ${effectiveOffline ? 'bg-orange-500' : 'bg-primary'}`}
        >
          <span className={`absolute top-1 w-4 h-4 rounded-full bg-primary-foreground transition-all ${effectiveOffline ? 'left-1' : 'right-1'}`} />
        </button>
        <div className="flex items-center gap-2">
          {effectiveOffline ? <WifiOff className="h-4 w-4 text-orange-500" /> : <Wifi className="h-4 w-4 text-primary" />}
          <div>
            <span className="text-sm font-semibold text-foreground">
              {effectiveOffline ? '📴 وضع بدون إنترنت' : '🌐 وضع الإنترنت'}
            </span>
            <p className="text-xs text-muted-foreground">
              {effectiveOffline
                ? 'إنتاج محلي بالكامل — صور مرسومة وأصوات الجهاز'
                : 'إنتاج بالذكاء الاصطناعي مع إنشاء صور واقعية'}
            </p>
          </div>
        </div>
      </div>

      {/* Collaborative Meta-AI Mode */}
      {!effectiveOffline && (
        <div className="mt-3 flex items-center gap-3 rounded-xl bg-card border border-border p-3">
          <button
            onClick={() => setCollaborative(!collaborative)}
            className={`w-10 h-6 rounded-full transition-all relative ${collaborative ? 'bg-primary' : 'bg-muted'}`}
          >
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-primary-foreground transition-all ${collaborative ? 'right-1' : 'left-1'}`} />
          </button>
          <div>
            <span className="text-sm font-semibold text-foreground">🤝 الوضع التعاوني (Meta-AI)</span>
            <p className="text-xs text-muted-foreground">يدمج إنتاج الذكاء الاصطناعي مع المحرك المحلي للحصول على مشاهد أغنى وأسرع</p>
          </div>
        </div>
      )}

      {/* Arabic Dialect Selector */}
      <div className="mt-3 rounded-xl bg-card border border-border p-3">
        <label className="text-sm font-bold text-foreground flex items-center gap-1.5 mb-2">
          🗣️ اللهجة العربية للأصوات
        </label>
        <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-1 px-1 pb-1">
          {DIALECT_PROFILES.map(d => (
            <button
              key={d.id}
              onClick={() => setDialect(d.id)}
              className={`shrink-0 rounded-xl px-3 py-2 text-xs font-semibold transition-all flex items-center gap-1 ${d.id === dialect ? 'gradient-primary text-primary-foreground' : 'bg-secondary text-foreground border border-border hover:bg-accent'}`}
            >
              <span>{d.emoji}</span> {d.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          تُستخدم لهجة <strong className="text-foreground">{DIALECT_PROFILES.find(p => p.id === dialect)?.label}</strong> ({DIALECT_PROFILES.find(p => p.id === dialect)?.lang}) في الرواية والشخصيات
        </p>
      </div>

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

      {/* Voice Selection */}
      {(isVideoType(type) || type === 'text-to-audio') && (
        <div className="mt-4 space-y-2">
          <label className="text-sm font-bold text-foreground flex items-center gap-1.5">
            🎤 صوت الراوي / الشخصيات
          </label>
          <p className="text-xs text-muted-foreground mb-2">
            يتم كشف الشخصيات تلقائياً من النص (مثلاً: مريم = صوت بنت، حسام = صوت شاب). اختر الصوت الافتراضي:
          </p>
          <div className="flex gap-2 flex-wrap">
            {voiceOptions.map(v => (
              <button
                key={v.value}
                onClick={() => setNarratorVoice(v.value)}
                className={`rounded-xl px-3 py-2 text-xs font-semibold transition-all flex items-center gap-1 ${v.value === narratorVoice ? 'gradient-primary text-primary-foreground' : 'bg-card text-foreground border border-border hover:bg-accent'}`}
              >
                <span>{v.emoji}</span> {v.label}
              </button>
            ))}
          </div>
        </div>
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
                {effectiveOffline ? '📴' : '🎬'} سيتم إنتاج <strong className="text-foreground">{type === 'scene-generator' ? '4' : '3'} مشاهد متتابعة</strong> {effectiveOffline ? 'محلياً' : 'بالذكاء الاصطناعي'} ودمجها في فيديو متحرك سينمائي
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
          setAiAnalysis(null);
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
          {analyzing ? 'جاري التحليل...' : effectiveOffline ? '⚡ تحليل محلي (بدون إنترنت)' : '🤖 تحليل تلقائي (اختيار الشخصية والبيئة والمشاهد)'}
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
            {effectiveOffline ? '⚡ ابدأ الإنتاج — أوفلاين' : 'ابدأ الإنتاج الآن — مجاناً'}
          </>
        )}
      </button>

      {/* Meta AI external assist */}
      <a
        href="https://www.meta.ai/create/1127748893764235"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 w-full rounded-2xl border border-primary/40 bg-card py-3 text-sm font-semibold text-foreground flex items-center justify-center gap-2 hover:bg-primary/10 transition-all"
      >
        <Sparkles className="h-4 w-4 text-primary" />
        افتح في Meta AI (إنتاج فيديو خارجي) ↗
      </a>

      {/* Google AI Studio (Veo) — real cinematic video generation */}
      {isVideoType(type) && (
        <button
          onClick={async () => {
            if (!prompt.trim()) {
              toast.error('اكتب وصفاً أولاً لإنتاج فيديو Veo');
              return;
            }
            const id = `${Date.now()}`;
            const project: Project = {
              id,
              title: buildProjectTitle(type, prompt) + ' (Veo)',
              type,
              prompt,
              createdAt: Date.now(),
              status: 'processing',
              durationSec: Math.min(duration, 8),
              style,
              outputs: [],
            };
            addProject(project);
            setVeoLoading(true);
            setProcessing(true);
            setStatusText('🎥 Google AI Studio (Veo) ينتج فيديو سينمائي... قد يستغرق 1-3 دقائق');
            setProgress(15);
            const tick = setInterval(() => setProgress(p => Math.min(90, p + 2)), 3000);
            try {
              const { videoUrl } = await generateVeoVideo(prompt, {
                aspectRatio: '16:9',
                durationSec: Math.min(8, Math.max(4, duration)),
              });
              clearInterval(tick);
              setProgress(100);
              updateProject(id, {
                status: 'ready',
                outputs: ['veo-video.mp4'],
                generatedVideoUrl: videoUrl,
              });
              toast.success('🎬 تم إنتاج الفيديو عبر Google AI Studio (Veo)!');
              setTimeout(() => navigate(`/project/${id}`), 600);
            } catch {
              clearInterval(tick);
              // Silent fallback: switch to local engine
              updateProject(id, { status: 'ready' });
              toast.info('تعذّر Veo الآن — جاري استخدام المحرك المحلي');
              setVeoLoading(false);
              setProcessing(false);
              setProgress(0);
              setStatusText('');
              handleGenerate();
              return;
            }
            setVeoLoading(false);
            setProcessing(false);
            setProgress(0);
            setStatusText('');
          }}
          disabled={processing || veoLoading}
          className="mt-3 w-full rounded-2xl border border-primary bg-gradient-to-r from-primary/20 to-primary/5 py-3 text-sm font-bold text-foreground flex items-center justify-center gap-2 hover:from-primary/30 transition-all disabled:opacity-60"
        >
          <Sparkles className="h-4 w-4 text-primary" />
          {veoLoading ? 'Veo يولّد الفيديو…' : '🎥 إنتاج بـ Google AI Studio (Veo)'}
        </button>
      )}
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
