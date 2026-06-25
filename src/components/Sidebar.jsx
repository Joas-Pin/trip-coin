

import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';

import {
  LayoutDashboard,
  Map,
  PlusCircle,
  ClipboardCheck,
  Settings,
  Users,
  LogOut,
  ChevronLeft,
  Plane,
  ShieldCheck,
} from 'lucide-react';

const menuItems = {
  colaborador: [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/viagens', icon: Map, label: 'Minhas Viagens' },
    { to: '/viagens/nova', icon: PlusCircle, label: 'Nova Viagem' },
    { to: '/aprovacoes', icon: ClipboardCheck, label: 'Minhas Aprovações' },
    { to: '/mfa-setup', icon: ShieldCheck, label: 'Segurança 2FA' },
  ],
  gestor: [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/viagens', icon: Map, label: 'Viagens da Equipe' },
    { to: '/aprovacoes', icon: ClipboardCheck, label: 'Aprovações' },
    { to: '/configuracoes', icon: Settings, label: 'Configurações' },
    { to: '/mfa-setup', icon: ShieldCheck, label: 'Segurança 2FA' },
  ],
  financeiro: [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/viagens', icon: Map, label: 'Todas as Viagens' },
    { to: '/aprovacoes', icon: ClipboardCheck, label: 'Aprovações' },
    { to: '/configuracoes', icon: Settings, label: 'Parâmetros' },
    { to: '/mfa-setup', icon: ShieldCheck, label: 'Segurança 2FA' },
  ],
  admin: [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/viagens', icon: Map, label: 'Viagens' },
    { to: '/aprovacoes', icon: ClipboardCheck, label: 'Aprovações' },
    { to: '/admin', icon: Users, label: 'Administração' },
    { to: '/configuracoes', icon: Settings, label: 'Configurações' },
    { to: '/mfa-setup', icon: ShieldCheck, label: 'Segurança 2FA' },
  ],
};

export default function Sidebar({ onClose }) {
  const location = useLocation();
  const { user, profile, role, logout } = useAuth();
  const resolvedRole = role || 'colaborador';
  const normalizedRole = resolvedRole === "administrador" ? "admin" : resolvedRole;
  const items = menuItems[normalizedRole] || menuItems.colaborador;

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="flex flex-col h-full w-72 bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 h-16 border-b border-sidebar-border shrink-0">
        <div className="flex justify-center py-6">
          <img
            src="/apple-touch-icon.png"
            alt="Trip Close"
            className='h-12 w-auto' 
          />
        </div>
        <div>
          <h1 className="font-bold text-base text-foreground leading-tight">TripClose</h1>
          <p className="text-xs text-muted-foreground">Grupo Enviegas</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="ml-auto lg:hidden p-3 rounded-md hover:bg-accent/10 touch-target">
            <ChevronLeft className="h-5 w-5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const isActive = location.pathname === item.to || 
            (item.to !== '/' && location.pathname.startsWith(item.to));
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 min-h-[48px]',
                isActive
                  ? 'bg-primary/10 text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent'
              )}
            >
              <Icon className={cn('h-5 w-5', isActive && 'text-primary')} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-sidebar-border shrink-0 space-y-2">
        <div className="px-4 py-3 rounded-xl bg-sidebar-accent/50">
          <p className="text-xs text-muted-foreground truncate">{profile?.nome || user?.user_metadata?.full_name || user?.email || 'Usuário'}</p>
          <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">{normalizedRole}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium text-sidebar-foreground/70 hover:text-red-400 hover:bg-red-400/10 transition-all duration-200 w-full min-h-[48px]"
        >
          <LogOut className="h-5 w-5" />
          Sair
        </button>
      </div>
    </div>
  );
}
