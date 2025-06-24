"use client";
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { UserNav } from './UserNav';
import { FamilyContextSwitcher } from './FamilyContextSwitcher';
import { Rocket, Users, ListChecks, ShieldCheck, LogIn, Gift, Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useState } from 'react';

export function Header() {
  const { user, loading, isChildAuthenticated } = useAuth();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const closeSheet = () => setIsSheetOpen(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between">
        <Link href="/" className="flex items-center space-x-2" onClick={closeSheet}>
          <Rocket className="h-8 w-8 text-primary" />
          <span className="font-headline text-2xl font-bold text-foreground">Mini Herois</span>
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-2 md:space-x-4">
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
              <UserNav />
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

        {/* Mobile Navigation */}
        <div className="md:hidden">
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetTrigger asChild>
                    <Button variant="outline" size="icon">
                        <Menu className="h-6 w-6" />
                        <span className="sr-only">Abrir menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] sm:w-[340px] flex flex-col p-0">
                    <div className="p-4 border-b">
                         <Link href="/" className="flex items-center space-x-2" onClick={closeSheet}>
                            <Rocket className="h-8 w-8 text-primary" />
                            <span className="font-headline text-2xl font-bold text-foreground">Mini Herois</span>
                        </Link>
                    </div>
                    <nav className="flex-grow p-4">
                      <div className="flex flex-col space-y-2">
                        {loading ? null : user ? (
                          <>
                             <div className="pb-2">
                                <FamilyContextSwitcher />
                             </div>
                            <Button asChild variant="ghost" className="w-full justify-start text-base p-4">
                                <Link href="/dashboard" onClick={closeSheet}>Painel</Link>
                            </Button>
                            <Button asChild variant="ghost" className="w-full justify-start gap-2 text-base p-4">
                                <Link href="/dashboard/family" onClick={closeSheet}><Users className="h-5 w-5" /> Família</Link>
                            </Button>
                            <Button asChild variant="ghost" className="w-full justify-start gap-2 text-base p-4">
                                <Link href="/dashboard/tasks" onClick={closeSheet}><ListChecks className="h-5 w-5" /> Tarefas</Link>
                            </Button>
                            <Button asChild variant="ghost" className="w-full justify-start gap-2 text-base p-4">
                                <Link href="/dashboard/rewards" onClick={closeSheet}><Gift className="h-5 w-5" /> Recompensas</Link>
                            </Button>
                          </>
                        ) : isChildAuthenticated ? (
                          <>
                            {/* Child-specific links can go here if needed */}
                          </>
                        ) : (
                          <>
                            <Button asChild variant="ghost" className="w-full justify-start gap-2 text-base p-4">
                              <Link href="/auth/login" onClick={closeSheet}><LogIn className="h-5 w-5" /> Login Admin</Link>
                            </Button>
                            <Button asChild variant="ghost" className="w-full justify-start gap-2 text-base p-4">
                              <Link href="/child-login" onClick={closeSheet}>
                                <ShieldCheck className="h-5 w-5" /> Acesso Infantil
                              </Link>
                            </Button>
                          </>
                        )}
                      </div>
                    </nav>
                    {!loading && (user || isChildAuthenticated) && (
                      <div className="mt-auto border-t p-4">
                        <UserNav />
                      </div>
                    )}
                </SheetContent>
            </Sheet>
        </div>
      </div>
    </header>
  );
}
