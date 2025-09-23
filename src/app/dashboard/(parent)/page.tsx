

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

function DashboardCard({
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


function DashboardPage() {
    const { openModal, selectedChildId } = useFamily();
    const router = useRouter();
    
  return (
    <div className="space-y-8">
      {/* Seção "Comece por Aqui!" */}
      <Accordion type="single" collapsible defaultValue="item-1" className="w-full">
        <AccordionItem value="item-1" className="border rounded-lg bg-gradient-to-br from-card to-accent/5">
          <AccordionTrigger className="p-6 hover:no-underline">
              <div className="flex flex-col text-left">
                <CardTitle className="text-2xl font-headline flex items-center gap-2"><Wand2 className="text-primary"/>Comece por Aqui!</CardTitle>
                <CardDescription className="mt-1">
                  Ações rápidas para configurar sua Central de Heróis e iniciar a jornada.
                </CardDescription>
              </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="px-6 pb-6 pt-0 grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-background/70">
                  <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">Criar Rotina para Criança</CardTitle>
                  </CardHeader>
                  <CardContent>
                      <Button asChild className="w-full">
                          <Link href="/dashboard/assistente">
                               Usar o Assistente de Criação
                          </Link>
                      </Button>
                  </CardContent>
              </Card>
              <Card className="bg-background/70">
                  <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">Colaborar em Aliança</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                      <Button asChild variant="secondary" className="w-full">
                          <Link href="/dashboard/family?action=join">
                               Entrar em aliança com convite
                          </Link>
                      </Button>
                      <div className="grid grid-cols-2 gap-2">
                        <Button asChild variant="secondary" className="w-full">
                            <Link href="/dashboard/family?action=create">
                                 Criar Aliança
                            </Link>
                        </Button>
                         <Button asChild variant="secondary" className="w-full">
                            <Link href="/dashboard/alliances">
                                Gerenciar Alianças
                            </Link>
                        </Button>
                      </div>
                  </CardContent>
              </Card>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>


      {/* Seção "Meus Mini Heróis" */}
      <div>
          <h2 className="text-2xl font-headline font-bold mb-4 flex items-center gap-2"><Heart className="text-pink-500" />Meus Mini Heróis</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
