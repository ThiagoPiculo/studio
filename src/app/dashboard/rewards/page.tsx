
"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Gift, PlusCircle, Star as StarIcon, PackageSearch, Loader2, Tag, Users, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { getChildProfilesByOwner, getChildProfilesByFamily, getRewardsByOwner, getRewardsByFamily } from '@/lib/firebase/firestore';
import type { Reward, ChildProfile, RewardCategoryDetails } from '@/lib/types';
import { rewardCategories } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export default function RewardsHubPage() {
  const { user } = useAuth();
  const { currentContext } = useFamily();
  const { toast } = useToast();

  const [rewards, setRewards] = useState<Reward[]>([]);
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const childrenMap = new Map(children.map(child => [child.id, child.name]));

  const getCategoryDetails = (categoryId: Reward['category']): RewardCategoryDetails | undefined => {
    return rewardCategories.find(cat => cat.id === categoryId);
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
            Crie, atribua e gerencie as recompensas que motivarão seus Mini Herois.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-xl flex items-center">
                <PlusCircle className="mr-2 h-5 w-5 text-accent" />
                Criar Nova Recompensa
              </CardTitle>
              <CardDescription>
                Defina novas recompensas para seus Mini Herois resgatarem com suas estrelas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/rewards/new">
                <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                  Adicionar Recompensa
                </Button>
              </Link>
            </CardContent>
          </Card>
          {/* Placeholder for other actions if needed */}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recompensas Ativas</CardTitle>
          <CardDescription>
            {currentContext === 'my-space' 
              ? "Recompensas criadas em seu espaço pessoal."
              : `Recompensas disponíveis para a família: ${useFamily().availableContexts.find(c => c.id === currentContext)?.name || 'Desconhecida'}.`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="ml-3 text-muted-foreground">Carregando recompensas...</p>
            </div>
          ) : error ? (
            <p className="text-destructive text-center py-10">{error}</p>
          ) : rewards.length === 0 ? (
            <div className="text-center py-10">
              <PackageSearch className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg text-muted-foreground">Nenhuma recompensa ativa encontrada.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Crie uma nova recompensa para começar a motivar seus Mini Herois!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rewards.map((reward) => {
                const categoryDetails = getCategoryDetails(reward.category);
                const CategoryIcon = categoryDetails?.icon;
                const childName = childrenMap.get(reward.childId);
                return (
                  <Card key={reward.id} className="shadow-md hover:shadow-lg transition-shadow flex flex-col">
                    <CardHeader>
                      <CardTitle className="text-xl">{reward.title}</CardTitle>
                      {reward.description && (
                        <CardDescription className="text-sm pt-1">{reward.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3 flex-grow">
                      {categoryDetails && (
                        <div className="flex items-center">
                           <span className={`mr-2 p-1.5 rounded-full ${categoryDetails.colorClasses.split(' ')[0]}`}>
                            {CategoryIcon && <CategoryIcon className={`h-5 w-5 ${categoryDetails.colorClasses.split(' ')[1]}`} />}
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
                    </CardContent>
                    <CardFooter>
                        <Button variant="outline" size="sm" className="w-full" disabled>
                            Gerenciar (Em breve)
                        </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="opacity-60">
        <CardHeader>
          <CardTitle>Histórico de Recompensas Resgatadas (Em Breve)</CardTitle>
          <CardDescription>Aqui você verá todas as recompensas que foram resgatadas pelos seus Mini Herois.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">A funcionalidade de listagem de recompensas resgatadas está em desenvolvimento.</p>
        </CardContent>
      </Card>
    </div>
  );
}

