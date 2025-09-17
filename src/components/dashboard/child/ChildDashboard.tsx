'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  getChildProfileById,
  getMissionInstancesByChild,
  completeMissionInstance,
  reactivateMissionInstance
} from '@/lib/firebase/firestore';
import type { ChildProfile, MissionInstance } from '@/lib/types';
import Loading from '@/app/dashboard/(child)/loading';
import { isMissionScheduledForDate, isMissionCompletedForDate, getDateObject, getPeriodOfDay } from '@/lib/calendar-utils';
import { startOfDay, format as formatDateFns } from 'date-fns';
import { onSnapshot, doc, query, collection, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { convertTimestampsInObject } from '@/lib/utils';


import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, Star, Circle, CheckCircle, Sun, Moon, CloudSun, LogOut, Trophy } from 'lucide-react';
import { ChildBottomNavbar } from './ChildBottomNavbar';
import { cn, getInitials } from '@/lib/utils';
import { ptBR } from 'date-fns/locale';
import { VictoryParade } from './VictoryParade';
import { Separator } from '@/components/ui/separator';
import { LevelUpPath } from '../LevelUpPath';

const periodIcons = {
    Manhã: Sun,
    Tarde: CloudSun,
    Noite: Moon,
};

export function ChildDashboard() {
  const params = useParams();
  const router = useRouter();
  const { childProfile: authChildProfile, isChildAuthenticated, loading: authLoading, logout } = useAuth();
  const { toast } = useToast();

  const childId = params.childId as string;
  const [child, setChild] = useState<ChildProfile | null>(authChildProfile);
  const [todaysMissions, setTodaysMissions] = useState<MissionInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingMissionId, setProcessingMissionId] = useState<string | null>(null);

  const [victoryData, setVictoryData] = useState<{
    child: ChildProfile;
    period: 'Manhã' | 'Tarde' | 'Noite';
    missions: MissionInstance[];
    stars: number;
  } | null>(null);

  useEffect(() => {
    if (!authLoading && (!isChildAuthenticated || !authChildProfile)) {
        logout(); // Force logout for security if state is inconsistent
        router.replace('/dashboard/child-login');
    } else if (authChildProfile && authChildProfile.id !== childId) {
        // Logged in as a different child, redirect to their correct page
        router.replace(`/dashboard/child/${authChildProfile.id}`);
    }
  }, [childId, authChildProfile, isChildAuthenticated, authLoading, router, logout]);

  useEffect(() => {
    if (isChildAuthenticated && childId) {
      setIsLoading(true);

      const childDocRef = doc(db, 'children', childId);
      const childUnsubscribe = onSnapshot(childDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setChild(convertTimestampsInObject({ id: docSnap.id, ...docSnap.data() }) as ChildProfile);
        } else {
           toast({ title: 'Erro ao carregar perfil', variant: 'destructive' });
           logout();
        }
      });
      
      const missionsQuery = query(collection(db, 'missionInstances'), where('childId', '==', childId));
      const missionsUnsubscribe = onSnapshot(missionsQuery, (snapshot) => {
          const missions = snapshot.docs.map(doc => convertTimestampsInObject({ id: doc.id, ...doc.data() }) as MissionInstance);
          const today = startOfDay(new Date());
          const filteredMissions = missions
            .filter(m => isMissionScheduledForDate(m, today) && m.status === 'pending')
            .sort((a, b) => {
                const timeA = getDateObject(a.isRecurring ? a.startDate : a.dueDate) || new Date(0);
                const timeB = getDateObject(b.isRecurring ? b.startDate : b.dueDate) || new Date(0);
                return timeA.getTime() - timeB.getTime();
            });
          setTodaysMissions(filteredMissions);
          if (isLoading) setIsLoading(false);
      });

      return () => {
        childUnsubscribe();
        missionsUnsubscribe();
      };
    }
  }, [childId, isChildAuthenticated, toast, logout]);

  const missionsByPeriod = useMemo(() => {
    const byPeriod: { Manhã: MissionInstance[], Tarde: MissionInstance[], Noite: MissionInstance[] } = {
        Manhã: [],
        Tarde: [],
        Noite: [],
    };
    todaysMissions.forEach(mission => {
        const missionTime = getDateObject(mission.isRecurring ? mission.startDate : mission.dueDate);
        const period = getPeriodOfDay(missionTime);
        if (period) {
            byPeriod[period].push(mission);
        }
    });
    return byPeriod;
  }, [todaysMissions]);
  
  const handleToggleCompletion = async (mission: MissionInstance) => {
    if (!child) return;
    setProcessingMissionId(mission.id);
  
    const isCompleted = isMissionCompletedForDate(mission, new Date());
    const dateKey = formatDateFns(new Date(), 'yyyy-MM-dd');

    try {
        if (isCompleted) {
             await reactivateMissionInstance(mission.id, new Date(), { id: child.id, name: child.name });
        } else {
            const missionTime = getDateObject(mission.isRecurring ? mission.startDate : mission.dueDate);
            const missionPeriod = getPeriodOfDay(missionTime);
            
            const updatedChild = await completeMissionInstance(mission.id, new Date(), { id: child.id, name: child.name });
            
            // Victory Parade Logic
            // We need to check against the *new state* of missionInstances after completion.
            const allInPeriodComplete = missionsByPeriod[missionPeriod!].every(m => {
                 const isThisMission = m.id === mission.id;
                 const wasAlreadyCompleted = isMissionCompletedForDate(m, new Date());
                 return isThisMission || wasAlreadyCompleted;
            });
            
            if (missionPeriod && allInPeriodComplete && missionsByPeriod[missionPeriod].length > 0 && updatedChild) {
                const starsForPeriod = missionsByPeriod[missionPeriod].reduce((sum, m) => sum + m.starsReward, 0);
                setTimeout(() => {
                  setVictoryData({
                    child: updatedChild,
                    period: missionPeriod,
                    missions: missionsByPeriod[missionPeriod],
                    stars: starsForPeriod,
                  });
                }, 500);
            }
        }
    } catch (error) {
        console.error("Error toggling mission completion:", error);
        toast({ title: 'Ops! Ocorreu um erro mágico.', variant: 'destructive' });
    } finally {
        setProcessingMissionId(null);
    }
  };


  if (isLoading || authLoading || !child) {
    return <Loading />;
  }
  
  const todayLabel = formatDateFns(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR });

  return (
    <>
      <VictoryParade data={victoryData} onDone={() => setVictoryData(null)} />
      <div className="flex flex-col h-screen">
        <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-sm p-4 pt-4 pb-4 space-y-4">
            <header className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20 text-3xl border-4" style={{ borderColor: child.color }}>
                    <AvatarImage src={child.avatar} alt={child.name} />
                    <AvatarFallback style={{ backgroundColor: child.color }} className="font-bold">{getInitials(child.name)}</AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold font-headline text-primary">{child.name}</h1>
                    <Badge variant="secondary" className="font-semibold text-base" style={{ backgroundColor: `${child.color}30`, color: child.color }}>
                        Nível {child.level}
                    </Badge>
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-2">
                 <div className="flex items-center justify-center gap-2 text-amber-500">
                    <Star className="h-7 w-7 fill-current" />
                    <span className="text-3xl font-bold">{child.stars}</span>
                </div>
              </div>

              <Button onClick={logout} variant="ghost" size="icon" className="text-muted-foreground self-start"><LogOut className="h-5 w-5"/></Button>
            </header>
            
            <div className="flex flex-col gap-4 font-semibold">
                <div className="w-full">
                    <LevelUpPath currentLevel={child.level} currentTotalStars={child.totalStars} />
                </div>
            </div>

            <h2 className="text-xl font-bold font-headline capitalize text-center">{todayLabel}</h2>
        </div>

        <div className="overflow-y-auto flex-1 pb-24">
            <div className="space-y-3 px-4 mt-4">
            {todaysMissions.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                <p className="font-semibold">Nenhuma missão para hoje!</p>
                <p className="text-sm">Aproveite seu dia de folga, herói!</p>
                </div>
            ) : (
                todaysMissions.map(mission => {
                const isCompleted = isMissionCompletedForDate(mission, new Date());
                const missionTime = getDateObject(mission.isRecurring ? mission.startDate : mission.dueDate);
                const period = missionTime ? getPeriodOfDay(missionTime) : null;
                const PeriodIcon = period ? periodIcons[period] : null;

                return (
                    <Card 
                    key={mission.id} 
                    className={cn("p-4 transition-all", isCompleted && "bg-green-500/10 border-green-500/30")}
                    >
                        <div className="flex items-center gap-4">
                            <div className="text-5xl">{mission.emoji || '🎯'}</div>
                            <div className="flex-grow space-y-1">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                {missionTime && <p className="font-mono">{formatDateFns(missionTime, 'HH:mm')}</p>}
                                {PeriodIcon && (
                                    <div className={cn("flex items-center gap-1 font-semibold", 
                                    period === 'Manhã' && 'text-yellow-600', 
                                    period === 'Tarde' && 'text-orange-600', 
                                    period === 'Noite' && 'text-indigo-600'
                                    )}>
                                    <PeriodIcon className="h-4 w-4" /> {period}
                                    </div>
                                )}
                            </div>
                            <p className={cn("font-semibold text-lg leading-tight", isCompleted && "line-through text-muted-foreground")}>{mission.title}</p>
                            <div className="flex items-center gap-1 font-bold text-amber-600">
                                +{mission.starsReward} <Star className="h-4 w-4 fill-current" />
                            </div>
                            </div>
                            <Button 
                            variant="ghost" 
                            className="h-16 w-16 rounded-full" 
                            onClick={() => handleToggleCompletion(mission)}
                            disabled={processingMissionId === mission.id}
                            >
                            {processingMissionId === mission.id 
                                ? <Loader2 className="h-8 w-8 animate-spin" /> 
                                : isCompleted 
                                ? <CheckCircle className="h-12 w-12 text-green-500" /> 
                                : <Circle className="h-12 w-12 text-primary" />}
                            </Button>
                        </div>
                    </Card>
                )
                })
            )}
            </div>
        </div>

        <ChildBottomNavbar childId={child.id} />
      </div>
    </>
  );
}
