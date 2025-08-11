
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutGrid, CalendarDays, Users, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/components/ui/sidebar';
import type { ReactNode } from 'react';

const navItems = [
  { href: '/dashboard/dashboard', label: 'Painel', icon: LayoutGrid, color: 'text-chart-1' },
  { href: '/dashboard/heroes', label: 'Hoje', icon: Home, color: 'text-primary' },
  { href: '/dashboard/agenda', label: 'Agenda', icon: CalendarDays, color: 'text-chart-5' },
];

interface BottomNavbarProps {
    profileTrigger: ReactNode;
}

export function BottomNavbar({ profileTrigger }: BottomNavbarProps) {
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
        {profileTrigger}
      </div>
    </div>
  );
}
