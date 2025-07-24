
"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { isMissionScheduledForDate, isMissionCompletedForDate } from '@/lib/calendar-utils';
import type { ChildProfile, MissionInstance } from '@/lib/types';
import { startOfWeek, endOfWeek, eachDayOfInterval, isToday } from 'date-fns';
import { BarChart, Clock } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface ProgressAnalysisProps {
  childrenProfiles: ChildProfile[];
  missionInstances: MissionInstance[];
}

export function ProgressAnalysis({ childrenProfiles, missionInstances }: ProgressAnalysisProps) {
  const weeklyProgress = useMemo(() => {
    const today = new Date();
    const startOfThisWeek = startOfWeek(today, { weekStartsOn: 1 });
    const endOfThisWeek = endOfWeek(today, { weekStartsOn: 1 });
    const daysInWeek = eachDayOfInterval({ start: startOfThisWeek, end: endOfThisWeek });

    return childrenProfiles.map(child => {
      let totalMissionsInWeek = 0;
      let completedMissionsInWeek = 0;
      
      const todaysPendingMissions = missionInstances.filter(inst => 
        inst.childId === child.id &&
        isMissionScheduledForDate(inst, today) &&
        !isMissionCompletedForDate(inst, today)
      );

      daysInWeek.forEach(day => {
        const scheduledMissions = missionInstances.filter(inst => inst.childId === child.id && isMissionScheduledForDate(inst, day));
        totalMissionsInWeek += scheduledMissions.length;
        
        const completedMissions = scheduledMissions.filter(inst => isMissionCompletedForDate(inst, day));
        completedMissionsInWeek += completedMissions.length;
      });

      const progressPercentage = totalMissionsInWeek > 0 ? (completedMissionsInWeek / totalMissionsInWeek) * 100 : 0;

      return {
        childId: child.id,
        childName: child.name,
        childAvatar: child.avatar,
        childColor: child.color,
        totalMissions: totalMissionsInWeek,
        completedMissions: completedMissionsInWeek,
        progress: progressPercentage,
        todaysPendingMissions: todaysPendingMissions.slice(0, 2),
      };
    });
  }, [childrenProfiles, missionInstances]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart className="text-chart-1" />
          Análise de Progresso da Semana
        </CardTitle>
        <CardDescription>Acompanhe o desempenho semanal dos seus heróis.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {weeklyProgress.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum herói ou missão encontrada para analisar.</p>
        ) : (
            weeklyProgress.map((data, index) => (
                <div key={data.childId}>
                    {index > 0 && <Separator className="my-4" />}
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={data.childAvatar} alt={data.childName} />
                                <AvatarFallback style={{ backgroundColor: data.childColor }}>
                                    {getInitials(data.childName)}
                                </AvatarFallback>
                            </Avatar>
                            <h4 className="font-semibold">{data.childName}</h4>
                        </div>
                        <div>
                            <Progress value={data.progress} className="h-2" />
                            <p className="text-xs text-muted-foreground mt-1">
                                {data.completedMissions} de {data.totalMissions} missões concluídas esta semana.
                            </p>
                        </div>
                        {data.todaysPendingMissions.length > 0 ? (
                             <div className="space-y-1 pt-1">
                                {data.todaysPendingMissions.map(mission => (
                                    <div key={mission.id} className="text-xs text-muted-foreground flex items-center gap-1.5">
                                        <Clock className="h-3 w-3" />
                                        <span>Pendente para hoje: <span className="font-semibold text-foreground">{mission.title}</span></span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-green-600 font-medium pt-1">Tudo certo por hoje! 🎉</p>
                        )}
                    </div>
                </div>
            ))
        )}
      </CardContent>
    </Card>
  );
}
