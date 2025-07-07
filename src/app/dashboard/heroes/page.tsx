
"use client";
import { useAuth } from "@/contexts/AuthContext";
import { useFamily } from "@/contexts/FamilyContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Star, PlusCircle, Smile, Loader2, Settings, Gift, Target, Medal, CheckCircle, ListChecks, List, PackageCheck, School, CircleDot } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import type { ChildProfile, MissionTemplate, RewardTemplate, MissionInstance, ChildRewardInstance, SchoolScheduleEntry } from "@/lib/types";
import { 
    getChildProfilesForAttribution,
    getMissionTemplatesByOwnerOrFamily,
    getRewardTemplatesByOwnerOrFamily,
    getMissionInstancesForContext,
    getChildRewardInstancesForContext,
    getSchoolScheduleForContext
} from "@/lib/firebase/firestore";
import type { Timestamp } from "firebase/firestore";
import { GettingStartedGuide } from '@/components/dashboard/GettingStartedGuide';
import { useRouter, useSearchParams } from 'next/navigation';
import { Progress } from "@/components/ui/progress";
import { isMissionScheduledForDate, isMissionCompletedForDate, getDateObject, getDayToWeekday } from "@/lib/calendar-utils";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


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
  const [scheduleEntries, setScheduleEntries] = useState<SchoolScheduleEntry[]>([]);

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

        const [childProfiles, missionTpls, rewardTpls, missionInsts, rewardInsts, scheduleData] = await Promise.all([
          getChildProfilesForAttribution(user.uid, currentContext),
          getMissionTemplatesByOwnerOrFamily(user.uid, familyIdToQuery),
          getRewardTemplatesByOwnerOrFamily(user.uid, familyIdToQuery),
          getMissionInstancesForContext(user.uid, familyIdToQuery),
          getChildRewardInstancesForContext(user.uid, familyIdToQuery),
          getSchoolScheduleForContext(user.uid, familyIdToQuery)
        ]);
        
        setChildren(childProfiles);
        setMissionTemplates(missionTpls);
        setRewardTemplates(rewardTpls);
        setMissionInstances(missionInsts);
        setRewardInstances(rewardInsts);
        setScheduleEntries(scheduleData);

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setChildren([]);
        setMissionTemplates([]);
        setRewardTemplates([]);
        setMissionInstances([]);
        setRewardInstances([]);
        setScheduleEntries([]);
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

  const today = format(new Date(), 'yyyy-MM-dd');

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
              const todaysMissions = missionInstances.filter(inst => inst.childId === child.id && inst.status === 'pending' && isMissionScheduledForDate(inst, new Date())).sort((a,b) => {
                const timeA = getDateObject(a.startDate || a.dueDate)?.getTime() || 0;
                const timeB = getDateObject(b.startDate || b.dueDate)?.getTime() || 0;
                return timeA - timeB;
              });

              const todaysWeekday = getDayToWeekday[new Date().getDay()];
              const todaysSchedule = scheduleEntries
                .filter(entry => entry.childId === child.id && entry.dayOfWeek === todaysWeekday && entry.subject !== 'Recreio/Intervalo')
                .sort((a, b) => a.startTime.localeCompare(b.startTime));

              const todaysMissionsCount = todaysMissions.length;
              const completedTodaysMissionsCount = todaysMissions.filter(m => isMissionCompletedForDate(m, new Date())).length;

              const availableRewardsCount = rewardInstances.filter(inst => inst.childId === child.id && inst.status === 'active').length;
              const redeemedRewardsCount = rewardInstances.filter(inst => inst.childId === child.id && inst.status === 'redeemed').length;
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
                      <div className="flex-grow overflow-hidden">
                        <CardTitle className="text-2xl font-semibold truncate">{child.name}</CardTitle>
                        <CardDescription>{age} anos</CardDescription>
                      </div>
                  </div>
                   <div className="flex items-baseline justify-center gap-1.5 mt-2">
                      <Star className="h-6 w-6 fill-amber-400 text-amber-500" />
                      <span className="text-3xl font-bold text-amber-600">{child.stars}</span>
                    </div>
                </CardHeader>

                <CardContent className="p-4 pt-0 flex-grow">
                  <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground font-medium">
                          <span>Nível {child.level}</span>
                          <span>{child.xp} / {xpForNextLevel} XP</span>
                      </div>
                      <Progress value={progressPercentage} className="h-2" aria-label={`${progressPercentage.toFixed(0)}% do progresso de XP`} />
                  </div>
                   <Separator className="my-4" />
                   <Tabs defaultValue="missions" className="w-full">
                      <TabsList className="grid w-full grid-cols-2 h-9 mb-2">
                          <TabsTrigger value="missions" className="text-xs gap-1.5"><ListChecks className="h-4 w-4" />Missões de Hoje</TabsTrigger>
                          <TabsTrigger value="school" className="text-xs gap-1.5"><School className="h-4 w-4"/>Escola Hoje</TabsTrigger>
                      </TabsList>
                      <TabsContent value="missions" className="mt-2 min-h-[110px]">
                          {todaysMissions.length > 0 ? (
                          <ul className="space-y-1">
                            {todaysMissions.slice(0, 3).map(mission => {
                              const isCompleted = isMissionCompletedForDate(mission, new Date());
                              const eventTime = getDateObject(mission.startDate || mission.dueDate);
                              const formattedTime = eventTime ? format(eventTime, 'HH:mm') : '';
                              const popoverId = `${mission.id}-${today}`;
                              const href = `/dashboard/agenda?focus_date=${today}&open_popover=${popoverId}`;
                              
                              return (
                                <li key={mission.id}>
                                  <Link href={href} className="block">
                                    <div className={cn(
                                      "text-sm flex items-center gap-2 p-1.5 rounded-md transition-colors",
                                      isCompleted 
                                        ? "bg-green-500/10 text-muted-foreground" 
                                        : "bg-background hover:bg-accent/50",
                                    )}>
                                      {isCompleted ? (
                                        <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                                      ) : (
                                        <CircleDot className="h-4 w-4 text-primary shrink-0" />
                                      )}
                                      <span className="text-xs font-mono w-10">{formattedTime}</span>
                                      <span className={cn("truncate flex-grow", isCompleted && "line-through")}>
                                        {mission.title}
                                      </span>
                                    </div>
                                  </Link>
                                </li>
                              );
                            })}
                            {todaysMissions.length > 3 && (
                              <li className="text-xs text-muted-foreground text-center pt-1">
                                + {todaysMissions.length - 3} mais...
                              </li>
                            )}
                          </ul>
                         ) : (
                           <p className="text-xs text-muted-foreground text-center py-2 px-1">
                             Dia de descanso do herói!
                           </p>
                         )}
                      </TabsContent>
                      <TabsContent value="school" className="mt-2 min-h-[110px]">
                          {todaysSchedule.length > 0 ? (
                              <div className="space-y-1">
                                  <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                                      {todaysSchedule.slice(0, 6).map(entry => (
                                          <div key={entry.id} className="text-xs flex items-center gap-2 p-1.5 rounded-md bg-background">
                                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color, flexShrink: 0 }}></div>
                                              <div className="flex flex-col flex-grow truncate">
                                                  <span className="font-semibold truncate">{entry.subject}</span>
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                                  {todaysSchedule.length > 6 && (
                                      <Link href={`/dashboard/school-schedule`} className="text-xs text-muted-foreground text-center pt-1 block hover:underline">
                                        + {todaysSchedule.length - 6} mais...
                                      </Link>
                                  )}
                              </div>
                          ) : (
                              <p className="text-xs text-muted-foreground text-center py-2 px-1">
                                  Nenhuma aula hoje. Dia livre!
                              </p>
                          )}
                      </TabsContent>
                   </Tabs>
                </CardContent>

                <CardFooter className="grid grid-cols-3 gap-1 text-center p-1 border-t bg-muted/20 mt-auto">
                    <Link href={`/dashboard/agenda?view=day&focus_date=${today}&child_id=${child.id}`} className="p-2 rounded-md hover:bg-primary/10 transition-colors flex flex-col items-center justify-center gap-1">
                        <div className="flex items-end gap-1.5">
                            <div className="flex flex-col items-center">
                                <ListChecks className="h-5 w-5 text-chart-2" />
                                <span className="font-bold text-lg leading-none">{completedTodaysMissionsCount}</span>
                            </div>
                            <span className="text-xl text-muted-foreground font-light pb-0.5">/</span>
                            <div className="flex flex-col items-center">
                                <List className="h-5 w-5 text-muted-foreground" />
                                <span className="font-bold text-lg leading-none">{todaysMissionsCount}</span>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground leading-tight">Missões Hoje</p>
                    </Link>
                    <Link href={`/dashboard/child/${child.id}/manage?tab=rewards`} className="p-2 rounded-md hover:bg-primary/10 transition-colors flex flex-col items-center justify-center gap-1">
                        <div className="flex items-end gap-1.5">
                            <div className="flex flex-col items-center">
                                <PackageCheck className="h-5 w-5 text-chart-2" />
                                <span className="font-bold text-lg leading-none">{redeemedRewardsCount}</span>
                            </div>
                            <span className="text-xl text-muted-foreground font-light pb-0.5">/</span>
                            <div className="flex flex-col items-center">
                                <Gift className="h-5 w-5 text-muted-foreground" />
                                <span className="font-bold text-lg leading-none">{availableRewardsCount}</span>
                            </div>
                        </div>
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
