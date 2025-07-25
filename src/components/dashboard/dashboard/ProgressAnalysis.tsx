
"use client";

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials, cn } from '@/lib/utils';
import { isMissionScheduledForDate, isMissionCompletedForDate, getDayToWeekday } from '@/lib/calendar-utils';
import type { ChildProfile, MissionInstance } from '@/lib/types';
import { weekdayLabels } from '@/lib/types';
import { startOfWeek, eachDayOfInterval, addDays, subWeeks, addWeeks, format, isSameWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, ArrowRight, Star, BadgeCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';


interface ProgressAnalysisProps {
  childrenProfiles: ChildProfile[];
  missionInstances: MissionInstance[];
}

interface DailyProgress {
    day: string;
    dateLabel: string;
    total: number;
    completed: number;
    starsEarned: number;
    xpEarned: number;
    dayKey: 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU';
}

export function ProgressAnalysis({ childrenProfiles, missionInstances }: ProgressAnalysisProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const handlePrevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const handleNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
  const handleToday = () => setCurrentDate(new Date());
  
  const isCurrentWeek = isSameWeek(currentDate, new Date(), { weekStartsOn: 1 });

  const weeklyProgress = useMemo(() => {
    const startOfThisWeek = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
    const daysInWeek = eachDayOfInterval({ start: startOfThisWeek, end: addDays(startOfThisWeek, 6) }); // Mon-Sun

    return childrenProfiles.map(child => {
        const dailyData: DailyProgress[] = daysInWeek.map(day => {
            const scheduledMissions = missionInstances.filter(inst => inst.childId === child.id && isMissionScheduledForDate(inst, day));
            const completedMissions = scheduledMissions.filter(inst => isMissionCompletedForDate(inst, day));
            const dayKey = getDayToWeekday[day.getDay()];

            const { starsEarned, xpEarned } = completedMissions.reduce(
              (acc, mission) => {
                  acc.starsEarned += mission.starsReward;
                  acc.xpEarned += mission.xpReward;
                  return acc;
              },
              { starsEarned: 0, xpEarned: 0 }
            );

            return {
                day: weekdayLabels[dayKey].short,
                dateLabel: format(day, 'dd/MM'),
                dayKey: dayKey,
                total: scheduledMissions.length,
                completed: completedMissions.length,
                starsEarned,
                xpEarned,
            };
        });
        
        return {
            childId: child.id,
            childName: child.name,
            childAvatar: child.avatar,
            childColor: child.color,
            stars: child.stars,
            xp: child.xp,
            dailyData: dailyData
        };
    });
  }, [childrenProfiles, missionInstances, currentDate]);

  const weekDisplay = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = addDays(start, 6);
    return `${format(start, 'd MMM', { locale: ptBR })} - ${format(end, 'd MMM', { locale: ptBR })}`;
  }, [currentDate]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart className="text-chart-1" />
          Missões da Semana
        </CardTitle>
        <CardDescription>Acompanhe o desempenho diário dos seus heróis na semana atual.</CardDescription>
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={handlePrevWeek}>
                <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium w-32 text-center">{weekDisplay}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleNextWeek}>
                <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="secondary" size="sm" onClick={handleToday} disabled={isCurrentWeek}>
            Hoje
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {weeklyProgress.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">Nenhum herói ou missão encontrada para analisar.</p>
        ) : (
            weeklyProgress.map((data, index) => (
                <div key={data.childId}>
                    {index > 0 && <Separator className="my-4" />}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={data.childAvatar} alt={data.childName} />
                                    <AvatarFallback style={{ backgroundColor: data.childColor }}>
                                        {getInitials(data.childName)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
                                  <h4 className="font-semibold">{data.childName}</h4>
                                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                      <span className="flex items-center gap-1 font-semibold text-amber-600">
                                        <Star className="h-4 w-4" /> {data.stars}
                                      </span>
                                      <span className="flex items-center gap-1 font-semibold text-blue-600">
                                        <BadgeCheck className="h-4 w-4" /> {data.xp}
                                      </span>
                                  </div>
                                </div>
                            </div>
                            <Button asChild variant="link" className="p-0 h-auto text-sm shrink-0">
                                <Link href={`/dashboard/agenda?child_id=${data.childId}`}>
                                    ver agenda <ArrowRight className="ml-1 h-4 w-4" />
                                </Link>
                            </Button>
                        </div>
                        <div className="space-y-3">
                            {data.dailyData.map((dayProgress) => {
                                const progressPercentage = dayProgress.total > 0 ? (dayProgress.completed / dayProgress.total) * 100 : 0;
                                const isToday = isSameWeek(new Date(), currentDate, { weekStartsOn: 1 }) && dayProgress.dayKey === getDayToWeekday[new Date().getDay()];

                                return (
                                    <div key={dayProgress.day} className="grid grid-cols-[4.5rem,1fr,auto] items-center gap-4">
                                        <div className={cn("text-sm font-semibold text-muted-foreground", isToday && "text-primary")}>
                                          <span>{dayProgress.day}</span>
                                          <span className="ml-1 text-xs opacity-80">{dayProgress.dateLabel}</span>
                                        </div>
                                        {dayProgress.total > 0 ? (
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Progress value={progressPercentage} className="h-2" />
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>{dayProgress.completed} de {dayProgress.total} missões concluídas</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        ) : (
                                            <div className="h-2 flex items-center justify-center rounded-full bg-muted">
                                                <span className="text-xs text-muted-foreground italic">Nenhuma missão</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2 text-xs font-mono w-40 justify-end">
                                            <span className="text-muted-foreground/80">{`${dayProgress.completed}/${dayProgress.total}`}</span>
                                            <Separator orientation="vertical" className="h-3" />
                                            <span className={cn("flex items-center gap-1", dayProgress.starsEarned > 0 ? 'text-amber-600' : 'text-muted-foreground/80')}>
                                                <Star className="h-3 w-3" /> {dayProgress.starsEarned}
                                            </span>
                                            <span className={cn("flex items-center gap-1", dayProgress.xpEarned > 0 ? 'text-blue-600' : 'text-muted-foreground/80')}>
                                                <BadgeCheck className="h-3 w-3" /> {dayProgress.xpEarned}
                                            </span>
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
