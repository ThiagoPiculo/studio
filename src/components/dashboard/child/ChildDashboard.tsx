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
} from '@/lib/supabase/db';
import type { ChildProfile, MissionInstance } from '@/lib/types';
import Loading from '@/app/dashboard/(child)/loading';
import { isMissionScheduledForDate, isMissionCompletedForDate, getDateObject, getPeriodOfDay } from '@/lib/calendar-utils';
import { startOfDay, format as formatDateFns, subDays, addDays, isToday } from 'date-fns';
import { supabase } from '@/lib/supabase/config';


import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, Star, Circle, CheckCircle, Sun, Moon, CloudSun, LogOut, Trophy, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [allMissions, setAllMissions] = useState<MissionInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingMissionId, setProcessingMissionId] = useState<string | null>(null);
  
  const [currentDate, setCurrentDate] = useState(new Date());

  const [victoryData, setVictoryData] = useState<{
    child: ChildProfile;
    period: 'Manhã' | 'Tarde' | 'Noite';
    missions: MissionInstance[];
    stars: number;
  } | null>(null);

  useEffect(() => {
    if (isChildAuthenticated && childId) {
      setIsLoading(true);

      const loadChild = async () => {
        const profile = await getChildProfileById(childId);
        if (profile) {
          setChild(profile);
        } else {
          toast({ title: 'Erro ao carregar perfil', variant: 'destructive' });
          logout();
        }
      };

      const loadMissions = async () => {
        const missions = await getMissionInstancesByChild(childId);
        setAllMissions(missions);
        setIsLoading(false);
      };

      loadChild();
      loadMissions();

      const childChannel = supabase
        .channel(`child:${childId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'child_profiles', filter: `id=eq.${childId}` }, () => { loadChild(); })
        .subscribe();

      const missionsChannel = supabase
        .channel(`child-missions:${childId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'mission_instances', filter: `child_id=eq.${childId}` }, () => { loadMissions(); })
        .subscribe();

      return () => {
        supabase.removeChannel(childChannel);
        supabase.removeChannel(missionsChannel);
      };
    }
  }, [childId, isChildAuthenticated, toast, logout]);

  const todaysMissions = useMemo(() => {
    const selectedDate = startOfDay(currentDate);
    return allMissions
        .filter(m => isMissionScheduledForDate(m, selectedDate) && m.status === 'pending')
        .sort((a, b) => {
            const timeA = getDateObject(a.isRecurring ? a.startDate : a.dueDate) || new Date(0);
            const timeB = getDateObject(b.isRecurring ? b.startDate : b.dueDate) || new Date(0);
            return timeA.getTime() - timeB.getTime();
        });
  }, [allMissions, currentDate]);


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
  
    const isCompleted = isMissionCompletedForDate(mission, currentDate);

    try {
        if (isCompleted) {
             await reactivateMissionInstance(mission.id, currentDate, { id: child.id, name: child.name });
        } else {
            const missionTime = getDateObject(mission.isRecurring ? mission.startDate : mission.dueDate);
            const missionPeriod = getPeriodOfDay(missionTime);
            
            const updatedChild = await completeMissionInstance(mission.id, currentDate, { id: child.id, name: child.name });
            
            // Victory Parade Logic
            const allInPeriodComplete = missionsByPeriod[missionPeriod!].every(m => {
                 const isThisMission = m.id === mission.id;
                 const wasAlreadyCompleted = isMissionCompletedForDate(m, currentDate);
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
  
  const selectedDateLabel = formatDateFns(currentDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  
  const handlePrevDay = () => setCurrentDate(prev => subDays(prev, 1));
  const handleNextDay = () => setCurrentDate(prev => addDays(prev, 1));
  const handleToday = () => setCurrentDate(new Date());

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

            <div className="flex items-center justify-center gap-2">
                <Button variant={isToday(currentDate) ? 'default' : 'outline'} size="sm" onClick={handleToday}>Hoje</Button>
                <div className="flex items-center">
                    <Button variant="ghost" size="icon" onClick={handlePrevDay} className="h-9 w-9 rounded-full"><ChevronLeft className="h-5 w-5"/></Button>
                    <Button variant="ghost" size="icon" onClick={handleNextDay} className="h-9 w-9 rounded-full"><ChevronRight className="h-5 w-5"/></Button>
                </div>
                <h2 className="text-base sm:text-lg font-bold font-headline capitalize text-center truncate">
                    {selectedDateLabel}
                </h2>
            </div>
        </div>

        <div className="overflow-y-auto flex-1 pb-24">
            <div className="space-y-3 px-4 mt-4">
            {todaysMissions.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                <p className="font-semibold">Nenhuma missão para este dia!</p>
                <p className="text-sm">Aproveite seu dia de folga, herói!</p>
                </div>
            ) : (
                todaysMissions.map(mission => {
                const isCompleted = isMissionCompletedForDate(mission, currentDate);
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
