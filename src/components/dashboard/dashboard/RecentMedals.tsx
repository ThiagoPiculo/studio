
"use client";

import { useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { getInitials } from '@/lib/utils';
import type { ChildProfile } from '@/lib/types';
import { allBadgesMap } from '@/lib/badges';
import { Medal, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RecentMedalsProps {
  childrenProfiles: ChildProfile[];
}

const getProgressTypeLabel = (badge: { progressType?: string, goal?: number }): string => {
    if (!badge.goal) return '';
    switch (badge.progressType) {
      case 'singleMissionStreak':
      case 'perfectStreak':
        return `${badge.goal} ${badge.goal > 1 ? 'dias' : 'dia'}`;
      case 'stars':
        return `${badge.goal} estrelas`;
      case 'level':
        return `Nível ${badge.goal}`;
      default:
        return '';
    }
};

export function RecentMedals({ childrenProfiles }: RecentMedalsProps) {
  const recentMedals = useMemo(() => {
    const allEarnedBadges: { child: ChildProfile; badgeId: string }[] = [];
    childrenProfiles.forEach(child => {
      (child.earnedBadgeIds || []).forEach(badgeId => {
        allEarnedBadges.push({ child, badgeId });
      });
    });

    const sortedBadges = allEarnedBadges
      .map(({ child, badgeId }) => ({ child, badge: allBadgesMap.get(badgeId) }))
      .filter((item): item is { child: ChildProfile, badge: NonNullable<typeof item.badge> } => !!item.badge)
      .sort((a, b) => (b.badge.goal || 0) - (a.badge.goal || 0));
      
    // Remove duplicates, keeping the first occurrence (which is from the most "advanced" child if filtered)
    const uniqueBadges = Array.from(new Map(sortedBadges.map(item => [item.badge.id, item])).values());
      
    return uniqueBadges.slice(0, 6);
  }, [childrenProfiles]);
  
  const singleChildProfile = childrenProfiles.length === 1 ? childrenProfiles[0] : null;
  const medalsLink = singleChildProfile
    ? `/dashboard/mural?childId=${singleChildProfile.id}&tab=badges`
    : '/dashboard/achievements';

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Medal className="text-chart-5" />
          Medalhas Conquistadas
        </CardTitle>
        <CardDescription>As últimas medalhas desbloqueadas pelos seus heróis.</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        {recentMedals.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma medalha desbloqueada ainda. A jornada está apenas começando!</p>
        ) : (
          <div className="grid grid-cols-3 gap-4 text-center">
            {recentMedals.map(({ badge }) => {
                const metricLabel = getProgressTypeLabel(badge);
                return (
                    <div key={badge.id} className="flex flex-col items-center gap-2">
                        <div className="p-3 rounded-full shadow-inner" style={{ backgroundColor: `${badge.color}20` }}>
                            <badge.icon className="h-8 w-8" style={{ color: badge.color }} />
                        </div>
                        <div className="h-12 flex flex-col justify-start">
                           <p className="text-xs font-semibold leading-tight">{badge.title}</p>
                           {metricLabel && (
                             <p className="text-xs text-muted-foreground mt-1">({metricLabel})</p>
                           )}
                        </div>
                    </div>
                )
            })}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button asChild variant="secondary" className="w-full">
            <Link href={medalsLink}>
                Ver Quadro de Medalhas <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
