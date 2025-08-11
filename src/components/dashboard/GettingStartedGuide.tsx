
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { UserPlus, Target, Gift, CheckCircle, Circle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';

interface GettingStartedGuideProps {
  hasChildren: boolean;
  hasMissions: boolean;
  hasRewards: boolean;
}

interface StepProps {
  isComplete: boolean;
  title: string;
  href: string;
  icon: React.ElementType;
}

function Step({ isComplete, title, href, icon: Icon }: StepProps) {
  return (
    <Link href={href} className={cn(
        "flex-1 flex flex-col items-center justify-center p-4 rounded-lg transition-all",
        isComplete ? "bg-green-500/10 cursor-default" : "bg-accent/10 hover:bg-accent/20"
    )}>
        <div className="flex items-center gap-4 w-full">
            {isComplete ? (
                <CheckCircle className="h-8 w-8 text-green-600" />
            ) : (
                <Icon className="h-8 w-8 text-primary" />
            )}
            <div className="flex-grow">
                <h4 className={cn("font-semibold", isComplete && "text-green-700 line-through")}>{title}</h4>
            </div>
            {!isComplete && <ArrowRight className="h-6 w-6 text-primary/70" />}
        </div>
    </Link>
  );
}


export function GettingStartedGuide({ hasChildren, hasMissions, hasRewards }: GettingStartedGuideProps) {
  const { user } = useAuth();
  const { availableContexts } = useFamily();
  const [isVisible, setIsVisible] = useState(false);
  
  const hasAlliances = availableContexts.length > 1;

  useEffect(() => {
    // This logic is simplified. It shows if the user is new OR if they are in an alliance but have no personal heroes.
    const isNewUser = !hasChildren && !hasAlliances;
    const isEmptyPersonalSpace = hasAlliances && !hasChildren;
    
    // Check if dismissed only if it's not the "empty personal space" scenario which should always appear
    const dismissed = localStorage.getItem('gettingStartedDismissed');
    if (isEmptyPersonalSpace || (isNewUser && dismissed !== 'true')) {
        setIsVisible(true);
    }
  }, [hasChildren, hasAlliances]);

  const handleDismiss = (dismissed: boolean) => {
    if (dismissed) {
      localStorage.setItem('gettingStartedDismissed', 'true');
      setIsVisible(false);
    } else {
      localStorage.removeItem('gettingStartedDismissed');
    }
  };

  const steps = [
    { name: 'children', complete: hasChildren, title: 'Cadastre seu primeiro Heroi', href: '/dashboard/novo-heroi', icon: UserPlus },
    { name: 'missions', complete: hasMissions, title: 'Crie sua primeira Missão', href: '/dashboard/missions/new', icon: Target },
    { name: 'rewards', complete: hasRewards, title: 'Crie sua primeira Recompensa', href: '/dashboard/rewards/new', icon: Gift },
  ];

  const completedSteps = steps.filter(step => step.complete).length;
  const progress = (completedSteps / steps.length) * 100;
  
  if (!isVisible && !hasAlliances) {
    return null;
  }
  
  const isForEmptyPersonalSpace = hasAlliances && !hasChildren;

  if (!isVisible) return null;


  return (
    <Card className="shadow-lg overflow-hidden">
      <CardHeader>
        <CardTitle className="text-2xl font-headline">
          {isForEmptyPersonalSpace ? 'Comece a Usar seu Espaço Pessoal' : 'Primeiros Passos'}
        </CardTitle>
        <CardDescription>
          {isForEmptyPersonalSpace
            ? "Seus Mini Heróis estão em suas Alianças. Para 'cuidar solo' de seus heróis, comece por aqui!"
            : "Siga estes passos para configurar sua central de missões e começar a aventura!"
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Progress value={progress} className="flex-1 h-3" />
          <span className="text-sm font-medium text-muted-foreground">{completedSteps} de {steps.length} concluídos</span>
        </div>
        <div className="flex flex-col md:flex-row gap-4">
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
        {!isForEmptyPersonalSpace && (
             <div className="flex items-center space-x-2 pt-2">
                <Checkbox id="dismiss-guide" onCheckedChange={handleDismiss} />
                <Label htmlFor="dismiss-guide" className="text-sm font-normal text-muted-foreground">
                    Não exibir mais esta seção.
                </Label>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
