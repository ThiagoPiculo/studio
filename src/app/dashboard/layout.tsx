
"use client";
import type { ReactNode } from 'react';
import React, from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Footer } from '@/components/layout/Footer';
import { Loader2, ArrowLeft, Home, HelpCircle } from 'lucide-react';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { Notifications } from '@/components/layout/Notifications';
import { FamilyContextSwitcher } from '@/components/layout/FamilyContextSwitcher';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { BottomNavbar } from '@/components/layout/BottomNavbar';
import { Sheet } from '@/components/ui/sheet';
import { Popover, PopoverTrigger, PopoverContent, PopoverClose } from '@/components/ui/popover';


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
  const pathname = usePathname();
  const { isChildAuthenticated } = useAuth();
  const isMobile = useIsMobile();
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);
  
  const handleBackClick = () => {
    router.back();
  };

  const isRootDashboard = pathname === '/dashboard';

  return (
    <>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <Sheet>
            <div className="flex flex-col" style={{ minHeight: '100svh' }}>
              <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm sm:h-16 sm:px-6">
                <div className="flex items-center gap-2 sm:gap-4">
                  {isClient && isMobile && !isRootDashboard && (
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleBackClick}>
                        <ArrowLeft className="mr-1 h-4 w-4" />
                        <span className="sr-only">Voltar</span>
                      </Button>
                  )}
                  {isRootDashboard ? (
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-bold font-headline">Espaços com Mini Herois</h1>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground shrink-0">
                                    <HelpCircle className="h-5 w-5" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                                <div className="space-y-3">
                                    <h4 className="font-medium leading-none">Comece escolhendo um espaço</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Esta tela é sua central de comando, oferecendo uma visão geral de todos os seus espaços de trabalho que você tem acesso e crianças para cuidar.
                                    </p>
                                    <ul className="text-sm text-muted-foreground space-y-2">
                                        <li><strong>Meu Espaço:</strong> Seu ambiente privado para cuidar dos heróis que só você acompanha, sem qualquer colaboração. Ideal para missões e recompensas pessoais. Se não quiser cuidar solo, não precisa usar este espaço.</li>
                                        <li><strong>Alianças:</strong> Espaços compartilhados onde você colabora com outros responsáveis (como co-pais, babás, cuidadoras, avós ou terapeutas). As missões, recompensas e heróis aqui são visíveis a todos os membros da aliança.</li>
                                    </ul>
                                     <p className="text-sm text-muted-foreground">
                                        Clique em um card para mergulhar no universo daquele espaço e começar a gerenciar o progresso dos heróis.
                                     </p>
                                    <PopoverClose asChild>
                                        <Button className="w-full">Entendi 👍</Button>
                                    </PopoverClose>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                  ) : (
                    <>
                      <Breadcrumbs />
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!isChildAuthenticated && <Notifications />}
                </div>
              </header>

              <div className="px-4 sm:px-6 py-2">
                <FamilyContextSwitcher />
              </div>

              <DashboardMainContent>{children}</DashboardMainContent>
              {isClient && isMobile && <BottomNavbar />}
              <Footer />
            </div>
          </Sheet>
        </SidebarInset>
      </SidebarProvider>
    </>
  );
}
