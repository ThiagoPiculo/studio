

"use client";

import React, { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, BookOpen, ChevronsRight, Contact, FilePlus, GitBranch, Handshake, Heart, HelpCircle, ListChecks, PlusCircle, UserPlus, Users, Wand2, CalendarDays, NotebookPen, CalendarCheck, Gift, Target, Link as LinkIcon, X, Sparkles } from 'lucide-react';
import { useFamily } from '@/contexts/FamilyContext';
import { useRouter } from 'next/navigation';
import { Calendar1Icon } from '@/components/icons/Calendar1Icon';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useIsMobile } from '@/hooks/use-mobile';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { GettingStartedGuide } from '@/components/dashboard/GettingStartedGuide';
import type { ChildProfile, MissionInstance, RewardTemplate } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { getChildProfilesForAttribution, getMissionInstancesForContext, getRewardTemplatesByOwnerOrFamily } from '@/lib/firebase/firestore';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';


function DesktopDashboardCard({
  icon: Icon,
  title,
  description,
  href,
  bypassModal = false,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  href?: string;
  bypassModal?: boolean;
}) {
  const router = useRouter();
  const { selectedChildId, openModal } = useFamily();

  const isModalTrigger = !bypassModal;

  const handleClick = (e: React.MouseEvent) => {
    if (isModalTrigger) {
      e.preventDefault();
      if (selectedChildId) {
        router.push(href || '/dashboard');
      } else {
        openModal(href);
      }
    }
  };

  const cardContent = (
    <Card 
      className="shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all h-full flex flex-col cursor-pointer"
      role="button"
      tabIndex={0}
      onClick={isModalTrigger ? handleClick : undefined}
       onKeyDown={(e) => {
          if (isModalTrigger && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            if (selectedChildId) {
              router.push(href || '/dashboard');
            } else {
              openModal(href);
            }
          }
        }}
    >
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-primary/10 rounded-xl shadow-clay">
                <Icon className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="font-headline text-lg">{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardFooter className="mt-auto">
        <Button variant="outline" className="w-full justify-between" tabIndex={-1}>
          Acessar
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );

  return isModalTrigger ? cardContent : <Link href={href || '#'} className="h-full">{cardContent}</Link>;
}

function MobileDashboardCard({
  icon: Icon,
  title,
  description,
  href,
  bypassModal = false,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  href?: string;
  bypassModal?: boolean;
}) {
  const router = useRouter();
  const { selectedChildId, openModal } = useFamily();
  
  const isModalTrigger = !bypassModal;

  const handleClick = (e: React.MouseEvent) => {
    if (isModalTrigger) {
      e.preventDefault();
      if (selectedChildId) {
        router.push(href || '/dashboard');
      } else {
        openModal(href);
      }
    }
  };

  const cardContent = (
      <Card 
          className="shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all h-full flex flex-col cursor-pointer text-center relative"
          role="button"
          tabIndex={0}
          onClick={isModalTrigger ? handleClick : undefined}
          onKeyDown={(e) => {
              if (isModalTrigger && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                if (selectedChildId) {
                  router.push(href || '/dashboard');
                } else {
                  openModal(href);
                }
              }
            }}
        >
          <CardContent className="p-4 flex flex-col items-center justify-center gap-2 flex-grow">
              <div className="p-3 bg-primary/10 rounded-2xl shadow-clay mb-2">
                  <Icon className="h-7 w-7 text-primary" />
              </div>
              <CardTitle className="font-headline text-base leading-tight">{title}</CardTitle>
          </CardContent>
          <Popover>
              <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 text-muted-foreground" onClick={(e) => e.stopPropagation()}>
                    <HelpCircle className="h-4 w-4"/>
                  </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 text-sm" onClick={(e) => e.stopPropagation()}>
                {description}
              </PopoverContent>
          </Popover>
      </Card>
  );

  return isModalTrigger ? cardContent : <Link href={href || '#'} className="h-full">{cardContent}</Link>;
}


function DashboardPage() {
    const { user, loading: authLoading } = useAuth();
    const { openModal, selectedChildId, currentContext, isLoading: isFamilyLoading } = useFamily();
    const router = useRouter();
    const isMobile = useIsMobile();
    
    const [children, setChildren] = useState<ChildProfile[]>([]);
    const [missions, setMissions] = useState<MissionInstance[]>([]);
    const [rewards, setRewards] = useState<RewardTemplate[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);

    const [isGuideVisible, setIsGuideVisible] = useState(false);

    useEffect(() => {
        const guideDismissed = localStorage.getItem('gettingStartedCardDismissed') === 'true';
        if (!guideDismissed) {
            setIsGuideVisible(true);
        }
    }, []);

    const handleDismissGuide = () => {
        localStorage.setItem('gettingStartedCardDismissed', 'true');
        setIsGuideVisible(false);
    };

    useEffect(() => {
        if (authLoading || isFamilyLoading || !user) {
            if (!user && !authLoading) setIsLoadingData(false);
            return;
        }

        const familyIdToQuery = currentContext === 'my-space' ? null : currentContext;
        const fetchData = async () => {
            setIsLoadingData(true);
            try {
                const [childData, missionData, rewardData] = await Promise.all([
                    getChildProfilesForAttribution(user.uid, currentContext),
                    getMissionInstancesForContext(user.uid, currentContext),
                    getRewardTemplatesByOwnerOrFamily(user.uid, familyIdToQuery)
                ]);
                setChildren(childData);
                setMissions(missionData);
                setRewards(rewardData);
            } catch (error) {
                console.error("Error fetching dashboard content data:", error);
            } finally {
                setIsLoadingData(false);
            }
        };

        fetchData();
    }, [user, currentContext, authLoading, isFamilyLoading]);
    
    const DashboardCard = isMobile ? MobileDashboardCard : DesktopDashboardCard;
    const gridClasses = isMobile ? "grid-cols-2 sm:grid-cols-3 gap-3" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6";

  return (
    <div className="space-y-8">
      {isGuideVisible && (
        <Accordion type="single" collapsible defaultValue="item-1" className="w-full">
            <AccordionItem value="item-1" className="border-primary/20 bg-primary/5 rounded-2xl shadow-lg">
                <AccordionTrigger className="p-4 hover:no-underline text-lg font-semibold">
                    <div className="flex items-center gap-2">
                        <Wand2 className="h-6 w-6 text-primary"/>
                        Comece por Aqui!
                    </div>
                </AccordionTrigger>
                <AccordionContent className="p-6 pt-0">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card className="bg-background/70">
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-5 w-5 text-chart-4"/>Assistente de Criação</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Button asChild className="w-full">
                                    <Link href="/dashboard/assistente">Usar o Assistente de Criação</Link>
                                </Button>
                            </CardContent>
                        </Card>
                        <Card className="bg-background/70">
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2"><LinkIcon className="h-5 w-5 text-primary"/>Colaborar em Aliança</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Button asChild variant="secondary" className="w-full">
                                    <Link href="/dashboard/family?action=join">Entrar em aliança com convite</Link>
                                </Button>
                                <div className="grid grid-cols-2 gap-2">
                                <Button asChild variant="secondary" className="w-full">
                                    <Link href="/dashboard/family?action=create">Criar Aliança</Link>
                                </Button>
                                <Button asChild variant="secondary" className="w-full">
                                    <Link href="/dashboard/alliances">Gerenciar Alianças</Link>
                                </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="mt-4 text-right">
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-muted-foreground text-xs">
                                    <X className="mr-1 h-3 w-3"/>
                                    Ocultar
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Ocultar esta seção?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Esta seção de atalhos rápidos será ocultada da sua tela inicial. Você sempre poderá encontrar estas opções na Central de Ajuda ou no menu lateral.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDismissGuide}>
                                        Sim, ocultar
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
      )}
      
      <div>
          <h2 className="text-2xl font-headline font-bold mb-4 flex items-center gap-2">Meus Mini Heróis</h2>
          <div className={cn("grid", gridClasses)}>
              <DashboardCard 
                  icon={Calendar1Icon}
                  title="Rotina do Dia"
                  description="Veja as missões agendadas para hoje e acompanhe o progresso em tempo real."
                  href="/dashboard/heroes"
              />
              <DashboardCard 
                  icon={CalendarDays}
                  title="Rotina da Semana"
                  description="Visualize o calendário completo com a programação de missões da semana."
                  href="/dashboard/agenda"
              />
               <DashboardCard 
                  icon={NotebookPen}
                  title="Agenda Escolar"
                  description="Gerencie os horários de aulas para planejar melhor o dia e a semana."
                  href="/dashboard/school-schedule"
              />
               <DashboardCard 
                  icon={CalendarCheck}
                  title="Painel de Progressos"
                  description="Analise gráficos e relatórios sobre o desenvolvimento e as conquistas."
                  href="/dashboard/progressos"
              />
               <DashboardCard 
                  icon={Gift}
                  title="Baú de Recompensas"
                  description="Crie e gerencie os prêmios que seus heróis podem conquistar com estrelas."
                  href="/dashboard/rewards"
                   bypassModal={true}
              />
              <DashboardCard 
                  icon={Contact}
                  title="Perfil do Mini Herói"
                  description="Acesse e edite as informações, missões e recompensas individuais."
                  href="/dashboard/mural"
              />
               <DashboardCard 
                  icon={Target}
                  title="Quadro de Missões"
                  description="Crie e gerencie os modelos de todas as missões que podem ser atribuídas."
                  href="/dashboard/missions"
                  bypassModal={true}
              />
                <DashboardCard 
                  icon={Sparkles}
                  title="Assistente de Criação"
                  description="Deixe a Aura te guiar! Crie o perfil e a rotina de missões diárias de forma rápida e inteligente com nossa assistente"
                  href="/dashboard/assistente"
                  bypassModal={true}
              />
          </div>
      </div>
    </div>
  );
}

export default function DashboardPageWrapper() {
  return (
    <Suspense fallback={<div />}>
      <DashboardPage />
    </Suspense>
  )
}
