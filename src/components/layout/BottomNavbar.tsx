
"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { CalendarDays, Menu, Home, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/components/ui/sidebar';
import { Calendar1Icon } from '../icons/Calendar1Icon';
import { useFamily } from '@/contexts/FamilyContext';
import React from 'react';

const NavLink = ({ href, label, icon: Icon, color, isBypass = false }: { href: string, label: string, icon: React.ElementType, color: string, isBypass?: boolean }) => {
    const pathname = usePathname();
    const router = useRouter();
    const { openModal, selectedChildId } = useFamily();
    const isActive = href === '/dashboard' ? pathname === href : pathname.startsWith(href);
    
    const handleClick = (e: React.MouseEvent) => {
        if (isBypass) return; // Allow normal link behavior for "Início"
        
        e.preventDefault();
        if (selectedChildId) {
            router.push(href);
        } else {
            openModal(href);
        }
    };
    
    return (
        <a href={href} onClick={handleClick} className="relative inline-flex h-full flex-col items-center justify-center px-2 hover:bg-muted/50 group flex-1">
          <div className={cn("absolute top-0 h-1 w-10 rounded-b-full bg-primary transition-opacity", isActive ? "opacity-100" : "opacity-0")}></div>
          <Icon className={cn("w-7 h-7 mb-1 text-muted-foreground group-hover:text-primary transition-colors", isActive && color)} />
          <span className={cn("text-xs text-muted-foreground group-hover:text-primary transition-colors", isActive && "text-primary font-semibold")}>
            {label}
          </span>
        </a>
    )
}

const navItems = [
  { href: '/dashboard/heroes', label: 'Hoje', icon: Calendar1Icon, color: 'text-chart-5' },
  { href: '/dashboard/agenda', label: 'Semana', icon: CalendarDays, color: 'text-chart-1' },
  { href: '/dashboard', label: 'Início', icon: Home, color: 'text-primary', isBypass: true },
];


export function BottomNavbar() {
  const { toggleSidebar } = useSidebar();

  return (
    <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-background/80 border-t border-border backdrop-blur-sm">
      <div className="grid h-full max-w-lg grid-cols-4 mx-auto font-medium">
         <button
          type="button"
          onClick={toggleSidebar}
          className="relative inline-flex h-full flex-col items-center justify-center px-2 hover:bg-muted/50 group flex-1"
        >
          <div className="absolute top-0 h-1 w-10 rounded-b-full bg-primary transition-opacity opacity-0"></div>
          <Menu className="w-7 h-7 mb-1 text-muted-foreground group-hover:text-primary transition-colors" />
          <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
            Mais
          </span>
        </button>
        {navItems.map((item) => (
            <NavLink key={item.href} {...item} />
        ))}
      </div>
    </div>
  );
}
