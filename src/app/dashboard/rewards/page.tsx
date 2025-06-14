
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
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Gift, PlusCircle, Star as StarIcon, PackageSearch, Loader2, MoreHorizontal, Edit3, Trash2, PackagePlus, Sparkles, ArrowRight, Users, Filter, Search, Tag, Coins } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { getRewardTemplatesByOwnerOrFamily, deleteRewardTemplate, getChildProfilesForAttribution, getChildRewardInstancesForContext } from '@/lib/firebase/firestore';
import type { RewardTemplate, RewardCategoryDetails, RewardCategory, PredefinedRewardGroup, ChildProfile, ChildRewardInstance } from '@/lib/types';
import { rewardCategories } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { predefinedRewardGroups, type PredefinedRewardIdea } from '@/lib/predefined-reward-ideas';
import { AssignRewardDialog } from '@/components/dashboard/rewards/AssignRewardDialog';

const starCostFilterOptions = [
  { value: 'all', label: 'Qualquer Custo' },
  { value: '0-10', label: 'Até 10 estrelas' },
  { value: '11-50', label: '11 - 50 estrelas' },
  { value: '51-100', label: '51 - 100 estrelas' },
  { value: '101+', label: 'Mais de 100 estrelas' },
];


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
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('active'); 
  const [categoryFilter, setCategoryFilter] = useState<string>('all'); 
  const [starsCostFilter, setStarsCostFilter] = useState<string>('all'); 
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [selectedChildIdForFilter, setSelectedChildIdForFilter] = useState<string>('all');
  const [eligibleChildrenForFilter, setEligibleChildrenForFilter] = useState<ChildProfile[]>([]);
  const [childRewardInstancesInContext, setChildRewardInstancesInContext] = useState<ChildRewardInstance[]>([]);
  const [isLoadingFilterData, setIsLoadingFilterData] = useState(false);


  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      setIsLoadingFilterData(false);
      return;
    }

    const fetchAllData = async () => {
      setIsLoading(true);
      setIsLoadingFilterData(true);
      setError(null);
      try {
        const familyIdToQuery = currentContext === 'my-space' ? null : currentContext;
        
        const [fetchedTemplates, fetchedChildren, fetchedInstances] = await Promise.all([
          getRewardTemplatesByOwnerOrFamily(user.uid, familyIdToQuery),
          getChildProfilesForAttribution(user.uid, currentContext),
          getChildRewardInstancesForContext(user.uid, familyIdToQuery)
        ]);

        setRewardTemplates(fetchedTemplates);
        setEligibleChildrenForFilter(fetchedChildren);
        setChildRewardInstancesInContext(fetchedInstances);

      } catch (err) {
        console.error("Error fetching data for rewards page:", err);
        setError("Não foi possível carregar os dados. Tente atualizar a página.");
        toast({
          title: "Erro ao Carregar Dados",
          description: "Houve um problema ao buscar os dados. Verifique sua conexão ou tente mais tarde.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
        setIsLoadingFilterData(false);
      }
    };

    fetchAllData();
  }, [user, currentContext, toast]);

  const getCategoryDetails = (categoryId: RewardTemplate['category']): RewardCategoryDetails | undefined => {
    return rewardCategories.find(cat => cat.id === categoryId);
  };

  const currentContextName = useMemo(() => {
    if (currentContext === 'my-space') return "Seu Espaço Pessoal";
    return availableContexts.find(f => f.id === currentContext)?.name || `Família ${currentContext}`;
  }, [availableContexts, currentContext]);

  const templatesDescription = `Catálogo de itens para recompensa em ${currentContextName}. Crie recompensas que podem ser atribuídas aos seus Mini Herois.`;

  const handleDeleteConfirm = async () => {
    if (!templateToDelete) return;
    setIsProcessingAction(true);
    try {
      await deleteRewardTemplate(templateToDelete.id);
      setRewardTemplates(prev => prev.filter(rt => rt.id !== templateToDelete.id));
      toast({ title: "Recompensa Excluída do Catálogo!", description: `A recompensa "${templateToDelete.title}" foi removida do catálogo.` });
    } catch (error)
    {
      console.error("Error deleting reward template:", error);
      toast({ title: "Erro ao Excluir Recompensa", description: "Não foi possível remover a recompensa do catálogo.", variant: "destructive" });
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
    let tempTemplates = rewardTemplates;

    if (statusFilter !== 'all') {
      tempTemplates = tempTemplates.filter(template => template.status === statusFilter);
    }
    if (categoryFilter !== 'all') {
      tempTemplates = tempTemplates.filter(template => template.category === categoryFilter);
    }
    if (starsCostFilter !== 'all') {
      tempTemplates = tempTemplates.filter(template => {
        const cost = template.starsCost;
        if (starsCostFilter === '0-10') return cost >= 0 && cost <= 10;
        if (starsCostFilter === '11-50') return cost >= 11 && cost <= 50;
        if (starsCostFilter === '51-100') return cost >= 51 && cost <= 100;
        if (starsCostFilter === '101+') return cost >= 101;
        return true; 
      });
    }
    if (searchFilter.trim() !== '') {
      const lowercasedSearch = searchFilter.toLowerCase();
      tempTemplates = tempTemplates.filter(template =>
        template.title.toLowerCase().includes(lowercasedSearch) ||
        (template.description && template.description.toLowerCase().includes(lowercasedSearch))
      );
    }
    if (selectedChildIdForFilter !== 'all') {
      const assignedTemplateIds = childRewardInstancesInContext
        .filter(instance => instance.childId === selectedChildIdForFilter)
        .map(instance => instance.templateId);
      const uniqueAssignedTemplateIds = [...new Set(assignedTemplateIds)];
      tempTemplates = tempTemplates.filter(template => uniqueAssignedTemplateIds.includes(template.id));
    }

    return tempTemplates;
  }, [rewardTemplates, statusFilter, categoryFilter, starsCostFilter, searchFilter, selectedChildIdForFilter, childRewardInstancesInContext]);


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

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="user-rewards-accordion" className="rounded-lg border bg-card text-card-foreground shadow-md">
          <AccordionTrigger className="p-6 hover:no-underline w-full group">
            <div className="flex flex-1 items-center justify-between">
              <div className="text-left">
                <CardTitle className="text-2xl font-headline">Recompensas do Catálogo</CardTitle>
                <CardDescription className="mt-1">Abaixo estão as recompensas que você já adicionou ao catálogo de <span className="font-semibold text-primary">{currentContextName}</span>.</CardDescription>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="p-6 pt-0">
            
            <Accordion type="single" collapsible className="w-full mb-6 mt-4">
              <AccordionItem value="filters-accordion-item" className="border rounded-lg bg-muted/30 shadow-sm overflow-hidden">
                <AccordionTrigger className="w-full p-4 text-left hover:no-underline group">
                  <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Filtrar Recompensas:</h3>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-2 border-t border-border/30">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                     <div>
                      <Label htmlFor="child-filter" className="text-sm font-medium text-muted-foreground mb-1 block">Por Mini Herois:</Label>
                      <Select 
                        value={selectedChildIdForFilter} 
                        onValueChange={setSelectedChildIdForFilter}
                        disabled={isLoadingFilterData || eligibleChildrenForFilter.length === 0}
                      >
                        <SelectTrigger id="child-filter" className="w-full">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <SelectValue placeholder={isLoadingFilterData ? "Carregando crianças..." : "Selecione um Mini Heroi..."} />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Qualquer Mini Heroi</SelectItem>
                          {eligibleChildrenForFilter.map(child => (
                            <SelectItem key={child.id} value={child.id}>Atribuídas a {child.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                       {isLoadingFilterData && <p className="text-xs text-muted-foreground mt-1">Carregando lista de crianças...</p>}
                       {!isLoadingFilterData && eligibleChildrenForFilter.length === 0 && <p className="text-xs text-muted-foreground mt-1">Nenhuma criança no contexto atual.</p>}
                    </div>
                    <div>
                      <Label htmlFor="category-filter" className="text-sm font-medium text-muted-foreground mb-1 block">Por Categoria:</Label>
                      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger id="category-filter" className="w-full">
                          <div className="flex items-center gap-2">
                            <Tag className="h-4 w-4 text-muted-foreground" />
                            <SelectValue placeholder="Selecione uma categoria..." />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas as Categorias</SelectItem>
                          {rewardCategories.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="stars-cost-filter" className="text-sm font-medium text-muted-foreground mb-1 block">Por Custo (Estrelas):</Label>
                      <Select value={starsCostFilter} onValueChange={setStarsCostFilter}>
                        <SelectTrigger id="stars-cost-filter" className="w-full">
                         <div className="flex items-center gap-2">
                            <Coins className="h-4 w-4 text-muted-foreground" />
                            <SelectValue placeholder="Selecione o custo..." />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          {starCostFilterOptions.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                     <div>
                      <Label htmlFor="status-filter" className="text-sm font-medium text-muted-foreground mb-1 block">Por Status:</Label>
                      <RadioGroup
                        id="status-filter"
                        value={statusFilter}
                        onValueChange={(value) => setStatusFilter(value as 'all' | 'active' | 'archived')}
                        className="flex flex-wrap gap-x-4 gap-y-2 pt-2" 
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="all" id="filter-all-status" />
                          <Label htmlFor="filter-all-status" className="cursor-pointer hover:text-primary text-sm">Todas</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="active" id="filter-active" />
                          <Label htmlFor="filter-active" className="cursor-pointer hover:text-primary text-sm">Ativas</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="archived" id="filter-archived" />
                          <Label htmlFor="filter-archived" className="cursor-pointer hover:text-primary text-sm">Arquivadas</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    <div>
                      <Label htmlFor="search-filter" className="text-sm font-medium text-muted-foreground mb-1 block">Buscar por Texto:</Label>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="search-filter"
                          type="search"
                          placeholder="Título, descrição..."
                          value={searchFilter}
                          onChange={(e) => setSearchFilter(e.target.value)}
                          className="w-full pl-8"
                        />
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {isLoading ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="ml-3 text-muted-foreground">Carregando recompensas...</p>
              </div>
            ) : error ? (
              <p className="text-destructive text-center py-10">{error}</p>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg mt-6">
                <PackageSearch className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg text-muted-foreground">Nenhuma recompensa encontrada com os filtros atuais.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Tente ajustar os filtros ou{" "}
                  <Link href="/dashboard/rewards/new" className="text-primary hover:underline">crie uma nova recompensa</Link>.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                {filteredTemplates.map((template) => {
                  const categoryDetails = getCategoryDetails(template.category);
                  const CategoryIconComponent = categoryDetails?.icon;
                  return (
                    <Card key={template.id} className="shadow-md hover:shadow-lg transition-shadow flex flex-col bg-card">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-xl">{template.title}</CardTitle>
                          <Badge variant={getStatusBadgeVariant(template.status)} className="capitalize">
                              {template.status === 'active' ? 'Ativa' : 'Arquivada'}
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
                            <DropdownMenuLabel>Gerenciar Recompensa</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => router.push(`/dashboard/rewards/edit-template/${template.id}`)} disabled={isProcessingAction}>
                              <Edit3 className="mr-2 h-4 w-4" /> Editar Recompensa
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setTemplateToDelete(template)} className="text-destructive focus:text-destructive-foreground focus:bg-destructive" disabled={isProcessingAction}>
                              <Trash2 className="mr-2 h-4 w-4" /> Excluir Recompensa
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="predefined-rewards-accordion" className="rounded-lg border bg-card text-card-foreground shadow-lg">
          <AccordionTrigger className="p-6 hover:no-underline w-full group">
            <div className="flex flex-1 items-center justify-between">
                <div className="text-left">
                    <CardTitle className="text-2xl font-headline flex items-center">
                        <Sparkles className="mr-3 h-7 w-7 text-accent" />
                        Inspire-se: Ideias de Recompensas
                    </CardTitle>
                    <CardDescription className="mt-1">
                        Não sabe por onde começar? Use estas ideias como base para criar suas recompensas!
                    </CardDescription>
                </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="p-6 pt-0">
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
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      
      {templateToDelete && (
        <AlertDialog open={!!templateToDelete} onOpenChange={() => setTemplateToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir a recompensa "{templateToDelete.title}" do catálogo? As recompensas já atribuídas com base neste item do catálogo não serão afetadas, mas você não poderá usá-la para novas atribuições.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setTemplateToDelete(null)} disabled={isProcessingAction}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90" disabled={isProcessingAction}>
                {isProcessingAction ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Sim, Excluir Recompensa
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
            if (user) {
              const familyIdToQuery = currentContext === 'my-space' ? null : currentContext;
              setIsLoadingFilterData(true);
              getChildRewardInstancesForContext(user.uid, familyIdToQuery)
                .then(setChildRewardInstancesInContext)
                .catch(err => console.error("Error refetching instances after assignment:", err))
                .finally(() => setIsLoadingFilterData(false));
            }
          }}
        />
      )}
    </div>
  );
}

