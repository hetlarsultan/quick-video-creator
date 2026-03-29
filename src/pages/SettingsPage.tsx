import { Trash2, Download, FolderOpen } from 'lucide-react';
import { useProjects } from '@/lib/ProjectsContext';
import { UsageBanner } from '@/components/UsageBanner';

export default function SettingsPage() {
  const { projects, clearProjects } = useProjects();

  return (
    <div className="px-5 pb-24 pt-8">
      <h1 className="text-2xl font-black text-foreground">حسابك</h1>
      <p className="mt-2 text-sm text-muted-foreground">تطبيق مجاني بالكامل مع حفظ المشاريع محلياً.</p>

      <div className="mt-5">
        <UsageBanner />
      </div>

      <div className="mt-5 space-y-3">
        <div className="rounded-2xl bg-card border border-border p-4 flex items-center gap-3">
          <Download className="h-5 w-5 text-primary flex-shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-foreground">تحميل بدون علامة مائية</h3>
            <p className="text-xs text-muted-foreground mt-1">جميع النتائج قابلة للتحميل بجودة عالية.</p>
          </div>
        </div>

        <div className="rounded-2xl bg-card border border-border p-4 flex items-center gap-3">
          <FolderOpen className="h-5 w-5 text-primary flex-shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-foreground">المشاريع المحفوظة</h3>
            <p className="text-xs text-muted-foreground mt-1">تم حفظ {projects.length} مشروع داخل التطبيق.</p>
          </div>
        </div>
      </div>

      <button
        onClick={() => {
          if (confirm('هل تريد حذف جميع المشاريع المحفوظة؟')) clearProjects();
        }}
        className="mt-5 w-full flex items-center justify-center gap-2 rounded-2xl bg-destructive py-3 text-sm font-bold text-destructive-foreground transition-all hover:opacity-90"
      >
        <Trash2 className="h-4 w-4" />
        مسح جميع المشاريع
      </button>

      <div className="mt-6 rounded-2xl bg-card border border-border p-5">
        <h3 className="text-base font-black text-foreground mb-2">مجاني إلى الأبد ✨</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          استمتع بتحويل النص والصور والفيديو والصوت بدون أي قيود أو رسوم.
        </p>
      </div>
    </div>
  );
}
