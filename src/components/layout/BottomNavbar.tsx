

"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { CalendarCheck2, CalendarDays, Settings, Menu, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/components/ui/sidebar';
import type { ReactNode } from 'react';
import { Calendar1Icon } from '../icons/Calendar1Icon';

const navItems = [
  { href: '/dashboard', label: 'Início', icon: Home, color: 'text-primary' },
  { href: '/dashboard/heroes', label: 'Hoje', icon: Calendar1Icon, color: 'text-chart-5' },
  { href: '/dashboard/agenda', label: 'Semana', icon: CalendarDays, color: 'text-chart-5' },
];

const NavLink = ({ href, label, icon: Icon, color }: typeof navItems[number]) => {
    const pathname = usePathname();
    const isActive = href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href) && href !== '/dashboard';
    
    return (
        <Link href={href} className="relative inline-flex h-full flex-col items-center justify-center px-2 hover:bg-muted/50 group">
          <div className={cn("absolute top-0 h-0.5 w-10 rounded-b-full bg-primary transition-opacity", isActive ? "opacity-100" : "opacity-0")}></div>
          <Icon className={cn("w-6 h-6 mb-1 text-muted-foreground group-hover:text-primary", isActive && color)} />
          <span className={cn("text-xs text-muted-foreground group-hover:text-primary", isActive && "text-primary font-semibold")}>
            {label}
          </span>
        </Link>
    )
}

export function BottomNavbar() {
  const pathname = usePathname();
  const { toggleSidebar } = useSidebar();
  const settingsActive = pathname.startsWith('/dashboard/settings');

  return (
    <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-background/80 border-t border-border backdrop-blur-sm">
      <div className="grid h-full max-w-lg grid-cols-5 mx-auto font-medium">
        <button
          type="button"
          onClick={toggleSidebar}
          className="relative inline-flex h-full flex-col items-center justify-center px-2 hover:bg-muted/50 group"
        >
          <Menu className="w-6 h-6 mb-1 text-muted-foreground group-hover:text-primary" />
          <span className="text-xs text-muted-foreground group-hover:text-primary">Mais</span>
        </button>
        {navItems.map((item) => (
            <NavLink key={item.href} {...item} />
        ))}
        <Link href="/dashboard/settings" className="relative inline-flex h-full flex-col items-center justify-center px-2 hover:bg-muted/50 group">
            <div className={cn("absolute top-0 h-0.5 w-10 rounded-b-full bg-primary transition-opacity", settingsActive ? "opacity-100" : "opacity-0")}></div>
            <Settings className={cn("w-6 h-6 mb-1 text-muted-foreground group-hover:text-primary", settingsActive && 'text-purple-500')} />
            <span className={cn("text-xs text-muted-foreground group-hover:text-primary", settingsActive && "text-primary font-semibold")}>
            Ajustes
            </span>
        </Link>
      </div>
    </div>
  );
}
