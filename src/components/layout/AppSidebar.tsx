
"use client";

import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarFooter,
    SidebarRail
} from '@/components/ui/sidebar';
import { Rocket, LayoutDashboard, CalendarDays, Target, Gift, Shield } from 'lucide-react';
import { FamilyContextSwitcher } from './FamilyContextSwitcher';
import { UserNav } from './UserNav';
import Link from 'next/link';
import { useSidebar } from '@/components/ui/sidebar';
import { usePathname } from 'next/navigation';
import { AgendaSidebarFilters } from '../dashboard/agenda/AgendaSidebarFilters';
import { Separator } from '../ui/separator';

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
    const pathname = usePathname();

    return (
        <Sidebar>
            <SidebarRail />
            <SidebarHeader>
                <AppLogo />
            </SidebarHeader>

            <SidebarContent className="p-0">
                 <div className="p-2">
                    <FamilyContextSwitcher />
                 </div>

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
                            <div className="pl-6 pt-2 space-y-4 group-data-[collapsible=icon]:hidden">
                                <AgendaSidebarFilters />
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
