
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getChildProfileById, getMissionInstancesByChild, completeMissionInstance, reactivateMissionInstance } from '@/lib/firebase/firestore';
import type { ChildProfile, MissionInstance } from '@/lib/types';
import Loading from '@/app/dashboard/(child)/child/[childId]/loading';
import { isMissionScheduledForDate, isMissionCompletedForDate, getDateObject, getPeriodOfDay } from '@/lib/calendar-utils';
import { startOfDay, format as formatDateFns } from 'date-fns';

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, Star, Circle, CheckCircle, Sun, Moon, CloudSun, LogOut } from 'lucide-react';
import { ChildBottomNavbar } from './ChildBottomNavbar';
import { cn, getInitials } from '@/lib/utils';
import { CompleteMissionConfirmationDialog } from '../missions/CompleteMissionConfirmationDialog';
import { ptBR } from 'date-fns/locale';

const periodIcons = {
    Manhã: Sun,
    Tarde: CloudSun,
    Noite: Moon,
};

export function ChildDashboard() {
  const params = useParams();
  const router = useRouter();
  const { childProfile, isChildAuthenticated, loading: authLoading, logout } = useAuth();
  const { toast } = useToast();

  const childId = params.childId as string;
  const [child, setChild] = useState<ChildProfile | null>(childProfile);
  const [missionInstances, setMissionInstances] = useState<MissionInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingMissionId, setProcessingMissionId] = useState<string | null>(null);

  useEffect(() => {
    // Redirect if not the correct child or not authenticated
    if (!authLoading && (!isChildAuthenticated || childProfile?.id !== childId)) {
      logout(); // Force logout for security
      router.replace('/child-login');
    }
  }, [childId, childProfile, isChildAuthenticated, authLoading, router, logout]);

  useEffect(() => {
    if (isChildAuthenticated && childId) {
      setIsLoading(true);
      Promise.all([
        getChildProfileById(childId),
        getMissionInstancesByChild(childId)
      ]).then(([profile, missions]) => {
        setChild(profile);
        setMissionInstances(missions);
      }).catch(err => {
        console.error("Error fetching child data:", err);
        toast({ title: 'Erro ao carregar seus dados, herói!', variant: 'destructive' });
      }).finally(() => {
        setIsLoading(false);
      });
    }
  }, [childId, isChildAuthenticated, toast]);
  
  const todaysMissions = useMemo(() => {
    const today = startOfDay(new Date());
    return missionInstances
      .filter(m => isMissionScheduledForDate(m, today) && m.status === 'pending')
      .sort((a, b) => {
          const timeA = getDateObject(a.isRecurring ? a.startDate : a.dueDate) || new Date(0);
          const timeB = getDateObject(b.isRecurring ? b.startDate : b.dueDate) || new Date(0);
          return timeA.getTime() - timeB.getTime();
      });
  }, [missionInstances]);
  
  const handleToggleCompletion = async (mission: MissionInstance) => {
    if (!child) return;
    setProcessingMissionId(mission.id);

    const isCompleted = isMissionCompletedForDate(mission, new Date());
    const today = startOfDay(new Date());
    const dateKey = formatDateFns(today, 'yyyy-MM-dd');
    
    // Optimistic Update
    setMissionInstances(prev =>
      prev.map(inst => {
        if (inst.id === mission.id) {
          const newLog = { ...(inst.completionLog || {}) };
          if (isCompleted) {
            delete newLog[dateKey];
          } else {
            // The child is the actor
            newLog[dateKey] = { completedAt: new Date() as any, stars: mission.starsReward, actorId: child.id, actorName: child.name };
          }
          return { ...inst, completionLog: newLog };
        }
        return inst;
      })
    );
     setChild(prev => prev ? ({ ...prev, stars: prev.stars + (isCompleted ? -mission.starsReward : mission.starsReward) }) : null);

    try {
        // The child is always the actor in this view
        const actor = { id: child.id, name: child.name };
        isCompleted
            ? await reactivateMissionInstance(mission.id, today, actor)
            : await completeMissionInstance(mission.id, today, actor);
    } catch (error) {
        console.error("Error toggling mission completion:", error);
        toast({ title: 'Ops! Ocorreu um erro mágico.', variant: 'destructive' });
        // Revert optimistic update on error
        setMissionInstances(missionInstances);
        setChild(child);
    } finally {
        setProcessingMissionId(null);
    }
  };


  if (isLoading || authLoading) {
    return <Loading />;
  }

  if (!child) {
    return (
        <div className="p-4 text-center">
            <p className="text-destructive">Não foi possível carregar o perfil do herói.</p>
            <Button onClick={() => router.push('/child-login')}>Voltar ao Login</Button>
        </div>
    );
  }

  const completedCount = todaysMissions.filter(m => isMissionCompletedForDate(m, new Date())).length;
  const totalCount = todaysMissions.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  
  const todayLabel = formatDateFns(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR });

  return (
    <div className="p-4 pb-24 space-y-6">
      <header className="flex items-center gap-4">
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
        <Button onClick={logout} variant="ghost" size="icon" className="ml-auto text-muted-foreground"><LogOut className="h-5 w-5"/></Button>
      </header>
      
      <div className="grid grid-cols-2 gap-4 text-center">
        <Card className="p-3">
            <div className="flex items-center justify-center gap-2 text-amber-500">
                <Star className="h-8 w-8 fill-current" />
                <span className="text-3xl font-bold">{child.stars}</span>
            </div>
            <p className="text-xs text-muted-foreground">Estrelas</p>
        </Card>
         <Card className="p-3">
            <div className="flex flex-col items-center justify-center">
                <Progress value={progress} className="h-2 w-full" />
                <p className="text-xs text-muted-foreground mt-2">{completedCount}/{totalCount} missões hoje</p>
            </div>
        </Card>
      </div>

      <div className="space-y-3">
        <h2 className="text-xl font-bold font-headline capitalize">{todayLabel}</h2>
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

      <ChildBottomNavbar childId={child.id} />
    </div>
  );
}
