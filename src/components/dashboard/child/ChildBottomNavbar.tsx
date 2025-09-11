
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Target, Gift, Medal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItemProps {
  href: string;
  label: string;
  icon: React.ElementType;
}

const NavLink = ({ href, label, icon: Icon }: NavItemProps) => {
    const pathname = usePathname();
    const isActive = pathname === href;
    
    return (
        <Link href={href} className="relative inline-flex h-full flex-col items-center justify-center px-2 hover:bg-muted/50 group flex-1">
          <div className={cn("absolute top-0 h-1 w-10 rounded-b-full bg-primary transition-opacity", isActive ? "opacity-100" : "opacity-0")}></div>
          <Icon className={cn("w-7 h-7 mb-1 text-muted-foreground group-hover:text-primary transition-colors", isActive && "text-primary")} />
          <span className={cn("text-xs text-muted-foreground group-hover:text-primary transition-colors", isActive && "text-primary font-semibold")}>
            {label}
          </span>
        </Link>
    )
}

export function ChildBottomNavbar({ childId }: { childId: string }) {
  const navItems: NavItemProps[] = [
    { href: `/dashboard/child/${childId}`, label: 'Missões', icon: Target },
    { href: `/dashboard/child/${childId}/rewards`, label: 'Recompensas', icon: Gift },
    { href: `/dashboard/child/${childId}/achievements`, label: 'Conquistas', icon: Medal },
  ];

  return (
    <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-background/80 border-t border-border backdrop-blur-sm">
      <div className="flex h-full max-w-lg mx-auto font-medium">
        {navItems.map((item) => (
            <NavLink key={item.href} {...item} />
        ))}
      </div>
    </div>
  );
}
