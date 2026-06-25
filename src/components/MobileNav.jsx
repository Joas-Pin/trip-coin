import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';
import { LayoutDashboard, Map, PlusCircle, ClipboardCheck } from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Início' },
  { to: '/viagens', icon: Map, label: 'Viagens' },
  { to: '/viagens/nova', icon: PlusCircle, label: 'Nova' },
  { to: '/aprovacoes', icon: ClipboardCheck, label: 'Aprovações' },
];

export default function MobileNav() {
  const location = useLocation();
  const { user } = useAuth();

  if (!user) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-card/95 backdrop-blur-md border-t border-border">
      <div className="flex items-center justify-around h-20 px-2 max-w-lg mx-auto pb-safe">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to ||
            (item.to !== '/' && location.pathname.startsWith(item.to));
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-4 py-3 rounded-xl min-w-[80px] min-h-[64px] touch-target transition-all duration-200',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )}
            >
              <Icon className={cn(
                'h-6 w-6 transition-all',
                isActive && 'drop-shadow-[0_0_6px_rgba(79,110,247,0.4)]'
              )} />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}