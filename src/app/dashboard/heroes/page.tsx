
"use client";
import { useAuth } from "@/contexts/AuthContext";
import { useFamily } from "@/contexts/FamilyContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Star, PlusCircle, Smile, Loader2, Settings, Gift, ListChecks, NotebookPen, Medal, CheckSquare, Target, ArrowRight, Square, Info, BadgeCheck, RefreshCw } from "lucide-react";
import { useEffect, useState, useMemo, Suspense, useCallback } from "react";
import type { ChildProfile, MissionTemplate, RewardTemplate, MissionInstance, SchoolScheduleEntry } from "@/lib/types";
import { 
    getChildProfilesForAttribution,
    getMissionInstancesForContext,
    regenerateChildAccessCode,
    getSchoolScheduleForContext,
} from "@/lib/firebase/firestore";
import type { Timestamp } from "firebase/firestore";
import { GettingStartedGuide } from '@/components/dashboard/GettingStartedGuide';
import { useRouter, useSearchParams } from 'next/navigation';
import { isMissionScheduledForDate, isMissionCompletedForDate, getDateObject, getDayToWeekday } from "@/lib/calendar-utils";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { allBadgesMap } from "@/lib/badges";
import { ScrollArea } from "@/components/ui/scroll-area";
import Loading from "./loading";
import { LevelUpPath } from "@/components/dashboard/LevelUpPath";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from "@/hooks/use-toast";


function HeroesPageContent() {
  const { user, loading: authLoading } = useAuth();
  const { currentContext } = useFamily();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const [allChildren, setAllChildren] = useState<ChildProfile[]>([]);
  const [missionInstances, setMissionInstances] = useState<MissionInstance[]>([]);
  const [rewardTemplates, setRewardTemplates] = useState<RewardTemplate[]>([]);
  const [schoolSchedule, setSchoolSchedule] = useState<SchoolScheduleEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(true);

  const totalBadgesCount = allBadgesMap.size;
  
  const [isRegenerating, setIsRegenerating] = useState<string | null>(null);
  
  useEffect(() => {
    const initialLoad = searchParams.get('initial_load');

    if (!authLoading) {
      if (initialLoad === 'true') {
        const userSettings = JSON.parse(localStorage.getItem('user_settings') || '{}');
        const initialPage = userSettings?.initialPage || 'heroes';
        
        if (initialPage !== 'heroes') {
          router.replace(`/dashboard/${initialPage}`);
        } else {
          router.replace('/dashboard/heroes'); 
          setIsRedirecting(false);
        }
      } else {
        setIsRedirecting(false);
      }
    }
  }, [authLoading, router, searchParams]);

  const handleRegenerateAccessCode = async (childId: string, childName: string) => {
    if (isRegenerating) return;
    setIsRegenerating(childId);
    try {
      const newCode = await regenerateChildAccessCode(childId);
      toast({
        title: "Nova Chave Secreta Gerada!",
        description: `A nova chave de ${childName} é ${newCode}.`,
        duration: 10000,
      });
      // Optimistically update the UI
      setAllChildren(prev => prev.map(c => c.id === childId ? { ...c, accessCode: newCode } : c));
    } catch (error) {
      console.error("Error regenerating code:", error);
      toast({ title: "Erro ao gerar nova chave", variant: "destructive" });
    } finally {
      setIsRegenerating(null);
    }
  };

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
        setIsLoading(true);
        const familyIdToQuery = currentContext === 'my-space' ? null : currentContext;
        
        try {
            const [childrenData, missionsData, scheduleData] = await Promise.all([
                getChildProfilesForAttribution(user.uid, currentContext),
                getMissionInstancesForContext(user.uid, familyIdToQuery),
                getSchoolScheduleForContext(user.uid, familyIdToQuery)
            ]);
            setAllChildren(childrenData);
            setMissionInstances(missionsData);
            setSchoolSchedule(scheduleData);
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
            toast({ title: "Erro ao carregar dados", description: "Não foi possível buscar as informações dos heróis.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    fetchData();
  }, [user, currentContext, toast]);


  const getInitials = (name?: string | null) => {
    if (!name) return "MH"; 
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const calculateAge = (birthDate?: Timestamp): number | null => {
    if (!birthDate) return null;
    const today = new Date();
    const birthDateObj = birthDate.toDate();
    let age = today.getFullYear() - birthDateObj.getFullYear();
    const m = today.getMonth() - birthDateObj.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
      age--;
    }
    return age;
  };
  
  const todaysSchoolEntries = useMemo(() => {
    const todayWeekday = getDayToWeekday[new Date().getDay()];
    return schoolSchedule
        .filter(entry => entry.dayOfWeek === todayWeekday)
        .sort((a,b) => a.startTime.localeCompare(b.startTime));
  }, [schoolSchedule]);

  if (isLoading || authLoading || isRedirecting) {
    return <Loading />;
  }

  const hasChildren = allChildren.length > 0;
  
  const today = format(new Date(), 'yyyy-MM-dd');
  
  return (
    <div className="space-y-8">
       {!hasChildren && (
         <GettingStartedGuide 
            hasChildren={false}
            hasMissions={false}
            hasRewards={false}
          />
      )}
      
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-headline">Resumo do Dia</h2>
          <Link href="/dashboard/onboarding">
            <Button className="shadow-md"><PlusCircle className="mr-2 h-4 w-4" /> Novo Mini Heroi</Button>
          </Link>
        </div>

        {allChildren.length === 0 ? (
          <Card className="text-center py-10 shadow-md bg-gradient-to-br from-card to-secondary/10">
            <CardContent>
              <Smile className="h-20 w-20 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Nenhum Herói Cadastrado Ainda!</h3>
              <p className="text-muted-foreground mb-6">Parece um pouco vazio por aqui. Comece adicionando o primeiro herói.</p>
              <Link href="/dashboard/onboarding">
                <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg animate-pulse">
                  <PlusCircle className="mr-2 h-5 w-5" /> Adicione Seu Primeiro Heroi
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allChildren.map((child) => {
              const age = calculateAge(child.birthDate);
              
              const todaysMissions: MissionInstance[] = missionInstances
                .filter(inst => inst.childId === child.id && isMissionScheduledForDate(inst, new Date()))
                .sort((a, b) => {
                    const timeA = a.startDate?.toDate() || a.dueDate?.toDate();
                    const timeB = b.startDate?.toDate() || b.dueDate?.toDate();
                    if (!timeA || !timeB) return 0;
                    const minutesA = timeA.getHours() * 60 + timeA.getMinutes();
                    const minutesB = timeB.getHours() * 60 + timeB.getMinutes();
                    return minutesA - minutesB;
                });
              
              const todaysMissionsCount = todaysMissions.length;
              const completedTodaysMissionsCount = todaysMissions
                .filter(inst => isMissionCompletedForDate(inst, new Date())).length;
              
              const availableRewardsCount = rewardTemplates.filter(r => r.status === 'active' && child.stars >= r.starsCost).length;
              const redeemedRewardsCount = 0; // Placeholder, would need rewardInstances
              const unlockedAchievementsCount = child.earnedBadgeIds?.length || 0;
             
              return (
              <Card key={child.id} className="shadow-md hover:shadow-lg transition-all duration-300 ease-in-out flex flex-col transform hover:-translate-y-1">
                <CardHeader className="p-4 relative">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <Link href={`/dashboard?childId=${child.id}`} className="absolute top-2 right-2 z-10">
                      <Button variant="link" className="h-8 px-2 py-1 text-xs font-medium text-muted-foreground hover:text-primary rounded-full">
                          Painel de Progresso <ArrowRight className="ml-1.5 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                  <div className="flex items-center gap-4 mt-2">
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
                         <div className="flex flex-col md:flex-row md:items-center md:gap-2 text-muted-foreground text-xs">
                          {age !== null && <span>{age} anos</span>}
                          <span className="text-muted-foreground/50 hidden md:inline">•</span>
                          <div className="flex items-center gap-1 font-mono">
                            <span className="font-sans font-semibold">Chave Secreta:</span>
                            <span className="tracking-wider font-bold text-foreground">{child.accessCode}</span>
                             <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    onClick={() => handleRegenerateAccessCode(child.id, child.name)}
                                    disabled={isRegenerating === child.id}
                                  >
                                    {isRegenerating === child.id ? <Loader2 className="h-3 w-3 animate-spin"/> : <RefreshCw className="h-3 w-3" />}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Gerar nova Chave Secreta</p></TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                      </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 pt-0">
                   <div className="space-y-4">
                       <div className="flex items-center justify-around gap-4 w-full">
                            <div className="flex items-center gap-1.5">
                               <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground"><Info className="h-4 w-4" /></Button>
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs text-center">
                                            <p>Complete missões para ganhar Estrelas (⭐) para resgatar recompensas e XP (🛡️) para subir de nível!</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                                <Star className="h-5 w-5 fill-amber-400 text-amber-500" />
                                <span className="text-xl font-bold text-amber-600">{child.stars}</span>
                            </div>
                           <div className="flex items-center gap-1.5">
                              <BadgeCheck className="h-5 w-5 text-blue-500" />
                              <span className="text-xl font-bold text-blue-600">{child.xp}</span>
                              <span className="text-xs text-muted-foreground font-semibold">(Nível {child.level})</span>
                           </div>
                       </div>
                       <LevelUpPath currentLevel={child.level} currentXp={child.xp} />
                    </div>
                   <Separator className="my-4" />
                   
                   <Tabs defaultValue="missions">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="missions">Missões de Hoje</TabsTrigger>
                            <TabsTrigger value="school">Rotina Escolar</TabsTrigger>
                        </TabsList>
                        <TabsContent value="missions">
                            <ScrollArea className="h-[145px] w-full">
                                <ul className="space-y-1 pr-3">
                                {todaysMissions.length > 0 ? (
                                  todaysMissions.map(item => {
                                    const isCompleted = isMissionCompletedForDate(item, new Date());
                                    const eventTime = item.startDate ? (item.startDate instanceof Date ? item.startDate : item.startDate.toDate()) : new Date(0);
                                    const formattedTime = format(eventTime, 'HH:mm');
                                    const popoverId = `${item.id}-${today}`;
                                    const href = `/dashboard/agenda?view=day&focus_date=${today}&open_popover=${popoverId}`;
                                    
                                    return (
                                        <li key={item.id}>
                                        <Link href={href} className="block">
                                            <div className={cn(
                                            "text-xs flex items-center gap-1.5 p-1.5 rounded-md transition-colors",
                                            isCompleted ? "bg-green-500/10 text-muted-foreground" : "bg-background hover:bg-accent/50"
                                            )}>
                                            {isCompleted ? (
                                                <CheckSquare className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                            ) : (
                                                <Square className="h-3.5 w-3.5 text-primary shrink-0" />
                                            )}
                                            <span className="font-semibold text-foreground/80">{formattedTime}</span>
                                            {item.emoji && <span className="text-sm">{item.emoji}</span>}
                                            <span className={cn("truncate flex-grow", isCompleted ? "line-through font-normal" : "font-semibold")}>
                                                {item.title}
                                            </span>
                                            </div>
                                        </Link>
                                        </li>
                                    );
                                  })
                                ) : (
                                <p className="text-xs text-muted-foreground text-center py-2 px-1">
                                    Dia de descanso do heroi!
                                </p>
                                )}
                                </ul>
                            </ScrollArea>
                        </TabsContent>
                        <TabsContent value="school">
                             <ScrollArea className="h-[145px] w-full">
                                <ul className="space-y-1 pr-3">
                                {todaysSchoolEntries.filter(e => e.childId === child.id).length > 0 ? (
                                    todaysSchoolEntries.filter(e => e.childId === child.id).map(entry => (
                                        <li key={entry.id}>
                                            <div className="text-xs flex items-center gap-1.5 p-1.5 rounded-md" style={{ borderLeft: `4px solid ${entry.color}`}}>
                                                <NotebookPen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                <span className="font-semibold text-foreground/80">{entry.startTime}</span>
                                                <span className="truncate flex-grow font-semibold">{entry.subject}</span>
                                            </div>
                                        </li>
                                    ))
                                ) : (
                                    <p className="text-xs text-muted-foreground text-center py-2 px-1">
                                        Nenhuma aula hoje.
                                    </p>
                                )}
                                </ul>
                             </ScrollArea>
                        </TabsContent>
                    </Tabs>
                </CardContent>

                <CardFooter className="grid grid-cols-3 gap-1 text-center p-1 border-t bg-muted/20 mt-auto">
                    <Link href={`/dashboard/agenda?view=day&focus_date=${today}&child_id=${child.id}`} className="p-2 rounded-md hover:bg-primary/10 transition-colors flex flex-col items-center justify-center gap-1">
                        <div className="flex min-h-[36px] items-center justify-center gap-1.5">
                            <CheckSquare className="h-5 w-5 text-chart-2" />
                            <span className="font-bold text-lg leading-none">{completedTodaysMissionsCount}</span>
                            <span className="text-xl text-muted-foreground font-light pb-0.5">/</span>
                            <span className="font-bold text-lg leading-none">{todaysMissionsCount}</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-tight">Missões Hoje</p>
                    </Link>
                    <Link href={`/dashboard/mural?childId=${child.id}&tab=rewards`} className="p-2 rounded-md hover:bg-primary/10 transition-colors flex flex-col items-center justify-center gap-1">
                        <div className="flex min-h-[36px] items-center justify-center gap-1.5">
                            <Gift className="h-5 w-5 text-chart-1" />
                            <span className="font-bold text-lg leading-none">{availableRewardsCount}</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-tight">Recompensas</p>
                    </Link>
                    <Link href={`/dashboard/mural?childId=${child.id}&tab=badges`} className="p-2 rounded-md hover:bg-primary/10 transition-colors flex flex-col items-center justify-center gap-1">
                      <div className="flex min-h-[36px] items-center justify-center gap-1.5">
                          <Medal className="h-5 w-5 text-chart-5" />
                          <span className="font-bold text-lg leading-none">{unlockedAchievementsCount}</span>
                           <span className="text-xl text-muted-foreground font-light pb-0.5">/</span>
                           <span className="font-bold text-lg leading-none">{totalBadgesCount}</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-tight">Medalhas</p>
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

export default function HeroesPage() {
  return (
      <Suspense fallback={<Loading />}>
          <HeroesPageContent />
      </Suspense>
  )
}
 
