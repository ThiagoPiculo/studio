
"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlusCircle, Smile, Loader2, Settings, Gift, ListChecks, NotebookPen, Medal, CheckCircle, Target, ArrowRight, Circle, Info, BadgeCheck, RefreshCw, ChevronDown, ChevronUp, Clock, CalendarDays, ExternalLink, LayoutGrid, Home, Star, HelpCircle, Lightbulb, MoreVertical, Contact, Edit3, CalendarCheck2, Camera, Sun, CloudSun, Moon } from "lucide-react";
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
import { isMissionScheduledForDate, isMissionCompletedForDate, getDayToWeekday, getDateObject, parseTime, getPeriodOfDay } from '@/lib/calendar-utils';
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
import { CompleteMissionConfirmationDialog } from '../missions/CompleteMissionConfirmationDialog';

interface ActivityItem {
    id: string;
    type: 'mission' | 'school';
    time: string;
    title: string;
    emoji?: string;
    isCompleted?: boolean;
    data: MissionInstance | { startTime: string };
    period: 'Manhã' | 'Tarde' | 'Noite' | null;
}

interface HeroesSummaryProps {
  initialChildren: ChildProfile[];
  initialMissionInstances: MissionInstance[];
}

export function HeroesSummary({ initialChildren, initialMissionInstances }: HeroesSummaryProps) {
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();
    const { selectedChildId, setSelectedChildId } = useFamily(); // Use global state
    
    const [children, setChildren] = useState(initialChildren);
    const [missionInstances, setMissionInstances] = useState(initialMissionInstances);
    
    const [expandedChildId, setExpandedChildId] = useState<string | null>(null);
    const [schoolSchedules, setSchoolSchedules] = useState<Record<string, SchoolScheduleEntry[]>>({});
    const [isLoadingSchedules, setIsLoadingSchedules] = useState(false);
    
    const [processingMissionId, setProcessingMissionId] = useState<string | null>(null);
    const [missionToDelete, setMissionToDelete] = useState<MissionInstance | null>(null);
    
    const [confirmingMission, setConfirmingMission] = useState<MissionInstance | null>(null);
    
    useEffect(() => {
        setChildren(initialChildren);
        setMissionInstances(initialMissionInstances);
    }, [initialChildren, initialMissionInstances]);


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
    
    const triggerToggleCompletion = async (mission: MissionInstance, date: Date, isCompleted: boolean) => {
        if (!user) return;
        setProcessingMissionId(mission.id);

        const dateKey = formatDateFns(startOfDay(date), 'yyyy-MM-dd');
        
        const originalInstances = missionInstances;
        const originalChildren = children;

        setMissionInstances(prevInstances =>
            prevInstances.map(inst => {
                if (inst.id === mission.id) {
                    const newLog = { ...(inst.completionLog || {}) };
                    if (isCompleted) {
                        delete newLog[dateKey];
                    } else {
                        newLog[dateKey] = { completedAt: new Date() as any, stars: mission.starsReward, actorId: user.uid, actorName: user.name };
                    }
                    return { ...inst, completionLog: newLog };
                }
                return inst;
            })
        );
        
        setChildren(prevChildren => 
            prevChildren.map(c => {
                if (c.id === mission.childId) {
                    const starsChange = isCompleted ? -mission.starsReward : mission.starsReward;
                    return { ...c, stars: c.stars + starsChange };
                }
                return c;
            })
        );


        try {
            const actor = { id: user.uid, name: user.name };
            const updatedChildProfile = isCompleted
                ? await reactivateMissionInstance(mission.id, date, actor)
                : await completeMissionInstance(mission.id, date, actor);
            
            if (updatedChildProfile) {
                setChildren(prevChildren =>
                    prevChildren.map(c => 
                        c.id === updatedChildProfile.id ? { ...c, ...updatedChildProfile } : c
                    )
                );
                toast({
                    title: isCompleted ? "Ação Desfeita" : "Missão Cumprida!",
                    description: `A missão "${mission.title}" foi atualizada.`
                });
            }
        } catch (error) {
            console.error("Error toggling mission completion:", error);
            toast({ title: "Erro ao atualizar missão", variant: "destructive" });
            setMissionInstances(originalInstances);
            setChildren(originalChildren);
        } finally {
            setProcessingMissionId(null);
            setConfirmingMission(null);
        }
    };

    const handleToggleCompletion = async (mission: MissionInstance, date: Date, isCompleted: boolean) => {
        if (isCompleted) {
             await triggerToggleCompletion(mission, date, true);
        } else {
            const dismissedToday = sessionStorage.getItem('dismissCompleteMissionConfirmation');
            if (dismissedToday === 'true') {
                 await triggerToggleCompletion(mission, date, false);
            } else {
                 setConfirmingMission(mission);
            }
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
    
    const containerClasses = filteredChildren.length === 1
        ? "max-w-2xl mx-auto"
        : "grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6";

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button asChild className="w-full sm:w-auto">
                    <Link href="/dashboard/missions/new">
                        <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Missão
                    </Link>
                </Button>
            </div>
            <div className={containerClasses}>
                {filteredChildren.map(child => {
                    const today = startOfDay(new Date());

                    const allTodaysActivities: ActivityItem[] = useMemo(() => {
                        const todaysMissions = missionInstances
                          .filter(m => m.childId === child.id && isMissionScheduledForDate(m, today));
        
                        const schoolActivities: ActivityItem[] = [];
                        const isWeekday = getDay(today) >= 1 && getDay(today) <= 5;
                        if (isWeekday && child.schoolShift && child.schoolShift !== 'not_applicable') {
                            if (child.schoolShiftStart) {
                                schoolActivities.push({
                                    id: 'school-start',
                                    type: 'school',
                                    time: child.schoolShiftStart,
                                    title: 'Entrada na Escola',
                                    data: { startTime: child.schoolShiftStart },
                                    period: getPeriodOfDay(parseTime(child.schoolShiftStart)),
                                });
                            }
                            if (child.schoolShiftEnd) {
                                 schoolActivities.push({
                                    id: 'school-end',
                                    type: 'school',
                                    time: child.schoolShiftEnd,
                                    title: 'Saída da Escola',
                                    data: { startTime: child.schoolShiftEnd },
                                    period: getPeriodOfDay(parseTime(child.schoolShiftEnd)),
                                });
                            }
                        }
        
                        const missionActivities: ActivityItem[] = todaysMissions.map(m => {
                            const missionTime = getDateObject(m.isRecurring ? m.startDate : m.dueDate) || getDateObject(m.startDate) || new Date();
                            return {
                                id: m.id,
                                type: 'mission',
                                time: formatDateFns(missionTime, 'HH:mm'),
                                title: m.title,
                                emoji: m.emoji,
                                isCompleted: isMissionCompletedForDate(m, today),
                                data: m,
                                period: getPeriodOfDay(missionTime),
                            };
                        });
                        
                        return [...missionActivities, ...schoolActivities].sort((a, b) => a.time.localeCompare(b.time));

                    }, [missionInstances, child, today]);

                    const completedMissions = allTodaysActivities.filter(a => a.type === 'mission' && a.isCompleted);
                    const totalMissions = allTodaysActivities.filter(a => a.type === 'mission').length;
                    const progress = totalMissions > 0 ? (completedMissions.length / totalMissions) * 100 : 0;
                    
                    const todaysGains = completedMissions.reduce((acc, mission) => {
                        acc.stars += (mission.data as MissionInstance).starsReward;
                        return acc;
                    }, { stars: 0 });

                    const totalStarsToday = allTodaysActivities
                        .filter(a => a.type === 'mission')
                        .reduce((total, mission) => total + (mission.data as MissionInstance).starsReward, 0);

                    const isDayComplete = totalMissions > 0 && completedMissions.length === totalMissions;

                    const isExpanded = expandedChildId === child.id;
                    const activitiesByPeriod = {
                        Manhã: allTodaysActivities.filter(a => a.period === 'Manhã'),
                        Tarde: allTodaysActivities.filter(a => a.period === 'Tarde'),
                        Noite: allTodaysActivities.filter(a => a.period === 'Noite'),
                    };
                    const periodOrder: Array<'Manhã' | 'Tarde' | 'Noite'> = ['Manhã', 'Tarde', 'Noite'];
                    const periodIcons = { Manhã: Sun, Tarde: CloudSun, Noite: Moon };
                    

                    return (
                        <Card key={child.id} className="shadow-lg hover:shadow-xl transition-shadow flex flex-col">
                             <CardHeader className="p-4">
                               <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-4">
                                        <Avatar
                                            className="h-16 w-16 text-2xl ring-4 ring-offset-background ring-[var(--ring-color)]"
                                            style={{ '--ring-color': child.color } as React.CSSProperties}
                                        >
                                            <AvatarImage src={child.avatar} alt={child.name} />
                                            <AvatarFallback style={{ backgroundColor: child.color }} className="font-bold">{getInitials(child.name)}</AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <CardTitle className="text-2xl truncate">{child.name}</CardTitle>
                                            <CardDescription className="text-sm flex items-center gap-1">
                                                Acesso do Herói: <span className="font-mono">{child.accessCode}</span>
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Link href={`/dashboard/agenda?childId=${child.id}`}>
                                            <Button variant="link" className="p-0 h-auto text-xs">
                                                Rotina Semanal <ArrowRight className="ml-1 h-3 w-3" />
                                            </Button>
                                        </Link>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onSelect={() => router.push(`/dashboard/mural?childId=${child.id}&tab=edit`)}>
                                                    <Camera className="mr-2 h-4 w-4" />
                                                    <span>Trocar foto</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onSelect={() => router.push(`/dashboard/mural?childId=${child.id}&tab=edit`)}>
                                                    <Edit3 className="mr-2 h-4 w-4" />
                                                    <span>Editar Perfil</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onSelect={() => router.push(`/dashboard/mural?childId=${child.id}`)}>
                                                    <Contact className="mr-2 h-4 w-4" />
                                                    <span>Perfil Completo</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onSelect={() => router.push(`/dashboard/progressos?childId=${child.id}`)}>
                                                    <CalendarCheck2 className="mr-2 h-4 w-4" />
                                                    <span>Painel de progresso</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onSelect={() => router.push(`/dashboard/school-schedule?childId=${child.id}`)}>
                                                    <NotebookPen className="mr-2 h-4 w-4" />
                                                    <span>Agenda Escolar</span>
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-center gap-4">
                                        <div className="flex items-center gap-2 text-amber-600">
                                            <Star className="h-5 w-5 fill-current" />
                                            <span className="text-lg font-bold">{child.stars}</span>
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
                                        <Label className="text-xs text-muted-foreground">Missões de Hoje: {completedMissions.length} de {totalMissions}</Label>
                                        <Progress value={progress} className="h-2" />
                                    </div>
                                </div>
                            </CardContent>

                            <CardContent className="p-4 pt-0 flex-grow">
                                {allTodaysActivities.length === 0 ? (
                                     <div className="flex flex-col items-center justify-center h-full text-sm text-muted-foreground italic text-center p-4 border-2 border-dashed rounded-lg min-h-[200px]">
                                        <Smile className="h-8 w-8 mb-2 text-primary/50" />
                                        <p className="font-semibold">Nenhuma missão para hoje!</p>
                                        <p>Aproveite o dia livre ou adicione uma nova missão.</p>
                                     </div>
                                ) : (
                                    <div className="space-y-3 min-h-[200px]">
                                        {periodOrder.map(period => {
                                            const activities = activitiesByPeriod[period];
                                            if (activities.length === 0) return null;
                                            const PeriodIcon = periodIcons[period];

                                            return (
                                                <div key={period}>
                                                    <h4 className={cn("flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider mb-1.5",
                                                      period === 'Manhã' && "text-yellow-600",
                                                      period === 'Tarde' && "text-orange-600",
                                                      period === 'Noite' && "text-indigo-600",
                                                    )}>
                                                        <PeriodIcon className="h-4 w-4" /> {period}
                                                    </h4>
                                                    <div className="space-y-1.5">
                                                        {activities.map(item => {
                                                             if(item.type === 'school') {
                                                                return (
                                                                    <div key={item.id} className="p-1.5 rounded-md text-sm flex items-center gap-2 bg-indigo-500/10 border-l-4 border-indigo-500">
                                                                        <div className="text-indigo-700 font-mono text-xs w-10 text-center">{item.time}</div>
                                                                        <NotebookPen className="h-4 w-4 text-indigo-600" />
                                                                        <span className="font-semibold text-indigo-800">{item.title}</span>
                                                                    </div>
                                                                );
                                                            }
                                                            
                                                            const mission = item.data as MissionInstance;
                                                            
                                                            return (
                                                                <div key={mission.id} className={cn("p-1.5 rounded-md text-sm flex items-center gap-2", item.isCompleted ? 'bg-green-500/10' : 'bg-muted/40')}>
                                                                    <div className="flex items-center gap-2 flex-grow min-w-0">
                                                                        <div className="text-muted-foreground font-mono text-xs w-10 text-center">{item.time}</div>
                                                                        <span className="text-xl shrink-0 w-5 text-center">{item.emoji || '🎯'}</span>
                                                                        <span className={cn("truncate font-medium", item.isCompleted && "line-through text-muted-foreground")}>{item.title}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1 flex-shrink-0">
                                                                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => handleToggleCompletion(mission, today, !!item.isCompleted)} disabled={processingMissionId === mission.id}>
                                                                            {processingMissionId === mission.id ? <Loader2 className="h-4 w-4 animate-spin" /> : item.isCompleted ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4 text-primary" />}
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
                                                                                        <span className="flex items-center gap-1.5 text-amber-600"><Star className="h-3.5 w-3.5" /> +{mission.starsReward}</span>
                                                                                    </div>
                                                                                </DropdownMenuLabel>
                                                                                <DropdownMenuSeparator />
                                                                                <DropdownMenuItem onSelect={() => router.push(`/dashboard/agenda?childId=${child.id}`)}>
                                                                                    Ver na Agenda
                                                                                </DropdownMenuItem>
                                                                                <DropdownMenuItem onSelect={() => router.push(`/dashboard/missions/edit/${mission.templateId}`)}>
                                                                                    Editar Missão
                                                                                </DropdownMenuItem>
                                                                                <DropdownMenuSeparator />
                                                                                <DropdownMenuItem onSelect={() => setMissionToDelete(mission)} className="text-destructive">
                                                                                    Remover Atribuição
                                                                                </DropdownMenuItem>
                                                                            </DropdownMenuContent>
                                                                        </DropdownMenu>
                                                                    </div>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </CardContent>
                             <CardFooter className="grid grid-cols-3 gap-1 p-1 border-t bg-muted/20 mt-auto">
                                <div className="p-2 text-center space-y-1">
                                    {isDayComplete ? (
                                        <>
                                            <div className="font-semibold flex items-center justify-center gap-x-1.5 text-green-600">
                                                <span>👍</span>
                                                <span>Dia Completo!</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground">+{todaysGains.stars} ⭐ Ganhas Hoje</p>
                                        </>
                                    ) : (
                                        <>
                                            <div className="font-semibold flex items-center justify-center gap-x-1 sm:gap-x-1.5">
                                                <div className="flex items-center gap-1 text-amber-600">
                                                    +{todaysGains.stars} / {totalStarsToday} <Star className="h-4 w-4 fill-current" />
                                                </div>
                                            </div>
                                            <p className="text-xs text-muted-foreground">Ganhos do Dia</p>
                                        </>
                                    )}
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
            
            {confirmingMission && (
                <CompleteMissionConfirmationDialog
                  isOpen={!!confirmingMission}
                  onOpenChange={() => setConfirmingMission(null)}
                  onConfirm={(dismiss) => {
                    if (dismiss) {
                      sessionStorage.setItem('dismissCompleteMissionConfirmation', 'true');
                    }
                    triggerToggleCompletion(confirmingMission, startOfDay(new Date()), false);
                  }}
                />
            )}
        </div>
    );
}

    


    