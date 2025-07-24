
"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import type { ChildProfile, RewardTemplate } from '@/lib/types';
import { Gift, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

interface UnlockedRewardsProps {
  childrenProfiles: ChildProfile[];
  rewardTemplates: RewardTemplate[];
}

export function UnlockedRewards({ childrenProfiles, rewardTemplates }: UnlockedRewardsProps) {
  const { toast } = useToast();
  
  const unlockedRewardsByChild = useMemo(() => {
    return childrenProfiles.map(child => {
      const affordableRewards = rewardTemplates.filter(template => 
        template.status === 'active' && child.stars >= template.starsCost
      );
      return {
        ...child,
        affordableRewards,
      };
    }).filter(child => child.affordableRewards.length > 0);
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
             <p className="text-sm text-muted-foreground">Nenhum herói tem estrelas suficientes para resgatar uma recompensa no momento.</p>
        ) : (
            unlockedRewardsByChild.map((childData, index) => (
                <div key={childData.id}>
                    {index > 0 && <Separator className="my-4" />}
                    <div className="flex items-center gap-3 mb-2">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={childData.avatar} alt={childData.name} />
                            <AvatarFallback style={{ backgroundColor: childData.color }}>
                                {getInitials(childData.name)}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <h4 className="font-semibold">{childData.name}</h4>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-500" /> {childData.stars} estrelas disponíveis
                            </p>
                        </div>
                    </div>
                    <ul className="space-y-2 pl-4 border-l-2 ml-4" style={{borderColor: childData.color}}>
                        {childData.affordableRewards.map(reward => (
                            <li key={reward.id} className="flex items-center justify-between text-sm">
                                <span className="flex-grow pr-2">{reward.title}</span>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className="font-semibold text-muted-foreground flex items-center gap-1">
                                        {reward.starsCost} <Star className="h-3 w-3 text-yellow-500"/>
                                    </span>
                                    <Button size="sm" variant="outline" onClick={() => handleRedeem(childData.name, reward.title)}>Resgatar</Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            ))
        )}
      </CardContent>
    </Card>
  );
}
