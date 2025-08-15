

"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlusCircle, Smile, Loader2, Settings, Gift, ListChecks, NotebookPen, Medal, CheckCircle, Target, ArrowRight, Circle, Info, BadgeCheck, RefreshCw, ChevronDown, ChevronUp, Clock, CalendarDays, ExternalLink, LayoutGrid, Home, Star, HelpCircle, Lightbulb, MoreVertical, Contact } from "lucide-react";
import { useRouter } from 'next/navigation';
import type { ChildProfile, MissionInstance, SchoolScheduleEntry } from "@/lib/types";
import { cn, getInitials } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getTodaysMissions, getSchoolScheduleForChild, completeMissionInstance, reactivateMissionInstance, deleteMissionInstance } from '@/lib/firebase/firestore';
import { Progress } from '@/components/ui/progress';
import { isMissionScheduledForDate, isMissionCompletedForDate, getDayToWeekday, getDateObject } from '@/lib/calendar-utils';
import { getDay, startOfDay, format as formatDateFns } from 'date-fns';
import { HeroSelector } from '@/components/dashboard/dashboard/HeroSelector';
import { weekdayLabels } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PopoverClose } from '@radix-ui/react-popover';
import { Calendar1Icon } from '@/components/icons/Calendar1Icon';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';


interface HeroesSummaryProps {
  children: ChildProfile[];
  missionInstances: MissionInstance[];
}

export function HeroesSummary({ children: initialChildren, missionInstances: initialMissionInstances }: HeroesSummaryProps) {
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();
    const { selectedChildId, setSelectedChildId } = useFamily(); // Use global state
    
    const [children, setChildren] = useState(initialChildren);
    const [expandedChildId, setExpandedChildId] = useState<string | null>(null);
    const [schoolSchedules, setSchoolSchedules] = useState<Record<string, SchoolScheduleEntry[]>>({});
    const [isLoadingSchedules, setIsLoadingSchedules] = useState(false);
    
    const [missionInstances, setMissionInstances] = useState(initialMissionInstances);
    const [processingMissionId, setProcessingMissionId] = useState<string | null>(null);
    const [missionToDelete, setMissionToDelete] = useState<MissionInstance | null>(null);
    
    useEffect(() => {
        setMissionInstances(initialMissionInstances);
    }, [initialMissionInstances]);
    
    useEffect(() => {
        setChildren(initialChildren);
    }, [initialChildren]);


    const handleExpandClick = async (childId: string) => {
        const newExpandedId = expandedChildId === childId ? null : childId;
        setExpandedChildId(newExpandedId);
        
        if (newExpandedId && !schoolSchedules[newExpandedId]) {
            setIsLoadingSchedules(true);
            try {
                const schedule = await getSchoolScheduleForChild(newExpandedId);
                setSchoolSchedules(prev => ({ ...prev, [newExpandedId]: schedule }));
            } catch (error) {
                console.error("Error fetching school schedule:", error);
                toast({ title: "Erro ao buscar agenda escolar.", variant: "destructive" });
            } finally {
                setIsLoadingSchedules(false);
            }
        }
    };

    const getTodaysSchedule = (childId: string) => {
        const todayWeekday = getDayToWeekday[getDay(new Date())];
        return (schoolSchedules[childId] || [])
            .filter(entry => entry.dayOfWeek === todayWeekday)
            .sort((a,b) => a.startTime.localeCompare(b.startTime));
    };

    const filteredChildren = useMemo(() => {
        if (!selectedChildId) return children;
        return children.filter(child => child.id === selectedChildId);
    }, [children, selectedChildId]);
    
    const handleToggleCompletion = async (mission: MissionInstance, date: Date, isCompleted: boolean) => {
        if (!user) return;
        setProcessingMissionId(mission.id);

        try {
            const actor = { id: user.uid, name: user.name };
            const updatedChild = isCompleted
                ? await reactivateMissionInstance(mission.id, date, actor)
                : await completeMissionInstance(mission.id, date, actor);

            // Optimistically update the UI
            setMissionInstances(prev => prev.map(m => {
                if (m.id === mission.id) {
                    const newLog = { ...m.completionLog };
                    const dateKey = formatDateFns(date, 'yyyy-MM-dd');
                    if (isCompleted) {
                        delete newLog[dateKey];
                    } else {
                        newLog[dateKey] = { 
                            completedAt: new Date().toISOString(), 
                            actorId: actor.id, 
                            actorName: actor.name,
                            stars: m.starsReward,
                            xp: m.xpReward
                        } as any;
                    }
                    return { ...m, completionLog: newLog };
                }
                return m;
            }));
            
            if (updatedChild) {
                 setChildren(prev => prev.map(c => c.id === updatedChild.id ? updatedChild : c));
                toast({
                    title: isCompleted ? "Ação Desfeita" : "Missão Cumprida!",
                    description: `A missão "${mission.title}" foi atualizada.`
                });
            }
        } catch (error) {
            console.error("Error toggling mission completion:", error);
            toast({ title: "Erro ao atualizar missão", variant: "destructive" });
        } finally {
            setProcessingMissionId(null);
        }
    };
    
    const handleDeleteInstance = async () => {
        if (!missionToDelete || !user) return;
        setProcessingMissionId(missionToDelete.id);
        try {
            await deleteMissionInstance(user, missionToDelete.id);
            setMissionInstances(prev => prev.filter(m => m.id !== missionToDelete.id));
            toast({ title: "Atribuição Removida", description: "A missão foi removida da lista deste herói."});
        } catch (error) {
            console.error("Error deleting mission instance", error);
            toast({ title: "Erro ao remover", variant: "destructive"});
        } finally {
            setProcessingMissionId(null);
            setMissionToDelete(null);
        }
    }
    
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button asChild variant="secondary" className="w-full sm:w-auto">
                    <Link href="/dashboard/missions/ideas">
                        <Lightbulb className="mr-2 h-4 w-4" /> Ideias de Missões
                    </Link>
                </Button>
                <Button asChild className="w-full sm:w-auto">
                    <Link href="/dashboard/missions/new">
                        <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Missão
                    </Link>
                </Button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredChildren.map(child => {
                    const today = startOfDay(new Date());
                    
                    const timeToMinutes = (date: Date): number => {
                        return date.getHours() * 60 + date.getMinutes();
                    };

                    const todaysMissions = missionInstances
                        .filter(m => m.childId === child.id && isMissionScheduledForDate(m, today))
                        .sort((a, b) => {
                            const dateA = getDateObject(a.isRecurring ? a.startDate : a.dueDate);
                            const dateB = getDateObject(b.isRecurring ? b.startDate : b.dueDate);
                            
                            if (!dateA) return 1;
                            if (!dateB) return -1;
                            
                            return timeToMinutes(dateA) - timeToMinutes(dateB);
                        });

                    const completedMissions = todaysMissions.filter(m => isMissionCompletedForDate(m, today));
                    const progress = todaysMissions.length > 0 ? (completedMissions.length / todaysMissions.length) * 100 : 0;
                    
                    const todaysGains = completedMissions.reduce((acc, mission) => {
                        acc.stars += mission.starsReward;
                        acc.xp += mission.xpReward;
                        return acc;
                    }, { stars: 0, xp: 0 });

                    const isExpanded = expandedChildId === child.id;
                    const displayMissions = isExpanded ? todaysMissions : todaysMissions.slice(0, 5);
                    const remainingCount = todaysMissions.length - 5;


                    return (
                        <Card key={child.id} className="shadow-lg hover:shadow-xl transition-shadow flex flex-col">
                            <CardHeader className="p-4">
                               <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-4">
                                        <Avatar
                                            className="h-16 w-16 text-2xl ring-4 ring-offset-background ring-[--ring-color]"
                                            style={{ '--ring-color': child.color } as React.CSSProperties}
                                        >
                                            <AvatarImage src={child.avatar} alt={child.name} />
                                            <AvatarFallback style={{ backgroundColor: child.color }} className="font-bold">{getInitials(child.name)}</AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <CardTitle className="text-2xl truncate">{child.name}</CardTitle>
                                            <CardDescription className="text-sm flex items-center gap-1">
                                                Chave Secreta: <span className="font-mono">{child.accessCode}</span>
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onSelect={() => router.push(`/dashboard/mural?childId=${child.id}`)}>
                                                <Contact className="mr-2 h-4 w-4" />
                                                <span>Perfil Completo</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => router.push(`/dashboard/agenda?childId=${child.id}`)}>
                                                <CalendarDays className="mr-2 h-4 w-4" />
                                                <span>Rotina de Missões</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => router.push(`/dashboard/school-schedule?childId=${child.id}`)}>
                                                <NotebookPen className="mr-2 h-4 w-4" />
                                                <span>Rotina Escolar</span>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-center gap-8">
                                        <div className="flex items-center gap-2 text-amber-600">
                                            <Star className="h-5 w-5 fill-current" />
                                            <span className="text-lg font-bold">{child.stars}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-blue-600">
                                            <BadgeCheck className="h-5 w-5" />
                                            <span className="text-lg font-bold">{child.xp}</span>
                                            <span className="text-sm font-normal">XP</span>
                                        </div>
                                        <Badge
                                            variant="secondary"
                                            className="font-semibold text-xs border-2 border-background shadow-md"
                                            style={{ backgroundColor: child.color, color: 'white' }}
                                        >
                                            NÍVEL {child.level}
                                        </Badge>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">Missões de Hoje: {completedMissions.length} de {todaysMissions.length}</Label>
                                        <Progress value={progress} className="h-2" />
                                    </div>
                                </div>
                            </CardContent>

                            <CardContent className="p-4 pt-0 flex-grow">
                                <Tabs defaultValue="today" className="w-full">
                                    <TabsList className="grid w-full grid-cols-2 h-9">
                                        <TabsTrigger value="today" className="h-full text-xs sm:text-sm">
                                            <Target className="mr-2 h-4 w-4" />
                                            Missões de Hoje
                                        </TabsTrigger>
                                        <TabsTrigger value="schedule" className="h-full text-xs sm:text-sm" onClick={() => handleExpandClick(child.id)}>
                                            <NotebookPen className="mr-2 h-4 w-4" />
                                            Rotina Escolar
                                        </TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="today" className="mt-2 space-y-1.5 min-h-[200px] pr-2">
                                        {todaysMissions.length === 0 ? (
                                            <div className="flex items-center justify-center h-full text-sm text-muted-foreground italic">Nenhuma missão para hoje.</div>
                                        ) : (
                                            <>
                                                {displayMissions.map(m => {
                                                    const isCompleted = isMissionCompletedForDate(m, today);
                                                    const dateForTime = getDateObject(m.isRecurring ? m.startDate : m.dueDate);
                                                    const timeString = dateForTime ? new Date(dateForTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit'}) : '';

                                                    return (
                                                        <div key={m.id} className={cn("p-1.5 rounded-md text-sm flex items-center gap-2", isCompleted ? 'bg-green-500/10' : 'bg-muted/40')}>
                                                            <div className="text-muted-foreground font-mono text-xs w-10 text-center">{timeString}</div>
                                                            <span className="text-xl shrink-0 w-5 text-center">{m.emoji || '🎯'}</span>
                                                            <span className={cn("truncate font-medium flex-grow", isCompleted && "line-through text-muted-foreground")}>{m.title}</span>
                                                             <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => handleToggleCompletion(m, today, isCompleted)} disabled={processingMissionId === m.id}>
                                                                {processingMissionId === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : isCompleted ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4 text-primary" />}
                                                            </Button>
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="h-6 w-6">
                                                                        <MoreVertical className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                                                                        <div className="flex items-center justify-between gap-4">
                                                                            <span className="flex items-center gap-1.5 text-amber-600"><Star className="h-3.5 w-3.5" /> +{m.starsReward}</span>
                                                                            <span className="flex items-center gap-1.5 text-blue-600"><BadgeCheck className="h-3.5 w-3.5" /> +{m.xpReward} XP</span>
                                                                        </div>
                                                                    </DropdownMenuLabel>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem onSelect={() => router.push(`/dashboard/agenda?childId=${child.id}`)}>
                                                                        Ver na Agenda
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onSelect={() => router.push(`/dashboard/missions/edit/${m.templateId}`)}>
                                                                        Editar Missão
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem onSelect={() => setMissionToDelete(m)} className="text-destructive">
                                                                        Remover Atribuição
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                    )
                                                })}
                                                {remainingCount > 0 && (
                                                    <Button variant="link" size="sm" className="w-full text-xs h-auto py-1" onClick={() => handleExpandClick(child.id)}>
                                                        {isExpanded ? "Mostrar menos" : `Ver +${remainingCount} missões`}
                                                        {isExpanded ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />}
                                                    </Button>
                                                )}
                                            </>
                                        )}
                                    </TabsContent>
                                    <TabsContent value="schedule" className="mt-2 space-y-1.5 h-[145px] overflow-y-auto pr-2">
                                        {isLoadingSchedules && expandedChildId === child.id ? (
                                            <div className="flex items-center justify-center h-full"><Loader2 className="h-5 w-5 animate-spin" /></div>
                                        ) : getTodaysSchedule(child.id).length === 0 ? (
                                             <div className="flex items-center justify-center h-full text-sm text-muted-foreground italic">Nenhuma aula para hoje.</div>
                                        ) : (
                                            getTodaysSchedule(child.id).map(entry => (
                                                <div key={entry.id} className="p-1.5 rounded-md text-sm flex items-center gap-2 bg-muted/40">
                                                    <div className="text-muted-foreground font-mono text-xs w-10 text-center">{entry.startTime}</div>
                                                    <NotebookPen className="h-4 w-4 text-chart-4" />
                                                    <span className="truncate">{entry.subject}</span>
                                                </div>
                                            ))
                                        )}
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                            <CardFooter className="grid grid-cols-3 gap-1 p-1 border-t bg-muted/20 mt-auto">
                                <div className="p-2 text-center space-y-1">
                                    <div className="font-semibold flex items-center justify-center gap-x-1 sm:gap-x-1.5">
                                        <div className="flex items-center gap-1 text-amber-600">
                                          +{todaysGains.stars} <Star className="h-4 w-4 fill-current" />
                                        </div>
                                        <span className="text-muted-foreground">/</span>
                                        <div className="flex items-center gap-1 text-blue-600">
                                          +{todaysGains.xp} <BadgeCheck className="h-4 w-4" />
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground">Ganhos do Dia</p>
                                </div>
                                <Button asChild variant="ghost" size="sm" className="h-full flex-col gap-1">
                                    <Link href={`/dashboard/mural?childId=${child.id}&tab=rewards`}>
                                        <Gift className="h-5 w-5 text-chart-2" />
                                        <span className="text-xs text-muted-foreground">Recompensas</span>
                                    </Link>
                                </Button>
                                <Button asChild variant="ghost" size="sm" className="h-full flex-col gap-1">
                                    <Link href={`/dashboard/mural?childId=${child.id}&tab=badges`}>
                                        <Medal className="h-5 w-5 text-chart-5" />
                                        <span className="text-xs text-muted-foreground">Medalhas</span>
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    );
                })}
            </div>
             {missionToDelete && (
                <AlertDialog open={!!missionToDelete} onOpenChange={() => setMissionToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Remover Atribuição?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Tem certeza que deseja remover permanentemente a missão "{missionToDelete.title}" da lista de tarefas de {children.find(c => c.id === missionToDelete.childId)?.name}?
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={processingMissionId === missionToDelete.id}>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDeleteInstance}
                                className="bg-destructive hover:bg-destructive/90"
                                disabled={processingMissionId === missionToDelete.id}
                            >
                                {processingMissionId === missionToDelete.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Sim, Remover
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </div>
    );
}
