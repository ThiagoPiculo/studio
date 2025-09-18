
'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlusCircle, Smile, Loader2, Settings, Gift, ListChecks, NotebookPen, Medal, CheckCircle, Target, ArrowRight, Circle, Info, BadgeCheck, RefreshCw, ChevronDown, ChevronUp, Clock, CalendarDays, ExternalLink, LayoutGrid, Home, Star, HelpCircle, Lightbulb, MoreVertical, Contact, Edit3, CalendarCheck2, Camera, Sun, CloudSun, Moon } from "lucide-react";
import { useRouter } from 'next/navigation';
import type { ChildProfile, MissionInstance, SchoolScheduleEntry } from "@/lib/types";
import { cn, getInitials, convertTimestampsInObject } from "@/lib/utils";
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
import { missionToBlockMap } from '@/lib/mission-block-mapping';
import { onSnapshot, query, collection, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

interface ActivityItem {
    id: string;
    type: 'mission' | 'school';
    time: string;
    title: string;
    emoji?: string;
    isCompleted?: boolean;
    data: MissionInstance | SchoolScheduleEntry;
    block: string;
}

interface HeroesSummaryProps {
  initialChildren: ChildProfile[];
  initialMissionInstances: MissionInstance[];
}

export function HeroesSummary({ initialChildren, initialMissionInstances }: HeroesSummaryProps) {
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();
    const { currentContext, selectedChildId, setSelectedChildId } = useFamily();
    
    const [children, setChildren] = useState(initialChildren);
    const [missionInstances, setMissionInstances] = useState(initialMissionInstances);
    
    const [schoolSchedules, setSchoolSchedules] = useState<Record<string, SchoolScheduleEntry[]>>({});
    const [isLoadingSchedules, setIsLoadingSchedules] = useState(true);
    
    const [processingMissionId, setProcessingMissionId] = useState<string | null>(null);
    const [missionToDelete, setMissionToDelete] = useState<MissionInstance | null>(null);
    
    const [confirmingMission, setConfirmingMission] = useState<MissionInstance | null>(null);
    
    // Real-time listener for mission instances
    useEffect(() => {
        if (!user) return;
        
        let q;
        if(currentContext === 'my-space') {
            q = query(collection(db, 'missionInstances'), where('ownerId', '==', user.uid), where('familyId', '==', null));
        } else {
            q = query(collection(db, 'missionInstances'), where('familyId', '==', currentContext));
        }
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const missions = snapshot.docs.map(doc => convertTimestampsInObject({ id: doc.id, ...doc.data() }) as MissionInstance);
            setMissionInstances(missions);
        });

        return () => unsubscribe();
    }, [user, currentContext]);
    
    // Real-time listener for children profiles
    useEffect(() => {
        if (!user) return;
        
        let q;
        if(currentContext === 'my-space') {
            q = query(collection(db, 'children'), where('ownerId', '==', user.uid), where('familyId', '==', null));
        } else {
            q = query(collection(db, 'children'), where('familyId', '==', currentContext));
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const childrenProfiles = snapshot.docs.map(doc => convertTimestampsInObject({ id: doc.id, ...doc.data() }) as ChildProfile);
            setChildren(childrenProfiles);
        });
        
        return () => unsubscribe();
    }, [user, currentContext]);


    useEffect(() => {
        setIsLoadingSchedules(true);
        const childIds = initialChildren.map(c => c.id);
        if (childIds.length === 0) {
            setIsLoadingSchedules(false);
            return;
        }

        const fetchAllSchedules = async () => {
            const schedulePromises = childIds.map(id => getSchoolScheduleForChild(id));
            try {
                const results = await Promise.all(schedulePromises);
                const schedulesMap: Record<string, SchoolScheduleEntry[]> = {};
                childIds.forEach((id, index) => {
                    schedulesMap[id] = results[index];
                });
                setSchoolSchedules(schedulesMap);
            } catch (error) {
                console.error("Error fetching school schedules:", error);
            } finally {
                setIsLoadingSchedules(false);
            }
        };
        fetchAllSchedules();
    }, [initialChildren]);

    const filteredChildren = useMemo(() => {
        if (!selectedChildId) return children;
        return children.filter(child => child.id === selectedChildId);
    }, [children, selectedChildId]);
    
    const triggerToggleCompletion = async (mission: MissionInstance, date: Date, isCompleted: boolean) => {
        if (!user) return;
        setProcessingMissionId(mission.id);

        try {
            const actor = { id: user.uid, name: user.name };
            if (isCompleted) {
                await reactivateMissionInstance(mission.id, date, actor);
                toast({ title: "Ação Desfeita", description: `A missão "${mission.title}" foi reativada.` });
            } else {
                await completeMissionInstance(mission.id, date, actor);
                 toast({ title: "Missão Cumprida!", description: `Você marcou "${mission.title}" como concluída.` });
            }
        } catch (error) {
            console.error("Error toggling mission completion:", error);
            toast({ title: "Erro ao atualizar missão", variant: "destructive" });
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
            // onSnapshot will handle the update
            toast({ title: "Atribuição Removida", description: "A missão foi removida da lista deste herói."});
        } catch (error) {
            console.error("Error deleting mission instance", error);
            toast({ title: "Erro ao remover", variant: "destructive"});
        } finally {
            setProcessingMissionId(null);
            setMissionToDelete(null);
        }
    }

    const allTodaysActivitiesByChild = useMemo(() => {
        const today = startOfDay(new Date());
        const todayWeekday = getDayToWeekday[getDay(today)];
        const result: Record<string, ActivityItem[]> = {};

        for (const child of children) {
            const todaysMissions = missionInstances.filter(m => m.childId === child.id && isMissionScheduledForDate(m, today));
            const childSchoolSchedule = schoolSchedules[child.id] || [];

            const schoolActivities: ActivityItem[] = childSchoolSchedule
                .filter(entry => entry.dayOfWeek === todayWeekday)
                .map(entry => ({
                    id: entry.id,
                    type: 'school',
                    time: entry.startTime,
                    title: entry.subject,
                    data: entry,
                    block: 'Agenda Escolar'
                }));
            
            const missionActivities: ActivityItem[] = todaysMissions.map(m => {
                const missionTime = getDateObject(m.isRecurring ? m.startDate : m.dueDate) || getDateObject(m.startDate) || new Date();
                
                let block = missionToBlockMap[m.title.trim()];
                if (!block) {
                  const period = getPeriodOfDay(missionTime);
                  block = `Atividades ${period ? `da ${period}` : 'Extras'}`;
                } else {
                  block = block.replace('Rotina ', '');
                }

                return {
                    id: m.id,
                    type: 'mission',
                    time: formatDateFns(missionTime, 'HH:mm'),
                    title: m.title,
                    emoji: m.emoji,
                    isCompleted: isMissionCompletedForDate(m, today),
                    data: m,
                    block: block,
                };
            });
            
            result[child.id] = [...missionActivities, ...schoolActivities].sort((a, b) => a.time.localeCompare(b.time));
        }

        return result;
    }, [missionInstances, children, schoolSchedules]);

    const containerClasses = filteredChildren.length === 1
        ? "max-w-2xl mx-auto"
        : "grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6";

    return (
        <div className="space-y-6">
            <div className={containerClasses}>
                {filteredChildren.map(child => {
                    const allTodaysActivities = allTodaysActivitiesByChild[child.id] || [];
                    const todaysMissions = allTodaysActivities.filter(a => a.type === 'mission');
                    const todaysSchoolEntries = allTodaysActivities.filter(a => a.type === 'school');
                    
                    const completedMissions = todaysMissions.filter(a => a.isCompleted);
                    const totalMissions = todaysMissions.length;
                    const progress = totalMissions > 0 ? (completedMissions.length / totalMissions) * 100 : 0;
                    
                    const todaysGains = completedMissions.reduce((acc, mission) => {
                        acc.stars += (mission.data as MissionInstance).starsReward;
                        return acc;
                    }, { stars: 0 });

                    const totalStarsToday = todaysMissions
                        .reduce((total, mission) => total + (mission.data as MissionInstance).starsReward, 0);

                    const isDayComplete = totalMissions > 0 && completedMissions.length === totalMissions;

                    const missionsByBlock = todaysMissions.reduce((acc, activity) => {
                        const blockName = activity.block || 'Atividades Extras';
                        if (!acc[blockName]) acc[blockName] = [];
                        acc[blockName].push(activity);
                        return acc;
                    }, {} as Record<string, ActivityItem[]>);

                    const sortedMissionBlockNames = Object.keys(missionsByBlock).sort((a, b) => {
                        const firstActivityTimeA = missionsByBlock[a][0]?.time || '23:59';
                        const firstActivityTimeB = missionsByBlock[b][0]?.time || '23:59';
                        return firstActivityTimeA.localeCompare(firstActivityTimeB);
                    });
                    
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

                            <Tabs defaultValue="missions" className="w-full flex-grow flex flex-col">
                                <TabsList className="w-full">
                                    <TabsTrigger value="missions"><ListChecks className="mr-2 h-4 w-4" />Missões Hoje</TabsTrigger>
                                    <TabsTrigger value="school"><NotebookPen className="mr-2 h-4 w-4" />Escola</TabsTrigger>
                                </TabsList>
                                <TabsContent value="missions" className="flex-grow">
                                    <CardContent className="p-4 pt-4 flex-grow">
                                        {todaysMissions.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-full text-sm text-muted-foreground italic text-center p-4 border-2 border-dashed rounded-lg min-h-[150px]">
                                                <Smile className="h-8 w-8 mb-2 text-primary/50" />
                                                <p className="font-semibold">Nenhuma missão para hoje!</p>
                                                <p>Aproveite o dia livre.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {sortedMissionBlockNames.map(blockName => {
                                                    const activities = missionsByBlock[blockName];
                                                    return (
                                                        <div key={blockName}>
                                                            <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider mb-1.5 text-muted-foreground">{blockName}</h4>
                                                            <div className="space-y-1.5">
                                                                {activities.map(item => (
                                                                    <div key={item.id} className={cn("p-1.5 rounded-md text-sm flex items-center gap-2", item.isCompleted ? 'bg-green-500/10' : 'bg-muted/40')}>
                                                                        <div className="flex items-center gap-2 flex-grow min-w-0">
                                                                            <div className="text-muted-foreground font-mono text-xs w-10 text-center">{item.time}</div>
                                                                            <span className="text-xl shrink-0 w-5 text-center">{item.emoji || '🎯'}</span>
                                                                            <span className={cn("truncate font-medium", item.isCompleted && "line-through text-muted-foreground")}>{item.title}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-1 flex-shrink-0">
                                                                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => handleToggleCompletion(item.data as MissionInstance, startOfDay(new Date()), !!item.isCompleted)} disabled={processingMissionId === item.id}>
                                                                                {processingMissionId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : item.isCompleted ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4 text-primary" />}
                                                                            </Button>
                                                                            <DropdownMenu>
                                                                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                                                <DropdownMenuContent align="end">
                                                                                    <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                                                                                        <div className="flex items-center justify-between gap-4"><span className="flex items-center gap-1.5 text-amber-600"><Star className="h-3.5 w-3.5" /> +{(item.data as MissionInstance).starsReward}</span></div>
                                                                                    </DropdownMenuLabel>
                                                                                    <DropdownMenuSeparator />
                                                                                    <DropdownMenuItem onSelect={() => router.push(`/dashboard/agenda?childId=${child.id}`)}>Ver na Agenda</DropdownMenuItem>
                                                                                    <DropdownMenuItem onSelect={() => router.push(`/dashboard/missions/edit/${(item.data as MissionInstance).templateId}`)}>Editar Missão</DropdownMenuItem>
                                                                                    <DropdownMenuSeparator />
                                                                                    <DropdownMenuItem onSelect={() => setMissionToDelete(item.data as MissionInstance)} className="text-destructive">Remover Atribuição</DropdownMenuItem>
                                                                                </DropdownMenuContent>
                                                                            </DropdownMenu>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </CardContent>
                                </TabsContent>
                                <TabsContent value="school" className="flex-grow">
                                     <CardContent className="p-4 pt-4 flex-grow">
                                        {isLoadingSchedules ? (
                                            <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                                        ) : todaysSchoolEntries.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-full text-sm text-muted-foreground italic text-center p-4 border-2 border-dashed rounded-lg min-h-[150px]">
                                                <Smile className="h-8 w-8 mb-2 text-primary/50" />
                                                <p className="font-semibold">Nenhuma aula hoje!</p>
                                                <p>Um dia de folga da escola.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-1.5">
                                                {todaysSchoolEntries.map(item => (
                                                    <div key={item.id} className="p-1.5 rounded-md text-sm flex items-center gap-2 bg-indigo-500/10 border-l-4 border-indigo-500">
                                                        <div className="text-indigo-700 font-mono text-xs w-10 text-center">{item.time}</div>
                                                        <span className="font-semibold text-indigo-800">{item.title}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </TabsContent>
                            </Tabs>

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
