
"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import type { ChildProfile } from '@/lib/types';
import { allBadgesMap } from '@/lib/badges';
import { Award } from 'lucide-react';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface RecentAchievementsProps {
  childrenProfiles: ChildProfile[];
}

export function RecentAchievements({ childrenProfiles }: RecentAchievementsProps) {
  // This is a simplified version. A real implementation would need timestamps on badges.
  // Here, we just show the most "advanced" or "rare" badges as a proxy for "recent".
  const recentAchievements = useMemo(() => {
    const allEarnedBadges: { child: ChildProfile; badgeId: string }[] = [];
    childrenProfiles.forEach(child => {
      (child.earnedBadgeIds || []).forEach(badgeId => {
        allEarnedBadges.push({ child, badgeId });
      });
    });

    // Sort by badge "difficulty" (goal) as a proxy for recency/importance
    const sortedBadges = allEarnedBadges
      .map(({ child, badgeId }) => ({ child, badge: allBadgesMap.get(badgeId) }))
      .filter((item): item is { child: ChildProfile, badge: NonNullable<typeof item.badge> } => !!item.badge)
      .sort((a, b) => (b.badge.goal || 0) - (a.badge.goal || 0));
      
    return sortedBadges.slice(0, 3); // Take top 3 most "difficult" achievements
  }, [childrenProfiles]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="text-chart-5" />
          Medalhas em Destaque
        </CardTitle>
        <CardDescription>As medalhas mais notáveis dos seus heróis.</CardDescription>
      </CardHeader>
      <CardContent>
        {recentAchievements.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma medalha desbloqueada ainda. A jornada está apenas começando!</p>
        ) : (
          <ul className="space-y-3">
            {recentAchievements.map(({ child, badge }, index) => (
              <li key={`${child.id}-${badge.id}-${index}`} className="flex items-center gap-4">
                <div className="p-2 rounded-full shadow-inner" style={{ backgroundColor: `${badge.color}20` }}>
                    <badge.icon className="h-6 w-6" style={{ color: badge.color }} />
                </div>
                <div className="flex-grow">
                  <p className="font-semibold">{badge.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                     <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger>
                                <Avatar className="h-6 w-6 border-2 border-background">
                                    <AvatarImage src={child.avatar} alt={child.name} />
                                    <AvatarFallback style={{backgroundColor: child.color}} className="text-xs">{getInitials(child.name)}</AvatarFallback>
                                </Avatar>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Conquistado por {child.name}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <p className="text-xs text-muted-foreground">
                        {badge.description}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
