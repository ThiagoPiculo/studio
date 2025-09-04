

"use client";

import { useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import type { ChildProfile, MissionInstance, RewardTemplate } from '@/lib/types';
import { ArrowRight, CheckCircle, Clock, Star } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getDateObject } from '@/lib/calendar-utils';
import { Fragment } from 'react';
import { Separator } from '@/components/ui/separator';

type Activity =
    | (MissionInstance & { type: 'mission', scheduledFor: Date, completionLogEntry: { completedAt: string, stars: number, actorId?: string, actorName?: string } })
    | (RewardTemplate & { type: 'reward', redeemedAt: string, actorId?: string, actorName?: string, childId: string });

interface RecentActivitiesProps {
  childrenProfiles: ChildProfile[];
  missionInstances: MissionInstance[];
}

export function RecentActivities({ childrenProfiles, missionInstances }: RecentActivitiesProps) {
    const childrenMap = useMemo(() => new Map(childrenProfiles.map(child => [child.id, child])), [childrenProfiles]);

    const activities = useMemo(() => {
        const completedMissions = missionInstances.flatMap(m =>
            Object.entries(m.completionLog || {}).map(([dateStr, logEntry]) => ({
              ...m,
              type: 'mission' as const,
              scheduledFor: new Date(dateStr),
              completionLogEntry: logEntry
            }))
        );

        const allActivities = [...completedMissions];

        allActivities.sort((a, b) => {
            const timeA = a.completionLogEntry?.completedAt;
            const timeB = b.completionLogEntry?.completedAt;
            const dateA = timeA ? new Date(timeA as any).getTime() : 0;
            const dateB = timeB ? new Date(timeB as any).getTime() : 0;
            return dateB - dateA;
        });

        return allActivities.slice(0, 5);
    }, [missionInstances]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Clock className="text-chart-3" />
            Atividades Recentes
        </CardTitle>
        <CardDescription>As últimas missões concluídas pelos heróis.</CardDescription>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma atividade recente para exibir. Complete missões para ver o progresso!</p>
        ) : (
          <ul className="space-y-4">
            {activities.map((activity, index) => {
              const child = childrenMap.get(activity.childId);
              if (!child) return null;

              const completedDate = getDateObject(activity.completionLogEntry.completedAt);
              if (!completedDate) return null;
              const timeAgo = formatDistanceToNowStrict(completedDate, { locale: ptBR, addSuffix: true });

              return (
                <Fragment key={`${activity.id}-${completedDate.getTime()}-${index}`}>
                  <li className="flex items-start gap-4">
                    <div className="p-2.5 rounded-full mt-1 bg-green-100 dark:bg-green-900/30">
                        <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-grow text-sm space-y-1">
                        <div className="flex justify-between items-baseline">
                            <p className="font-semibold text-foreground/90">Missão Cumprida</p>
                            <span className="text-xs text-muted-foreground capitalize">{timeAgo}</span>
                        </div>
                        <p className="font-medium text-foreground/80">- {activity.title}</p>
                        <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5 border border-background">
                                <AvatarImage src={child.avatar} alt={child.name} />
                                <AvatarFallback style={{backgroundColor: child.color}} className="text-xs">{getInitials(child.name)}</AvatarFallback>
                            </Avatar>
                            <p className="text-xs text-muted-foreground">Concluída por {child.name}</p>
                        </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                        <p className="font-bold text-green-600 text-sm flex items-center gap-1">+{activity.completionLogEntry.stars} <Star className="h-4 w-4 text-yellow-500 fill-yellow-500"/></p>
                    </div>
                  </li>
                  {index < activities.length - 1 && <Separator />}
                </Fragment>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
