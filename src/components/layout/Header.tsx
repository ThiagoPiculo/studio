
"use client";
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { UserNav } from './UserNav';
import { FamilyContextSwitcher } from './FamilyContextSwitcher';
import { Rocket, Users, ListChecks, ShieldCheck, LogIn } from 'lucide-react';

export function Header() {
  const { user, loading, isChildAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <Rocket className="h-8 w-8 text-primary" />
          <span className="font-headline text-2xl font-bold text-foreground">MiniHeroes</span>
        </Link>
        
        <nav className="flex items-center space-x-4">
          {loading ? null : user ? (
            <>
              <Link href="/dashboard">
                <Button variant="ghost" className="text-foreground hover:bg-accent/10">Dashboard</Button>
              </Link>
              <Link href="/dashboard/family">
                <Button variant="ghost" className="flex items-center gap-2 text-foreground hover:bg-accent/10">
                  <Users className="h-4 w-4" /> Family
                </Button>
              </Link>
              <Link href="/dashboard/tasks">
                <Button variant="ghost" className="flex items-center gap-2 text-foreground hover:bg-accent/10">
                  <ListChecks className="h-4 w-4" /> Tasks
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
              <Link href="/auth/login">
                <Button variant="ghost" className="flex items-center gap-2 text-foreground hover:bg-accent/10">
                  <LogIn className="h-4 w-4" /> Admin Login
                </Button>
              </Link>
              <Link href="/child-login">
                <Button variant="outline" className="border-primary text-primary hover:bg-primary/10">
                  <ShieldCheck className="h-4 w-4 mr-2" /> Child Access
                </Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
