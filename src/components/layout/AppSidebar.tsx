
"use client";

import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarTrigger
} from '@/components/ui/sidebar';
import { Rocket, LayoutDashboard, CalendarDays, ListChecks, Gift, Users } from 'lucide-react';
import { FamilyContextSwitcher } from './FamilyContextSwitcher';
import { UserNav } from './UserNav';
import Link from 'next/link';
import { useSidebar } from '@/components/ui/sidebar';

function AppLogo() {
    const { state } = useSidebar();
    return (
        <Link href="/dashboard" className="flex items-center gap-2">
            <Rocket className="h-7 w-7 text-primary" />
            <span className="font-headline text-xl font-bold text-foreground group-data-[collapsible=icon]:hidden">
                Mini Herois
            </span>
        </Link>
    )
}

export function AppSidebar() {
    return (
        <Sidebar>
            <SidebarHeader className="flex items-center justify-between">
                <AppLogo />
                <SidebarTrigger />
            </SidebarHeader>

            <SidebarContent className="p-0">
                 <div className="p-2">
                    <FamilyContextSwitcher />
                 </div>

                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton href="/dashboard" tooltip="Painel">
                            <LayoutDashboard />
                            <span>Painel</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton href="/dashboard/agenda" tooltip="Agenda">
                            <CalendarDays />
                            <span>Agenda</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    
                    <SidebarGroup>
                        <SidebarGroupLabel>Gerenciamento</SidebarGroupLabel>
                        <SidebarMenuItem>
                            <SidebarMenuButton href="/dashboard/missions" tooltip="Missões">
                                <ListChecks />
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
                             <SidebarMenuButton href="/dashboard/family" tooltip="Família">
                                <Users />
                                <span>Família</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarGroup>
                </SidebarMenu>
            </SidebarContent>

            <SidebarFooter>
                <UserNav />
            </SidebarFooter>
        </Sidebar>
    );
}
