

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
import { Rocket, Users, CalendarDays, Target, Gift, Link as LinkIcon, NotebookPen, Medal, UserPlus, Home, PlusCircle, View, ChevronsUpDown, Menu, Sparkles, User, CalendarCheck2, Settings, Radar, Contact, CircleDot, HelpCircle } from 'lucide-react';
import { UserNav } from './UserNav';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useFamily } from '@/contexts/FamilyContext';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Calendar1Icon } from '../icons/Calendar1Icon';
import { useToast } from '@/hooks/use-toast';

function AppLogo() {
    return (
        <div className="flex h-10 items-center justify-between px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
            <Link href="/dashboard" className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
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

const NavLink = ({ href, tooltip, label, children, exact = false, bypassModal = false }: { href: string; tooltip: string; label: string, children: React.ReactNode, exact?: boolean, bypassModal?: boolean }) => {
    const pathname = usePathname();
    const router = useRouter();
    const { isLoading: isFamilyLoading, selectedChildId, openModal } = useFamily();
    
    const isActive = !isFamilyLoading && (exact ? pathname === href : pathname.startsWith(href));

    const handleClick = (e: React.MouseEvent) => {
        if (bypassModal || !selectedChildId) {
            router.push(href);
            return;
        }
        
        openModal(href); 
    };

    return (
        <SidebarMenuButton tooltip={tooltip} isActive={isActive} href={href} onClick={handleClick}>
            {children}
            <span>{label}</span>
        </SidebarMenuButton>
    );
};


export function AppSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { availableContexts, currentContext, setCurrentContext, openModal, selectedChildId } = useFamily();
    const isInAnyAlliance = availableContexts.some(c => c.id !== 'my-space');

    const handleAllianceAction = (action: 'create' | 'join') => {
        if (currentContext !== 'my-space') {
            setCurrentContext('my-space');
        }
        router.push(`/dashboard/family?action=${action}`);
    };

    const handleMenuClick = (href: string) => {
        if (!selectedChildId) {
            openModal(href);
        } else {
            router.push(href);
        }
    }
    
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
                        <NavLink href="/dashboard" tooltip="Início" label="Início" exact={true} bypassModal={true}>
                            <Home className="text-primary"/>
                        </NavLink>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <NavLink href="/dashboard/heroes" tooltip="Rotina Hoje" label="Rotina Hoje">
                            <Calendar1Icon className="text-chart-5"/>
                        </NavLink>
                    </SidebarMenuItem>
                     <SidebarMenuItem>
                        <NavLink href="/dashboard/agenda" tooltip="Rotina Semanal" label="Rotina Semanal">
                            <CalendarDays className="text-chart-5" />
                        </NavLink>
                    </SidebarMenuItem>
                     <SidebarMenuItem>
                         <NavLink href="/dashboard/progressos" tooltip="Painel de Progressos" label="Painel de Progressos">
                            <CalendarCheck2 className="text-chart-1" />
                        </NavLink>
                    </SidebarMenuItem>
                     <SidebarMenuItem>
                        <NavLink href="/dashboard/school-schedule" tooltip="Agenda Escolar" label="Agenda Escolar">
                            <NotebookPen className="text-chart-4" />
                        </NavLink>
                    </SidebarMenuItem>
                    
                    <Accordion type="multiple" className="w-full" defaultValue={defaultAccordionValue}>
                        <AccordionItem value="item-2" className="border-none">
                            <CustomAccordionTrigger>
                                Crianças
                            </CustomAccordionTrigger>
                            <AccordionContent className="pt-1">
                                <SidebarMenuItem>
                                    <SidebarMenuButton onClick={() => handleMenuClick('/dashboard/mural')} tooltip="Perfil Completo">
                                        <Contact className="text-chart-1" />
                                        <span>Perfil Completo</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                     <SidebarMenuButton onClick={() => router.push('/dashboard/assistente')} tooltip="Assistente de Criação">
                                        <Sparkles className="text-chart-4" />
                                        <span>Assistente de Criação</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-3" className="border-none">
                             <CustomAccordionTrigger>
                                Quadros e Catálogos
                            </CustomAccordionTrigger>
                            <AccordionContent className="pt-1">
                                <SidebarMenuItem>
                                    <NavLink href="/dashboard/missions" tooltip="Quadro de Missões" label="Quadro de Missões" bypassModal={true}>
                                        <Target className="text-destructive" />
                                    </NavLink>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <NavLink href="/dashboard/rewards" tooltip="Baú de Recompensas" label="Baú de Recompensas" bypassModal={true}>
                                        <Gift className="text-chart-2" />
                                    </NavLink>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                     <NavLink href="/dashboard/achievements" tooltip="Quadro de Medalhas" label="Quadro de Medalhas" bypassModal={true}>
                                        <Medal className="text-chart-5" />
                                    </NavLink>
                                </SidebarMenuItem>
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-4" className="border-none">
                            <CustomAccordionTrigger>
                                <span className="whitespace-nowrap">Cuidar Solo ou Alianças</span>
                            </CustomAccordionTrigger>
                             <AccordionContent className="pt-1">
                                <SidebarMenuItem>
                                    <NavLink href="/dashboard/cuidando-solo" tooltip="Gerenciar Cuidar Solo" label="Gerenciar Cuidar Solo" bypassModal={true}>
                                        <CircleDot className="text-chart-2" />
                                    </NavLink>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <NavLink href="/dashboard/alliances" tooltip="Gerenciar Alianças" label="Gerenciar Alianças" bypassModal={true}>
                                        <LinkIcon className="text-primary" />
                                    </NavLink>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton onClick={() => handleAllianceAction('create')} tooltip="Criar ou Entrar em Aliança">
                                        <PlusCircle className="text-primary" />
                                        <span>Criar ou Entrar em Aliança</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </SidebarMenu>
            </SidebarContent>

            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <NavLink href="/dashboard/help" tooltip="Central de Ajuda" label="Central de Ajuda" bypassModal={true}>
                            <HelpCircle className="text-chart-3" />
                        </NavLink>
                    </SidebarMenuItem>
                </SidebarMenu>
                <UserNav />
            </SidebarFooter>
        </Sidebar>
    );
}
