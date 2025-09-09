

"use client";

import { useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { ChildProfile, RewardTemplate } from '@/lib/types';
import { Gift, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface UnlockedRewardsProps {
  childrenProfiles: ChildProfile[];
  rewardTemplates: RewardTemplate[];
}

export function UnlockedRewards({ childrenProfiles, rewardTemplates }: UnlockedRewardsProps) {
  const { toast } = useToast();
  
  const unlockedRewardsByChild = useMemo(() => {
    if (!childrenProfiles || !rewardTemplates) {
        return [];
    }

    return childrenProfiles.map(child => {
        const affordableTemplates = rewardTemplates
          .filter(template => 
              template.status === 'active' && 
              child.stars >= template.starsCost
          )
          .sort((a, b) => a.starsCost - b.starsCost);
        
        return { child, unlockedRewards: affordableTemplates };
    });
  }, [childrenProfiles, rewardTemplates]);
  
  const handleRedeem = (childName: string, rewardTitle: string) => {
    toast({
        title: "Resgate em Andamento!",
        description: `O resgate de "${rewardTitle}" para ${childName} precisa ser confirmado na aba 'Recompensas' do Mural Completo.`,
    });
  };

  const hasAnyUnlockedReward = unlockedRewardsByChild.some(data => data.unlockedRewards.length > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Gift className="text-chart-2" />
            Recompensas Desbloqueadas
        </CardTitle>
        <CardDescription>Prêmios que seus heróis já podem resgatar com as estrelas que ganharam.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasAnyUnlockedReward ? (
             <p className="text-sm text-muted-foreground text-center py-4">Nenhuma recompensa desbloqueada. Continue completando missões para ganhar mais estrelas!</p>
        ) : (
            unlockedRewardsByChild.map(({ child, unlockedRewards }, index) => {
                if(unlockedRewards.length === 0) return null;
                return (
                    <div key={child.id}>
                        {index > 0 && <Separator className="my-4"/>}
                        <h4 className="font-semibold mb-2">{child.name}</h4>
                        <Accordion type="single" collapsible className="w-full space-y-2">
                           <AccordionItem value="unlocked" className="border rounded-lg shadow-sm">
                              <AccordionTrigger className="p-4 hover:no-underline">
                                <span className="font-semibold">Ver Recompensas Disponíveis ({unlockedRewards.length})</span>
                              </AccordionTrigger>
                              <AccordionContent className="px-4 pb-4">
                                <ul className="space-y-2 pt-2 border-t">
                                    {unlockedRewards.map(reward => (
                                        <li key={reward.id} className="flex items-center justify-between text-sm py-1">
                                            <span className="flex-grow pr-2">{reward.title}</span>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <Badge variant="secondary" className="font-semibold">
                                                    {reward.starsCost} <Star className="ml-1.5 h-3 w-3 text-yellow-500"/>
                                                </Badge>
                                                <Link href={`/dashboard/mural?childId=${child.id}&tab=rewards`} passHref>
                                                    <Button size="sm" variant="outline" onClick={() => handleRedeem(child.name, reward.title)}>Resgatar</Button>
                                                </Link>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                              </AccordionContent>
                           </AccordionItem>
                        </Accordion>
                    </div>
                )
            })
        )}
      </CardContent>
    </Card>
  );
}
