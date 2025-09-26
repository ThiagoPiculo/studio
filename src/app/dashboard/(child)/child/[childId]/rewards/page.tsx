
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { requestRewardRedemption, getChildProfileById, getChildRewardInstancesByChild, toggleFavoriteReward } from '@/lib/firebase/firestore';
import type { ChildRewardInstance, ChildProfile } from '@/lib/types';
import type { PredefinedRewardIdea } from '@/lib/predefined-reward-ideas';
import Loading from '../loading';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Star, Clock, Gift, Sparkles, Heart, ThumbsUp, PackagePlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { predefinedRewardGroups } from '@/lib/predefined-reward-ideas';
import { Loader2 } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { Progress } from '@/components/ui/progress';


interface RewardCardProps {
  reward: PredefinedRewardIdea;
  childStars: number;
  isFavorited: boolean;
  onToggleFavorite: (rewardTitle: string, isFavorited: boolean) => void;
  onRedeem: (reward: PredefinedRewardIdea) => void;
  isProcessing: boolean;
}

function RewardCard({ reward, childStars, isFavorited, onToggleFavorite, onRedeem, isProcessing }: RewardCardProps) {
    const canAfford = reward.starsCost ? childStars >= reward.starsCost : false;
    const progress = reward.starsCost ? (childStars / reward.starsCost) * 100 : 0;

    return (
        <Card className={cn(
            "flex flex-col h-full shadow-sm hover:shadow-md transition-shadow",
            !canAfford && "bg-muted/50"
        )}>
            <CardHeader className="p-4">
                 <div className="flex justify-between items-start">
                    <p className="font-semibold text-sm leading-tight pr-2">{reward.title}</p>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => onToggleFavorite(reward.title, isFavorited)}
                    >
                        <Heart className={cn("h-5 w-5", isFavorited ? "text-pink-500 fill-pink-500" : "text-muted-foreground")} />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 flex-grow">
                 <p className="text-xs text-muted-foreground line-clamp-2">
                    {reward.description || 'Uma recompensa incrível aguardando para ser conquistada!'}
                </p>
            </CardContent>
            <CardFooter className="p-4 pt-0 flex-col items-start gap-3">
                 <Badge variant="secondary" className="font-semibold text-sm py-1 px-3">
                    {reward.starsCost?.toLocaleString('pt-BR')} <Star className="ml-1.5 h-4 w-4 text-yellow-400 fill-current" />
                </Badge>
                {canAfford ? (
                    <Button
                        size="sm"
                        className="w-full"
                        disabled={isProcessing}
                        onClick={() => onRedeem(reward)}
                    >
                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : 'Pedir Resgate'}
                    </Button>
                ) : (
                    <div className="w-full space-y-1">
                        <Progress value={progress} className="h-2" />
                        <p className="text-xs text-muted-foreground text-center font-semibold">
                            {childStars.toLocaleString('pt-BR')} / {reward.starsCost?.toLocaleString('pt-BR')} estrelas
                        </p>
                    </div>
                )}
            </CardFooter>
        </Card>
    );
}


export default function ChildRewardsPage() {
  const params = useParams();
  const childId = params.childId as string;
  const { toast } = useToast();
  const { user, isChildAuthenticated } = useAuth(); // Assuming child auth sets a user-like object or specific state

  const [child, setChild] = useState<ChildProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [rewardInstances, setRewardInstances] = useState<ChildRewardInstance[]>([]);
  
  const [rewardToRedeem, setRewardToRedeem] = useState<PredefinedRewardIdea | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const allPredefinedRewards = useMemo(() => predefinedRewardGroups.flatMap(g => g.items), []);

  const fetchData = async (id: string) => {
      setIsLoading(true);
      try {
          const [childProfile, rewardInstancesData] = await Promise.all([
              getChildProfileById(id),
              getChildRewardInstancesByChild(id)
          ]);
          
          if (!childProfile) {
              throw new Error("Perfil do herói não encontrado.");
          }
          
          setChild(childProfile);
          setRewardInstances(rewardInstancesData);
      } catch (error: any) {
          console.error("Error fetching child rewards data:", error);
          toast({ title: 'Erro ao carregar dados', description: error.message, variant: 'destructive' });
      } finally {
          setIsLoading(false);
      }
  };

  useEffect(() => {
    if (childId) {
      fetchData(childId);
    }
  }, [childId]);

  const handleToggleFavorite = async (rewardTitle: string, isCurrentlyFavorited: boolean) => {
    if (!child) return;
    
    // Optimistic UI Update
    const oldFavorites = child.favoriteRewardIds || [];
    const newFavorites = isCurrentlyFavorited
        ? oldFavorites.filter(id => id !== rewardTitle)
        : [...oldFavorites, rewardTitle];
    setChild({ ...child, favoriteRewardIds: newFavorites });

    try {
        await toggleFavoriteReward(child.id, rewardTitle);
    } catch (error) {
        console.error("Error toggling favorite:", error);
        // Revert UI on error
        setChild({ ...child, favoriteRewardIds: oldFavorites });
        toast({ title: 'Ops!', description: 'Não foi possível atualizar seus favoritos.', variant: 'destructive' });
    }
  };
  
  const confirmRedemption = async () => {
    if (!rewardToRedeem || !child) return;

    setIsProcessing(true);
    try {
      await requestRewardRedemption(rewardToRedeem, child.id);
      
      toast({
        title: "Pedido de Resgate Enviado!",
        description: `Seu pedido para "${rewardToRedeem.title}" foi enviado para aprovação!`,
      });
      
      // Refetch data to update pending rewards
      await fetchData(child.id);

    } catch (error: any) {
      console.error("Error requesting reward redemption:", error);
      toast({ title: 'Ops! Algo deu errado.', description: error.message, variant: 'destructive' });
    } finally {
      setIsProcessing(false);
      setRewardToRedeem(null);
    }
  };

  const favoriteRewards = useMemo(() => {
    if (!child?.favoriteRewardIds) return [];
    const favoriteSet = new Set(child.favoriteRewardIds);
    return allPredefinedRewards.filter(r => favoriteSet.has(r.title));
  }, [child, allPredefinedRewards]);

  const availableRewardsByCategory = useMemo(() => {
    if (!child) return {};
    const pendingOrRedeemedTitles = new Set(rewardInstances.map(r => r.title));
    
    return allPredefinedRewards.reduce((acc, reward) => {
      if (pendingOrRedeemedTitles.has(reward.title)) return acc;
      
      const category = reward.userCategory;
      if (!acc[category]) {
        acc[category] = { icon: predefinedRewardGroups.find(g => g.userCategory === category)?.icon || Gift, items: [] };
      }
      acc[category].items.push(reward);
      return acc;
    }, {} as Record<string, { icon: React.ElementType, items: PredefinedRewardIdea[] }>);
  }, [child, rewardInstances, allPredefinedRewards]);

  const pendingRedemptions = useMemo(() => {
    return rewardInstances.filter(r => r.status === 'pending_approval');
  }, [rewardInstances]);


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
            <span>{child.stars.toLocaleString('pt-BR')}</span>
        </div>
      </div>
      
      {favoriteRewards.length > 0 && (
          <section>
             <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><Heart className="h-5 w-5 text-pink-500 fill-pink-500"/> Minha Lista de Sonhos</h2>
             <ScrollArea>
                <div className="flex space-x-4 pb-4">
                    {favoriteRewards.map(reward => (
                       <div key={reward.title} className="w-64 flex-shrink-0">
                           <RewardCard
                                reward={reward}
                                childStars={child.stars}
                                isFavorited={true}
                                onToggleFavorite={handleToggleFavorite}
                                onRedeem={setRewardToRedeem}
                                isProcessing={isProcessing}
                            />
                       </div>
                    ))}
                </div>
                <ScrollBar orientation="horizontal" />
             </ScrollArea>
          </section>
      )}

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
                                {reward.starsCost.toLocaleString('pt-BR')} <Star className="ml-1.5 h-3 w-3 text-muted-foreground/50"/>
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
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><Gift className="h-5 w-5 text-primary"/>Catálogo de Tesouros</h2>
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
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-3">
                            {group.items.map(reward => (
                                <RewardCard
                                    key={reward.title}
                                    reward={reward}
                                    childStars={child.stars}
                                    isFavorited={child.favoriteRewardIds?.includes(reward.title) || false}
                                    onToggleFavorite={handleToggleFavorite}
                                    onRedeem={setRewardToRedeem}
                                    isProcessing={isProcessing}
                                />
                            ))}
                        </div>
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
      </section>
      
       {rewardToRedeem && (
        <AlertDialog open={!!rewardToRedeem} onOpenChange={() => setRewardToRedeem(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Pedido de Resgate?</AlertDialogTitle>
              <AlertDialogDescription>
                Você tem certeza que quer usar {rewardToRedeem.starsCost?.toLocaleString('pt-BR')} estrelas para pedir a recompensa "{rewardToRedeem.title}"? Um adulto precisará confirmar depois.
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
