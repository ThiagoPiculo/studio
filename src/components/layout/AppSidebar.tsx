
"use client";

import * as React from 'react';
import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarRail,
    SidebarFooter,
    SidebarTrigger,
    SidebarGroupLabel,
} from '@/components/ui/sidebar';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import { Rocket, Users, CalendarDays, Target, Gift, Link as LinkIcon, LayoutGrid, NotebookPen, Medal, UserPlus, Home, ListCollapse, PlusCircle, View, ChevronsUpDown, Menu, Sparkles, User } from 'lucide-react';
import { UserNav } from './UserNav';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useFamily } from '@/contexts/FamilyContext';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Calendar1Icon } from '../icons/Calendar1Icon';


function AppLogo() {
    return (
        <div className="flex h-10 items-center justify-between px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
            <Link href="/dashboard/heroes" className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
                <Rocket className="h-7 w-7 text-primary" />
                <span className="font-headline text-xl font-bold text-foreground">
                    Mini Herois
                </span>
            </Link>
            <SidebarTrigger />
        </div>
    )
}

const CustomAccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionTrigger>,
  React.ComponentPropsWithoutRef<typeof AccordionTrigger>
>(({ className, children, ...props }, ref) => (
  <AccordionTrigger
    ref={ref}
    className={cn(
      "px-4 py-2 mt-2 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/80 hover:no-underline hover:bg-sidebar-accent rounded-md",
      "group-data-[collapsible=icon]:hidden",
      className
    )}
    {...props}
  >
    <div className="flex flex-1 items-center justify-between">
      {children}
    </div>
  </AccordionTrigger>
));
CustomAccordionTrigger.displayName = "CustomAccordionTrigger";


export function AppSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { availableContexts, currentContext, setCurrentContext } = useFamily();
    const isInAnyAlliance = availableContexts.some(c => c.id !== 'my-space');

    const handleAllianceAction = (action: 'create' | 'join') => {
        if (currentContext !== 'my-space') {
            setCurrentContext('my-space');
        }
        router.push(`/dashboard/family?action=${action}`);
    };
    
    const isMobile = useIsMobile();
    const defaultAccordionValue = isMobile ? [] : ['item-1', 'item-2', 'item-3', 'item-4'];

    return (
        <Sidebar>
            <SidebarRail />
            <SidebarHeader>
                <AppLogo />
            </SidebarHeader>

            <SidebarContent>
                <SidebarMenu>
                     <SidebarMenuItem>
                         <SidebarMenuButton href="/dashboard" tooltip="Espaços com Mini Herois" isActive={pathname === '/dashboard'}>
                            <Home className="text-chart-3" />
                            <span>Espaços</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton href="/dashboard/heroes" tooltip="Resumo do Dia" isActive={pathname.startsWith('/dashboard/heroes')}>
                            <Calendar1Icon className="text-chart-5"/>
                            <span>Resumo do Dia</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                     <SidebarMenuItem>
                         <SidebarMenuButton href="/dashboard/dashboard" tooltip="Painel de Progressos" isActive={pathname.startsWith('/dashboard/dashboard')}>
                            <LayoutGrid className="text-chart-1" />
                            <span>Painel de Progressos</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    
                    <Accordion type="multiple" className="w-full" defaultValue={defaultAccordionValue}>
                        <AccordionItem value="item-2" className="border-none">
                            <CustomAccordionTrigger>
                                Gerenciamento
                            </CustomAccordionTrigger>
                            <AccordionContent className="pt-1">
                                <SidebarMenuItem>
                                    <SidebarMenuButton href="/dashboard/mural" tooltip="Mural Completo" isActive={pathname.startsWith('/dashboard/mural')}>
                                        <ListCollapse className="text-chart-1" />
                                        <span>Mural Completo</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton href="/dashboard/novo-heroi" tooltip="Novo Mini Heroi" isActive={pathname.startsWith('/dashboard/novo-heroi')}>
                                        <UserPlus className="text-chart-2" />
                                        <span>Novo Mini Heroi</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                 <SidebarMenuItem>
                                     <SidebarMenuButton href="/dashboard/assistente" tooltip="Assistente de Criação" isActive={pathname.startsWith('/dashboard/assistente')}>
                                        <Sparkles className="text-chart-4" />
                                        <span>Assistente de Criação</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-3" className="border-none">
                             <CustomAccordionTrigger>
                                Quadros e Rotinas
                            </CustomAccordionTrigger>
                            <AccordionContent className="pt-1">
                                <SidebarMenuItem>
                                    <SidebarMenuButton href="/dashboard/agenda" tooltip="Rotina de Missões" isActive={pathname.startsWith('/dashboard/agenda')}>
                                        <CalendarDays className="text-chart-5" />
                                        <span>Rotina de Missões</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton href="/dashboard/school-schedule" tooltip="Rotina Escolar" isActive={pathname.startsWith('/dashboard/school-schedule')}>
                                        <NotebookPen className="text-chart-4" />
                                        <span>Rotina Escolar</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton href="/dashboard/missions" tooltip="Quadro de Missões" isActive={pathname.startsWith('/dashboard/missions')}>
                                        <Target className="text-destructive" />
                                        <span>Quadro de Missões</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton href="/dashboard/rewards" tooltip="Quadro de Recompensas" isActive={pathname.startsWith('/dashboard/rewards')}>
                                        <Gift className="text-chart-2" />
                                        <span>Quadro de Recompensas</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                     <SidebarMenuButton href="/dashboard/achievements" tooltip="Quadro de Medalhas" isActive={pathname.startsWith('/dashboard/achievements')}>
                                        <Medal className="text-chart-5" />
                                        <span>Quadro de Medalhas</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-4" className="border-none">
                            <CustomAccordionTrigger>
                                Solo ou Aliança de Herois
                            </CustomAccordionTrigger>
                             <AccordionContent className="pt-1">
                                <SidebarMenuItem>
                                    <SidebarMenuButton href="/dashboard/cuidando-solo" tooltip="Cuidando Solo" isActive={pathname.startsWith('/dashboard/cuidando-solo')}>
                                        <User className="text-chart-2" />
                                        <span>Cuidar Solo</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton href="/dashboard/family" tooltip="Criar ou Entrar em Aliança">
                                        <PlusCircle className="text-primary" />
                                        <span>Criar ou Entrar em Aliança</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                {isInAnyAlliance && (
                                    <SidebarMenuItem>
                                        <SidebarMenuButton href="/dashboard/alliances" tooltip="Minhas Alianças" isActive={pathname.startsWith('/dashboard/alliances')}>
                                            <LinkIcon className="text-primary" />
                                            <span>Minhas Alianças</span>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                )}
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </SidebarMenu>
            </SidebarContent>

            <SidebarFooter>
                <UserNav />
            </SidebarFooter>
        </Sidebar>
    );
}
