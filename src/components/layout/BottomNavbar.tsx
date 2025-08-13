
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarCheck2, CalendarDays, Settings, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/components/ui/sidebar';
import type { ReactNode } from 'react';
import { Calendar1Icon } from '../icons/Calendar1Icon';

const navItems = [
  { href: '/dashboard/dashboard', label: 'Progressos', icon: CalendarCheck2, color: 'text-chart-1' },
  { href: '/dashboard/heroes', label: 'Hoje', icon: Calendar1Icon, color: 'text-chart-5' },
  { href: '/dashboard/agenda', label: 'Agenda', icon: CalendarDays, color: 'text-chart-5' },
];

export function BottomNavbar() {
  const pathname = usePathname();
  const { toggleSidebar } = useSidebar();

  return (
    <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-background/80 border-t border-border backdrop-blur-sm">
      <div className="grid h-full max-w-lg grid-cols-5 mx-auto font-medium">
        <button
          type="button"
          onClick={toggleSidebar}
          className="inline-flex flex-col items-center justify-center px-2 hover:bg-muted/50 group"
        >
          <Menu className="w-6 h-6 mb-1 text-muted-foreground group-hover:text-primary" />
          <span className="text-xs text-muted-foreground group-hover:text-primary">Mais</span>
        </button>
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="inline-flex flex-col items-center justify-center px-2 hover:bg-muted/50 group">
              <Icon className={cn("w-6 h-6 mb-1 text-muted-foreground group-hover:text-primary", isActive && item.color)} />
              <span className={cn("text-xs text-muted-foreground group-hover:text-primary", isActive && "text-primary font-semibold")}>
                {item.label}
              </span>
            </Link>
          );
        })}
        <Link href="/dashboard/settings" className="inline-flex flex-col items-center justify-center px-2 hover:bg-muted/50 group">
            <Settings className={cn("w-6 h-6 mb-1 text-muted-foreground group-hover:text-primary", pathname.startsWith('/dashboard/settings') && 'text-purple-500')} />
            <span className={cn("text-xs text-muted-foreground group-hover:text-primary", pathname.startsWith('/dashboard/settings') && "text-primary font-semibold")}>
            Ajustes
            </span>
        </Link>
      </div>
    </div>
  );
}
