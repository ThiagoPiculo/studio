
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Gift, PlusCircle, Star as StarIcon, PackageSearch, Loader2, Tag, Users, ShieldCheck, MoreHorizontal, Edit3, Trash2, Power, PowerOff, Eye } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { getChildProfilesByOwner, getChildProfilesByFamily, getRewardsByOwner, getRewardsByFamily, updateReward, deleteReward } from '@/lib/firebase/firestore';
import type { Reward, ChildProfile, RewardCategoryDetails } from '@/lib/types';
import { rewardCategories } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';

type RewardStatus = Reward['status'];

export default function RewardsHubPage() {
  const { user } = useAuth();
  const { currentContext, availableContexts } = useFamily();
  const { toast } = useToast();
  const router = useRouter();

  const [rewards, setRewards] = useState<Reward[]>([]);
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<RewardStatus | 'all'>('active');
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [rewardToDelete, setRewardToDelete] = useState<Reward | null>(null);


  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const fetchChildrenAndRewards = async () => {
      setIsLoading(true);
      setError(null);
      try {
        let childProfiles: ChildProfile[] = [];
        let fetchedRewards: Reward[] = [];

        if (currentContext === 'my-space') {
          childProfiles = await getChildProfilesByOwner(user.uid);
          fetchedRewards = await getRewardsByOwner(user.uid);
        } else {
          childProfiles = await getChildProfilesByFamily(currentContext);
          fetchedRewards = await getRewardsByFamily(currentContext);
        }
        setChildren(childProfiles);
        setRewards(fetchedRewards);
      } catch (err) {
        console.error("Error fetching rewards data:", err);
        setError("Não foi possível carregar as recompensas. Tente atualizar a página.");
        toast({
          title: "Erro ao Carregar Recompensas",
          description: "Houve um problema ao buscar os dados. Verifique sua conexão ou tente mais tarde.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchChildrenAndRewards();
  }, [user, currentContext, toast]);

  const childrenMap = useMemo(() => new Map(children.map(child => [child.id, child.name])), [children]);

  const getCategoryDetails = (categoryId: Reward['category']): RewardCategoryDetails | undefined => {
    return rewardCategories.find(cat => cat.id === categoryId);
  };

  const currentFamilyName = useMemo(() => availableContexts.find(f => f.id === currentContext)?.name || 'Desconhecida', [availableContexts, currentContext]);
  const rewardsDescription = currentContext === 'my-space'
    ? "Recompensas criadas em seu espaço pessoal."
    : `Recompensas disponíveis para a família: ${currentFamilyName}.`;

  const filteredRewards = useMemo(() => {
    if (activeTab === 'all') return rewards;
    return rewards.filter(reward => reward.status === activeTab);
  }, [rewards, activeTab]);

  const handleToggleStatus = async (reward: Reward) => {
    setIsProcessingAction(true);
    const newStatus = reward.status === 'active' ? 'disabled' : 'active';
    try {
      await updateReward(reward.id, { status: newStatus });
      setRewards(prev => prev.map(r => r.id === reward.id ? { ...r, status: newStatus, updatedAt: new Date() as any } : r)); // Optimistic update
      toast({ title: "Status Atualizado!", description: `Recompensa "${reward.title}" agora está ${newStatus === 'active' ? 'ativa' : 'desativada'}.` });
    } catch (error) {
      console.error("Error updating reward status:", error);
      toast({ title: "Erro ao Atualizar", description: "Não foi possível alterar o status da recompensa.", variant: "destructive" });
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!rewardToDelete) return;
    setIsProcessingAction(true);
    try {
      await deleteReward(rewardToDelete.id);
      setRewards(prev => prev.filter(r => r.id !== rewardToDelete.id)); // Optimistic update
      toast({ title: "Recompensa Excluída!", description: `"${rewardToDelete.title}" foi removida.` });
    } catch (error) {
      console.error("Error deleting reward:", error);
      toast({ title: "Erro ao Excluir", description: "Não foi possível remover a recompensa.", variant: "destructive" });
    } finally {
      setRewardToDelete(null);
      setIsProcessingAction(false);
    }
  };
  
  const getStatusBadgeVariant = (status: RewardStatus): "default" | "secondary" | "outline" => {
    switch (status) {
      case 'active': return 'default'; // Primary color by default
      case 'disabled': return 'outline'; // Muted/grey
      case 'redeemed': return 'secondary'; // Secondary color
      default: return 'outline';
    }
  };


  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline flex items-center">
            <Gift className="mr-3 h-8 w-8 text-primary" />
            Gerenciamento de Recompensas
          </CardTitle>
          <CardDescription>
            {rewardsDescription} Crie, atribua e gerencie as recompensas que motivarão seus Mini Herois.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/dashboard/rewards/new">
            <Button className="w-full md:w-auto bg-accent text-accent-foreground hover:bg-accent/90">
              <PlusCircle className="mr-2 h-5 w-5" /> Adicionar Nova Recompensa
            </Button>
          </Link>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as RewardStatus | 'all')}>
        <TabsList className="grid w-full grid-cols-3 md:max-w-md">
          <TabsTrigger value="active">Disponíveis</TabsTrigger>
          <TabsTrigger value="disabled">Desativadas</TabsTrigger>
          <TabsTrigger value="redeemed">Resgatadas</TabsTrigger>
        </TabsList>
        
        <div className="mt-4">
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="ml-3 text-muted-foreground">Carregando recompensas...</p>
            </div>
          ) : error ? (
            <p className="text-destructive text-center py-10">{error}</p>
          ) : filteredRewards.length === 0 ? (
            <TabsContent value={activeTab} className="mt-0"> {/* Ensure TabsContent is always rendered for structure */}
              <Card className="text-center py-10">
                <CardContent>
                  <PackageSearch className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-lg text-muted-foreground">Nenhuma recompensa encontrada nesta categoria.</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {activeTab === 'active' && "Crie uma recompensa para motivar seus Mini Herois!"}
                    {activeTab === 'disabled' && "Nenhuma recompensa foi desativada."}
                    {activeTab === 'redeemed' && "Nenhuma recompensa foi resgatada ainda."}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          ) : (
            <TabsContent value={activeTab} className="mt-0"> {/* Ensure TabsContent is always rendered for structure */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredRewards.map((reward) => {
                  const categoryDetails = getCategoryDetails(reward.category);
                  const CategoryIconComponent = categoryDetails?.icon;
                  const childName = childrenMap.get(reward.childId);
                  return (
                    <Card key={reward.id} className="shadow-md hover:shadow-lg transition-shadow flex flex-col">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-xl">{reward.title}</CardTitle>
                          <Badge variant={getStatusBadgeVariant(reward.status)} className="capitalize">
                            {reward.status === 'active' ? 'Ativa' : reward.status === 'disabled' ? 'Desativada' : 'Resgatada'}
                          </Badge>
                        </div>
                        {reward.description && (
                          <CardDescription className="text-sm pt-1">{reward.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-3 flex-grow">
                        {categoryDetails && (
                          <div className="flex items-center">
                            <span className={`mr-2 p-1.5 rounded-full ${categoryDetails.colorClasses.split(' ')[0]}`}>
                              {CategoryIconComponent && <CategoryIconComponent className={`h-5 w-5 ${categoryDetails.colorClasses.split(' ')[1]}`} />}
                            </span>
                            <Badge variant="outline" className={categoryDetails.colorClasses}>
                              {categoryDetails.label}
                            </Badge>
                          </div>
                        )}
                        <div className="flex items-center text-sm text-muted-foreground">
                          <StarIcon className="h-5 w-5 mr-1.5 text-yellow-400 fill-yellow-400" />
                          Custo: {reward.starsCost} estrelas
                        </div>
                        {childName && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <ShieldCheck className="h-5 w-5 mr-1.5 text-primary" />
                            Para: {childName}
                          </div>
                        )}
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Tag className="h-5 w-5 mr-1.5 text-gray-500" />
                          Tipo: {reward.isMaterial ? "Material" : "Não Material"}
                        </div>
                         {reward.updatedAt && (
                          <p className="text-xs text-muted-foreground">
                            Última atualização: {new Date((reward.updatedAt as any).seconds * 1000).toLocaleDateString()}
                          </p>
                        )}
                      </CardContent>
                      <CardFooter>
                        {reward.status !== 'redeemed' ? (
                           <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="w-full" disabled={isProcessingAction}>
                                <MoreHorizontal className="mr-2 h-4 w-4" /> Ações
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel>Gerenciar Recompensa</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => router.push(`/dashboard/rewards/edit/${reward.id}`)} disabled={isProcessingAction}>
                                <Edit3 className="mr-2 h-4 w-4" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleStatus(reward)} disabled={isProcessingAction}>
                                {reward.status === 'active' ? <PowerOff className="mr-2 h-4 w-4" /> : <Power className="mr-2 h-4 w-4" />}
                                {reward.status === 'active' ? 'Desativar' : 'Ativar'}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setRewardToDelete(reward)} className="text-destructive focus:text-destructive-foreground focus:bg-destructive" disabled={isProcessingAction}>
                                <Trash2 className="mr-2 h-4 w-4" /> Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                           <Button variant="outline" size="sm" className="w-full" disabled>
                                <Eye className="mr-2 h-4 w-4" /> Ver Detalhes (Em breve)
                           </Button>
                        )}
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          )}
        </div>
      </Tabs>
      
      {rewardToDelete && (
        <AlertDialog open={!!rewardToDelete} onOpenChange={() => setRewardToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir a recompensa "{rewardToDelete.title}"? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setRewardToDelete(null)} disabled={isProcessingAction}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90" disabled={isProcessingAction}>
                {isProcessingAction ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Sim, Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
