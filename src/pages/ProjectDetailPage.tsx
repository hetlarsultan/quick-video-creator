import { useParams, useNavigate } from 'react-router-dom';
import { Sparkles, Timer, Download, FileText, ArrowRight, Heart, Trash2, Share2, CheckCircle, Clock, Eye, Play, Volume2, VolumeX } from 'lucide-react';
import { useProjects } from '@/lib/ProjectsContext';
import { toast } from 'sonner';
import { useState, useRef } from 'react';
import { speakText } from '@/lib/tts';

const typeLabel: Record<string, string> = {
  'text-to-video': '🎬 نص ➜ فيديو',
  'image-to-video': '📸 صور ➜ فيديو',
  'text-to-image': '🎨 نص ➜ صور',
  'scene-generator': '🌍 مشاهد تلقائية',
  'text-to-audio': '🎙️ نص ➜ صوت',
};

function downloadBlob(url: string, filename: string) {
  if (url.startsWith('blob:') || url.startsWith('data:')) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    fetch(url)
      .then(res => res.blob())
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      })
      .catch(() => window.open(url, '_blank'));
  }
}

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { projects, deleteProject, toggleFavorite, isFavorite } = useProjects();
  const project = projects.find((p) => p.id === id);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3">
        <span className="text-5xl">🔍</span>
        <p className="text-muted-foreground">المشروع غير موجود.</p>
        <button onClick={() => navigate('/')} className="text-sm text-primary font-semibold">العودة للرئيسية</button>
      </div>
    );
  }

  const fav = isFavorite(project.id);
  const created = new Date(project.createdAt);
  const hasImage = !!project.generatedImageUrl;
  const hasVideo = !!project.generatedVideoUrl;
  const hasSource = !!project.sourceImageUrl;
  const previewImage = hasImage ? project.generatedImageUrl : hasSource ? project.sourceImageUrl : null;
  const isVideoProject = ['text-to-video', 'image-to-video', 'scene-generator'].includes(project.type);
  const isAudioProject = project.type === 'text-to-audio';

  const handleDelete = () => {
    if (confirm('هل تريد حذف هذا المشروع؟')) {
      deleteProject(project.id);
      toast.success('تم حذف المشروع.');
      navigate('/projects');
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: project.title, text: project.prompt });
    } else {
      navigator.clipboard.writeText(`${project.title}\n${project.prompt}`);
      toast.success('تم نسخ تفاصيل المشروع!');
    }
  };

  const handleDownloadAll = () => {
    if (hasVideo) {
      downloadBlob(project.generatedVideoUrl!, `${project.title}.webm`);
      toast.success('تم تنزيل الفيديو إلى جهازك!');
    } else if (hasImage) {
      downloadBlob(project.generatedImageUrl!, `${project.title}.png`);
      toast.success('تم تنزيل الملف إلى جهازك!');
    } else if (hasSource) {
      downloadBlob(project.sourceImageUrl!, `${project.title}-source.png`);
      toast.success('تم تنزيل الصورة المصدر!');
    } else {
      toast.info('لا يوجد ملف قابل للتنزيل حالياً.');
    }
  };

  const handleDownloadFile = (filename: string) => {
    if (filename.endsWith('.webm') || filename.endsWith('.mp4')) {
      if (hasVideo) {
        downloadBlob(project.generatedVideoUrl!, filename);
        toast.success(`تم تنزيل ${filename}`);
        return;
      }
    }
    if (hasImage) {
      downloadBlob(project.generatedImageUrl!, filename);
      toast.success(`تم تنزيل ${filename}`);
    } else {
      toast.info('هذا الملف غير متوفر للتنزيل حالياً.');
    }
  };

  const handlePlayVideo = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleNarrate = () => {
    if (isSpeaking) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      speakText(project.prompt, () => setIsSpeaking(false));
    }
  };

  return (
    <div className="px-5 pb-24 pt-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowRight className="h-4 w-4" />
          رجوع
        </button>
        <div className="flex items-center gap-1">
          <button onClick={() => toggleFavorite(project.id)} className="p-2 rounded-xl hover:bg-accent transition-colors">
            <Heart className={`h-4 w-4 ${fav ? 'fill-destructive text-destructive' : 'text-muted-foreground'}`} />
          </button>
          <button onClick={handleShare} className="p-2 rounded-xl hover:bg-accent transition-colors">
            <Share2 className="h-4 w-4 text-muted-foreground" />
          </button>
          <button onClick={handleDelete} className="p-2 rounded-xl hover:bg-accent transition-colors">
            <Trash2 className="h-4 w-4 text-destructive" />
          </button>
        </div>
      </div>

      {/* Video Preview */}
      {hasVideo ? (
        <div className="w-full rounded-2xl border border-border mb-5 overflow-hidden relative bg-black">
          <video
            ref={videoRef}
            src={project.generatedVideoUrl}
            className="w-full h-auto"
            loop
            playsInline
            onClick={handlePlayVideo}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
          {/* Play overlay */}
          {!isPlaying && (
            <div
              className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
              onClick={handlePlayVideo}
            >
              <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center glow-primary">
                <Play className="h-7 w-7 text-primary-foreground ml-1" />
              </div>
            </div>
          )}
          <div className="absolute top-2 right-2 flex gap-2">
            <button
              onClick={() => setPreviewOpen(true)}
              className="bg-background/80 backdrop-blur-sm rounded-full p-2 hover:bg-background transition-colors"
            >
              <Eye className="h-4 w-4 text-foreground" />
            </button>
          </div>
          <div className="p-2 bg-card text-center flex items-center justify-center gap-3">
            <span className="text-xs text-success font-semibold">🎬 فيديو متحرك بالذكاء الاصطناعي</span>
            <button
              onClick={handleNarrate}
              className={`flex items-center gap-1 text-xs font-semibold rounded-full px-3 py-1 transition-all ${isSpeaking ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
            >
              {isSpeaking ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
              {isSpeaking ? 'إيقاف' : 'رواية'}
            </button>
          </div>
        </div>
      ) : previewImage ? (
        <div className="w-full rounded-2xl border border-border mb-5 overflow-hidden relative">
          <img
            src={previewImage}
            alt={project.title}
            className="w-full h-auto object-cover cursor-pointer"
            onClick={() => setPreviewOpen(true)}
          />
          <div className="absolute top-2 right-2">
            <button
              onClick={() => setPreviewOpen(true)}
              className="bg-background/80 backdrop-blur-sm rounded-full p-2 hover:bg-background transition-colors"
            >
              <Eye className="h-4 w-4 text-foreground" />
            </button>
          </div>
          <div className="p-2 bg-card text-center flex items-center justify-center gap-3">
            <span className="text-xs text-success font-semibold">
              {hasImage ? '✨ تم الإنتاج بالذكاء الاصطناعي' : '📸 صورة مصدر المشروع'}
            </span>
            {(isAudioProject || isVideoProject) && (
              <button
                onClick={handleNarrate}
                className={`flex items-center gap-1 text-xs font-semibold rounded-full px-3 py-1 transition-all ${isSpeaking ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
              >
                {isSpeaking ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                {isSpeaking ? 'إيقاف' : 'رواية'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="w-full h-52 rounded-2xl gradient-card border border-border mb-5 flex flex-col items-center justify-center gap-2 relative overflow-hidden">
          <span className="text-5xl">
            {project.type === 'text-to-video' ? '🎬' : project.type === 'text-to-image' ? '🎨' : project.type === 'text-to-audio' ? '🎙️' : '📸'}
          </span>
          <span className="text-xs text-muted-foreground">معاينة المشروع</span>
          {project.status === 'processing' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-secondary">
              <div className="h-full gradient-primary animate-pulse-glow" style={{ width: '60%' }} />
            </div>
          )}
        </div>
      )}

      {/* Fullscreen Preview Modal */}
      {previewOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setPreviewOpen(false)}
        >
          {hasVideo ? (
            <video
              src={project.generatedVideoUrl}
              className="max-w-full max-h-full rounded-lg"
              controls
              autoPlay
              loop
              playsInline
              onClick={(e) => e.stopPropagation()}
            />
          ) : previewImage ? (
            <img
              src={previewImage}
              alt={project.title}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          ) : null}
          <button
            className="absolute top-4 left-4 text-white bg-white/20 rounded-full px-4 py-2 text-sm font-semibold"
            onClick={() => setPreviewOpen(false)}
          >
            إغلاق ✕
          </button>
          <button
            className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white bg-primary/80 rounded-full px-6 py-2 text-sm font-semibold flex items-center gap-2"
            onClick={(e) => {
              e.stopPropagation();
              handleDownloadAll();
            }}
          >
            <Download className="h-4 w-4" />
            تنزيل
          </button>
        </div>
      )}

      {/* Status Badge */}
      <div className="mb-3">
        {project.status === 'ready' ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-success/10 text-success px-3 py-1 text-xs font-semibold">
            <CheckCircle className="h-3 w-3" /> جاهز للتحميل
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 text-warning px-3 py-1 text-xs font-semibold">
            <Clock className="h-3 w-3" /> قيد المعالجة
          </span>
        )}
      </div>

      {/* Title & Description */}
      <h1 className="text-xl font-black text-foreground">{project.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{project.prompt || 'بدون وصف'}</p>

      {/* Metadata */}
      <div className="mt-5 rounded-2xl bg-card border border-border p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-base">{typeLabel[project.type]?.split(' ')[0]}</span>
          <span className="text-sm text-foreground">{typeLabel[project.type]?.slice(2)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm text-foreground">الطابع: {project.style}</span>
        </div>
        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4 text-primary" />
          <span className="text-sm text-foreground">المدة: {project.durationSec} ثانية</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">📅 {created.toLocaleDateString('ar-SA')} — {created.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      {/* Output Files */}
      <h2 className="mt-6 mb-3 text-base font-bold text-foreground">الملفات الناتجة</h2>
      <div className="space-y-2">
        {project.outputs.map((file) => (
          <div key={file} className="flex items-center justify-between rounded-xl bg-card border border-border p-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm text-foreground">{file}</span>
            </div>
            <button
              onClick={() => handleDownloadFile(file)}
              className="text-xs text-primary font-semibold"
            >
              تحميل
            </button>
          </div>
        ))}
        {project.outputs.length === 0 && (
          <div className="text-center py-6 rounded-xl bg-card border border-border">
            <span className="text-2xl block mb-2">⏳</span>
            <p className="text-sm text-muted-foreground">سيتم تجهيز الملفات بعد انتهاء المعالجة.</p>
          </div>
        )}
      </div>

      {/* Download All */}
      {project.status === 'ready' && (hasImage || hasVideo) && (
        <button
          onClick={handleDownloadAll}
          className="mt-6 w-full rounded-2xl gradient-primary py-4 text-base font-bold text-primary-foreground flex items-center justify-center gap-2 glow-primary hover:scale-[1.01] transition-all"
        >
          <Download className="h-4 w-4" />
          {hasVideo ? 'تحميل الفيديو — مجاناً' : 'تحميل الكل — مجاناً'}
        </button>
      )}
    </div>
  );
}
