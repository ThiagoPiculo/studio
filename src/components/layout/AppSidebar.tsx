
"use client";

import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarRail,
    SidebarFooter
} from '@/components/ui/sidebar';
import { Rocket, LayoutDashboard, CalendarDays, Target, Gift, Shield } from 'lucide-react';
import { FamilyContextSwitcher } from './FamilyContextSwitcher';
import { UserNav } from './UserNav';
import Link from 'next/link';
import { useSidebar } from '@/components/ui/sidebar';
import { usePathname } from 'next/navigation';
import { AgendaSidebarFilters } from '../dashboard/agenda/AgendaSidebarFilters';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

function AppLogo() {
    const { state } = useSidebar();
    return (
        <Link href="/dashboard" className="flex h-10 items-center justify-center gap-2 group-data-[collapsible=icon]:gap-0">
            <Rocket className="h-7 w-7 text-primary" />
            <span className="font-headline text-xl font-bold text-foreground group-data-[collapsible=icon]:hidden">
                Mini Herois
            </span>
        </Link>
    )
}

export function AppSidebar() {
    const pathname = usePathname();

    return (
        <Sidebar>
            <SidebarRail />
            <SidebarHeader>
                <AppLogo />
                <FamilyContextSwitcher />
            </SidebarHeader>

            <SidebarContent>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton href="/dashboard" tooltip="Painel do Heroi">
                            <LayoutDashboard />
                            <span>Painel do Heroi</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton href="/dashboard/agenda" tooltip="Agenda" isActive={pathname.startsWith('/dashboard/agenda')}>
                            <CalendarDays />
                            <span>Agenda</span>
                        </SidebarMenuButton>
                        
                        {pathname.startsWith('/dashboard/agenda') && (
                            <div className="group-data-[collapsible=icon]:hidden">
                                <Accordion type="single" collapsible defaultValue="agenda-filters" className="w-full">
                                    <AccordionItem value="agenda-filters" className="border-none">
                                        <AccordionTrigger className="py-1 px-3 text-xs hover:no-underline hover:bg-sidebar-accent rounded-md mx-2 w-[calc(100%-1rem)] flex font-semibold text-sidebar-foreground/70">
                                            Filtros
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <div className="pl-6 pt-2 pr-2 space-y-4">
                                                <AgendaSidebarFilters />
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            </div>
                        )}
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton href="/dashboard/missions" tooltip="Missões">
                            <Target />
                            <span>Missões</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                         <SidebarMenuButton href="/dashboard/rewards" tooltip="Recompensas">
                            <Gift />
                            <span>Recompensas</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                     <SidebarMenuItem>
                         <SidebarMenuButton href="/dashboard/family" tooltip="Gerenciar Aliança">
                            <Shield />
                            <span>Gerenciar Aliança</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarContent>

            <SidebarFooter>
                <UserNav />
            </SidebarFooter>
        </Sidebar>
    );
}
