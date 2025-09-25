
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { requestRewardRedemption, getChildProfileById, getChildRewardInstancesByChild } from '@/lib/firebase/firestore';
import type { ChildRewardInstance, ChildProfile, RewardTemplate } from '@/lib/types';
import { rewardCategories } from '@/lib/types';
import Loading from '../loading';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Star, Clock, Gift, Lock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { predefinedRewardGroups } from '@/lib/predefined-reward-ideas';
import { Loader2 } from 'lucide-react';


export default function ChildRewardsPage() {
  const params = useParams();
  const childId = params.childId as string;
  const { toast } = useToast();

  const rewardTemplates = useMemo(() => predefinedRewardGroups.flatMap(g => g.items), []);
  const [pendingRedemptions, setPendingRedemptions] = useState<ChildRewardInstance[]>([]);
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [rewardToRedeem, setRewardToRedeem] = useState<RewardTemplate | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (childId) {
      setIsLoading(true);
      Promise.all([
        getChildProfileById(childId),
        getChildRewardInstancesByChild(childId)
      ]).then(([childProfile, rewardInstances]) => {
        if (!childProfile) {
          throw new Error("Perfil do herói não encontrado.");
        }
        setChild(childProfile);
        setPendingRedemptions(rewardInstances.filter(r => r.status === 'pending_approval'));
      }).catch(error => {
        console.error("Error fetching child rewards data:", error);
        toast({ title: 'Erro ao buscar recompensas', variant: 'destructive' });
      }).finally(() => {
        setIsLoading(false);
      });
    }
  }, [childId, toast]);
  
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

  const availableRewardsByCategory = useMemo(() => {
    if (!child) return {};
    const alreadyPendingOrRedeemed = new Set(pendingRedemptions.map(r => r.title));

    return predefinedRewardGroups.reduce((acc, group) => {
        const availableItems = group.items.filter(template => {
            return template.starsCost !== undefined &&
                   child.stars >= template.starsCost &&
                   !alreadyPendingOrRedeemed.has(template.title);
        });
        if(availableItems.length > 0) {
            acc[group.userCategory] = {
                icon: group.icon,
                items: availableItems
            };
        }
        return acc;
    }, {} as Record<string, { icon: React.ElementType, items: typeof predefinedRewardGroups[0]['items'] }>);
  }, [child, pendingRedemptions]);

  const goalRewardsByCategory = useMemo(() => {
    if (!child) return {};
    const alreadyPendingOrRedeemed = new Set(pendingRedemptions.map(r => r.title));

    return predefinedRewardGroups.reduce((acc, group) => {
        const goalItems = group.items.filter(template => {
            return template.starsCost !== undefined &&
                   child.stars < template.starsCost &&
                   !alreadyPendingOrRedeemed.has(template.title);
        });
        if(goalItems.length > 0) {
            acc[group.userCategory] = {
                icon: group.icon,
                items: goalItems.sort((a,b) => a.starsCost! - b.starsCost!)
            };
        }
        return acc;
    }, {} as Record<string, { icon: React.ElementType, items: typeof predefinedRewardGroups[0]['items'] }>);
  }, [child, pendingRedemptions]);


  if (isLoading || !child) {
    return <Loading />;
  }

  const totalAvailable = Object.values(availableRewardsByCategory).reduce((sum, group) => sum + group.items.length, 0);

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
         {totalAvailable > 0 ? (
            <Accordion type="multiple" className="w-full space-y-2">
                 {Object.entries(availableRewardsByCategory).map(([category, group]) => (
                    <AccordionItem key={category} value={category} className="border rounded-lg bg-card text-card-foreground shadow-sm">
                         <AccordionTrigger className="p-3 hover:no-underline text-left">
                            <div className="flex items-center justify-between w-full">
                                <span className="font-semibold flex items-center gap-2">
                                    <group.icon className="h-5 w-5 text-primary" /> {category}
                                </span>
                                <Badge variant="secondary" className="mr-2">{group.items.length}</Badge>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-4 pt-2">
                             <div className="space-y-2 border-t pt-3">
                                {group.items.map(reward => (
                                    <div key={reward.title} className="p-2 rounded-md hover:bg-muted/50 flex items-center justify-between">
                                        <p className="font-medium text-sm">{reward.title}</p>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="font-semibold">{reward.starsCost} <Star className="ml-1.5 h-3 w-3 text-yellow-500" /></Badge>
                                            <Button size="xs" variant="default" className="h-6 text-xs" onClick={() => setRewardToRedeem(reward)}>Resgatar</Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
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
         {Object.keys(goalRewardsByCategory).length > 0 ? (
             <Accordion type="multiple" className="w-full space-y-2">
                 {Object.entries(goalRewardsByCategory).map(([category, group]) => (
                    <AccordionItem key={category} value={category} className="border rounded-lg bg-card text-card-foreground shadow-sm">
                         <AccordionTrigger className="p-3 hover:no-underline text-left">
                            <div className="flex items-center justify-between w-full">
                                <span className="font-semibold flex items-center gap-2">
                                    <group.icon className="h-5 w-5 text-primary/70" /> {category}
                                </span>
                                <Badge variant="outline" className="mr-2">{group.items.length}</Badge>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-4 pt-2">
                             <div className="space-y-2 border-t pt-3">
                                {group.items.map(reward => (
                                   <div key={reward.title} className="p-2 rounded-md bg-muted/40 flex items-center justify-between">
                                        <p className="font-semibold text-sm text-foreground line-clamp-2 pr-4">{reward.title}</p>
                                        <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                                            <span>Faltam {reward.starsCost! - child.stars}</span>
                                            <Star className="h-3 w-3" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
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
