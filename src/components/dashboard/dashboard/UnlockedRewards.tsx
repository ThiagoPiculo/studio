
"use client";

import { useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { ChildProfile, RewardTemplate, RewardCategory } from '@/lib/types';
import { rewardCategories } from '@/lib/types';
import { Gift, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface UnlockedRewardsProps {
  childrenProfiles: ChildProfile[];
  rewardTemplates: RewardTemplate[];
}

type GroupedReward = {
  category: RewardCategory;
  rewards: RewardTemplate[];
}

export function UnlockedRewards({ childrenProfiles, rewardTemplates }: UnlockedRewardsProps) {
  const { toast } = useToast();
  
  const unlockedRewardsByChild = useMemo(() => {
    return childrenProfiles.map(child => {
        // Filter the main reward catalog based on the child's stars
        const affordableAndActiveTemplates = rewardTemplates
          .filter(template => 
              template.status === 'active' && 
              child.stars >= template.starsCost
          )
          .sort((a, b) => a.starsCost - b.starsCost);

        // Group these affordable rewards by category
        const groupedRewards = affordableAndActiveTemplates.reduce((acc, reward) => {
          const categoryInfo = rewardCategories.find(c => c.id === reward.category);
          if(categoryInfo) {
              let group = acc.find(g => g.category === reward.category);
              if (!group) {
                group = { category: reward.category, rewards: [] };
                acc.push(group);
              }
              group.rewards.push(reward);
          }
          return acc;
        }, [] as GroupedReward[]);

        // Sort the groups based on the predefined category order
        groupedRewards.sort((a, b) => {
          const indexA = rewardCategories.findIndex(rc => rc.id === a.category);
          const indexB = rewardCategories.findIndex(rc => rc.id === b.category);
          return indexA - indexB;
        });
        
        return { child, groupedRewards };
    });
  }, [childrenProfiles, rewardTemplates]);
  
  const handleRedeem = (childName: string, rewardTitle: string) => {
    toast({
        title: "Resgate em Andamento!",
        description: `O resgate de "${rewardTitle}" para ${childName} precisa ser confirmado na aba 'Recompensas' do Mural Completo.`,
    });
  };

  const hasAnyUnlockedReward = unlockedRewardsByChild.some(data => data.groupedRewards.length > 0);

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
            unlockedRewardsByChild.map(({ child, groupedRewards }, index) => {
                if(groupedRewards.length === 0) return null;
                return (
                    <div key={child.id}>
                        {index > 0 && <Separator className="my-4"/>}
                        <h4 className="font-semibold mb-2">{child.name}</h4>
                        <Accordion type="multiple" defaultValue={groupedRewards.map(g => g.category)} className="w-full space-y-2">
                            {groupedRewards.map((group) => {
                                const categoryInfo = rewardCategories.find(c => c.id === group.category);
                                if (!categoryInfo) return null;
                                const CategoryIcon = categoryInfo.icon;
                                return (
                                    <AccordionItem value={group.category} key={group.category} className="border rounded-lg shadow-sm">
                                        <AccordionTrigger className="p-4 hover:no-underline">
                                            <div className="flex items-center gap-3">
                                                <CategoryIcon className="h-5 w-5 text-primary" />
                                                <span className="font-semibold">{categoryInfo.label}</span>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="px-4 pb-4">
                                            <ul className="space-y-2 pt-2 border-t">
                                                {group.rewards.map(reward => (
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
                                )
                            })}
                        </Accordion>
                    </div>
                )
            })
        )}
      </CardContent>
    </Card>
  );
}
