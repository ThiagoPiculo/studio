
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
    SidebarTrigger,
    SidebarGroupLabel,
} from '@/components/ui/sidebar';
import { Rocket, Users, CalendarDays, Target, Gift, Link as LinkIcon, LayoutGrid, NotebookPen, Medal, UserPlus, Home, ListCollapse, PlusCircle, View } from 'lucide-react';
import { UserNav } from './UserNav';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useFamily } from '@/contexts/FamilyContext';

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

    return (
        <Sidebar>
            <SidebarRail />
            <SidebarHeader>
                <AppLogo />
            </SidebarHeader>

            <SidebarContent>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton href="/dashboard/heroes" tooltip="Resumo do Dia" isActive={pathname.startsWith('/dashboard/heroes')}>
                            <Home className="text-primary"/>
                            <span>Resumo do Dia</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                     <SidebarMenuItem>
                         <SidebarMenuButton href="/dashboard" tooltip="Visão Geral" isActive={pathname === '/dashboard'}>
                            <View className="text-chart-3" />
                            <span>Visão Geral</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                         <SidebarMenuButton href="/dashboard/dashboard" tooltip="Painel de Progressos" isActive={pathname.startsWith('/dashboard/dashboard')}>
                            <LayoutGrid className="text-chart-1" />
                            <span>Painel de Progressos</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    
                    <SidebarGroupLabel>Meus Mini Herois</SidebarGroupLabel>
                    <SidebarMenuItem>
                        <SidebarMenuButton href="/dashboard/novo-heroi" tooltip="Novo Mini Heroi" isActive={pathname.startsWith('/dashboard/novo-heroi')}>
                            <UserPlus className="text-chart-2" />
                            <span>Novo Mini Heroi</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton href="/dashboard/mural" tooltip="Mural Completo" isActive={pathname.startsWith('/dashboard/mural')}>
                            <ListCollapse className="text-chart-1" />
                            <span>Mural Completo</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarGroupLabel>Rotinas dos Herois</SidebarGroupLabel>
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
                    
                    <SidebarGroupLabel>Quadros</SidebarGroupLabel>
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

                    <SidebarGroupLabel>Aliança de Herois</SidebarGroupLabel>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild={false} onClick={() => handleAllianceAction('create')} tooltip="Criar Aliança">
                            <PlusCircle className="text-primary" />
                            <span>Criar Aliança</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                         <SidebarMenuButton asChild={false} onClick={() => handleAllianceAction('join')} tooltip="Entrar em Aliança">
                            <LinkIcon className="text-primary" />
                            <span>Entrar em Aliança</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    {isInAnyAlliance && (
                        <SidebarMenuItem>
                            <SidebarMenuButton href="/dashboard/alliances" tooltip="Ver Minhas Alianças" isActive={pathname.startsWith('/dashboard/alliances')}>
                                <Users className="text-primary" />
                                <span>Ver Alianças</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    )}
                </SidebarMenu>
            </SidebarContent>

            <SidebarFooter>
                <UserNav />
            </SidebarFooter>
        </Sidebar>
    );
}
