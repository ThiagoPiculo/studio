

"use client";

import React, { useEffect, useState, useMemo, Fragment } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Gift, PlusCircle, Star as StarIcon, Loader2, Edit3, Trash2, ArrowRight, Users, Filter, Search, Tag, Coins, Info, CheckCircle, PackageSearch } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { getRewardTemplatesByOwnerOrFamily, deleteRewardTemplate, getChildProfilesForAttribution, getChildRewardInstancesForContext } from '@/lib/firebase/firestore';
import type { RewardTemplate, RewardCategoryDetails, PredefinedRewardIdea } from '@/lib/types';
import { rewardCategories } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { AssignRewardDialog } from '@/components/dashboard/rewards/AssignRewardDialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUserRole } from '@/hooks/useUserRole';
import { predefinedRewardGroups } from '@/lib/predefined-reward-ideas';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export default function RewardsHubPage() {
  const { user } = useAuth();
  const { currentContext, availableContexts } = useFamily();
  const { canEdit, isLoading: isRoleLoading } = useUserRole();
  const { toast } = useToast();
  const router = useRouter();

  const [rewardTemplates, setRewardTemplates] = useState<RewardTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [templateToDelete, setTemplateToDelete] = useState<RewardTemplate | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [templateToAssign, setTemplateToAssign] = useState<RewardTemplate | null>(null);
  const [isAboutDialogOpen, setIsAboutDialogOpen] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  
  const userTemplatesLoaded = useMemo(() => new Set(rewardTemplates.map(t => t.title.trim().toLowerCase())), [rewardTemplates]);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const familyIdToQuery = currentContext === 'my-space' ? null : currentContext;
    getRewardTemplatesByOwnerOrFamily(user.uid, familyIdToQuery)
      .then(setRewardTemplates)
      .catch(err => {
        console.error("Error fetching reward templates:", err);
        toast({ title: "Erro ao buscar recompensas", variant: "destructive" });
      })
      .finally(() => setIsLoading(false));
  }, [user, currentContext, toast]);


  const getCategoryDetails = (categoryId: RewardTemplate['category']): RewardCategoryDetails | undefined => {
    return rewardCategories.find(cat => cat.id === categoryId);
  };

  const handleUseIdea = (idea: PredefinedRewardIdea) => {
    const queryParams = new URLSearchParams();
    queryParams.append('title', idea.title);
    if (idea.description) {
        queryParams.append('description', idea.description);
    }
    queryParams.append('category', idea.suggestedAppCategory);
    if (idea.isMaterialSuggestion !== undefined) {
        queryParams.append('isMaterial', String(idea.isMaterialSuggestion));
    }
    if (idea.starsCost) {
        queryParams.append('starsCost', String(idea.starsCost));
    }
    router.push(`/dashboard/rewards/new?${queryParams.toString()}`);
  };

  const currentContextName = useMemo(() => {
    if (currentContext === 'my-space') return "seu Espaço Pessoal";
    return `a Aliança "${availableContexts.find(f => f.id === currentContext)?.name || 'Desconhecida'}"`;
  }, [availableContexts, currentContext]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <Dialog open={isAboutDialogOpen} onOpenChange={setIsAboutDialogOpen}>
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div>
                <CardTitle className="text-3xl font-headline flex items-center">
                  <Gift className="mr-3 h-8 w-8 text-primary" />
                  Lojinha de Recompensas
                </CardTitle>
                <CardDescription>
                  Inspire-se, crie e gerencie as recompensas para {currentContextName}.
                </CardDescription>
              </div>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto flex-shrink-0">
                  <Info className="mr-2 h-5 w-5" /> Sobre Recompensas
                </Button>
              </DialogTrigger>
            </div>
          </CardHeader>
        </Card>

        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-headline flex items-center gap-2">
              <Gift className="h-6 w-6 text-primary" />
              O Poder das Recompensas
            </DialogTitle>
            <DialogDescription className="pt-2">
              As recompensas são a parte fundamental da jornada no Mini Herois. Elas são o grande prêmio no final da aventura, o "tesouro" que os herois ganham com seu esforço.
            </DialogDescription>
          </DialogHeader>
           <CardContent className="max-h-[60vh] overflow-y-auto -mx-6 px-6">
            <div className="space-y-3 text-sm text-muted-foreground pb-4">
              <p>Pense nelas como a motivação principal para as crianças. O sistema funciona com uma lógica simples e poderosa:</p>
              <p><strong>Esforço Gera Valor:</strong> Ao completar as missões do dia a dia (as tarefas), a criança ganha Estrelas (⭐). Essas estrelas são a "moeda" do nosso universo heroico. Elas são a representação visual e tangível do esforço e da responsabilidade da criança.</p>
              <p><strong>Valor Gera Conquistas:</strong> A criança acumula essas estrelas em seu perfil. Com elas, ela pode "comprar" ou "resgatar" as recompensas que você, o responsável, criou e disponibilizou.</p>
              <p className="font-semibold text-foreground">O objetivo das recompensas vai muito além de simplesmente "dar um prêmio". Elas servem para:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong className="text-foreground">Ensinar Causa e Efeito:</strong> A criança aprende de forma concreta que o seu esforço (completar missões) leva a um resultado positivo e desejado (conquistar uma recompensa).</li>
                <li><strong className="text-foreground">Introduzir Educação Financeira:</strong> A dinâmica de economizar estrelas para um prêmio maior ensina, de forma lúdica, os conceitos de economizar, poupar e trabalhar por um objetivo.</li>
                <li><strong className="text-foreground">Fortalecer Laços Familiares:</strong> Muitas das melhores recompensas não são coisas, mas sim experiências. Uma "tarde de jogos em família", "uma hora a mais no parque com o papai" ou "ajudar a fazer o bolo do fim de semana" são recompensas que criam memórias e fortalecem a conexão entre vocês.</li>
                <li><strong className="text-foreground">Dar Autonomia e Poder de Escolha:</strong> Ao permitir que a criança escolha qual recompensa ela quer "comprar" com suas estrelas, você dá a ela um senso de controle e autonomia, o que é muito importante para o seu desenvolvimento.</li>
              </ul>
              <p className="font-semibold text-foreground">O sistema é flexível para você criar recompensas que se encaixem na sua família:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Experiências:</strong> Um piquenique, uma noite de cinema, uma história extra antes de dormir.</li>
                <li><strong>Privilégios:</strong> Escolher o cardápio do jantar, ter 30 minutos a mais de videogame.</li>
                <li><strong>Itens Materiais:</strong> Um gibi, um brinquedo pequeno, um livro novo.</li>
              </ul>
              <p className="pt-2">Em resumo, as recompensas são a ferramenta que fecha o ciclo de gamificação: a missão é o desafio, as estrelas são a pontuação, e a recompensa é a conquista que torna toda a jornada divertida e valiosa.</p>
            </div>
           </CardContent>
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button variant="outline" className="w-full">Entendido!</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Card>
        <CardHeader>
            <CardTitle>Ideias de Recompensas</CardTitle>
            <CardDescription>Inspire-se com estas sugestões. Clique em "Usar" para adicionar a recompensa ao seu catálogo e poder atribuí-la.</CardDescription>
        </CardHeader>
        <CardContent>
            {predefinedRewardGroups.length > 0 ? (
                <Accordion type="multiple" defaultValue={["Privilégios"]} className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    {predefinedRewardGroups.map((group) => {
                        const Icon = group.icon;
                        return (
                            <AccordionItem value={group.userCategory} key={group.userCategory} className="rounded-lg border bg-card text-card-foreground shadow-md break-inside-avoid">
                                <AccordionTrigger className="p-6 hover:no-underline w-full group text-left">
                                    <div className="flex items-center gap-3">
                                        <Icon className="h-7 w-7 text-primary" />
                                        <div>
                                            <h3 className="text-xl font-semibold">{group.userCategory}</h3>
                                            <p className="text-sm text-muted-foreground font-normal mt-1">{group.description}</p>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="p-6 pt-0">
                                    <ul className="space-y-3 pt-1">
                                    {group.items.map((idea) => {
                                        const alreadyExists = userTemplatesLoaded.has(idea.title.trim().toLowerCase());
                                        return (
                                            <li key={idea.title} className="p-3 border rounded-md bg-muted/30 hover:shadow-sm transition-shadow">
                                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                                    <div className="flex-grow space-y-1">
                                                        <h4 className="font-semibold text-md">{idea.title}</h4>
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            {idea.starsCost && <Badge variant="secondary" className="text-xs font-normal"><StarIcon className="mr-1.5 h-3 w-3 text-yellow-500 fill-yellow-500" /> {idea.starsCost}</Badge>}
                                                            {alreadyExists && <Badge variant="secondary" className="whitespace-nowrap bg-green-100 text-green-800 border-green-200"><CheckCircle className="mr-1.5 h-3.5 w-3.5"/> No Catálogo</Badge>}
                                                        </div>
                                                    </div>
                                                    <Button size="sm" variant="outline" onClick={() => handleUseIdea(idea)} className="mt-2 sm:mt-0 flex-shrink-0 border-primary/50 text-primary hover:bg-primary/10 hover:text-primary" disabled={!canEdit}>
                                                        Usar esta Ideia <ArrowRight className="ml-2 h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </li>
                                        )
                                    })}
                                    </ul>
                                </AccordionContent>
                            </AccordionItem>
                        )
                    })}
                </Accordion>
            ) : (
                 <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg">
                    <PackageSearch className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                    <p className="text-lg text-muted-foreground">Nenhuma ideia de recompensa disponível no momento.</p>
                </div>
            )}
        </CardContent>
         <CardFooter>
            <Link href="/dashboard/rewards/new">
              <Button disabled={!canEdit}>
                <PlusCircle className="mr-2 h-4 w-4" /> Criar Recompensa do Zero
              </Button>
            </Link>
          </CardFooter>
      </Card>
    </div>
  );
}

