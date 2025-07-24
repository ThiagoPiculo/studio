"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials, cn } from '@/lib/utils';
import { isMissionScheduledForDate, isMissionCompletedForDate, getDayToWeekday } from '@/lib/calendar-utils';
import type { ChildProfile, MissionInstance } from '@/lib/types';
import { weekdayLabels, allWeekdays } from '@/lib/types';
import { startOfWeek, endOfWeek, eachDayOfInterval, format } from 'date-fns';
import { BarChart, Clock, CalendarCheck, CalendarX } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface ProgressAnalysisProps {
  childrenProfiles: ChildProfile[];
  missionInstances: MissionInstance[];
}

interface DailyProgress {
    day: string;
    total: number;
    completed: number;
}

export function ProgressAnalysis({ childrenProfiles, missionInstances }: ProgressAnalysisProps) {
  const weeklyProgress = useMemo(() => {
    const today = new Date();
    const startOfThisWeek = startOfWeek(today, { weekStartsOn: 1 });
    const endOfThisWeek = endOfWeek(today, { weekStartsOn: 1 });
    const daysInWeek = eachDayOfInterval({ start: startOfThisWeek, end: endOfThisWeek });

    return childrenProfiles.map(child => {
        const dailyData: DailyProgress[] = daysInWeek.map(day => {
            const scheduledMissions = missionInstances.filter(inst => inst.childId === child.id && isMissionScheduledForDate(inst, day));
            const completedMissions = scheduledMissions.filter(inst => isMissionCompletedForDate(inst, day));
            return {
                day: weekdayLabels[getDayToWeekday[day.getDay()]].short,
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
      <CardContent className="space-y-4">
        {weeklyProgress.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum herói ou missão encontrada para analisar.</p>
        ) : (
            weeklyProgress.map((data, index) => (
                <div key={data.childId}>
                    {index > 0 && <Separator className="my-4" />}
                    <div className="space-y-3">
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
                            {data.dailyData.map((dayProgress, dayIndex) => {
                                const progressPercentage = dayProgress.total > 0 ? (dayProgress.completed / dayProgress.total) * 100 : 0;
                                const isToday = dayIndex === (new Date().getDay() + 6) % 7; // Monday is 0

                                return (
                                    <div key={dayProgress.day} className="grid grid-cols-[3rem,1fr,4rem] items-center gap-2">
                                        <span className={cn("text-sm font-semibold text-muted-foreground", isToday && "text-primary")}>
                                            {dayProgress.day}
                                        </span>
                                        <div className="w-full">
                                            {dayProgress.total > 0 ? (
                                                <Progress value={progressPercentage} className="h-3"/>
                                            ) : (
                                                <div className="h-3 text-xs text-muted-foreground italic flex items-center">Nenhuma missão agendada</div>
                                            )}
                                        </div>
                                        <span className="text-sm font-mono text-right text-muted-foreground">
                                            {dayProgress.total > 0 ? `${dayProgress.completed}/${dayProgress.total}` : `-`}
                                        </span>
                                    </div>
                                );
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
