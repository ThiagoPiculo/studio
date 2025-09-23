

"use client";

import React, { Suspense } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, BookOpen, ChevronsRight, Contact, FilePlus, GitBranch, Handshake, Heart, HelpCircle, ListChecks, PlusCircle, UserPlus, Users, Wand2, CalendarDays, NotebookPen, CalendarCheck, Gift, Target, Link as LinkIcon } from 'lucide-react';
import { useFamily } from '@/contexts/FamilyContext';
import { useRouter } from 'next/navigation';
import { Calendar1Icon } from '@/components/icons/Calendar1Icon';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { GettingStartedGuide } from '@/components/dashboard/GettingStartedGuide';
import type { ChildProfile, MissionInstance, RewardTemplate } from '@/lib/types';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getChildProfilesForAttribution, getMissionInstancesForContext, getRewardTemplatesByOwnerOrFamily } from '@/lib/firebase/firestore';


function DesktopDashboardCard({
  icon: Icon,
  title,
  description,
  href,
  isModalTrigger = false,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  href?: string;
  isModalTrigger?: boolean;
}) {
  const router = useRouter();
  const { selectedChildId, openModal } = useFamily();

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
  isModalTrigger = false,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  href?: string;
  isModalTrigger?: boolean;
}) {
  const router = useRouter();
  const { selectedChildId, openModal } = useFamily();

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
      <GettingStartedGuide hasChildren={children.length > 0} hasMissions={missions.length > 0} hasRewards={rewards.length > 0} />
      
      <div>
          <h2 className="text-2xl font-headline font-bold mb-4 flex items-center gap-2">Meus Mini Heróis</h2>
          <div className={cn("grid", gridClasses)}>
              <DashboardCard 
                  icon={Calendar1Icon}
                  title="Rotina do Dia"
                  description="Veja as missões agendadas para hoje e acompanhe o progresso em tempo real."
                  isModalTrigger
                  href="/dashboard/heroes"
              />
              <DashboardCard 
                  icon={CalendarDays}
                  title="Rotina da Semana"
                  description="Visualize o calendário completo com a programação de missões da semana."
                  isModalTrigger
                  href="/dashboard/agenda"
              />
               <DashboardCard 
                  icon={NotebookPen}
                  title="Agenda Escolar"
                  description="Gerencie os horários de aulas para planejar melhor o dia e a semana."
                  isModalTrigger
                  href="/dashboard/school-schedule"
              />
               <DashboardCard 
                  icon={CalendarCheck}
                  title="Painel de Progressos"
                  description="Analise gráficos e relatórios sobre o desenvolvimento e as conquistas."
                  isModalTrigger
                  href="/dashboard/progressos"
              />
               <DashboardCard 
                  icon={Gift}
                  title="Baú de Recompensas"
                  description="Crie e gerencie os prêmios que seus heróis podem conquistar com estrelas."
                  isModalTrigger
                  href="/dashboard/rewards"
              />
              <DashboardCard 
                  icon={Contact}
                  title="Perfil do Mini Herói"
                  description="Acesse e edite as informações, missões e recompensas individuais."
                  isModalTrigger
                  href="/dashboard/mural"
              />
               <DashboardCard 
                  icon={Target}
                  title="Quadro de Missões"
                  description="Crie e gerencie os modelos de todas as missões que podem ser atribuídas."
                  href="/dashboard/missions"
              />
               <DashboardCard 
                  icon={HelpCircle}
                  title="Central de Ajuda"
                  description="Aprenda sobre o Mini Herois e tire suas dúvidas."
                  href="/dashboard/help"
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
