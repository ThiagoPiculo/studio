
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { getChildRewardInstancesByChild, getChildProfileById, redeemChildRewardInstance } from '@/lib/firebase/firestore';
import type { ChildRewardInstance, ChildProfile } from '@/lib/types';
import Loading from '../loading';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Star, CheckCircle, Loader2, Gift, Lock, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

export default function ChildRewardsPage() {
  const params = useParams();
  const childId = params.childId as string;
  const { toast } = useToast();

  const [rewards, setRewards] = useState<ChildRewardInstance[]>([]);
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [rewardToRedeem, setRewardToRedeem] = useState<ChildRewardInstance | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (childId) {
      setIsLoading(true);
      Promise.all([
        getChildRewardInstancesByChild(childId),
        getChildProfileById(childId)
      ]).then(([rewardInstances, childProfile]) => {
        // Only show active rewards
        setRewards(rewardInstances.filter(r => r.status === 'active' || r.status === 'redeemed'));
        setChild(childProfile);
      }).catch(error => {
        console.error("Error fetching child rewards:", error);
        toast({ title: 'Erro ao buscar recompensas', variant: 'destructive' });
      }).finally(() => {
        setIsLoading(false);
      });
    }
  }, [childId, toast]);

  const { availableRewards, goalRewards, redeemedRewards } = useMemo(() => {
    const available = rewards.filter(r => r.status === 'active' && child && child.stars >= r.starsCost && !r.redeemedAt).sort((a,b) => a.starsCost - b.starsCost);
    const goals = rewards.filter(r => r.status === 'active' && child && child.stars < r.starsCost && !r.redeemedAt).sort((a,b) => a.starsCost - b.starsCost);
    const redeemed = rewards.filter(r => r.status === 'redeemed').sort((a,b) => (b.redeemedAt as any) - (a.redeemedAt as any));
    return { availableRewards: available, goalRewards: goals, redeemedRewards: redeemed };
  }, [rewards, child]);

  const handleRedeemClick = (reward: ChildRewardInstance) => {
    if (child && child.stars >= reward.starsCost) {
      setRewardToRedeem(reward);
    }
  };

  const confirmRedemption = async () => {
    if (!rewardToRedeem || !child) return;

    setIsProcessing(true);
    try {
      const actor = { id: child.id, name: child.name };
      await redeemChildRewardInstance(rewardToRedeem, child.id, actor);
      
      setChild(prev => prev ? { ...prev, stars: prev.stars - rewardToRedeem.starsCost } : null);
      setRewards(prev => prev.map(r => r.id === rewardToRedeem.id ? { ...r, status: 'redeemed' } : r));

      toast({
        title: "Pedido de Resgate Enviado!",
        description: `Seu pedido para "${rewardToRedeem.title}" foi enviado para aprovação!`,
      });
    } catch (error: any) {
      console.error("Error redeeming reward:", error);
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {availableRewards.map(reward => (
              <Card key={reward.id} className="bg-green-500/5 border-green-500/20 shadow-sm">
                <CardHeader>
                  <CardTitle>{reward.title}</CardTitle>
                  {reward.description && <CardDescription>{reward.description}</CardDescription>}
                </CardHeader>
                <CardFooter className="flex justify-between items-center">
                  <Badge variant="secondary" className="text-base border-amber-500/20">
                    {reward.starsCost} <Star className="ml-1.5 h-4 w-4 fill-yellow-400 text-yellow-500" />
                  </Badge>
                  <Button onClick={() => handleRedeemClick(reward)}>Resgatar!</Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-center text-muted-foreground py-6">Continue juntando estrelas! Suas próximas recompensas aparecerão aqui.</p>
        )}
      </section>
      
      <Separator />

      <section>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><Gift className="h-5 w-5 text-primary"/>Próximas Metas</h2>
         {goalRewards.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {goalRewards.map(reward => (
                <Card key={reward.id} className="relative overflow-hidden bg-muted/40">
                    <CardHeader>
                        <CardTitle className="text-muted-foreground">{reward.title}</CardTitle>
                        {reward.description && <CardDescription>{reward.description}</CardDescription>}
                    </CardHeader>
                    <CardFooter className="flex justify-between items-center">
                        <Badge variant="outline" className="text-base">
                            {reward.starsCost} <Star className="ml-1.5 h-4 w-4 text-muted-foreground/50"/>
                        </Badge>
                        <div className="text-xs font-semibold text-primary">Faltam {reward.starsCost - child.stars} estrelas!</div>
                    </CardFooter>
                    <div className="absolute inset-0 bg-background/20 backdrop-blur-sm flex items-center justify-center">
                        <Lock className="h-8 w-8 text-muted-foreground/50"/>
                    </div>
                </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-center text-muted-foreground py-6">Você já pode resgatar todas as recompensas disponíveis. Uau!</p>
        )}
      </section>
      
      <Separator />

      <section>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><CheckCircle className="h-5 w-5 text-gray-500"/>Recompensas Já Conquistadas</h2>
        {redeemedRewards.length > 0 ? (
          <div className="space-y-3">
            {redeemedRewards.map(reward => (
              <Card key={reward.id} className="bg-muted/30 border-dashed">
                <CardHeader className="flex flex-row items-center justify-between p-4">
                    <div>
                        <CardTitle className="text-base line-through text-muted-foreground">{reward.title}</CardTitle>
                        <p className="text-xs text-muted-foreground">Resgatada em {new Date(reward.redeemedAt as any).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <CheckCircle className="h-6 w-6 text-muted-foreground/50" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-center text-muted-foreground py-6">Sua jornada de conquistas está apenas começando!</p>
        )}
      </section>

       {rewardToRedeem && (
        <AlertDialog open={!!rewardToRedeem} onOpenChange={() => setRewardToRedeem(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Pedido de Resgate?</AlertDialogTitle>
              <AlertDialogDescription>
                Você tem certeza que quer usar {rewardToRedeem.starsCost} estrelas para resgatar "{rewardToRedeem.title}"? Um adulto precisará confirmar depois.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmRedemption} disabled={isProcessing}>
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                Sim, quero resgatar!
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

    </div>
  );
}
