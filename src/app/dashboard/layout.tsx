
"use client";
import type { ReactNode } from 'react';
import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Footer } from '@/components/layout/Footer';
import { Loader2, ArrowLeft, Home, HelpCircle, Radar, Contact, PlusCircle, CalendarCheck2, Target, Gift } from 'lucide-react';
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
import type { ChildProfile } from '@/lib/types';
import { CalendarDays, NotebookPen } from 'lucide-react';


function DashboardMainContent({ children }: { children: ReactNode }) {
    const { loading: authLoading } = useAuth();
    const { isLoading: familyLoading } = useFamily();
    const isMobile = useIsMobile();
    
    // Show a centralized spinner while the initial auth and family context are loading.
    // This prevents the "flash" of different skeleton screens.
    if (authLoading || familyLoading) {
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
  const { currentContext, selectedChildId, setSelectedChildId, childrenInContext, isLoading: isFamilyLoading } = useFamily();
  const isMobile = useIsMobile();
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  const handleBackClick = () => {
    router.back();
  };

  const isRootDashboard = pathname === '/dashboard';

  const showContextSwitcher = isClient && ![
    '/dashboard/profile', 
    '/dashboard/settings', 
    '/dashboard/family', 
    '/dashboard/cuidando-solo', 
    '/dashboard/alliances', 
    '/dashboard/novo-heroi', 
    '/dashboard/assistente', 
    '/dashboard/help',
    '/dashboard/rewards',
    '/dashboard/rewards/new',
    '/dashboard/rewards/edit-template'
  ].some(p => pathname.startsWith(p));


  const headerContent = {
    '/dashboard/heroes': {
      title: 'Rotina Hoje',
      icon: Calendar1Icon,
      help: {
        title: 'Missões na palma da mão',
        content: (
          <>
            <p className="text-sm text-muted-foreground">Esta tela é o seu ponto de partida para a aventura! Aqui você tem uma visão rápida e poderosa de tudo o que está acontecendo com seus Mini Herois hoje.</p>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-4">
              <li><strong>Missões do Dia:</strong> Veja as missões agendadas para hoje e o progresso de cada herói. Para ver a agenda completa de todos os dias, clique em "Painel de Progresso" no card do herói ou acesse a "Rotina Semanal" no menu lateral.</li>
              <li><strong>Agenda Escolar:</strong> Acompanhe os horários de aulas para planejar melhor o dia. Para visualizar ou alterar a grade completa, visite a "Agenda Escolar" no menu lateral.</li>
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
     '/dashboard/missions': {
      title: 'Quadro de Missões',
      icon: Target,
      help: {
        title: 'O Catálogo de Aventuras',
        content: (
          <>
            <p className="text-sm text-muted-foreground">
              Esta tela é o seu <strong>catálogo central</strong>, onde você cria os "modelos" de todas as missões possíveis.
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-4">
                <li><strong>Crie Primeiro Aqui:</strong> Antes de agendar uma missão, crie-a neste quadro.</li>
                <li><strong>Atribua aos Herois:</strong> Use o botão "Gerenciar" em cada card para atribuir a missão na rotina de um ou mais heróis.</li>
            </ul>
             <p className="text-sm text-muted-foreground">
                Em resumo, aqui você constrói seu arsenal de missões. Na <strong>"Rotina Semanal"</strong>, você as coloca em ação!
             </p>
          </>
        )
      }
    },
    '/dashboard/rewards': {
      title: 'Baú de Recompensas',
      icon: Gift,
      help: {
        title: 'A Vitrine de Recompensas do Herói',
        content: (
          <>
            <p className="text-sm text-muted-foreground">
                Este é o seu catálogo, onde você cria os "tesouros" que seus heróis podem conquistar com estrelas.
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-4">
                <li><strong>Como funciona?</strong> Nós disponibilizamos várias ideias de recompensas. Você pode usá-las como estão, personalizá-las ou criar novas. Os Mini Heróis terão a visão das recompensas em seu perfil e poderão "solicitar o resgate" para sua aprovação.</li>
                <li><strong>Dica:</strong> Equilibre recompensas de experiências (um passeio, uma história extra) com itens materiais. As experiências fortalecem laços e criam memórias duradouras!</li>
            </ul>
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
        title: 'Rotina Semanal',
        icon: CalendarDays,
        help: {
            title: 'O Comando da Rotina',
            content: (
                <p className="text-sm text-muted-foreground">Esta é a sua central de comando para visualizar e gerenciar o dia a dia dos seus heróis. Agende missões recorrentes ou únicas e acompanhe o que precisa ser feito a cada dia. Use os filtros para alternar entre as visualizações de dia, semana ou mês.</p>
            )
        }
    },
    '/dashboard/school-schedule': {
        title: 'Agenda Escolar',
        icon: NotebookPen,
        help: {
            title: 'O Quadro de Horários',
            content: (
                <p className="text-sm text-muted-foreground">Use esta grade para visualizar a agenda escolar de cada herói. Isso ajuda a identificar os melhores horários para agendar missões e a evitar sobrecarga de atividades.</p>
            )
        }
    }
  }

  const getHeaderForPath = (path: string) => {
    if (!isClient) return undefined;
    if (path.startsWith('/dashboard/rewards')) return headerContent['/dashboard/rewards'];
    if (path.startsWith('/dashboard/missions')) return headerContent['/dashboard/missions'];
    return headerContent[path as keyof typeof headerContent];
  };

  const currentHeader = getHeaderForPath(pathname);
  
  const showHeroSelector = isClient &&
    ['/dashboard/heroes', '/dashboard/mural', '/dashboard/progressos', '/dashboard/agenda', '/dashboard/school-schedule'].includes(pathname) &&
    childrenInContext.length > 1;

  const showRewardsHeaderActions = isClient && pathname.startsWith('/dashboard/rewards');


  return (
    <>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <Sheet>
            <div className="flex flex-col" style={{ minHeight: '100svh' }}>
              <header className="sticky top-0 z-40 flex h-14 items-center justify-between bg-background/80 px-4 backdrop-blur-sm sm:h-16 sm:px-6">
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
              
              {(showContextSwitcher || showHeroSelector || showRewardsHeaderActions) && (
                 <div className="px-4 sm:px-6 py-2">
                      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-start gap-2">
                         <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
                            {showContextSwitcher && (
                                <div className="w-full md:max-w-xs">
                                    <FamilyContextSwitcher />
                                </div>
                            )}
                            {showHeroSelector && (
                                <div className="w-full md:max-w-xs">
                                    <HeroSelector heroes={childrenInContext} selectedHeroId={selectedChildId} onSelectHero={setSelectedChildId} showAllOption={true} />
                                </div>
                            )}
                         </div>
                          {showRewardsHeaderActions && (
                            <div className="flex items-center gap-2 w-full md:w-auto">
                                <FamilyContextSwitcher />
                                <Button asChild className="flex-grow">
                                    <Link href="/dashboard/rewards/new">
                                        <PlusCircle className="mr-2 h-4 w-4" /> Criar Recompensa
                                    </Link>
                                </Button>
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
