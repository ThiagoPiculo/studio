
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
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenuSub,
    SidebarMenuSubButton,
} from '@/components/ui/sidebar';
import { Rocket, Users, CalendarDays, Target, Gift, Link as LinkIcon, LayoutGrid, NotebookPen, Medal, Sparkles, UserPlus, Home, ListCollapse, PlusCircle } from 'lucide-react';
import { UserNav } from './UserNav';
import Link from 'next/link';
import { useSidebar } from '@/components/ui/sidebar';
import { usePathname } from 'next/navigation';
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
    const { availableContexts, currentContext } = useFamily();
    const isInAlliance = currentContext !== 'my-space' && availableContexts.some(c => c.id === currentContext);

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
                    
                    <SidebarGroup>
                        <SidebarGroupLabel>Meus Mini Herois</SidebarGroupLabel>
                        <SidebarMenuSub>
                             <SidebarMenuSubButton href="/dashboard/onboarding" isActive={pathname.startsWith('/dashboard/onboarding')}>
                                <UserPlus />
                                <span>Novo Mini Heroi</span>
                             </SidebarMenuSubButton>
                             <SidebarMenuSubButton href="/dashboard/mural" isActive={pathname.startsWith('/dashboard/mural')}>
                                <ListCollapse />
                                <span>Mural Completo</span>
                             </SidebarMenuSubButton>
                             <SidebarMenuSubButton href="/dashboard" isActive={pathname === '/dashboard'}>
                                <LayoutGrid />
                                <span>Painel de Progressos</span>
                             </SidebarMenuSubButton>
                        </SidebarMenuSub>
                    </SidebarGroup>

                    <SidebarGroup>
                        <SidebarGroupLabel>Rotinas dos Mini Herois</SidebarGroupLabel>
                        <SidebarMenuSub>
                             <SidebarMenuSubButton href="/dashboard/agenda" isActive={pathname.startsWith('/dashboard/agenda')}>
                                <CalendarDays />
                                <span>Rotina de Missões</span>
                             </SidebarMenuSubButton>
                             <SidebarMenuSubButton href="/dashboard/school-schedule" isActive={pathname.startsWith('/dashboard/school-schedule')}>
                                <NotebookPen />
                                <span>Rotina Escolar</span>
                             </SidebarMenuSubButton>
                        </SidebarMenuSub>
                    </SidebarGroup>

                     <SidebarGroup>
                        <SidebarGroupLabel>Quadros dos Mini Herois</SidebarGroupLabel>
                        <SidebarMenuSub>
                             <SidebarMenuSubButton href="/dashboard/missions" isActive={pathname.startsWith('/dashboard/missions')}>
                                <Target />
                                <span>Quadro de Missões</span>
                             </SidebarMenuSubButton>
                             <SidebarMenuSubButton href="/dashboard/achievements" isActive={pathname.startsWith('/dashboard/achievements')}>
                                <Medal />
                                <span>Quadro de Medalhas</span>
                             </SidebarMenuSubButton>
                             <SidebarMenuSubButton href="/dashboard/rewards" isActive={pathname.startsWith('/dashboard/rewards')}>
                                <Gift />
                                <span>Quadro de Recompensas</span>
                             </SidebarMenuSubButton>
                        </SidebarMenuSub>
                    </SidebarGroup>

                    <SidebarGroup>
                        <SidebarGroupLabel>Aliança de Herois</SidebarGroupLabel>
                        <SidebarMenuSub>
                             {isInAlliance && (
                                <SidebarMenuSubButton href="/dashboard/family?action=switch" isActive={pathname.startsWith('/dashboard/family')}>
                                    <Users />
                                    <span>Ver Minha Aliança</span>
                                </SidebarMenuSubButton>
                             )}
                             <SidebarMenuSubButton href="/dashboard/family?action=create">
                                <PlusCircle />
                                <span>Criar Aliança</span>
                             </SidebarMenuSubButton>
                             <SidebarMenuSubButton href="/dashboard/family?action=join">
                                <LinkIcon />
                                <span>Entrar em uma Aliança</span>
                             </SidebarMenuSubButton>
                        </SidebarMenuSub>
                    </SidebarGroup>
                </SidebarMenu>
            </SidebarContent>

            <SidebarFooter>
                <UserNav />
            </SidebarFooter>
        </Sidebar>
    );
}
