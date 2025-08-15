

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
import { Rocket, Users, CalendarDays, Target, Gift, Link as LinkIcon, NotebookPen, Medal, UserPlus, Home, ListCollapse, PlusCircle, View, ChevronsUpDown, Menu, Sparkles, User, CalendarCheck2, Settings, Radar } from 'lucide-react';
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

const NavLink = ({ href, tooltip, label, children }: { href: string; tooltip: string; label: string, children: React.ReactNode }) => {
    const pathname = usePathname();
    const isActive = href === '/dashboard' ? pathname === href : pathname.startsWith(href);

    return (
        <SidebarMenuButton href={href} tooltip={tooltip} isActive={isActive}>
            {children}
            <span>{label}</span>
        </SidebarMenuButton>
    );
};


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
                        <NavLink href="/dashboard/heroes" tooltip="Resumo do Dia" label="Resumo do Dia">
                            <Calendar1Icon className="text-chart-5"/>
                        </NavLink>
                    </SidebarMenuItem>
                     <SidebarMenuItem>
                         <NavLink href="/dashboard/dashboard" tooltip="Painel de Progressos" label="Painel de Progressos">
                            <CalendarCheck2 className="text-chart-1" />
                        </NavLink>
                    </SidebarMenuItem>
                    
                    <Accordion type="multiple" className="w-full" defaultValue={defaultAccordionValue}>
                        <AccordionItem value="item-2" className="border-none">
                            <CustomAccordionTrigger>
                                Gerenciamento
                            </CustomAccordionTrigger>
                            <AccordionContent className="pt-1">
                                <SidebarMenuItem>
                                    <NavLink href="/dashboard/mural" tooltip="Perfil Completo" label="Perfil Completo">
                                        <ListCollapse className="text-chart-1" />
                                    </NavLink>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <NavLink href="/dashboard/novo-heroi" tooltip="Novo Mini Heroi" label="Novo Mini Heroi">
                                        <UserPlus className="text-chart-2" />
                                    </NavLink>
                                </SidebarMenuItem>
                                 <SidebarMenuItem>
                                     <NavLink href="/dashboard/assistente" tooltip="Assistente de Criação" label="Assistente de Criação">
                                        <Sparkles className="text-chart-4" />
                                    </NavLink>
                                </SidebarMenuItem>
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-3" className="border-none">
                             <CustomAccordionTrigger>
                                Quadros e Rotinas
                            </CustomAccordionTrigger>
                            <AccordionContent className="pt-1">
                                <SidebarMenuItem>
                                    <NavLink href="/dashboard/agenda" tooltip="Rotina de Missões" label="Rotina de Missões">
                                        <CalendarDays className="text-chart-5" />
                                    </NavLink>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <NavLink href="/dashboard/school-schedule" tooltip="Rotina Escolar" label="Rotina Escolar">
                                        <NotebookPen className="text-chart-4" />
                                    </NavLink>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <NavLink href="/dashboard/missions" tooltip="Quadro de Missões" label="Quadro de Missões">
                                        <Target className="text-destructive" />
                                    </NavLink>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <NavLink href="/dashboard/rewards" tooltip="Quadro de Recompensas" label="Quadro de Recompensas">
                                        <Gift className="text-chart-2" />
                                    </NavLink>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                     <NavLink href="/dashboard/achievements" tooltip="Quadro de Medalhas" label="Quadro de Medalhas">
                                        <Medal className="text-chart-5" />
                                    </NavLink>
                                </SidebarMenuItem>
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-4" className="border-none">
                            <CustomAccordionTrigger>
                                Cuidando Solo ou Alianças
                            </CustomAccordionTrigger>
                             <AccordionContent className="pt-1">
                                <SidebarMenuItem>
                                    <NavLink href="/dashboard/cuidando-solo" tooltip="Gerenciar Cuidar Solo" label="Gerenciar Cuidar Solo">
                                        <User className="text-chart-2" />
                                    </NavLink>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton onClick={() => handleAllianceAction('create')} tooltip="Criar ou Entrar em Aliança">
                                        <PlusCircle className="text-primary" />
                                        <span>Criar ou Entrar em Aliança</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                {isInAnyAlliance && (
                                    <SidebarMenuItem>
                                        <NavLink href="/dashboard/alliances" tooltip="Gerenciar Alianças" label="Gerenciar Alianças">
                                            <LinkIcon className="text-primary" />
                                        </NavLink>
                                    </SidebarMenuItem>
                                )}
                                <SidebarMenuItem>
                                     <NavLink href="/dashboard" tooltip="Ver Todos os Espaços" label="Espaços e Alianças">
                                        <Radar className="text-chart-3" />
                                     </NavLink>
                                </SidebarMenuItem>
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
