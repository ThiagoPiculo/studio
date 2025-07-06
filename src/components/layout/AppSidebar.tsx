
"use client";

import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarRail,
    SidebarFooter,
    SidebarTrigger
} from '@/components/ui/sidebar';
import { Rocket, Users, CalendarDays, Target, Gift, Shield, Link as LinkIcon } from 'lucide-react';
import { FamilyContextSwitcher } from './FamilyContextSwitcher';
import { UserNav } from './UserNav';
import Link from 'next/link';
import { useSidebar } from '@/components/ui/sidebar';
import { usePathname } from 'next/navigation';

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
                        <SidebarMenuButton href="/dashboard" tooltip="Crianças" isActive={pathname === '/dashboard'}>
                            <Shield className="text-primary"/>
                            <span>Crianças</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton href="/dashboard/agenda" tooltip="Agenda" isActive={pathname.startsWith('/dashboard/agenda')}>
                            <CalendarDays className="text-chart-1" />
                            <span>Agenda</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton href="/dashboard/missions" tooltip="Missões" isActive={pathname.startsWith('/dashboard/missions')}>
                            <Target className="text-chart-3" />
                            <span>Missões</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                         <SidebarMenuButton href="/dashboard/rewards" tooltip="Recompensas" isActive={pathname.startsWith('/dashboard/rewards')}>
                            <Gift className="text-chart-2" />
                            <span>Recompensas</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                     <SidebarMenuItem>
                         <SidebarMenuButton href="/dashboard/family" tooltip="Aliança e Colaboradores" isActive={pathname.startsWith('/dashboard/family')}>
                            <LinkIcon className="text-chart-4" />
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
