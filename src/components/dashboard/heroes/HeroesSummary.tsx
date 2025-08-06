
"use client";

import { useEffect, useState, useMemo, Suspense, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Star, PlusCircle, Smile, Loader2, Settings, Gift, ListChecks, NotebookPen, Medal, CheckSquare, Target, ArrowRight, Square, Info, BadgeCheck, RefreshCw, ChevronDown, ChevronUp, Home, Link as LinkIcon, HelpCircle, MoreHorizontal, LayoutGrid } from "lucide-react";
import { useRouter, useSearchParams } from 'next/navigation';
import type { ChildProfile, MissionTemplate, RewardTemplate, MissionInstance, SchoolScheduleEntry } from "@/lib/types";
import { 
    getChildProfilesForAttribution,
    getMissionInstancesForContext,
    regenerateChildAccessCode,
    getSchoolScheduleForContext,
    getRewardTemplatesByOwnerOrFamily,
} from "@/lib/firebase/firestore";
import { GettingStartedGuide } from '@/components/dashboard/GettingStartedGuide';
import { isMissionScheduledForDate, isMissionCompletedForDate, getDateObject, getDayToWeekday } from "@/lib/calendar-utils";
import { cn, getInitials } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { allBadgesMap } from "@/lib/badges";
import Loading from "@/app/dashboard/heroes/loading";
import { LevelUpPath } from "@/components/dashboard/LevelUpPath";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { HeroSelector } from "@/components/dashboard/dashboard/HeroSelector";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function HeroesSummary() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { currentContext, isLoading: isFamilyLoading, availableContexts, setCurrentContext } = useFamily();
  
  const [isLoading, setIsLoading] = useState(true);
  const [allChildren, setAllChildren] = useState<ChildProfile[]>([]);
  const [missionInstances, setMissionInstances] = useState<MissionInstance[]>([]);
  const [rewardTemplates, setRewardTemplates] = useState<RewardTemplate[]>([]);

  const fetchData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    
    try {
        const childrenPromises = availableContexts.map(context => getChildProfilesForAttribution(user.uid, context.id));
        const allChildrenResults = await Promise.all(childrenPromises);
        const uniqueChildren = Array.from(new Map(allChildrenResults.flat().map(c => [c.id, c])).values());
        
        const missionPromises = availableContexts.map(context => getMissionInstancesForContext(user.uid, context.id));
        const allMissionResults = await Promise.all(missionPromises);
        const uniqueMissions = Array.from(new Map(allMissionResults.flat().map(m => [m.id, m])).values());
        
        const rewardPromises = availableContexts.map(context => getRewardTemplatesByOwnerOrFamily(user.uid, context.id));
        const allRewardResults = await Promise.all(rewardPromises);
        const uniqueRewards = Array.from(new Map(allRewardResults.flat().map(r => [r.id, r])).values());

        setAllChildren(uniqueChildren);
        setMissionInstances(uniqueMissions);
        setRewardTemplates(uniqueRewards);
        
    } catch (error) {
        console.error("Error fetching dashboard data:", error);
    } finally {
        setIsLoading(false);
    }
  }, [user, availableContexts]);
  
  useEffect(() => {
    if (!authLoading && !isFamilyLoading) {
      fetchData();
    }
  }, [fetchData, authLoading, isFamilyLoading]);

  const handleContextClick = (contextId: string) => {
    setCurrentContext(contextId);
    router.push('/dashboard/mural');
  };

  const hasChildren = allChildren.length > 0;
  const hasAlliances = availableContexts.length > 1;

  if (authLoading || isFamilyLoading || isLoading) {
    return <Loading />;
  }
  
  // Scenarios for Getting Started Guide
  const isNewUserExperience = !hasChildren && !hasAlliances;

  if (isNewUserExperience) {
      return (
          <GettingStartedGuide 
            hasChildren={false}
            hasMissions={missionInstances.length > 0}
            hasRewards={rewardTemplates.length > 0}
          />
      );
  }

  return (
    <div className="space-y-8">
      <Card>
          <CardHeader>
              <CardTitle className="text-2xl font-headline flex items-center gap-3">
                  <Home className="h-6 w-6 text-primary" />
                  Visão Geral dos Contextos
              </CardTitle>
              <CardDescription>
                  Acesse o painel de um espaço pessoal ou de uma aliança para gerenciar seus heróis.
              </CardDescription>
          </CardHeader>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {availableContexts.map(context => {
            const contextChildren = allChildren.filter(c => (c.familyId || 'my-space') === context.id);
            const Icon = context.id === 'my-space' ? Home : LinkIcon;
            return (
                <Card key={context.id} className="shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <Icon className="h-5 w-5 text-muted-foreground" />
                                {context.name}
                            </CardTitle>
                            <Badge variant={context.role === 'Personal' ? 'secondary' : 'outline'}>{context.role}</Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {contextChildren.length > 0 ? (
                            <div className="flex -space-x-2">
                                {contextChildren.map(child => (
                                    <Avatar key={child.id} className="h-10 w-10 border-2 border-background">
                                        <AvatarImage src={child.avatar} alt={child.name} />
                                        <AvatarFallback style={{backgroundColor: child.color}}>{getInitials(child.name)}</AvatarFallback>
                                    </Avatar>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground italic">Nenhum herói neste espaço ainda.</p>
                        )}
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" onClick={() => handleContextClick(context.id)}>
                            Gerenciar Espaço <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </CardFooter>
                </Card>
            )
        })}
      </div>
    </div>
  );
}
