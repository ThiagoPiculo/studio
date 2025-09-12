
"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getChildProfileById, getChildRewardInstancesByChild, redeemChildRewardInstance } from '@/lib/firebase/firestore';
import type { ChildProfile, ChildRewardInstance } from '@/lib/types';
import { rewardCategories, type RewardCategoryDetails } from '@/lib/types';
import { cn, getInitials } from '@/lib/utils';
import { ChildBottomNavbar } from '@/components/dashboard/child/ChildBottomNavbar';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Gift, Star as StarIcon, Lock, CheckCircle, Loader2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import Loading from '../loading';


const getCategoryDetails = (categoryId: ChildRewardInstance['category']): RewardCategoryDetails | undefined => {
    return rewardCategories.find(cat => cat.id === categoryId);
};


export default function ChildRewardsPage() {
    const params = useParams();
    const childId = params.childId as string;
    const { childProfile, user, logout } = useAuth();
    const { toast } = useToast();

    const [child, setChild] = useState<ChildProfile | null>(childProfile);
    const [rewards, setRewards] = useState<ChildRewardInstance[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRedeeming, setIsRedeeming] = useState<string | null>(null);
    const [rewardToRedeem, setRewardToRedeem] = useState<ChildRewardInstance | null>(null);
    
    useEffect(() => {
        if (childId) {
            Promise.all([
                getChildProfileById(childId),
                getChildRewardInstancesByChild(childId)
            ]).then(([profile, rewardInstances]) => {
                setChild(profile);
                const activeRewards = rewardInstances.filter(r => r.status === 'active');
                setRewards(activeRewards);
            }).catch(err => {
                console.error("Error fetching data for rewards page:", err);
                toast({ title: "Erro ao carregar recompensas", variant: "destructive" });
            }).finally(() => {
                setIsLoading(false);
            });
        }
    }, [childId, toast]);

    const handleRedeemClick = (reward: ChildRewardInstance) => {
        if (child && child.stars >= reward.starsCost) {
            setRewardToRedeem(reward);
        } else {
            toast({
                title: "Ops, estrelas insuficientes!",
                description: "Continue completando missões para juntar mais estrelas e resgatar este prêmio.",
                variant: 'default',
            });
        }
    };
    
    const confirmRedeem = async () => {
        if (!rewardToRedeem || !child || !user) return;

        setIsRedeeming(rewardToRedeem.id);
        
        try {
            const actor = { id: child.id, name: child.name };
            await redeemChildRewardInstance(rewardToRedeem, child.id, actor);
            
            // Optimistic update
            setChild(prev => prev ? { ...prev, stars: prev.stars - rewardToRedeem.starsCost } : null);
            setRewards(prev => prev.filter(r => r.id !== rewardToRedeem.id));
            
            toast({
                title: "Pedido de Resgate Enviado!",
                description: "Seu pedido foi enviado para um adulto aprovar. Logo sua recompensa estará com você!",
            });
        } catch (error: any) {
            console.error("Error redeeming reward:", error);
            toast({ title: "Erro ao resgatar", description: error.message, variant: "destructive" });
        } finally {
            setIsRedeeming(null);
            setRewardToRedeem(null);
        }
    };

    if (isLoading) {
        return <Loading />;
    }

    if (!child) {
        return <div className="p-4">Herói não encontrado.</div>;
    }

    return (
        <div className="p-4 pb-24 space-y-6">
            <header className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-full">
                        <Gift className="h-7 w-7 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold font-headline">Recompensas</h1>
                </div>
                <div className="text-right">
                    <div className="flex items-center justify-end gap-1 text-amber-500">
                        <StarIcon className="h-6 w-6 fill-current" />
                        <span className="text-2xl font-bold">{child.stars}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Suas Estrelas</p>
                </div>
            </header>

            {rewards.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                    <p className="font-semibold text-lg">O Baú de Tesouros está vazio!</p>
                    <p className="text-sm mt-1">Peça para um adulto adicionar recompensas incríveis para você conquistar.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {rewards.map(reward => {
                        const canAfford = child.stars >= reward.starsCost;
                        const categoryDetails = getCategoryDetails(reward.category);
                        const CategoryIcon = categoryDetails?.icon;
                        return (
                            <Card key={reward.id} className={cn("flex flex-col shadow-lg transition-all", !canAfford && "bg-muted/50")}>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg">{reward.title}</CardTitle>
                                    {reward.description && <CardDescription className="text-xs pt-1 line-clamp-2">{reward.description}</CardDescription>}
                                </CardHeader>
                                <CardContent className="flex-grow space-y-2">
                                    {CategoryIcon && (
                                        <div className="flex items-center text-xs text-muted-foreground gap-1.5">
                                            <CategoryIcon className={cn("h-4 w-4", categoryDetails?.colorClasses.split(' ')[1])} />
                                            <span>{categoryDetails?.label}</span>
                                        </div>
                                    )}
                                </CardContent>
                                <CardFooter className="flex items-center justify-between bg-muted/30 p-3">
                                    <Badge variant="secondary" className="text-base">
                                        {reward.starsCost}
                                        <StarIcon className="ml-1.5 h-4 w-4 text-yellow-500 fill-yellow-500" />
                                    </Badge>
                                    <Button
                                        size="sm"
                                        onClick={() => handleRedeemClick(reward)}
                                        disabled={!canAfford || !!isRedeeming}
                                        className="shadow-md"
                                    >
                                        {isRedeeming === reward.id ? <Loader2 className="h-4 w-4 animate-spin" /> : (canAfford ? 'Resgatar!' : <Lock className="h-4 w-4" />)}
                                    </Button>
                                </CardFooter>
                            </Card>
                        )
                    })}
                </div>
            )}
            
            <AlertDialog open={!!rewardToRedeem} onOpenChange={() => setRewardToRedeem(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Resgatar Recompensa?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Você tem certeza que quer usar {rewardToRedeem?.starsCost} estrelas para pedir a recompensa "{rewardToRedeem?.title}"?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Não, voltar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmRedeem}>Sim, pedir!</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <ChildBottomNavbar childId={child.id} />
        </div>
    );
}

