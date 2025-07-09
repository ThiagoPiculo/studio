
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
import { Gift, PlusCircle, Star as StarIcon, PackageSearch, Loader2, MoreHorizontal, Edit3, Trash2, Sparkles, ArrowRight, Users, Filter, Search, Tag, Coins, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { getRewardTemplatesByOwnerOrFamily, deleteRewardTemplate, getChildProfilesForAttribution, getChildRewardInstancesForContext } from '@/lib/firebase/firestore';
import type { RewardTemplate, RewardCategoryDetails, RewardCategory, PredefinedRewardGroup, ChildProfile, ChildRewardInstance } from '@/lib/types';
import { rewardCategories } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { AssignRewardDialog } from '@/components/dashboard/rewards/AssignRewardDialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from '@/components/ui/scroll-area';

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
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [rewardInstances, setRewardInstances] = useState<ChildRewardInstance[]>([]);
  const [isLoadingFilterData, setIsLoadingFilterData] = useState(false);
  const [isAboutDialogOpen, setIsAboutDialogOpen] = useState(false);


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
        setChildren(fetchedChildren);
        setRewardInstances(fetchedInstances);

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

  const childrenMap = useMemo(() => {
    return new Map(children.map(child => [child.id, child]));
  }, [children]);

  const assignmentsByTemplate = useMemo(() => {
    const assignments = new Map<string, ChildProfile[]>();
    const activeInstances = rewardInstances.filter(i => i.status === 'active');
    activeInstances.forEach(instance => {
        const child = childrenMap.get(instance.childId);
        if (child) {
            const existing = assignments.get(instance.templateId) || [];
            if (!existing.find(c => c.id === child.id)) {
                assignments.set(instance.templateId, [...existing, child]);
            }
        }
    });
    return assignments;
  }, [rewardInstances, childrenMap]);

  const getInitials = (name?: string | null) => {
    if (!name) return "MH"; 
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const getCategoryDetails = (categoryId: RewardTemplate['category']): RewardCategoryDetails | undefined => {
    return rewardCategories.find(cat => cat.id === categoryId);
  };

  const currentContextName = useMemo(() => {
    if (currentContext === 'my-space') return "Seu Espaço Pessoal";
    return availableContexts.find(f => f.id === currentContext)?.name || `Família ${currentContext}`;
  }, [availableContexts, currentContext]);

  const templatesDescription = `Mural de recompensas para ${currentContextName}. Crie e gerencie itens que podem ser atribuídos aos seus Mini Herois.`;

  const handleDeleteConfirm = async () => {
    if (!templateToDelete) return;
    setIsProcessingAction(true);
    try {
      await deleteRewardTemplate(templateToDelete.id);
      setRewardTemplates(prev => prev.filter(rt => rt.id !== templateToDelete.id));
      toast({ title: "Tesouro Arquivado!", description: `A recompensa "${templateToDelete.title}" foi removida do catálogo de prêmios.` });
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

  const handleOpenAssignDialog = (template: RewardTemplate) => {
    setTemplateToAssign(template);
    setIsAssignDialogOpen(true);
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
      const assignedTemplateIds = rewardInstances
        .filter(instance => instance.childId === selectedChildIdForFilter)
        .map(instance => instance.templateId);
      const uniqueAssignedTemplateIds = [...new Set(assignedTemplateIds)];
      tempTemplates = tempTemplates.filter(template => uniqueAssignedTemplateIds.includes(template.id));
    }

    return tempTemplates;
  }, [rewardTemplates, statusFilter, categoryFilter, starsCostFilter, searchFilter, selectedChildIdForFilter, rewardInstances]);


  return (
    <div className="space-y-8 pb-10">
      <Dialog open={isAboutDialogOpen} onOpenChange={setIsAboutDialogOpen}>
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div>
                <CardTitle className="text-3xl font-headline flex items-center">
                  <Gift className="mr-3 h-8 w-8 text-primary" />
                  Mural de Recompensas
                </CardTitle>
                <CardDescription>
                  {templatesDescription}
                </CardDescription>
              </div>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto flex-shrink-0">
                  <Info className="mr-2 h-5 w-5" /> Sobre Recompensas
                </Button>
              </DialogTrigger>
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <Link href="/dashboard/rewards/new">
              <Button className="w-full sm:w-auto bg-accent text-accent-foreground hover:bg-accent/90">
                <PlusCircle className="mr-2 h-5 w-5" /> Criar nova recompensa
              </Button>
            </Link>
            <Link href="/dashboard/rewards/ideas">
              <Button variant="secondary" className="w-full sm:w-auto">
                <Sparkles className="mr-2 h-5 w-5" /> Ver Ideias de Recompensas
              </Button>
            </Link>
          </CardContent>
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
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-3 text-sm text-muted-foreground pb-4">
              <p>Pense nelas como a motivação principal para as crianças. O sistema funciona com uma lógica simples e poderosa:</p>
              <p><strong>Esforço Gera Valor:</strong> Ao completar as missões do dia a dia (as tarefas), a criança ganha Estrelas (⭐). Essas estrelas são a "moeda" do nosso universo heroico. Elas são a representação visual e tangível do esforço e da responsabilidade da criança.</p>
              <p><strong>Valor Gera Conquistas:</strong> A criança acumula essas estrelas em seu perfil. Com elas, ela pode "comprar" ou "resgatar" as recompensas que você, o responsável, criou e disponibilizou.</p>
              <p className="font-semibold text-foreground">O objetivo das recompensas vai muito além de simplesmente "dar um prêmio". Elas servem para:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong className="text-foreground">Ensinar Causa e Efeito:</strong> A criança aprende de forma concreta que o seu esforço (completar missões) leva a um resultado positivo e desejado (conquistar uma recompensa).</li>
                <li><strong className="text-foreground">Introduzir Educação Financeira:</strong> A dinâmica de "juntar estrelas" para conseguir algo maior ensina, de forma lúdica, os conceitos de economizar, poupar e trabalhar por um objetivo.</li>
                <li><strong className="text-foreground">Fortalecer Laços Familiares:</strong> Muitas das melhores recompensas não são coisas, mas sim experiências. Uma "tarde de jogos em família", "uma hora a mais no parque com o papai" ou "ajudar a fazer o bolo do fim de semana" são recompensas que criam memórias e fortalecem a conexão entre vocês.</li>
                <li><strong className="text-foreground">Dar Autonomia e Poder de Escolha:</strong> Ao permitir que a criança escolha qual recompensa ela quer "comprar" com suas estrelas, você dá a ela um senso de controle e autonomia, o que é muito importante para o seu desenvolvimento.</li>
              </ul>
              <p className="font-semibold text-foreground">O sistema é flexível para você criar recompensas que se encaixem na sua família:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Experiências:</strong> Um piquenique, uma noite de cinema, uma história extra antes de dormir.</li>
                <li><strong>Privilégios:</strong> Escolher o jantar de sexta-feira, ter 30 minutos a mais de videogame.</li>
                <li><strong>Itens Materiais:</strong> Um gibi, um brinquedo pequeno, um livro novo.</li>
              </ul>
              <p className="pt-2">Em resumo, as recompensas são a ferramenta que fecha o ciclo de gamificação: a missão é o desafio, as estrelas são a pontuação, e a recompensa é a conquista que torna toda a jornada divertida e valiosa.</p>
            </div>
          </ScrollArea>
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button variant="outline" className="w-full">Entendido!</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Card>
        <CardHeader>
          <CardTitle>Recompensas do Catálogo</CardTitle>
          <CardDescription>Abaixo estão as recompensas que você já adicionou para o contexto de <span className="font-semibold text-primary">{currentContextName}</span>.</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full mb-6 mt-4">
            <AccordionItem value="filters-accordion-item" className="border rounded-lg bg-muted/30 shadow-sm overflow-hidden">
              <AccordionTrigger className="w-full p-4 text-left hover:no-underline group">
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Filtrar Recompensas</h3>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 pt-2 border-t border-border/30">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                    <Label htmlFor="child-filter" className="text-sm font-medium text-muted-foreground mb-1 block">Por Mini Herois:</Label>
                    <Select 
                      value={selectedChildIdForFilter} 
                      onValueChange={setSelectedChildIdForFilter}
                      disabled={isLoadingFilterData || children.length === 0}
                    >
                      <SelectTrigger id="child-filter" className="w-full">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <SelectValue placeholder={isLoadingFilterData ? "Carregando crianças..." : "Selecione um Mini Heroi..."} />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Qualquer Mini Heroi</SelectItem>
                        {children.map(child => (
                          <SelectItem key={child.id} value={child.id}>Atribuídas a {child.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                      {isLoadingFilterData && <p className="text-xs text-muted-foreground mt-1">Carregando lista de crianças...</p>}
                      {!isLoadingFilterData && children.length === 0 && <p className="text-xs text-muted-foreground mt-1">Nenhuma criança no contexto atual.</p>}
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
                const assignedChildren = assignmentsByTemplate.get(template.id) || [];
                return (
                  <Card key={template.id} className="shadow-md hover:shadow-lg transition-shadow flex flex-col bg-card">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-xl">{template.title}</CardTitle>
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
                      <div className="border-t pt-3 mt-3">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />Atribuído a:</h4>
                                <Badge variant={getStatusBadgeVariant(template.status)} className="capitalize flex-shrink-0">
                                    {template.status === 'active' ? 'Ativa' : 'Arquivada'}
                                </Badge>
                            </div>
                            {assignedChildren.length > 0 ? (
                                <div className="flex items-center space-x-2">
                                    <div className="flex -space-x-2">
                                        {assignedChildren.slice(0, 5).map(child => (
                                            <TooltipProvider key={child.id} delayDuration={100}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Avatar
                                                          className="h-8 w-8 border-2 border-background ring-1 ring-offset-background ring-[var(--ring-color)]"
                                                          style={child.color ? { '--ring-color': child.color } as React.CSSProperties : {}}
                                                        >
                                                            <AvatarImage src={child.avatar} alt={child.name} />
                                                            <AvatarFallback
                                                              className="text-xs"
                                                              style={{ backgroundColor: child.color }}
                                                            >
                                                                {getInitials(child.name)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>{child.name}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        ))}
                                    </div>
                                    {assignedChildren.length > 5 && (
                                        <span className="text-xs font-medium text-muted-foreground">
                                            + {assignedChildren.length - 5}
                                        </span>
                                    )}
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground italic">Nenhum heroi com esta recompensa ativa.</p>
                            )}
                        </div>
                    </CardContent>
                    <CardFooter className="flex items-center gap-2 pt-4">
                      <Button
                        variant="default"
                        className="w-full"
                        onClick={() => handleOpenAssignDialog(template)}
                        disabled={isProcessingAction || template.status === 'archived'}
                      >
                        <Users className="mr-2 h-4 w-4" /> Atribuir
                      </Button>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => router.push(`/dashboard/rewards/edit-template/${template.id}`)}
                              disabled={isProcessingAction}
                              className="flex-shrink-0"
                            >
                              <Edit3 className="h-4 w-4" />
                              <span className="sr-only">Editar Recompensa</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Editar Recompensa</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setTemplateToDelete(template)}
                              disabled={isProcessingAction}
                              className="flex-shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Excluir Recompensa</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Excluir Recompensa</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
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
                .then(setRewardInstances)
                .catch(err => console.error("Error refetching instances after assignment:", err))
                .finally(() => setIsLoadingFilterData(false));
            }
          }}
        />
      )}
    </div>
  );
}
