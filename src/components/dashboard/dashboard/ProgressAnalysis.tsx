
"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials, cn } from '@/lib/utils';
import { isMissionScheduledForDate, isMissionCompletedForDate, getDayToWeekday } from '@/lib/calendar-utils';
import type { ChildProfile, MissionInstance } from '@/lib/types';
import { weekdayLabels } from '@/lib/types';
import { startOfWeek, addDays, eachDayOfInterval } from 'date-fns';
import { BarChart, Check, X, Minus } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';

interface ProgressAnalysisProps {
  childrenProfiles: ChildProfile[];
  missionInstances: MissionInstance[];
}

interface DailyProgress {
    day: string;
    total: number;
    completed: number;
    dayKey: 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU';
}

export function ProgressAnalysis({ childrenProfiles, missionInstances }: ProgressAnalysisProps) {
  const weeklyProgress = useMemo(() => {
    const today = new Date();
    const startOfThisWeek = startOfWeek(today, { weekStartsOn: 1 }); // Monday
    const daysInWeek = eachDayOfInterval({ start: startOfThisWeek, end: addDays(startOfThisWeek, 6) }); // Mon-Sun

    return childrenProfiles.map(child => {
        const dailyData: DailyProgress[] = daysInWeek.map(day => {
            const scheduledMissions = missionInstances.filter(inst => inst.childId === child.id && isMissionScheduledForDate(inst, day));
            const completedMissions = scheduledMissions.filter(inst => isMissionCompletedForDate(inst, day));
            const dayKey = getDayToWeekday[day.getDay()];
            return {
                day: weekdayLabels[dayKey].short,
                dayKey: dayKey,
                total: scheduledMissions.length,
                completed: completedMissions.length
            };
        });
        
        return {
            childId: child.id,
            childName: child.name,
            childAvatar: child.avatar,
            childColor: child.color,
            dailyData: dailyData
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
        <CardDescription>Acompanhe o desempenho diário dos seus heróis na semana atual.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {weeklyProgress.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">Nenhum herói ou missão encontrada para analisar.</p>
        ) : (
            weeklyProgress.map((data, index) => (
                <div key={data.childId}>
                    {index > 0 && <Separator className="my-4" />}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={data.childAvatar} alt={data.childName} />
                                <AvatarFallback style={{ backgroundColor: data.childColor }}>
                                    {getInitials(data.childName)}
                                </AvatarFallback>
                            </Avatar>
                            <h4 className="font-semibold">{data.childName}</h4>
                        </div>
                        <div className="space-y-2">
                            {data.dailyData.map((dayProgress) => {
                                const progressPercentage = dayProgress.total > 0 ? (dayProgress.completed / dayProgress.total) * 100 : 0;
                                const isToday = weekdayLabels[dayProgress.dayKey].long.toLowerCase() === new Date().toLocaleDateString('pt-BR', { weekday: 'long' }).toLowerCase();
                                
                                let status: 'perfect' | 'partial' | 'missed' | 'empty' = 'empty';
                                let StatusIcon = Minus;
                                let iconColor = "text-muted-foreground";

                                if (dayProgress.total > 0) {
                                    if (dayProgress.completed === dayProgress.total) {
                                        status = 'perfect';
                                        StatusIcon = Check;
                                        iconColor = "text-green-500";
                                    } else if (dayProgress.completed > 0) {
                                        status = 'partial';
                                        StatusIcon = Minus;
                                        iconColor = "text-orange-500";
                                    } else {
                                        status = 'missed';
                                        StatusIcon = X;
                                        iconColor = "text-red-500";
                                    }
                                }

                                return (
                                    <div key={dayProgress.day} className="grid grid-cols-[3rem,1fr,4rem,2rem] items-center gap-4">
                                        <span className={cn("text-sm font-semibold text-muted-foreground", isToday && "text-primary")}>
                                            {dayProgress.day}
                                        </span>
                                        <Progress value={progressPercentage} className="h-2" />
                                        <span className="text-sm text-muted-foreground font-mono">
                                            {dayProgress.completed}/{dayProgress.total}
                                        </span>
                                        <div className="flex justify-center">
                                            <StatusIcon className={cn("h-5 w-5", iconColor)} />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            ))
        )}
      </CardContent>
    </Card>
  );
}

