
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { requestRewardRedemption, getChildProfileById, getUserProfile } from '@/lib/firebase/firestore';
import { getRewardTemplatesByOwnerOrFamily } from '@/lib/firebase/firestore';
import type { ChildRewardInstance, ChildProfile, RewardTemplate, UserProfile, RewardCategoryDetails } from '@/lib/types';
import { rewardCategories } from '@/lib/types';
import Loading from '../loading';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Star, CheckCircle, Loader2, Gift, Lock, Sparkles, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function ChildRewardsPage() {
  const params = useParams();
  const childId = params.childId as string;
  const { toast } = useToast();

  const [allRewards, setAllRewards] = useState<RewardTemplate[]>([]);
  const [pendingRedemptions, setPendingRedemptions] = useState<ChildRewardInstance[]>([]);
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [owner, setOwner] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [rewardToRedeem, setRewardToRedeem] = useState<RewardTemplate | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (childId) {
      setIsLoading(true);
      getChildProfileById(childId)
        .then(async (childProfile) => {
          if (!childProfile) {
            throw new Error("Perfil do herói não encontrado.");
          }
          setChild(childProfile);
          
          const ownerProfile = await getUserProfile(childProfile.ownerId);
          setOwner(ownerProfile);
          
          const familyIdToQuery = childProfile.familyId || null;
          const [rewardData, pendingData] = await Promise.all([
             getRewardTemplatesByOwnerOrFamily(childProfile.ownerId, familyIdToQuery),
             requestRewardRedemption(null, childId, true) // Fetch pending redemptions
          ]);
          
          setAllRewards(rewardData.filter(r => r.status === 'active'));
          setPendingRedemptions(pendingData as ChildRewardInstance[]);

        }).catch(error => {
          console.error("Error fetching child rewards data:", error);
          toast({ title: 'Erro ao buscar recompensas', variant: 'destructive' });
        }).finally(() => {
          setIsLoading(false);
        });
    }
  }, [childId, toast]);
  
  const { availableRewards, goalRewards } = useMemo(() => {
    if (!child) return { availableRewards: [], goalRewards: [] };
    
    const available = allRewards.filter(r => child.stars >= r.starsCost).sort((a,b) => a.starsCost - b.starsCost);
    const goals = allRewards.filter(r => child.stars < r.starsCost).sort((a,b) => a.starsCost - b.starsCost);
    
    return { availableRewards: available, goalRewards: goals };

  }, [allRewards, child]);

  const goalRewardsByCategory = useMemo(() => {
    const grouped: Record<string, RewardTemplate[]> = {};
    goalRewards.forEach(reward => {
      if (!grouped[reward.category]) {
        grouped[reward.category] = [];
      }
      grouped[reward.category].push(reward);
    });
    return grouped;
  }, [goalRewards]);

  const getCategoryDetails = (categoryId: string): RewardCategoryDetails | undefined => {
    return rewardCategories.find(cat => cat.id === categoryId);
  };

  const handleRedeemClick = (reward: RewardTemplate) => {
    if (child && child.stars >= reward.starsCost) {
      setRewardToRedeem(reward);
    }
  };

  const confirmRedemption = async () => {
    if (!rewardToRedeem || !child) return;

    setIsProcessing(true);
    try {
      const newPendingRedemption = await requestRewardRedemption(rewardToRedeem, child.id);
      
      if(newPendingRedemption) {
        setPendingRedemptions(prev => [...prev, newPendingRedemption as ChildRewardInstance]);
      }
      
      toast({
        title: "Pedido de Resgate Enviado!",
        description: `Seu pedido para "${rewardToRedeem.title}" foi enviado para aprovação!`,
      });
    } catch (error: any) {
      console.error("Error requesting reward redemption:", error);
      toast({ title: 'Ops! Algo deu errado.', description: error.message, variant: 'destructive' });
    } finally {
      setIsProcessing(false);
      setRewardToRedeem(null);
    }
  };

  if (isLoading || !child) {
    return <Loading />;
  }

  return (
    <div className="p-4 pb-24 space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold font-headline">Baú de Recompensas</h1>
        <p className="text-muted-foreground">Aqui estão os tesouros que você pode conquistar!</p>
        <div className="mt-4 inline-flex items-center justify-center gap-2 text-3xl font-bold text-amber-500 bg-amber-500/10 px-4 py-2 rounded-full border border-amber-500/20 shadow-inner">
            <Star className="h-8 w-8 fill-current" />
            <span>{child.stars}</span>
        </div>
      </div>
      
      <section>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><Sparkles className="h-5 w-5 text-green-500"/>Disponíveis para Resgate</h2>
        {availableRewards.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {availableRewards.map(reward => (
              <Card key={reward.id} className="bg-green-500/5 border-green-500/20 shadow-sm flex flex-col">
                <CardHeader className="p-3 flex-grow">
                  <p className="font-semibold text-sm leading-tight line-clamp-2">{reward.title}</p>
                </CardHeader>
                <CardContent className="p-3 pt-0 flex items-center justify-between">
                    <Badge variant="secondary" className="font-semibold border-amber-500/20 h-6 text-xs">
                       {reward.starsCost} <Star className="ml-1.5 h-3 w-3 fill-yellow-400 text-yellow-500" />
                    </Badge>
                     <Button size="xs" className="h-6 text-xs" onClick={() => handleRedeemClick(reward)}>Resgatar</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-center text-muted-foreground py-6">Continue juntando estrelas! Suas próximas recompensas aparecerão aqui.</p>
        )}
      </section>

      {pendingRedemptions.length > 0 && (
         <>
            <Separator />
             <section>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><Clock className="h-5 w-5 text-blue-500"/>Aguardando Aprovação</h2>
                <div className="grid grid-cols-2 gap-3">
                   {pendingRedemptions.map(reward => (
                     <Card key={reward.id} className="relative overflow-hidden bg-blue-500/5 border-blue-500/20">
                         <CardContent className="p-3">
                             <p className="font-semibold text-sm text-blue-800 line-clamp-2 pr-4">{reward.title}</p>
                             <Badge variant="outline" className="text-xs font-semibold h-6 mt-2">
                                {reward.starsCost} <Star className="ml-1.5 h-3 w-3 text-muted-foreground/50"/>
                            </Badge>
                         </CardContent>
                     </Card>
                   ))}
                </div>
            </section>
         </>
      )}
      
      <Separator />

      <section>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><Gift className="h-5 w-5 text-primary"/>Próximas Metas</h2>
         {goalRewards.length > 0 ? (
            <Accordion type="multiple" className="w-full space-y-3">
              {Object.entries(goalRewardsByCategory).map(([categoryId, rewards]) => {
                const categoryDetails = getCategoryDetails(categoryId);
                return (
                  <AccordionItem key={categoryId} value={categoryId} className="border rounded-lg bg-card text-card-foreground shadow-sm">
                    <AccordionTrigger className="p-4 hover:no-underline">
                      <div className="flex items-center gap-2">
                        {categoryDetails?.icon && <categoryDetails.icon className={cn("h-5 w-5", categoryDetails.colorClasses.split(' ')[1])} />}
                        <span className="text-base font-semibold">{categoryDetails?.label || 'Outros'}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="p-4 pt-0">
                      <div className="grid grid-cols-2 gap-3">
                        {rewards.map(reward => (
                            <Card key={reward.id} className="relative overflow-hidden bg-muted/40 flex flex-col">
                                <CardContent className="p-3 flex-grow">
                                    <div className="flex items-start justify-between">
                                        <p className="font-semibold text-sm text-foreground line-clamp-2 pr-4">{reward.title}</p>
                                        <Lock className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
                                    </div>
                                </CardContent>
                                <div className="p-2 border-t flex items-center justify-between">
                                     <Badge variant="outline" className="text-xs font-semibold h-6">
                                        {reward.starsCost} <Star className="ml-1.5 h-3 w-3 text-muted-foreground/50"/>
                                    </Badge>
                                     <div className="text-xs font-semibold text-primary">Faltam {reward.starsCost - child.stars}!</div>
                                </div>
                            </Card>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
        ) : (
          <p className="text-sm text-center text-muted-foreground py-6">Você já pode resgatar todas as recompensas disponíveis. Uau!</p>
        )}
      </section>
      
       {rewardToRedeem && (
        <AlertDialog open={!!rewardToRedeem} onOpenChange={() => setRewardToRedeem(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Pedido de Resgate?</AlertDialogTitle>
              <AlertDialogDescription>
                Você tem certeza que quer usar {rewardToRedeem.starsCost} estrelas para pedir a recompensa "{rewardToRedeem.title}"? Um adulto precisará confirmar depois.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmRedemption} disabled={isProcessing}>
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                Sim, pedir resgate!
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

    </div>
  );
}
