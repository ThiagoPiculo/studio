
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlusCircle, Smile, Loader2, Settings, Gift, ListChecks, NotebookPen, Medal, CheckSquare, Target, ArrowRight, Square, Info, BadgeCheck, RefreshCw, ChevronDown, ChevronUp, Clock, CalendarDays, ExternalLink, LayoutGrid, Home } from "lucide-react";
import { useRouter } from 'next/navigation';
import type { ChildProfile, MissionInstance, SchoolScheduleEntry } from "@/lib/types";
import { cn, getInitials } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getTodaysMissions, getSchoolScheduleForContext } from '@/lib/firebase/firestore';
import { Progress } from '@/components/ui/progress';
import { isMissionScheduledForDate, isMissionCompletedForDate, getPeriodOfDay } from '@/lib/calendar-utils';
import { getDay, startOfDay } from 'date-fns';
import { HeroSelector } from '@/components/dashboard/dashboard/HeroSelector';
import { weekdayLabels, getDayToWeekday } from '@/lib/types';

interface HeroesSummaryProps {
  children: ChildProfile[];
  missionInstances: MissionInstance[];
}

export function HeroesSummary({ children, missionInstances }: HeroesSummaryProps) {
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();
    const [expandedChildId, setExpandedChildId] = useState<string | null>(null);
    const [schoolSchedules, setSchoolSchedules] = useState<Record<string, SchoolScheduleEntry[]>>({});
    const [isLoadingSchedules, setIsLoadingSchedules] = useState(false);
    const [selectedHeroId, setSelectedHeroId] = useState<string | null>(null);

    const heroesToDisplay = useMemo(() => {
        if (!selectedHeroId) return children;
        return children.filter(c => c.id === selectedHeroId);
    }, [children, selectedHeroId]);

    const handleExpandClick = async (childId: string) => {
        const newExpandedId = expandedChildId === childId ? null : childId;
        setExpandedChildId(newExpandedId);
        
        if (newExpandedId && !schoolSchedules[newExpandedId]) {
            setIsLoadingSchedules(true);
            try {
                const schedule = await getSchoolScheduleForContext(user!.uid, childId);
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
    
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <CardTitle className="text-2xl font-headline flex items-center gap-3">
                    <Home className="h-6 w-6 text-primary" />
                    Resumo do Dia
                </CardTitle>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    {children.length > 1 && (
                         <HeroSelector
                            heroes={children}
                            selectedHeroId={selectedHeroId}
                            onSelectHero={setSelectedHeroId}
                            showAllOption={true}
                        />
                    )}
                    <Link href="/dashboard/novo-heroi" passHref>
                        <Button className="flex-shrink-0">
                            <PlusCircle className="mr-2 h-4 w-4" /> Novo Mini Heroi
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {heroesToDisplay.map(child => {
                    const today = startOfDay(new Date());
                    const todaysMissions = missionInstances.filter(m => m.childId === child.id && isMissionScheduledForDate(m, today));
                    const completedMissions = todaysMissions.filter(m => isMissionCompletedForDate(m, today));
                    const progress = todaysMissions.length > 0 ? (completedMissions.length / todaysMissions.length) * 100 : 0;
                    
                    const todaysGains = completedMissions.reduce((acc, mission) => {
                        acc.stars += mission.starsReward;
                        acc.xp += mission.xpReward;
                        return acc;
                    }, { stars: 0, xp: 0 });

                    return (
                        <Card key={child.id} className="shadow-lg hover:shadow-xl transition-shadow flex flex-col">
                            <CardHeader className="p-4">
                                <div className="flex items-center justify-between">
                                    <Badge variant="secondary" className="font-semibold text-xs">
                                        NÍVEL {child.level}
                                    </Badge>
                                    <Link href={`/dashboard/mural?childId=${child.id}`} passHref>
                                        <Button variant="link" className="p-0 h-auto text-sm">
                                            Painel de Progresso <ArrowRight className="ml-1 h-3 w-3" />
                                        </Button>
                                    </Link>
                                </div>
                                <div className="flex items-center gap-4 mt-2">
                                    <Avatar className="h-16 w-16 text-2xl ring-4 ring-offset-2 ring-offset-background" style={{ '--ring-color': child.color } as React.CSSProperties}>
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
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-around">
                                        <div className="flex items-center gap-2 text-amber-600">
                                            <Star className="h-5 w-5 fill-current" />
                                            <span className="text-lg font-bold">{child.stars}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-blue-600">
                                            <BadgeCheck className="h-5 w-5" />
                                            <span className="text-lg font-bold">{child.xp}</span>
                                            <span className="text-sm font-normal">XP</span>
                                        </div>
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
                                        <TabsTrigger value="today" className="h-full">Missões de Hoje</TabsTrigger>
                                        <TabsTrigger value="schedule" className="h-full">Rotina Escolar</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="today" className="mt-2 space-y-1.5 h-[145px] overflow-y-auto pr-2">
                                        {todaysMissions.length === 0 ? (
                                            <div className="flex items-center justify-center h-full text-sm text-muted-foreground italic">Nenhuma missão para hoje.</div>
                                        ) : (
                                            todaysMissions.map(m => {
                                                const isCompleted = isMissionCompletedForDate(m, today);
                                                const period = getPeriodOfDay(m.startDate || m.dueDate);
                                                return (
                                                <div key={m.id} className={cn("p-1.5 rounded-md text-sm flex items-center gap-2", isCompleted ? 'bg-green-500/10' : 'bg-muted/40')}>
                                                    <div className="text-muted-foreground font-mono text-xs w-10 text-center">{m.startDate ? new Date(m.startDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit'}) : ''}</div>
                                                    {isCompleted ? <CheckSquare className="h-4 w-4 text-green-600" /> : <Square className="h-4 w-4 text-primary" />}
                                                    <span className={cn("truncate", isCompleted && "line-through text-muted-foreground")}>{m.title}</span>
                                                </div>
                                            )})
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
                                <div className="p-2 text-center">
                                    <p className="font-semibold flex items-center justify-center gap-1 text-green-600">+{todaysGains.stars} <Star className="h-4 w-4" /> / +{todaysGains.xp} XP</p>
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
        </div>
    );
}
