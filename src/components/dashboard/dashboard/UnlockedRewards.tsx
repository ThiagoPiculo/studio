
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

interface UnlockedRewardsProps {
  childProfile: ChildProfile;
  rewardTemplates: RewardTemplate[];
}

type GroupedReward = {
  category: RewardCategory;
  rewards: RewardTemplate[];
}

export function UnlockedRewards({ childProfile, rewardTemplates }: UnlockedRewardsProps) {
  const { toast } = useToast();
  
  const unlockedRewardsByChild = useMemo(() => {
      // Filter the main reward catalog based on the child's stars
      const affordableAndActiveTemplates = rewardTemplates
        .filter(template => 
            template.status === 'active' && 
            childProfile.stars >= template.starsCost
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
      
      return groupedRewards;

  }, [childProfile, rewardTemplates]);
  
  const handleRedeem = (childName: string, rewardTitle: string) => {
    toast({
        title: "Resgate em Andamento!",
        description: `O resgate de "${rewardTitle}" para ${childName} precisa ser confirmado na aba 'Recompensas' desta página.`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Gift className="text-chart-2" />
            Recompensas Desbloqueadas
        </CardTitle>
        <CardDescription>Prêmios que {childProfile.name} já pode resgatar com as estrelas que ganhou.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {unlockedRewardsByChild.length === 0 ? (
             <p className="text-sm text-muted-foreground text-center py-4">Nenhuma recompensa desbloqueada. Continue completando missões para ganhar mais estrelas!</p>
        ) : (
            <Accordion type="multiple" defaultValue={unlockedRewardsByChild.map(g => g.category)} className="w-full space-y-2">
                {unlockedRewardsByChild.map((group) => {
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
                                                <Link href={`/dashboard/mural?childId=${childProfile.id}&tab=rewards`} passHref>
                                                    <Button size="sm" variant="outline" onClick={() => handleRedeem(childProfile.name, reward.title)}>Resgatar</Button>
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
        )}
      </CardContent>
    </Card>
  );
}
