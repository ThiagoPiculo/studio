
"use client";

import { useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials, cn } from '@/lib/utils';
import { isMissionScheduledForDate, isMissionCompletedForDate, getDayToWeekday } from '@/lib/calendar-utils';
import type { ChildProfile, MissionInstance } from '@/lib/types';
import { weekdayLabels } from '@/lib/types';
import { startOfWeek, eachDayOfInterval, addDays } from 'date-fns';
import { BarChart, ArrowRight, Star, BadgeCheck } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

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
            stars: child.stars,
            xp: child.xp,
            dailyData: dailyData
        };
    });
  }, [childrenProfiles, missionInstances]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart className="text-chart-1" />
          Missões da Semana
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
                                const isToday = weekdayLabels[dayProgress.dayKey].long.toLowerCase() === new Date().toLocaleDateString('pt-BR', { weekday: 'long' }).toLowerCase();

                                return (
                                    <div key={dayProgress.day} className="grid grid-cols-[3rem,1fr,auto] items-center gap-4">
                                        <span className={cn("text-sm font-semibold text-muted-foreground", isToday && "text-primary")}>
                                            {dayProgress.day}
                                        </span>
                                        {dayProgress.total > 0 ? (
                                            <Progress value={progressPercentage} className="h-2" />
                                        ) : (
                                            <div className="h-2 flex items-center justify-center rounded-full bg-muted">
                                                <span className="text-xs text-muted-foreground italic">Nenhuma missão</span>
                                            </div>
                                        )}
                                        <span className="text-sm text-muted-foreground font-mono w-10 text-right">
                                            {`${dayProgress.completed}/${dayProgress.total}`}
                                        </span>
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
