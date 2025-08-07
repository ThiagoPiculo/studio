
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
  const { user, loading, logout, isChildAuthenticated } = useAuth();
  const [isConfirmingLogout, setIsConfirmingLogout] = useState(false);

  const handleBackClick = () => {
    setIsConfirmingLogout(true);
  };
  
  const handleConfirmLogout = async () => {
    setIsConfirmingLogout(false);
    await logout();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // If loading is finished and there's still no user, the AuthContext will handle the redirect.
  // This layout should only render if a user (admin or child) is confirmed.
  if (!user && !isChildAuthenticated) {
     return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-4">Verificando credenciais...</p>
        </div>
     );
  }

  return (
    <>
      <AlertDialog open={isConfirmingLogout} onOpenChange={setIsConfirmingLogout}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Você tem certeza que deseja sair?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta ação irá encerrar sua sessão atual. Você precisará fazer login novamente para acessar o painel.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Permanecer</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmLogout}>
                    Confirmar Logout
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
