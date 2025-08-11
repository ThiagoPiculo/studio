
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { UserPlus, Target, Gift, CheckCircle, ArrowRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { getChildProfilesForAttribution, getMissionTemplatesByOwnerOrFamily, getRewardTemplatesByOwnerOrFamily } from '@/lib/firebase/firestore';
import type { ChildProfile, MissionTemplate, RewardTemplate } from '@/lib/types';
import Loading from './loading';

interface StepProps {
  isComplete: boolean;
  title: string;
  href: string;
  icon: React.ElementType;
}

function Step({ isComplete, title, href, icon: Icon }: StepProps) {
  return (
    <Link 
      href={href} 
      className={cn(
        "flex-1 flex flex-col items-center justify-center p-4 rounded-lg transition-all group",
        isComplete 
          ? "bg-green-500/10 cursor-default" 
          : "bg-accent/10 hover:bg-accent/20"
      )}
    >
        <div className="flex items-center gap-4 w-full">
            {isComplete ? (
                <CheckCircle className="h-8 w-8 text-green-600" />
            ) : (
                <Icon className="h-8 w-8 text-primary" />
            )}
            <div className="flex-grow">
                <h4 className={cn("font-semibold", isComplete && "text-green-700 line-through")}>{title}</h4>
            </div>
            {!isComplete && <ArrowRight className="h-6 w-6 text-primary/70 transition-transform group-hover:translate-x-1" />}
        </div>
    </Link>
  );
}


export default function AssistantPage() {
  const { user, loading: authLoading } = useAuth();
  const { currentContext, isLoading: familyLoading } = useFamily();
  const [data, setData] = useState<{ children: ChildProfile[], missions: MissionTemplate[], rewards: RewardTemplate[] } | null>(null);

  useEffect(() => {
    if (authLoading || familyLoading || !user) return;

    const fetchData = async () => {
      try {
        const familyIdToQuery = currentContext === 'my-space' ? null : currentContext;
        const [children, missions, rewards] = await Promise.all([
          getChildProfilesForAttribution(user.uid, currentContext),
          getMissionTemplatesByOwnerOrFamily(user.uid, familyIdToQuery),
          getRewardTemplatesByOwnerOrFamily(user.uid, familyIdToQuery)
        ]);
        setData({ children, missions, rewards });
      } catch (error) {
        console.error("Error fetching assistant data:", error);
      }
    };

    fetchData();
  }, [user, currentContext, authLoading, familyLoading]);
  
  if (authLoading || familyLoading || !data) {
    return <Loading />;
  }
  
  const hasChildren = data.children.length > 0;
  const hasMissions = data.missions.length > 0;
  const hasRewards = data.rewards.length > 0;

  const steps = [
    { name: 'children', complete: hasChildren, title: 'Cadastre seu primeiro Herói', href: '/dashboard/novo-heroi', icon: UserPlus },
    { name: 'missions', complete: hasMissions, title: 'Crie sua primeira Missão', href: '/dashboard/missions/new', icon: Target },
    { name: 'rewards', complete: hasRewards, title: 'Crie sua primeira Recompensa', href: '/dashboard/rewards/new', icon: Gift },
  ];

  const completedSteps = steps.filter(step => step.complete).length;
  const progress = (completedSteps / steps.length) * 100;
  
  const isComplete = completedSteps === steps.length;

  return (
    <div className="space-y-6">
       <Card className="shadow-lg">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <Sparkles className="h-8 w-8 text-primary" />
                    <div>
                        <CardTitle className="text-3xl font-headline">Assistente de Configuração</CardTitle>
                        <CardDescription>
                            Siga estes passos para configurar sua central de missões e começar a aventura!
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-muted-foreground">{completedSteps} de {steps.length} concluídos</span>
                  <Progress value={progress} className="flex-1 h-3" />
                </div>
                <div className="flex flex-col md:flex-row gap-4 pt-2">
                  {steps.map(step => (
                    <Step
                      key={step.name}
                      isComplete={step.complete}
                      title={step.title}
                      href={step.href}
                      icon={step.icon}
                    />
                  ))}
                </div>
            </CardContent>
        </Card>
        {isComplete && (
             <Card className="shadow-lg bg-green-500/10 border-green-500/30">
                <CardHeader className="text-center">
                    <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2"/>
                    <CardTitle className="text-2xl font-headline text-green-800">Tudo pronto para começar!</CardTitle>
                    <CardDescription className="text-green-700/80">
                        Você configurou os passos essenciais. Agora, que tal ver o resumo do dia dos seus heróis?
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                    <Link href="/dashboard/heroes">
                        <Button className="bg-green-600 hover:bg-green-700 text-white shadow-md">
                            Ir para o Resumo do Dia <ArrowRight className="ml-2 h-4 w-4"/>
                        </Button>
                    </Link>
                </CardContent>
            </Card>
        )}
    </div>
  );
}
