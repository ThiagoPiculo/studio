
"use client";
import type { ReactNode } from 'react';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Footer } from '@/components/layout/Footer';
import { Loader2, ArrowLeft, UserCircle } from 'lucide-react';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { Notifications } from '@/components/layout/Notifications';
import { FamilyContextSwitcher } from '@/components/layout/FamilyContextSwitcher';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { BottomNavbar } from '@/components/layout/BottomNavbar';
import { Sheet, SheetTrigger, SheetContent } from '@/components/ui/sheet';
import { UserNav } from '@/components/layout/UserNav';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


function DashboardMainContent({ children }: { children: ReactNode }) {
    const { loading } = useAuth();
    const isMobile = useIsMobile();
    
    if (loading) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <main className={cn("flex-1 p-4 sm:p-6 lg:p-8 animate-in fade-in duration-300", isMobile && "pb-24")}>
            {children}
        </main>
    );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, childProfile, isChildAuthenticated } = useAuth();
  const isMobile = useIsMobile();
  const [isClient, setIsClient] = useState(false);
  const [isProfileSheetOpen, setIsProfileSheetOpen] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const displayName = isChildAuthenticated ? childProfile?.name : user?.name;
  const avatarSrc = isChildAuthenticated ? childProfile?.avatar : user?.avatarUrl;
  const avatarColor = isChildAuthenticated ? childProfile?.color : undefined;
  
  const getInitials = (name?: string | null) => {
    if (!name) return "MH";
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const handleBackClick = () => {
    router.back();
  };
  
  const ProfileSheetTrigger = (
      <SheetTrigger asChild>
        <button
            type="button"
            className="inline-flex flex-col items-center justify-center px-2 hover:bg-muted/50 group"
        >
            <Avatar className="h-6 w-6 mb-1">
              <AvatarImage src={avatarSrc || ''} alt={displayName || 'User'} />
              <AvatarFallback style={avatarColor ? {backgroundColor: avatarColor} : {}} className="text-xs">{getInitials(displayName)}</AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground group-hover:text-primary">Perfil</span>
        </button>
      </SheetTrigger>
  );

  return (
    <>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <Sheet open={isProfileSheetOpen} onOpenChange={setIsProfileSheetOpen}>
            <div className="flex flex-col" style={{ minHeight: '100svh' }}>
              <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm sm:h-16 sm:px-6">
                <div className="flex items-center gap-2 sm:gap-4">
                  {isClient && isMobile && (
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleBackClick}>
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Voltar</span>
                      </Button>
                  )}
                  <FamilyContextSwitcher />
                  <Separator orientation="vertical" className="h-6 hidden sm:block" />
                  <Breadcrumbs />
                </div>
                <div className="flex items-center gap-2">
                  <Notifications />
                </div>
              </header>
              <DashboardMainContent>{children}</DashboardMainContent>
              {isClient && isMobile && <BottomNavbar profileTrigger={ProfileSheetTrigger} />}
              <Footer />
            </div>
            
            <SheetContent side="right" className="p-0">
                <div className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground">
                    <UserNav />
                </div>
            </SheetContent>

          </Sheet>
        </SidebarInset>
      </SidebarProvider>
    </>
  );
}
