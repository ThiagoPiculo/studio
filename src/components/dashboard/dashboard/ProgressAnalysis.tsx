

"use client";

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials, cn } from '@/lib/utils';
import { isMissionScheduledForDate, isMissionCompletedForDate, getDayToWeekday } from '@/lib/calendar-utils';
import type { ChildProfile, MissionInstance } from '@/lib/types';
import { weekdayLabels } from '@/lib/types';
import { startOfWeek, eachDayOfInterval, addDays, subWeeks, addWeeks, format, isSameWeek, isPast, isSameDay } from 'date-fns';
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
    date: Date;
    dateLabel: string;
    total: number;
    completed: number;
    starsEarned: number;
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

            const { starsEarned } = completedMissions.reduce(
              (acc, mission) => {
                  acc.starsEarned += mission.starsReward;
                  return acc;
              },
              { starsEarned: 0 }
            );

            return {
                day: weekdayLabels[dayKey].short,
                date: day,
                dateLabel: format(day, 'dd/MM'),
                dayKey: dayKey,
                total: scheduledMissions.length,
                completed: completedMissions.length,
                starsEarned,
            };
        });
        
        return {
            childId: child.id,
            childName: child.name,
            childAvatar: child.avatar,
            childColor: child.color,
            stars: child.stars,
            totalStars: child.totalStars,
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
                                <Avatar 
                                  className="h-10 w-10 ring-2 ring-offset-background ring-[var(--ring-color)]"
                                  style={{ '--ring-color': data.childColor } as React.CSSProperties}
                                >
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
                                  </div>
                                </div>
                            </div>
                            <Button asChild variant="link" className="p-0 h-auto text-sm shrink-0">
                                <Link href={`/dashboard/agenda?child_id=${data.childId}`}>
                                    ver agenda <ArrowRight className="ml-1 h-4 w-4" />
                                </Link>
                            </Button>
                        </div>
                        <div className="space-y-2">
                            {data.dailyData.map((dayProgress) => {
                                const progressPercentage = dayProgress.total > 0 ? (dayProgress.completed / dayProgress.total) * 100 : 0;
                                const isToday = isSameWeek(new Date(), currentDate, { weekStartsOn: 1 }) && dayProgress.dayKey === getDayToWeekday[new Date().getDay()];
                                
                                const dayIsInThePast = isPast(dayProgress.date) && !isSameDay(dayProgress.date, new Date());
                                const isSuccess = dayProgress.total > 0 && dayProgress.completed === dayProgress.total;
                                const isFailure = dayIsInThePast && dayProgress.total > 0 && dayProgress.completed < dayProgress.total;
                                
                                return (
                                    <div key={dayProgress.day} className={cn("grid grid-cols-[4.5rem,1fr,auto] items-center gap-4 p-1 -m-1 rounded-md transition-colors",
                                        isSuccess && "bg-green-500/10",
                                        isFailure && "bg-destructive/10",
                                    )}>
                                        <div className={cn("text-sm font-semibold text-muted-foreground", isToday && "text-primary")}>
                                          <span>{dayProgress.day}</span>
                                          <span className="ml-1 text-xs opacity-80">{dayProgress.dateLabel}</span>
                                        </div>
                                        <div className="flex-grow">
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
                                                    <span className="text-xs text-foreground/70 italic whitespace-nowrap">Nenhuma missão</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs font-mono justify-end w-40">
                                            {dayProgress.total > 0 ? (
                                              <>
                                                <span className="text-muted-foreground/80">{`${dayProgress.completed}/${dayProgress.total}`}</span>
                                                <Separator orientation="vertical" className="h-3" />
                                                <span className={cn("flex items-center gap-1 w-12", dayProgress.starsEarned > 0 ? 'text-amber-600' : 'text-muted-foreground/80')}>
                                                    <Star className="h-3 w-3" /> {dayProgress.starsEarned}
                                                </span>
                                              </>
                                            ) : (
                                              <span className="text-muted-foreground/80 text-center w-full">-</span>
                                            )}
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
