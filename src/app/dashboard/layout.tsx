
"use client";
import type { ReactNode } from 'react';
import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Footer } from '@/components/layout/Footer';
import { Loader2, ArrowLeft, Home, HelpCircle, Radar, Contact, PlusCircle, CalendarCheck2 } from 'lucide-react';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { Notifications } from '@/components/layout/Notifications';
import { FamilyContextSwitcher } from '@/components/layout/FamilyContextSwitcher';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { BottomNavbar } from '@/components/layout/BottomNavbar';
import { Sheet } from '@/components/ui/sheet';
import { Popover, PopoverTrigger, PopoverContent, PopoverClose } from '@/components/ui/popover';
import { Calendar1Icon } from '@/components/icons/Calendar1Icon';
import { Skeleton } from '@/components/ui/skeleton';
import { HeroSelector } from '@/components/dashboard/dashboard/HeroSelector';
import Link from 'next/link';
import { useFamily } from '@/contexts/FamilyContext';
import { getChildProfilesForAttribution } from '@/lib/firebase/firestore';
import type { ChildProfile } from '@/lib/types';
import { CalendarDays } from 'lucide-react';


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
  const { user } = useAuth();
  const { currentContext, selectedChildId, setSelectedChildId } = useFamily();
  const isMobile = useIsMobile();
  const [isClient, setIsClient] = React.useState(false);
  const [childrenInContext, setChildrenInContext] = useState<ChildProfile[]>([]);
  const [isLoadingChildren, setIsLoadingChildren] = useState(true);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (user && isClient) {
      setIsLoadingChildren(true);
      getChildProfilesForAttribution(user.uid, currentContext)
        .then(setChildrenInContext)
        .catch(console.error)
        .finally(() => setIsLoadingChildren(false));
    }
  }, [user, currentContext, isClient]);
  
  const handleBackClick = () => {
    router.back();
  };

  const isRootDashboard = pathname === '/dashboard';

  const showContextSwitcher = !['/dashboard/profile', '/dashboard/settings', '/dashboard/family', '/dashboard/cuidando-solo', '/dashboard/alliances'].includes(pathname);

  const headerContent = {
    '/dashboard': {
      title: 'Espaços e Alianças',
      icon: Radar,
      help: {
        title: 'Comece escolhendo um espaço',
        content: (
          <>
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
          </>
        )
      }
    },
    '/dashboard/heroes': {
      title: 'Resumo do Dia',
      icon: Calendar1Icon,
      help: {
        title: 'Missões na palma da mão',
        content: (
          <>
            <p className="text-sm text-muted-foreground">Esta tela é o seu ponto de partida para a aventura! Aqui você tem uma visão rápida e poderosa de tudo o que está acontecendo com seus Mini Herois hoje.</p>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-4">
              <li><strong>Missões do Dia:</strong> Veja as missões agendadas para hoje e o progresso de cada herói. Para ver a agenda completa de todos os dias, clique em "Painel de Progresso" no card do herói ou acesse a "Rotina de Missões" no menu lateral.</li>
              <li><strong>Rotina Escolar:</strong> Acompanhe os horários de aulas para planejar melhor o dia. Para visualizar ou alterar a grade completa, visite a "Rotina Escolar" no menu lateral.</li>
              <li><strong>Progresso e Recompensas:</strong> Acompanhe as Estrelas (⭐) e o XP, e veja os prêmios que eles podem resgatar.</li>
            </ul>
            <p className="text-sm text-muted-foreground">Use esta página para dar aquele incentivo matinal e celebrar as conquistas no final do dia!</p>
          </>
        )
      }
    },
    '/dashboard/mural': {
      title: 'Perfil Completo',
      icon: Contact,
      help: {
        title: 'O Painel de Controle do Herói',
        content: (
          <>
            <p className="text-sm text-muted-foreground">Este é o painel de controle completo para um herói. Use as abas para gerenciar missões, recompensas, perfil e muito mais.</p>
          </>
        )
      }
    },
    '/dashboard/progressos': {
        title: 'Painel de Progressos',
        icon: CalendarCheck2,
        help: {
            title: 'Central de Análises',
            content: (
                <p className="text-sm text-muted-foreground">Esta é a sua central de análises para acompanhar a jornada dos seus heróis, com gráficos de desempenho, recompensas desbloqueadas e as últimas medalhas conquistadas.</p>
            )
        }
    },
     '/dashboard/agenda': {
        title: 'Rotina de Missões',
        icon: CalendarDays,
        help: {
            title: 'O Comando da Rotina',
            content: (
                <p className="text-sm text-muted-foreground">Esta é a sua central de comando para visualizar e gerenciar o dia a dia dos seus heróis. Agende missões recorrentes ou únicas e acompanhe o que precisa ser feito a cada dia. Use os filtros para alternar entre as visualizações de dia, semana ou mês.</p>
            )
        }
    }
  }

  const currentHeader = isClient ? headerContent[pathname as keyof typeof headerContent] : undefined;
  const showHeroSelector = isClient && (pathname === '/dashboard/heroes' || pathname === '/dashboard/mural' || pathname === '/dashboard/progressos' || pathname === '/dashboard/agenda');

  return (
    <>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <Sheet>
            <div className="flex flex-col" style={{ minHeight: '100svh' }}>
              <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm sm:h-16 sm:px-6">
                <div className="flex items-center gap-2 sm:gap-4">
                  {isClient && isMobile && !currentHeader && (
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleBackClick}>
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Voltar</span>
                      </Button>
                  )}
                  {isClient && currentHeader ? (
                    <div className="flex items-center gap-3">
                        <currentHeader.icon className="h-6 w-6 text-primary" />
                        <h1 className="text-2xl font-bold font-headline">{currentHeader.title}</h1>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground shrink-0">
                                    <HelpCircle className="h-5 w-5" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                                <div className="space-y-3">
                                    <h4 className="font-medium leading-none">{currentHeader.help.title}</h4>
                                    {currentHeader.help.content}
                                    <PopoverClose asChild>
                                        <Button className="w-full">Entendi 👍</Button>
                                    </PopoverClose>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                  ) : isClient && !currentHeader ? (
                      <Breadcrumbs />
                  ) : (
                    <Skeleton className="h-8 w-48" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!user?.isAnonymous && <Notifications />}
                </div>
              </header>
              
              {showContextSwitcher && (
                 <div className="px-4 sm:px-6 py-2 border-b">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <FamilyContextSwitcher />
                     <div className="hidden sm:block">
                        {isClient && showHeroSelector && (
                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            {isLoadingChildren ? (
                              <Skeleton className="h-10 w-72" />
                            ) : (
                              <HeroSelector heroes={childrenInContext} selectedHeroId={selectedChildId} onSelectHero={setSelectedChildId} showAllOption={true} />
                            )}
                            {pathname === '/dashboard/agenda' && (
                               <Button onClick={() => {
                                const dialogTrigger = document.getElementById('add-mission-dialog-trigger');
                                dialogTrigger?.click();
                               }}
                                >
                                <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Missão
                              </Button>
                            )}
                          </div>
                        )}
                    </div>
                  </div>
                   <div className="block sm:hidden mt-4">
                        {isClient && showHeroSelector && (
                           <div className="flex items-center gap-2 w-full sm:w-auto">
                              {isLoadingChildren ? (
                                <Skeleton className="h-10 flex-grow" />
                              ) : (
                                <HeroSelector heroes={childrenInContext} selectedHeroId={selectedChildId} onSelectHero={setSelectedChildId} showAllOption={true} />
                              )}
                              {pathname === '/dashboard/agenda' && (
                                <Button size="icon" onClick={() => {
                                  const dialogTrigger = document.getElementById('add-mission-dialog-trigger');
                                  dialogTrigger?.click();
                                }}>
                                  <PlusCircle className="h-4 w-4" />
                                </Button>
                              )}
                           </div>
                        )}
                    </div>
                </div>
              )}

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
