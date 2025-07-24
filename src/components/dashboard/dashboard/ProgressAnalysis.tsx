
"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials, cn } from '@/lib/utils';
import { isMissionScheduledForDate, isMissionCompletedForDate, getDayToWeekday } from '@/lib/calendar-utils';
import type { ChildProfile, MissionInstance } from '@/lib/types';
import { weekdayLabels, allWeekdays } from '@/lib/types';
import { startOfWeek, endOfWeek, eachDayOfInterval, addDays } from 'date-fns';
import { BarChart, Clock, CalendarCheck, CalendarX, Check, X, Minus } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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

const DayStatus = ({ dayProgress }: { dayProgress: DailyProgress }) => {
    const isToday = weekdayLabels[dayProgress.dayKey].long.toLowerCase() === new Date().toLocaleDateString('pt-BR', { weekday: 'long' }).toLowerCase();

    let status: 'perfect' | 'partial' | 'missed' | 'empty' = 'empty';
    if (dayProgress.total > 0) {
        if (dayProgress.completed === dayProgress.total) {
            status = 'perfect';
        } else if (dayProgress.completed > 0) {
            status = 'partial';
        } else {
            status = 'missed';
        }
    }

    const statusConfig = {
        perfect: { icon: Check, color: 'bg-green-500/20 text-green-700', tooltip: `Perfeito! ${dayProgress.completed}/${dayProgress.total} missões concluídas.` },
        partial: { icon: Check, color: 'bg-yellow-500/20 text-yellow-700', tooltip: `Quase lá! ${dayProgress.completed}/${dayProgress.total} missões concluídas.` },
        missed: { icon: X, color: 'bg-red-500/20 text-red-700', tooltip: `Nenhuma missão concluída de ${dayProgress.total}.` },
        empty: { icon: Minus, color: 'bg-muted text-muted-foreground', tooltip: 'Nenhuma missão agendada.' },
    };
    
    const { icon: Icon, color, tooltip } = statusConfig[status];

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="flex flex-col items-center gap-1">
                        <span className={cn("text-xs font-semibold text-muted-foreground", isToday && "text-primary")}>
                            {dayProgress.day}
                        </span>
                        <div className={cn("h-10 w-10 rounded-full flex items-center justify-center transition-all", color)}>
                            <Icon className="h-5 w-5" />
                        </div>
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{tooltip}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};


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
                        <div className="grid grid-cols-7 gap-2">
                            {data.dailyData.map((dayProgress) => (
                                <DayStatus key={dayProgress.day} dayProgress={dayProgress} />
                            ))}
                        </div>
                    </div>
                </div>
            ))
        )}
      </CardContent>
    </Card>
  );
}
