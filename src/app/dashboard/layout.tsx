
"use client";
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Footer } from '@/components/layout/Footer';
import { Loader2 } from 'lucide-react';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';


export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading, isChildAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user && !isChildAuthenticated) {
        router.replace('/auth/login');
      }
      // Additional logic: if it's an admin user but they haven't onboarded (e.g. no children added yet)
      // and the current page is not onboarding, redirect to onboarding.
      // This would require checking if the user has completed onboarding.
      // For now, this check is simplified.
      // if (user && !user.onboardingCompleted && router.pathname !== '/dashboard/onboarding') {
      // router.replace('/dashboard/onboarding');
      // }
    }
  }, [user, loading, router, isChildAuthenticated]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // If not admin and not child, or loading still (should be caught by above), show loader or redirect
  if (!user && !isChildAuthenticated) {
     return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4">Redirecionando para o login...</p>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-col" style={{ minHeight: '100svh' }}>
          <main className="flex-1 container mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <Breadcrumbs />
            {children}
          </main>
          <Footer />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
