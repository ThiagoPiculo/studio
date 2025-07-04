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
                        <SidebarMenuButton href="/dashboard" tooltip="Painel do Heroi" isActive={pathname === '/dashboard'}>
                            <LayoutDashboard className="text-primary"/>
                            <span>Painel do Heroi</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton href="/dashboard/agenda" tooltip="Agenda" isActive={pathname.startsWith('/dashboard/agenda')}>
                            <CalendarDays className="text-blue-500" />
                            <span>Agenda</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton href="/dashboard/missions" tooltip="Missões" isActive={pathname.startsWith('/dashboard/missions')}>
                            <Target className="text-red-500" />
                            <span>Missões</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                         <SidebarMenuButton href="/dashboard/rewards" tooltip="Recompensas" isActive={pathname.startsWith('/dashboard/rewards')}>
                            <Gift className="text-green-500" />
                            <span>Recompensas</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                     <SidebarMenuItem>
                         <SidebarMenuButton href="/dashboard/family" tooltip="Aliança e Colaboradores" isActive={pathname.startsWith('/dashboard/family')}>
                            <Shield className="text-purple-500" />
                            <span>Aliança e Colaboradores</span>
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
