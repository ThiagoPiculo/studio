
"use client";
import { useAuth } from "@/contexts/AuthContext";
import { useFamily } from "@/contexts/FamilyContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Star, PlusCircle, Smile, Loader2, Settings, Gift, Trophy, Target, Medal } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import type { ChildProfile, MissionTemplate, RewardTemplate, MissionInstance, ChildRewardInstance } from "@/lib/types";
import { 
    getChildProfilesForAttribution,
    getMissionTemplatesByOwnerOrFamily,
    getRewardTemplatesByOwnerOrFamily,
    getMissionInstancesForContext,
    getChildRewardInstancesForContext
} from "@/lib/firebase/firestore";
import type { Timestamp } from "firebase/firestore";
import { GettingStartedGuide } from '@/components/dashboard/GettingStartedGuide';
import { useRouter, useSearchParams } from 'next/navigation';
import { Progress } from "@/components/ui/progress";
import { isMissionScheduledForDate } from "@/lib/calendar-utils";
import { cn } from "@/lib/utils";

export default function HeroesPage() {
  const { user, loading } = useAuth();
  const { currentContext } = useFamily();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [isLoadingChildren, setIsLoadingChildren] = useState(true);
  
  const [missionTemplates, setMissionTemplates] = useState<MissionTemplate[]>([]);
  const [rewardTemplates, setRewardTemplates] = useState<RewardTemplate[]>([]);
  const [missionInstances, setMissionInstances] = useState<MissionInstance[]>([]);
  const [rewardInstances, setRewardInstances] = useState<ChildRewardInstance[]>([]);

  const [isLoadingGuideData, setIsLoadingGuideData] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(true);

  useEffect(() => {
    const initialLoad = searchParams.get('initial_load');

    if (!loading && user) {
      if (initialLoad === 'true') {
        const initialPage = user.settings?.initialPage || 'agenda';
        if (initialPage !== 'heroes') {
          router.replace(`/dashboard/${initialPage}`);
        } else {
          router.replace('/dashboard/heroes');
          setIsRedirecting(false);
        }
      } else {
        setIsRedirecting(false);
      }
    } else if (!loading && !user) {
      setIsRedirecting(false);
    }
  }, [user, loading, router, searchParams]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) {
        setIsLoadingChildren(false);
        setIsLoadingGuideData(false);
        return
      };
      setIsLoadingChildren(true);
      setIsLoadingGuideData(true);

      try {
        const familyIdToQuery = currentContext === 'my-space' ? null : currentContext;

        const [childProfiles, missionTpls, rewardTpls, missionInsts, rewardInsts] = await Promise.all([
          getChildProfilesForAttribution(user.uid, currentContext),
          getMissionTemplatesByOwnerOrFamily(user.uid, familyIdToQuery),
          getRewardTemplatesByOwnerOrFamily(user.uid, familyIdToQuery),
          getMissionInstancesForContext(user.uid, familyIdToQuery),
          getChildRewardInstancesForContext(user.uid, familyIdToQuery)
        ]);
        
        setChildren(childProfiles);
        setMissionTemplates(missionTpls);
        setRewardTemplates(rewardTpls);
        setMissionInstances(missionInsts);
        setRewardInstances(rewardInsts);

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setChildren([]);
        setMissionTemplates([]);
        setRewardTemplates([]);
        setMissionInstances([]);
        setRewardInstances([]);
      } finally {
        setIsLoadingChildren(false);
        setIsLoadingGuideData(false);
      }
    };

    fetchDashboardData();
  }, [user, currentContext]);
  
  const getInitials = (name?: string | null) => {
    if (!name) return "MH"; 
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };
  
  const calculateAge = (birthDate: Timestamp): number => {
    if (!birthDate) return 0;
    const today = new Date();
    const birthDateObj = birthDate.toDate();
    let age = today.getFullYear() - birthDateObj.getFullYear();
    const m = today.getMonth() - birthDateObj.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
      age--;
    }
    return age;
  };

  const calculateXpDetails = (level: number, currentXp: number) => {
    let xpForCurrentLevel = 0;
    let xpToLevelUp = 0;

    for (let i = 1; i < level; i++) {
      xpToLevelUp = 100 + (i - 1) * 50;
      xpForCurrentLevel += xpToLevelUp;
    }
    
    const xpForNextLevel = xpForCurrentLevel + (100 + (level - 1) * 50);
    const xpInCurrentLevel = currentXp - xpForCurrentLevel;
    const xpNeededForLevelUp = xpForNextLevel - xpForCurrentLevel;
    
    const progressPercentage = xpNeededForLevelUp > 0 ? (xpInCurrentLevel / xpNeededForLevelUp) * 100 : 0;

    return { progressPercentage, xpRemaining: xpForNextLevel - currentXp, xpForNextLevel };
  };

  if (loading || isRedirecting) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
        Carregando...
      </div>
    );
  }
  
  const hasChildren = children.length > 0;
  const hasMissions = missionTemplates.length > 0;
  const hasRewards = rewardTemplates.length > 0;
  const showGuide = !isLoadingGuideData && (!hasChildren || !hasMissions || !hasRewards);

  return (
    <div className="space-y-8">
       {showGuide && (
         <GettingStartedGuide 
            hasChildren={hasChildren}
            hasMissions={hasMissions}
            hasRewards={hasRewards}
          />
      )}

      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-headline">Seus Mini Herois</h2>
          <Link href="/dashboard/onboarding">
            <Button className="shadow-md"><PlusCircle className="mr-2 h-4 w-4" /> Adicionar Novo Mini Heroi</Button>
          </Link>
        </div>
        {isLoadingChildren ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
            Carregando Mini Herois...
          </div>
        ) : children.length === 0 ? (
          <Card className="text-center py-10 shadow-md bg-gradient-to-br from-card to-secondary/10">
            <CardContent>
              <Smile className="h-20 w-20 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Nenhum Mini Heroi Ainda!</h3>
              <p className="text-muted-foreground mb-6">Parece um pouco vazio por aqui. Comece adicionando sua primeira criança.</p>
              <Link href="/dashboard/onboarding">
                <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg animate-pulse">
                  <PlusCircle className="mr-2 h-5 w-5" /> Adicione Seu Primeiro Heroi
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {children.map((child) => {
              const age = calculateAge(child.birthDate);
              const todaysMissionsCount = missionInstances.filter(inst => inst.childId === child.id && inst.status === 'pending' && isMissionScheduledForDate(inst, new Date())).length;
              const availableRewardsCount = rewardInstances.filter(inst => inst.childId === child.id && inst.status === 'active').length;
              const unlockedAchievementsCount = child.earnedBadgeIds?.length || 0;
              const { progressPercentage, xpForNextLevel } = calculateXpDetails(child.level, child.xp);

              return (
              <Card key={child.id} className="shadow-md hover:shadow-lg transition-all duration-300 ease-in-out flex flex-col transform hover:-translate-y-1">
                <CardHeader className="p-4 relative">
                  <Link href={`/dashboard/child/${child.id}/manage`} className="absolute top-2 right-2 z-10">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/10">
                      <Settings className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                    </Button>
                  </Link>
                  <div className="flex items-center gap-4">
                     <Avatar
                        className="h-16 w-16 text-2xl shadow-sm ring-2 ring-offset-2 ring-[var(--ring-color)] ring-offset-background"
                        style={child.color ? { '--ring-color': child.color } as React.CSSProperties : {}}
                      >
                        <AvatarImage src={child.avatar} alt={child.name} />
                        <AvatarFallback
                          className="font-bold"
                          style={child.color ? { backgroundColor: child.color } : {}}
                        >
                          {getInitials(child.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-grow">
                        <CardTitle className="text-2xl font-semibold">{child.name}</CardTitle>
                        <CardDescription>{age} anos</CardDescription>
                        <div className="flex items-baseline gap-1.5 mt-2">
                          <Star className="h-6 w-6 fill-amber-400 text-amber-500" />
                          <span className="text-3xl font-bold text-amber-600">{child.stars}</span>
                        </div>
                      </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 pt-0 flex-grow flex flex-col justify-end">
                  <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground font-medium">
                          <span>Nível {child.level}</span>
                          <span>{child.xp} / {xpForNextLevel} XP</span>
                      </div>
                      <Progress value={progressPercentage} className="h-2" aria-label={`${progressPercentage.toFixed(0)}% do progresso de XP`} />
                  </div>
                </CardContent>

                <CardFooter className="grid grid-cols-3 gap-1 text-center p-1 border-t bg-muted/20">
                    <Link href={`/dashboard/child/${child.id}/manage`} className="p-2 rounded-md hover:bg-primary/10 transition-colors flex flex-col items-center gap-1">
                      <Target className="h-5 w-5 text-chart-3" />
                      <p className="font-bold text-lg">{todaysMissionsCount}</p>
                      <p className="text-xs text-muted-foreground leading-tight">Missões Hoje</p>
                    </Link>
                    <Link href={`/dashboard/child/${child.id}/manage?tab=rewards`} className="p-2 rounded-md hover:bg-primary/10 transition-colors flex flex-col items-center gap-1">
                       <Gift className="h-5 w-5 text-chart-2" />
                       <p className="font-bold text-lg">{availableRewardsCount}</p>
                      <p className="text-xs text-muted-foreground leading-tight">Recompensas</p>
                    </Link>
                    <Link href={`/dashboard/child/${child.id}/manage?tab=badges`} className="p-2 rounded-md hover:bg-primary/10 transition-colors flex flex-col items-center gap-1">
                      <Medal className="h-5 w-5 text-chart-5" />
                      <p className="font-bold text-lg">{unlockedAchievementsCount}</p>
                      <p className="text-xs text-muted-foreground leading-tight">Conquistas</p>
                    </Link>
                </CardFooter>
              </Card>
            )})}
          </div>
        )}
      </section>
    </div>
  );
}
