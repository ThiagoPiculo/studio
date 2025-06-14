
"use client";
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { UserNav } from './UserNav';
import { FamilyContextSwitcher } from './FamilyContextSwitcher';
import { Rocket, Users, ListChecks, ShieldCheck, LogIn, Gift } from 'lucide-react';

export function Header() {
  const { user, loading, isChildAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <Rocket className="h-8 w-8 text-primary" />
          <span className="font-headline text-2xl font-bold text-foreground">Mini Herois</span>
        </Link>
        
        <nav className="flex items-center space-x-2 md:space-x-4">
          {loading ? null : user ? (
            <>
              <Link href="/dashboard" passHref>
                <Button variant="ghost" className="text-foreground hover:bg-accent hover:text-accent-foreground px-2 md:px-3">Painel</Button>
              </Link>
              <Link href="/dashboard/family" passHref>
                <Button variant="ghost" className="flex items-center gap-1 md:gap-2 text-foreground hover:bg-accent hover:text-accent-foreground px-2 md:px-3">
                  <Users className="h-4 w-4" /> Família
                </Button>
              </Link>
              <Link href="/dashboard/tasks" passHref>
                <Button variant="ghost" className="flex items-center gap-1 md:gap-2 text-foreground hover:bg-accent hover:text-accent-foreground px-2 md:px-3">
                  <ListChecks className="h-4 w-4" /> Tarefas
                </Button>
              </Link>
              <Link href="/dashboard/rewards" passHref>
                <Button variant="ghost" className="flex items-center gap-1 md:gap-2 text-foreground hover:bg-accent hover:text-accent-foreground px-2 md:px-3">
                  <Gift className="h-4 w-4" /> Recompensas
                </Button>
              </Link>
              <FamilyContextSwitcher />
              <UserNav />
            </>
          ) : isChildAuthenticated ? (
            <>
              {/* Child specific nav items if any */}
              <UserNav /> {/* UserNav can be adapted for child logout */}
            </>
          ) : (
            <>
              <Link href="/auth/login" passHref>
                <Button variant="ghost" className="flex items-center gap-1 md:gap-2 text-foreground hover:bg-accent hover:text-accent-foreground px-2 md:px-3">
                  <LogIn className="h-4 w-4" /> Login Admin
                </Button>
              </Link>
              <Link href="/child-login" passHref>
                <Button variant="outline" className="border-primary text-primary hover:bg-primary/10 px-2 md:px-3">
                  <ShieldCheck className="h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Acesso Infantil</span>
                </Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
