import { useParams, useNavigate } from 'react-router-dom';
import { Sparkles, Timer, Download, FileText, ArrowRight } from 'lucide-react';
import { useProjects } from '@/lib/ProjectsContext';
import { toast } from 'sonner';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { projects } = useProjects();
  const project = projects.find((p) => p.id === id);

  if (!project) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">المشروع غير موجود.</p>
      </div>
    );
  }

  return (
    <div className="px-5 pb-24 pt-8">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-primary mb-4 hover:underline">
        <ArrowRight className="h-4 w-4" />
        رجوع
      </button>

      <div className="w-full h-48 rounded-2xl gradient-primary mb-5 flex items-center justify-center">
        <span className="text-primary-foreground/50 text-sm">معاينة المشروع</span>
      </div>

      <h1 className="text-xl font-black text-foreground">{project.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{project.prompt || 'بدون وصف'}</p>

      <div className="mt-5 rounded-2xl bg-card border border-border p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm text-foreground">الطابع: {project.style}</span>
        </div>
        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4 text-primary" />
          <span className="text-sm text-foreground">المدة: {project.durationSec} ثانية</span>
        </div>
        <div className="flex items-center gap-2">
          <Download className="h-4 w-4 text-primary" />
          <span className="text-sm text-foreground">تحميل بدون علامة مائية</span>
        </div>
      </div>

      <h2 className="mt-6 mb-3 text-base font-bold text-foreground">الملفات الناتجة</h2>
      <div className="space-y-2">
        {project.outputs.map((file) => (
          <div key={file} className="flex items-center gap-2 rounded-xl bg-card border border-border p-3">
            <FileText className="h-4 w-4 text-primary" />
            <span className="text-sm text-foreground">{file}</span>
          </div>
        ))}
        {project.outputs.length === 0 && (
          <p className="text-sm text-muted-foreground">سيتم تجهيز الملفات بعد انتهاء المعالجة.</p>
        )}
      </div>

      <button
        onClick={() => toast.success('تم تنزيل الملفات بدون علامة مائية.')}
        className="mt-6 w-full rounded-2xl gradient-primary py-4 text-base font-bold text-primary-foreground flex items-center justify-center gap-2 glow-primary hover:scale-[1.01] transition-all"
      >
        <Download className="h-4 w-4" />
        تحميل النتائج
      </button>
    </div>
  );
}
