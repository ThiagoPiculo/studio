
"use client";

import React, { useEffect, useState, useMemo, Fragment } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Gift, PlusCircle, Star as StarIcon, PackageSearch, Loader2, MoreHorizontal, Edit3, Trash2, PackagePlus, Sparkles, ArrowRight, Users, Filter } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { getRewardTemplatesByOwnerOrFamily, deleteRewardTemplate } from '@/lib/firebase/firestore';
import type { RewardTemplate, RewardCategoryDetails, RewardCategory, PredefinedRewardGroup } from '@/lib/types';
import { rewardCategories } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { predefinedRewardGroups, type PredefinedRewardIdea } from '@/lib/predefined-reward-ideas';
import { AssignRewardDialog } from '@/components/dashboard/rewards/AssignRewardDialog';


export default function RewardTemplatesHubPage() {
  const { user } = useAuth();
  const { currentContext, availableContexts } = useFamily();
  const { toast } = useToast();
  const router = useRouter();

  const [rewardTemplates, setRewardTemplates] = useState<RewardTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<RewardTemplate | null>(null);

  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [templateToAssign, setTemplateToAssign] = useState<RewardTemplate | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all');


  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const fetchRewardTemplates = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const familyIdToQuery = currentContext === 'my-space' ? null : currentContext;
        const fetchedTemplates = await getRewardTemplatesByOwnerOrFamily(user.uid, familyIdToQuery);
        setRewardTemplates(fetchedTemplates);
      } catch (err) {
        console.error("Error fetching reward templates:", err);
        setError("Não foi possível carregar os modelos de recompensa. Tente atualizar a página.");
        toast({
          title: "Erro ao Carregar Modelos",
          description: "Houve um problema ao buscar os dados. Verifique sua conexão ou tente mais tarde.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchRewardTemplates();
  }, [user, currentContext, toast]);

  const getCategoryDetails = (categoryId: RewardTemplate['category']): RewardCategoryDetails | undefined => {
    return rewardCategories.find(cat => cat.id === categoryId);
  };

  const currentContextName = useMemo(() => {
    if (currentContext === 'my-space') return "Seu Espaço Pessoal";
    return availableContexts.find(f => f.id === currentContext)?.name || `Família ${currentContext}`;
  }, [availableContexts, currentContext]);

  const templatesDescription = `Catálogo de recompensas para ${currentContextName}. Crie modelos que podem ser atribuídos aos seus Mini Herois.`;

  const handleDeleteConfirm = async () => {
    if (!templateToDelete) return;
    setIsProcessingAction(true);
    try {
      await deleteRewardTemplate(templateToDelete.id);
      setRewardTemplates(prev => prev.filter(rt => rt.id !== templateToDelete.id));
      toast({ title: "Modelo Excluído!", description: `O modelo "${templateToDelete.title}" foi removido do catálogo.` });
    } catch (error)
    {
      console.error("Error deleting reward template:", error);
      toast({ title: "Erro ao Excluir Modelo", description: "Não foi possível remover o modelo.", variant: "destructive" });
    } finally {
      setTemplateToDelete(null);
      setIsProcessingAction(false);
    }
  };
  
  const getStatusBadgeVariant = (status: RewardTemplate['status']): "default" | "secondary" | "outline" => {
    switch (status) {
      case 'active': return 'default';
      case 'archived': return 'secondary'; 
      default: return 'outline';
    }
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
    router.push(`/dashboard/rewards/new?${queryParams.toString()}`);
  };

  const handleOpenAssignDialog = (template: RewardTemplate) => {
    setTemplateToAssign(template);
    setIsAssignDialogOpen(true);
  };

  const groupIdeasBySubCategory = (items: PredefinedRewardIdea[]) => {
    return items.reduce((acc, idea) => {
      const subCategory = idea.userSubCategory || 'Outras Ideias';
      if (!acc[subCategory]) {
        acc[subCategory] = [];
      }
      acc[subCategory].push(idea);
      return acc;
    }, {} as Record<string, PredefinedRewardIdea[]>);
  };
  
  const filteredTemplates = useMemo(() => {
    if (statusFilter === 'all') {
      return rewardTemplates;
    }
    return rewardTemplates.filter(template => template.status === statusFilter);
  }, [rewardTemplates, statusFilter]);


  return (
    <div className="space-y-8 pb-10">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline flex items-center">
            <PackagePlus className="mr-3 h-8 w-8 text-primary" />
            Catálogo de Recompensas para os Mini Herois
          </CardTitle>
          <CardDescription>
            {templatesDescription}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/dashboard/rewards/new">
            <Button className="w-full md:w-auto bg-accent text-accent-foreground hover:bg-accent/90">
              <PlusCircle className="mr-2 h-5 w-5" /> Criar nova recompensa
            </Button>
          </Link>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <Sparkles className="mr-3 h-7 w-7 text-accent" />
            Inspire-se: Ideias de Recompensas
          </CardTitle>
          <CardDescription>
            Não sabe por onde começar? Use estas ideias como base para criar seus modelos!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {predefinedRewardGroups.map((group) => {
              const groupedIdeas = groupIdeasBySubCategory(group.items);
              return (
                <AccordionItem value={group.userCategory} key={group.userCategory}>
                  <AccordionTrigger className="text-lg hover:no-underline">
                    <div className="flex items-center gap-2">
                      <group.icon className="h-5 w-5 text-primary" />
                      {group.userCategory}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    {group.description && (
                      <p className="text-sm text-muted-foreground mb-4">{group.description}</p>
                    )}
                    {Object.entries(groupedIdeas).map(([subCategory, ideas]) => (
                      <Fragment key={subCategory}>
                        {subCategory !== 'Outras Ideias' && <h4 className="font-semibold text-md text-primary/80 mt-3 mb-1">{subCategory}</h4>}
                        <ul className="space-y-3 pt-1">
                          {ideas.map((idea) => (
                            <li key={idea.title} className="p-3 border rounded-md bg-muted/30 hover:shadow-sm transition-shadow">
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                <div>
                                  <h5 className="font-semibold text-md">{idea.title}</h5>
                                  {idea.description && <p className="text-sm text-muted-foreground mt-0.5">{idea.description}</p>}
                                </div>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => handleUseIdea(idea)}
                                  className="mt-2 sm:mt-0 flex-shrink-0 border-primary/50 text-primary hover:bg-primary/10 hover:text-primary"
                                >
                                  Usar esta Ideia <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </Fragment>
                    ))}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader>
            <CardTitle className="text-2xl font-headline">Seus Modelos Criados</CardTitle>
            <CardDescription>Abaixo estão os modelos de recompensa que você já adicionou ao catálogo de <span className="font-semibold text-primary">{currentContextName}</span>.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 p-4 border rounded-lg bg-muted/30 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
                <Filter className="h-5 w-5 text-primary" />
                <h3 className="text-md font-semibold">Filtrar por Status:</h3>
            </div>
            <RadioGroup
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as 'all' | 'active' | 'archived')}
              className="flex flex-wrap gap-x-6 gap-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="filter-all" />
                <Label htmlFor="filter-all" className="cursor-pointer hover:text-primary">Todos os Modelos</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="active" id="filter-active" />
                <Label htmlFor="filter-active" className="cursor-pointer hover:text-primary">Somente Ativos</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="archived" id="filter-archived" />
                <Label htmlFor="filter-archived" className="cursor-pointer hover:text-primary">Somente Arquivados</Label>
              </div>
            </RadioGroup>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="ml-3 text-muted-foreground">Carregando modelos de recompensa...</p>
            </div>
          ) : error ? (
            <p className="text-destructive text-center py-10">{error}</p>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-10">
              <PackageSearch className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg text-muted-foreground">
                {statusFilter === 'all' 
                  ? "Nenhum modelo de recompensa encontrado neste catálogo." 
                  : `Nenhum modelo ${statusFilter === 'active' ? 'ativo' : 'arquivado'} encontrado.`}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {statusFilter === 'all' 
                  ? "Crie seu primeiro modelo ou use uma das ideias acima!" 
                  : "Tente um filtro diferente ou crie um novo modelo."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map((template) => {
                const categoryDetails = getCategoryDetails(template.category);
                const CategoryIconComponent = categoryDetails?.icon;
                return (
                  <Card key={template.id} className="shadow-md hover:shadow-lg transition-shadow flex flex-col bg-card">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-xl">{template.title}</CardTitle>
                        <Badge variant={getStatusBadgeVariant(template.status)} className="capitalize">
                            {template.status === 'active' ? 'Ativo' : 'Arquivado'}
                        </Badge>
                      </div>
                      {template.description && (
                        <CardDescription className="text-sm pt-1 line-clamp-3">{template.description}</CardDescription>
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
                        Custo Base: {template.starsCost} estrelas
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Gift className="h-5 w-5 mr-1.5 text-gray-500" />
                        Tipo: {template.isMaterial ? "Material" : "Não Material"}
                      </div>
                      {template.updatedAt && (
                        <p className="text-xs text-muted-foreground">
                          Atualizado em: {new Date((template.updatedAt as any).seconds * 1000).toLocaleDateString()}
                        </p>
                      )}
                    </CardContent>
                    <CardFooter className="flex-col space-y-2 pt-4">
                      <Button 
                        variant="default" 
                        className="w-full" 
                        onClick={() => handleOpenAssignDialog(template)}
                        disabled={isProcessingAction || template.status === 'archived'}
                      >
                         <Users className="mr-2 h-4 w-4" /> Atribuir a Mini Herois
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="w-full" disabled={isProcessingAction}>
                            <MoreHorizontal className="mr-2 h-4 w-4" /> Mais Ações
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>Gerenciar Modelo</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => router.push(`/dashboard/rewards/edit-template/${template.id}`)} disabled={isProcessingAction}>
                            <Edit3 className="mr-2 h-4 w-4" /> Editar Modelo
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setTemplateToDelete(template)} className="text-destructive focus:text-destructive-foreground focus:bg-destructive" disabled={isProcessingAction}>
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir Modelo
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      
      {templateToDelete && (
        <AlertDialog open={!!templateToDelete} onOpenChange={() => setTemplateToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o modelo de recompensa "{templateToDelete.title}"? Esta ação não pode ser desfeita. As recompensas já atribuídas com base neste modelo não serão afetadas, mas você não poderá atribuí-lo novamente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setTemplateToDelete(null)} disabled={isProcessingAction}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90" disabled={isProcessingAction}>
                {isProcessingAction ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Sim, Excluir Modelo
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {templateToAssign && (
        <AssignRewardDialog
          template={templateToAssign}
          isOpen={isAssignDialogOpen}
          onOpenChange={setIsAssignDialogOpen}
          onAssigned={() => {
            toast({ title: "Recompensas Atribuídas!", description: "As instâncias da recompensa foram criadas para as crianças selecionadas."});
            // Poderíamos re-fetch ou atualizar a contagem de atribuições se exibíssemos isso nos cards.
          }}
        />
      )}
    </div>
  );
}

