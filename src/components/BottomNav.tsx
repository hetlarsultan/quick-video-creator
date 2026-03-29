import { Link, useLocation } from 'react-router-dom';
import { Home, Plus, FolderOpen, MessageCircle, Settings } from 'lucide-react';

const tabs = [
  { path: '/', label: 'الرئيسية', icon: Home },
  { path: '/create', label: 'إنشاء', icon: Plus },
  { path: '/projects', label: 'مشاريع', icon: FolderOpen },
  { path: '/chat', label: 'شات', icon: MessageCircle },
  { path: '/settings', label: 'الحساب', icon: Settings },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-lg items-center justify-around py-2">
        {tabs.map(({ path, label, icon: Icon }) => {
          const active = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-semibold">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
