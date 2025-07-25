
"use client";
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Footer } from '@/components/layout/Footer';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { Notifications } from '@/components/layout/Notifications';
import { FamilyContextSwitcher } from '@/components/layout/FamilyContextSwitcher';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';


export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading, isChildAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      // This is the main check: if there is no authenticated entity (neither user nor child),
      // redirect to the main login page.
      if (!user && !isChildAuthenticated) {
        router.replace('/auth/login');
      }
    }
  }, [user, loading, router, isChildAuthenticated]);
  
  const handleBackClick = () => {
    // Check if there is history to go back to.
    // window.history.length <= 2 means the user landed directly on a dashboard page
    // (e.g., from an external link or new tab), so "back" would take them off-site.
    if (window.history.length <= 2) {
      router.push('/dashboard'); 
    } else {
      router.back();
    }
  };


  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // If there's no user and no authenticated child, show a loading state while redirecting.
  // This prevents flashing the layout before the redirect happens.
  if (!user && !isChildAuthenticated) {
     return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4">Redirecionando para o login...</p>
      </div>
    );
  }

  // This layout is now primarily for the "Master User" (responsible).
  // The child-specific view is handled within the page components themselves,
  // but they will still be wrapped by this layout structure.
  return (
    <>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex flex-col" style={{ minHeight: '100svh' }}>
            <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm sm:h-16 sm:px-6">
              <div className="flex items-center gap-2 sm:gap-4">
                <SidebarTrigger className="md:hidden" />
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleBackClick}>
                  <ArrowLeft className="h-4 w-4" />
                  <span className="sr-only">Voltar</span>
                </Button>
                <FamilyContextSwitcher />
                <Separator orientation="vertical" className="h-6 hidden sm:block" />
                <Breadcrumbs />
              </div>
              <div className="flex items-center gap-2">
                <Notifications />
              </div>
            </header>
            <main className="flex-1 p-4 sm:p-6 lg:p-8 animate-in fade-in duration-300">
              {children}
            </main>
            <Footer />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </>
  );
}
