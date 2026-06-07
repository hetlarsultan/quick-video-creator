import { Trash2, Download, FolderOpen, Sparkles, Shield, Infinity, Info, ScrollText } from 'lucide-react';
import { useProjects } from '@/lib/ProjectsContext';
import { StatCard } from '@/components/StatCard';
import { Link } from 'react-router-dom';

export default function SettingsPage() {
  const { projects, clearProjects, stats } = useProjects();

  return (
    <div className="px-5 pb-24 pt-8">
      <h1 className="text-2xl font-black text-foreground">حسابك</h1>
      <p className="mt-1 text-sm text-muted-foreground">تطبيق مجاني بالكامل — بلا حدود أو رسوم.</p>

      {/* Free Forever Badge */}
      <div className="mt-5 rounded-2xl gradient-primary p-5 glow-primary relative overflow-hidden">
        <div className="absolute inset-0 animate-shimmer" />
        <div className="relative flex items-start gap-3">
          <Sparkles className="h-6 w-6 text-primary-foreground flex-shrink-0 animate-float" />
          <div>
            <h3 className="text-base font-black text-primary-foreground flex items-center gap-2">
              مجاني للأبد <span className="text-xl">∞</span>
            </h3>
            <p className="text-xs text-primary-foreground/70 mt-1 leading-relaxed">
              جميع الميزات مفتوحة بدون حدود. أنتج فيديو وصور وصوت مجاناً بلا قيود أو علامة مائية.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mt-5">
        <StatCard label="إجمالي المشاريع" value={stats.total} icon="📁" />
        <StatCard label="جاهز للتحميل" value={stats.ready} icon="✅" gradient="gradient-success" />
        <StatCard label="قيد المعالجة" value={stats.processing} icon="⏳" gradient="gradient-sunset" />
        <StatCard label="إجمالي المدة" value={`${stats.totalDuration}s`} icon="⏱️" gradient="gradient-warm" />
      </div>

      {/* Features */}
      <h2 className="mt-6 mb-3 text-base font-bold text-foreground">مميزات حسابك</h2>
      <div className="space-y-3">
        <div className="rounded-2xl bg-card border border-border p-4 flex items-center gap-3 card-hover">
          <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
            <Download className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">تحميل بدون علامة مائية</h3>
            <p className="text-xs text-muted-foreground mt-0.5">جميع النتائج بجودة عالية 1080p</p>
          </div>
        </div>

        <div className="rounded-2xl bg-card border border-border p-4 flex items-center gap-3 card-hover">
          <div className="h-10 w-10 rounded-xl gradient-success flex items-center justify-center flex-shrink-0">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">خصوصية كاملة</h3>
            <p className="text-xs text-muted-foreground mt-0.5">بياناتك محفوظة محلياً على جهازك فقط</p>
          </div>
        </div>

        <div className="rounded-2xl bg-card border border-border p-4 flex items-center gap-3 card-hover">
          <div className="h-10 w-10 rounded-xl gradient-warm flex items-center justify-center flex-shrink-0">
            <FolderOpen className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">مشاريع غير محدودة</h3>
            <p className="text-xs text-muted-foreground mt-0.5">أنشئ عدد لا نهائي من المشاريع</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <h2 className="mt-6 mb-3 text-base font-bold text-foreground">إدارة البيانات</h2>
      <Link
        to="/logs"
        className="w-full mb-2 flex items-center justify-center gap-2 rounded-2xl bg-card border border-border py-3 text-sm font-bold text-foreground hover:bg-accent transition-all"
      >
        <ScrollText className="h-4 w-4 text-primary" />
        📜 سجل أحداث Veo
      </Link>
      <button
        onClick={() => {
          if (confirm('هل تريد حذف جميع المشاريع المحفوظة؟ لا يمكن التراجع.')) clearProjects();
        }}
        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-destructive/10 border border-destructive/20 py-3 text-sm font-bold text-destructive transition-all hover:bg-destructive/20"
      >
        <Trash2 className="h-4 w-4" />
        مسح جميع المشاريع
      </button>

      {/* About */}
      <div className="mt-6 rounded-2xl bg-card border border-border p-5">
        <div className="flex items-center gap-2 mb-2">
          <Info className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">عن التطبيق</h3>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Agon — استوديو ذكاء اصطناعي لإنتاج الفيديو والصور والصوت. مجاني بالكامل وبدون أي قيود. صُمم بـ ❤️ لصنّاع المحتوى العرب.
        </p>
        <p className="text-[10px] text-muted-foreground mt-2">الإصدار 1.0.0</p>
      </div>
    </div>
  );
}
