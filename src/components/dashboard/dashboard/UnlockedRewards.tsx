
"use client";

import { useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import type { ChildProfile, RewardTemplate, RewardCategory } from '@/lib/types';
import { rewardCategories } from '@/lib/types';
import { Gift, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';

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
      const affordableAndActiveTemplates = rewardTemplates
        .filter(template => 
            template.status === 'active' && 
            child.stars >= template.starsCost
        )
        .sort((a, b) => a.starsCost - b.starsCost);

      const groupedRewards = affordableAndActiveTemplates.reduce((acc, reward) => {
        let group = acc.find(g => g.category === reward.category);
        if (!group) {
          const categoryInfo = rewardCategories.find(c => c.id === reward.category);
          if(categoryInfo) {
            group = { category: reward.category, rewards: [] };
            acc.push(group);
          } else {
            return acc;
          }
        }
        group.rewards.push(reward);
        return acc;
      }, [] as GroupedReward[]);

      groupedRewards.sort((a, b) => {
        const indexA = rewardCategories.findIndex(rc => rc.id === a.category);
        const indexB = rewardCategories.findIndex(rc => rc.id === b.category);
        return indexA - indexB;
      });
      
      return {
        ...child,
        groupedRewards,
      };
    }).filter(child => child.groupedRewards.length > 0);
  }, [childrenProfiles, rewardTemplates]);
  
  const handleRedeem = (childName: string, rewardTitle: string) => {
    toast({
        title: "Resgate em Andamento!",
        description: `O resgate de "${rewardTitle}" para ${childName} precisa ser confirmado na página do herói.`,
    });
  };

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
        {unlockedRewardsByChild.length === 0 ? (
             <p className="text-sm text-muted-foreground text-center py-4">Nenhum herói tem estrelas suficientes para resgatar uma recompensa no momento.</p>
        ) : (
            <Accordion type="multiple" defaultValue={unlockedRewardsByChild.map(c => c.id)} className="w-full space-y-4">
                {unlockedRewardsByChild.map((childData) => (
                    <AccordionItem value={childData.id} key={childData.id} className="border rounded-lg shadow-sm">
                        <AccordionTrigger className="p-4 hover:no-underline">
                             <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={childData.avatar} alt={childData.name} />
                                    <AvatarFallback style={{ backgroundColor: childData.color }}>
                                        {getInitials(childData.name)}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <h4 className="font-semibold text-left">{childData.name}</h4>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-500" /> {childData.stars} estrelas disponíveis
                                    </p>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                           <div className="space-y-2">
                            {childData.groupedRewards.map(group => {
                                const categoryInfo = rewardCategories.find(c => c.id === group.category);
                                if (!categoryInfo) return null;
                                const CategoryIcon = categoryInfo.icon;
                                return (
                                <div key={group.category}>
                                    <h5 className="font-semibold text-sm mb-1 flex items-center gap-2 text-muted-foreground">
                                        <CategoryIcon className="h-4 w-4" /> {categoryInfo.label}
                                    </h5>
                                    <ul className="space-y-1 pl-7">
                                        {group.rewards.map(reward => (
                                            <li key={reward.id} className="flex items-center justify-between text-sm py-1">
                                                <span className="flex-grow pr-2">{reward.title}</span>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <Badge variant="secondary" className="font-semibold">
                                                        {reward.starsCost} <Star className="ml-1.5 h-3 w-3 text-yellow-500"/>
                                                    </Badge>
                                                    <Link href={`/dashboard/mural?childId=${childData.id}&tab=rewards`} passHref>
                                                        <Button size="sm" variant="outline" onClick={() => handleRedeem(childData.name, reward.title)}>Resgatar</Button>
                                                    </Link>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                )
                            })}
                           </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
