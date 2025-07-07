
"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { getChildProfilesForAttribution } from '@/lib/firebase/firestore';
import { allBadgesMap } from '@/lib/badges';
import type { Badge } from '@/lib/badges';
import type { ChildProfile } from '@/lib/types';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Medal, ArrowRight, Sparkles, Trophy } from "lucide-react";
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import Loading from './loading';

export default function AchievementsPage() {
  const { user } = useAuth();
  const { currentContext } = useFamily();
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setIsLoading(true);
      getChildProfilesForAttribution(user.uid, currentContext)
        .then(setChildren)
        .catch(err => {
          console.error("Error fetching children for achievements:", err);
        })
        .finally(() => setIsLoading(false));
    }
  }, [user, currentContext]);

  const totalBadges = allBadgesMap.size;
  const getInitials = (name?: string | null) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : "MH";

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline flex items-center">
            <Medal className="mr-3 h-8 w-8 text-primary" />
            Mural de Conquistas
          </CardTitle>
          <CardDescription>
            Acompanhe todas as medalhas e troféus que seus heróis desbloquearam em suas jornadas.
          </CardDescription>
        </CardHeader>
      </Card>
      
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-headline mb-4">Progresso por Herói</h2>
           {children.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                <p>Nenhum herói encontrado neste contexto para exibir as conquistas.</p>
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
                          <p className="text-sm font-medium text-muted-foreground">Conquistas Desbloqueadas</p>
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
                                    <div className="p-2 rounded-full" style={{ backgroundColor: `${badge.color}20` }}>
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
                          <p className="text-sm text-muted-foreground italic">Nenhuma conquista ainda.</p>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Link href={`/dashboard/child/${child.id}/manage?tab=badges`} className="w-full">
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
                    Próximas Conquistas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Em breve: Veja quais conquistas estão mais próximas de serem desbloqueadas pela sua equipe.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Sparkles className="text-chart-4" />
                    Conquistas Raras
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Em breve: Descubra quais são as conquistas mais difíceis e raras de se obter.</p>
                </CardContent>
              </Card>
            </div>
        </div>

      </div>
    </div>
  );
}
