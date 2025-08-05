
"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { getChildProfilesForAttribution, getMissionInstancesForContext } from '@/lib/firebase/firestore';
import { allBadgesMap } from '@/lib/badges';
import type { Badge } from '@/lib/badges';
import type { ChildProfile, MissionInstance } from '@/lib/types';
import { isMissionScheduledForDate, isMissionCompletedForDate } from '@/lib/calendar-utils';
import { differenceInDays, eachDayOfInterval, startOfDay } from 'date-fns';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Medal, ArrowRight, Gem, Trophy, PlusCircle } from "lucide-react";
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import Loading from './loading';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { HeroSelector } from '@/components/dashboard/dashboard/HeroSelector';

interface UpcomingBadge {
  child: ChildProfile;
  badge: Badge;
  progress: number;
  progressPercentage: number;
}

interface RareBadge {
  badge: Badge;
  earnedBy: ChildProfile[];
}

export default function AchievementsPage() {
  const { user } = useAuth();
  const { currentContext } = useFamily();
  
  const [allChildren, setAllChildren] = useState<ChildProfile[]>([]);
  const [missionInstances, setMissionInstances] = useState<MissionInstance[]>([]);
  const [badgeProgress, setBadgeProgress] = useState<Record<string, { longestSingleMissionStreak: number; longestPerfectStreak: number; missionWithLongestStreak: MissionInstance | null; }>>({});
  
  const [isLoading, setIsLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState(true);
  
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  
  const children = useMemo(() => {
    if (!selectedChildId) return allChildren;
    return allChildren.filter(child => child.id === selectedChildId);
  }, [allChildren, selectedChildId]);


  useEffect(() => {
    if (user) {
      setIsLoading(true);

      Promise.all([
        getChildProfilesForAttribution(user.uid, currentContext),
        getMissionInstancesForContext(user.uid, currentContext)
      ]).then(([fetchedChildren, fetchedInstances]) => {
        setAllChildren(fetchedChildren);
        setMissionInstances(fetchedInstances);
        // Smart selection: if only one child, select it by default. Otherwise, default to all.
        if (fetchedChildren.length === 1) {
            setSelectedChildId(fetchedChildren[0].id);
        } else {
            setSelectedChildId(null);
        }
        setIsLoading(false);
      }).catch(err => {
        console.error("Error fetching achievements data:", err);
        setIsLoading(false);
      });
    } else {
        setIsLoading(false);
    }
  }, [user, currentContext]);

  useEffect(() => {
    if (isLoading || allChildren.length === 0) {
      setIsCalculating(false);
      return;
    }
    
    setIsCalculating(true);
    const newBadgeProgress: Record<string, { longestSingleMissionStreak: number; longestPerfectStreak: number; missionWithLongestStreak: MissionInstance | null; }> = {};

    allChildren.forEach(child => {
      const childInstances = missionInstances.filter(inst => inst.childId === child.id);
      
      // SINGLE MISSION STREAK CALC
      let overallLongestStreak = 0;
      let missionWithStreak: MissionInstance | null = null;
      childInstances.forEach(instance => {
          const completionDates = Object.keys(instance.completionLog || {}).map(dateStr => startOfDay(new Date(dateStr))).sort((a, b) => a.getTime() - b.getTime());
          if (completionDates.length === 0) return;

          let currentStreak = 1;
          let longestStreakForThisMission = 1;
          for (let i = 1; i < completionDates.length; i++) {
              if (differenceInDays(completionDates[i], completionDates[i-1]) === 1) {
                  currentStreak++;
              } else if (differenceInDays(completionDates[i], completionDates[i-1]) > 1) {
                  currentStreak = 1;
              }
              if (currentStreak > longestStreakForThisMission) {
                  longestStreakForThisMission = currentStreak;
              }
          }
          if (longestStreakForThisMission > overallLongestStreak) {
              overallLongestStreak = longestStreakForThisMission;
              missionWithStreak = instance;
          }
      });

      // PERFECT STREAK CALC
      let longestPerfectStreak = 0;
      let currentPerfectStreak = 0;
      const allCompletionDates = new Set(childInstances.flatMap(inst => Object.keys(inst.completionLog || {})));
      if (allCompletionDates.size > 0) {
          const sortedDates = Array.from(allCompletionDates).map(d => startOfDay(new Date(d))).sort((a, b) => a.getTime() - b.getTime());
          const firstDate = sortedDates[0];
          const today = startOfDay(new Date());
          const daysInInterval = eachDayOfInterval({ start: firstDate, end: today });

          for (const checkDate of daysInInterval) {
              const scheduledMissions = childInstances.filter(inst => isMissionScheduledForDate(inst, checkDate));
              if (scheduledMissions.length > 0) {
                  const allCompleted = scheduledMissions.every(inst => isMissionCompletedForDate(inst, checkDate));
                  if (allCompleted) {
                      currentPerfectStreak++;
                  } else {
                      if (currentPerfectStreak > longestPerfectStreak) {
                          longestPerfectStreak = currentPerfectStreak;
                      }
                      currentPerfectStreak = 0;
                  }
              }
          }
          if (currentPerfectStreak > longestPerfectStreak) {
              longestPerfectStreak = currentPerfectStreak;
          }
      }
      
      newBadgeProgress[child.id] = {
          longestSingleMissionStreak: overallLongestStreak,
          longestPerfectStreak: longestPerfectStreak,
          missionWithLongestStreak: missionWithStreak,
      };
    });
    
    setBadgeProgress(newBadgeProgress);
    setIsCalculating(false);
  }, [isLoading, allChildren, missionInstances]);

  const upcomingBadges = useMemo((): UpcomingBadge[] => {
    if (isCalculating || children.length === 0) return [];

    const allUpcoming: UpcomingBadge[] = [];

    children.forEach(child => {
      const earnedIds = new Set(child.earnedBadgeIds || []);
      const childProgress = badgeProgress[child.id];
      if (!childProgress) return;

      allBadgesMap.forEach(badge => {
        if (!earnedIds.has(badge.id) && badge.progressType && badge.goal) {
          let currentProgress = 0;
          switch (badge.progressType) {
            case 'singleMissionStreak': currentProgress = childProgress.longestSingleMissionStreak; break;
            case 'perfectStreak': currentProgress = childProgress.longestPerfectStreak; break;
            case 'stars': currentProgress = child.stars; break;
            case 'level': currentProgress = child.level; break;
          }
          if (currentProgress > 0) {
            allUpcoming.push({
              child,
              badge,
              progress: currentProgress,
              progressPercentage: (currentProgress / badge.goal) * 100,
            });
          }
        }
      });
    });

    return allUpcoming.sort((a, b) => b.progressPercentage - a.progressPercentage).slice(0, 3);
  }, [isCalculating, children, badgeProgress]);
  
  const rareBadges = useMemo((): RareBadge[] => {
    if (children.length === 0) return [];
    
    const earnedCountMap = new Map<string, ChildProfile[]>();
    allBadgesMap.forEach(badge => earnedCountMap.set(badge.id, []));

    children.forEach(child => {
      (child.earnedBadgeIds || []).forEach(badgeId => {
        if (earnedCountMap.has(badgeId)) {
          earnedCountMap.get(badgeId)!.push(child);
        }
      });
    });
    
    return Array.from(earnedCountMap.entries())
      .filter(([, earnedBy]) => earnedBy.length > 0) // Only show badges that have been earned by at least one person
      .map(([badgeId, earnedBy]) => ({ badge: allBadgesMap.get(badgeId)!, earnedBy }))
      .sort((a, b) => {
        if (a.earnedBy.length !== b.earnedBy.length) {
            return a.earnedBy.length - b.earnedBy.length;
        }
        return (b.badge.goal || 0) - (a.badge.goal || 0); // Prioritize harder badges if rarity is the same
      })
      .slice(0, 3);
  }, [children]);


  const totalBadges = allBadgesMap.size;
  const getInitials = (name?: string | null) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : "MH";

  const getProgressTypeLabel = (type: Badge['progressType']): string => {
    switch (type) {
      case 'singleMissionStreak':
      case 'perfectStreak':
        return 'dias';
      case 'stars':
        return 'estrelas';
      case 'level':
        return 'nível';
      default:
        return '';
    }
  };


  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline flex items-center">
            <Medal className="mr-3 h-8 w-8 text-primary" />
            Mural de Medalhas
          </CardTitle>
          <CardDescription>
            Acompanhe todas as medalhas e troféus que seus heróis desbloquearam em suas jornadas.
          </CardDescription>
        </CardHeader>
      </Card>

      {allChildren.length > 1 && (
        <HeroSelector
            heroes={allChildren}
            selectedHeroId={selectedChildId}
            onSelectHero={setSelectedChildId}
            showAllOption={true}
        />
      )}
      
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-headline mb-4">{selectedChildId ? `Progresso de ${children[0]?.name}` : 'Progresso por Herói'}</h2>
           {allChildren.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                <p>Nenhum herói encontrado neste contexto para exibir as medalhas.</p>
                <Link href="/dashboard/novo-heroi" passHref>
                  <Button variant="link" className="p-0 h-auto mt-2">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Vá para Adicionar Heroi para começar.
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {children.map(child => {
                const unlockedIds = child.earnedBadgeIds || [];
                const unlockedCount = unlockedIds.length;
                const progress = totalBadges > 0 ? (unlockedCount / totalBadges) * 100 : 0;
                const unlockedBadges = unlockedIds.map(id => allBadgesMap.get(id)).filter(Boolean) as Badge[];

                return (
                  <Card key={child.id} className="flex flex-col">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <Avatar
                          className="h-12 w-12 text-xl ring-2 ring-offset-background ring-[var(--ring-color)]"
                          style={child.color ? { '--ring-color': child.color } as React.CSSProperties : {}}
                        >
                          <AvatarImage src={child.avatar} alt={child.name} />
                          <AvatarFallback style={{backgroundColor: child.color}}>
                            {getInitials(child.name)}
                          </AvatarFallback>
                        </Avatar>
                        <CardTitle className="text-xl">{child.name}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-grow space-y-4">
                      <div>
                        <div className="flex justify-between items-baseline mb-1">
                          <p className="text-sm font-medium text-muted-foreground">Medalhas Desbloqueadas</p>
                          <p className="text-sm font-bold">{unlockedCount} / {totalBadges}</p>
                        </div>
                        <Progress value={progress} />
                      </div>
                      <div className="min-h-[40px]">
                        {unlockedBadges.length > 0 ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            <TooltipProvider>
                              {unlockedBadges.slice(0, 5).map(badge => (
                                <Tooltip key={badge.id}>
                                  <TooltipTrigger asChild>
                                    <div className="p-2 rounded-full cursor-pointer" style={{ backgroundColor: `${badge.color}20` }}>
                                      <badge.icon className="h-5 w-5" style={{ color: badge.color }} />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{badge.title}</p>
                                  </TooltipContent>
                                </Tooltip>
                              ))}
                              {unlockedBadges.length > 5 && (
                                <span className="text-xs font-medium text-muted-foreground ml-1">
                                  + {unlockedBadges.length - 5}
                                </span>
                              )}
                            </TooltipProvider>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">Nenhuma medalha ainda.</p>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Link href={`/dashboard/mural?childId=${child.id}&tab=badges`} className="w-full">
                        <Button variant="outline" className="w-full">
                          Ver Mural Completo <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </CardFooter>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        <div>
           <h2 className="text-2xl font-headline mb-4">Quadro de Honra</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Trophy className="text-chart-5" />
                    Próximas Medalhas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isCalculating ? (
                      <div className="space-y-4">
                        {[1, 2].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                      </div>
                  ) : upcomingBadges.length > 0 ? (
                      <ul className="space-y-4">
                        {upcomingBadges.map(({ child, badge, progress, progressPercentage }) => (
                          <li key={`${child.id}-${badge.id}`} className="flex items-center gap-4">
                            <Avatar
                              className="h-10 w-10 text-lg ring-1 ring-offset-background ring-[var(--ring-color)]"
                              style={child.color ? { '--ring-color': child.color } as React.CSSProperties : {}}
                            >
                              <AvatarImage src={child.avatar} alt={child.name} />
                              <AvatarFallback style={{backgroundColor: child.color}}>
                                {getInitials(child.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-grow">
                                <p className="text-sm font-semibold leading-tight">{badge.title}</p>
                                <p className="text-xs text-muted-foreground">Para {child.name}</p>
                                <Progress value={progressPercentage} className="h-2 mt-1" />
                                <p className="text-xs text-muted-foreground text-right mt-0.5">
                                  {progress} / {badge.goal} ({getProgressTypeLabel(badge.progressType)})
                                </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                  ) : (
                     <p className="text-muted-foreground text-sm">Nenhuma medalha em progresso no momento. Incentive seus heróis!</p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Gem className="text-chart-4" />
                    Medalhas Raras
                  </CardTitle>
                </CardHeader>
                <CardContent>
                   {isCalculating ? (
                      <div className="space-y-4">
                        {[1, 2].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                      </div>
                    ) : rareBadges.length > 0 ? (
                      <ul className="space-y-4">
                        {rareBadges.map(({badge, earnedBy}) => (
                           <li key={badge.id} className="flex items-center gap-4">
                              <div className="p-3 rounded-full shadow-inner" style={{ backgroundColor: `${badge.color}20` }}>
                                <badge.icon className="h-6 w-6" style={{ color: badge.color }} />
                              </div>
                               <div className="flex-grow">
                                <p className="font-semibold">{badge.title}</p>
                                 <p className="text-xs text-muted-foreground">
                                    Desbloqueada por {earnedBy.length} {earnedBy.length === 1 ? 'herói' : 'heróis'}
                                </p>
                                <div className="flex -space-x-2 mt-1">
                                    {earnedBy.map(child => (
                                      <TooltipProvider key={child.id}>
                                        <Tooltip>
                                          <TooltipTrigger>
                                            <Avatar className="h-6 w-6 border-2 border-background">
                                              <AvatarImage src={child.avatar} alt={child.name} />
                                              <AvatarFallback style={{backgroundColor: child.color}} className="text-xs">{getInitials(child.name)}</AvatarFallback>
                                            </Avatar>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>{child.name}</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    ))}
                                </div>
                              </div>
                           </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground text-sm">Nenhuma medalha rara foi desbloqueada ainda. A jornada continua!</p>
                    )}
                </CardContent>
              </Card>
            </div>
        </div>
      </div>
    </div>
  );
}
