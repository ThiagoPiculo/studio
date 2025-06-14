
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getChildProfileById, regenerateChildAccessCode, deleteChildProfile, updateChildProfile, getChildRewardInstancesByChild, updateChildRewardInstance, deleteChildRewardInstance } from '@/lib/firebase/firestore';
import type { ChildProfile, ChildRewardInstance, RewardCategoryDetails } from '@/lib/types';
import { rewardCategories } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, User, ListChecks, Star as StarIcon, Edit3, ShieldCheck, Loader2, Trash2, RefreshCw, Gift, PackageSearch, EllipsisVertical, CheckCircle, XCircle, ExternalLink, MoreHorizontal } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { EditChildProfileForm } from '@/components/dashboard/EditChildProfileForm';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { serverTimestamp } from 'firebase/firestore';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";


export default function ManageChildPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const childId = params.childId as string;

  const [child, setChild] = useState<ChildProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRegeneratingCode, setIsRegeneratingCode] = useState(false);

  const [childRewards, setChildRewards] = useState<ChildRewardInstance[]>([]);
  const [isLoadingRewards, setIsLoadingRewards] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [instanceToManage, setInstanceToManage] = useState<ChildRewardInstance | null>(null);
  const [isRedeemConfirmOpen, setIsRedeemConfirmOpen] = useState(false);
  const [isDeleteInstanceConfirmOpen, setIsDeleteInstanceConfirmOpen] = useState(false);
  const [isProcessingRewardAction, setIsProcessingRewardAction] = useState(false);
  const [instanceStatusFilter, setInstanceStatusFilter] = useState<'all' | 'active' | 'redeemed' | 'disabled'>('all');


  useEffect(() => {
    if (childId) {
      setIsLoading(true);
      getChildProfileById(childId)
        .then((profile) => {
          if (profile) {
            setChild(profile);
          } else {
            toast({ title: "Perfil Não Encontrado", description: "Não encontramos um perfil para este Mini Herois. Verifique o link ou volte ao painel.", variant: "destructive" });
            router.push('/dashboard');
          }
        })
        .catch((error) => {
          console.error("Error fetching child profile:", error);
          toast({ title: "Erro ao Carregar", description: "Não foi possível carregar os dados da criança. Verifique sua conexão ou tente recarregar a página.", variant: "destructive" });
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
        router.push('/dashboard');
    }
  }, [childId, router, toast]);

  useEffect(() => {
    if (activeTab === 'rewards' && childId) {
      setIsLoadingRewards(true);
      getChildRewardInstancesByChild(childId)
        .then(rewards => {
          setChildRewards(rewards.sort((a, b) => {
            if (a.status === 'active' && b.status !== 'active') return -1;
            if (a.status !== 'active' && b.status === 'active') return 1;
            if (a.status === 'disabled' && b.status === 'redeemed') return -1; // Inativas antes de resgatadas
            if (a.status === 'redeemed' && b.status === 'disabled') return 1; // Resgatadas depois de inativas
            return (b.assignedAt as any).seconds - (a.assignedAt as any).seconds; 
          }));
        })
        .catch(error => {
          console.error("Error fetching child rewards:", error);
          toast({ title: "Erro ao Carregar Recompensas", description: "Não foi possível buscar as recompensas atribuídas.", variant: "destructive" });
        })
        .finally(() => {
          setIsLoadingRewards(false);
        });
    }
  }, [activeTab, childId, toast]);
  
  const handleProfileUpdate = (updatedProfile: Partial<ChildProfile>) => {
    setChild(prev => prev ? { ...prev, ...updatedProfile } : null);
    toast({ title: "Perfil Atualizado!", description: "As informações da criança foram atualizadas com sucesso." });
  };

  const handleRegenerateAccessCode = async () => {
    if (!child) return;
    setIsRegeneratingCode(true);
    try {
      const newAccessCode = await regenerateChildAccessCode(child.id);
      setChild(prev => prev ? { ...prev, accessCode: newAccessCode } : null);
      toast({
        title: "Código de Acesso Regenerado!",
        description: `O novo código de acesso para ${child.name} é: ${newAccessCode}. Guarde bem este código!`,
        duration: 10000, 
      });
    } catch (error) {
      console.error("Error regenerating access code:", error);
      toast({ title: "Erro ao Regenerar Código", description: "Não foi possível regenerar o código de acesso. Por favor, tente novamente mais tarde.", variant: "destructive" });
    } finally {
      setIsRegeneratingCode(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!child) return;
    setIsDeleting(true);
    try {
      await deleteChildProfile(child.id);
      toast({ title: "Perfil Excluído", description: `O perfil de ${child.name} foi removido(a) do sistema com sucesso.` });
      router.push('/dashboard');
    } catch (error) {
      console.error("Error deleting child profile:", error);
      toast({ title: "Erro ao Excluir", description: "Não foi possível excluir o perfil da criança. Por favor, tente novamente mais tarde.", variant: "destructive" });
      setIsDeleting(false);
    }
  };

  const getInitials = (name?: string | null) => {
    if (!name) return "MH"; 
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const getCategoryDetails = (categoryId: ChildRewardInstance['category']): RewardCategoryDetails | undefined => {
    return rewardCategories.find(cat => cat.id === categoryId);
  };

  const getRewardStatusBadgeVariant = (status: ChildRewardInstance['status']): "default" | "secondary" | "outline" | "destructive" => {
    switch (status) {
      case 'active': return 'default'; 
      case 'redeemed': return 'secondary'; 
      case 'disabled': return 'outline'; 
      default: return 'outline';
    }
  };
  
  const getRewardStatusText = (status: ChildRewardInstance['status']): string => {
    switch (status) {
      case 'active': return 'Ativa';
      case 'redeemed': return 'Resgatada';
      case 'disabled': return `Inativa para ${child?.name || 'esta criança'}`;
      default: return 'Desconhecido';
    }
  };

  const handleMarkAsRedeemed = async () => {
    if (!instanceToManage || !child) return;
    setIsProcessingRewardAction(true);
    try {
      const currentChildProfile = await getChildProfileById(child.id); 
      if (!currentChildProfile) throw new Error("Perfil da criança não encontrado para verificação de estrelas.");

      if (currentChildProfile.stars < instanceToManage.starsCost) {
        toast({ title: "Estrelas Insuficientes", description: `${child.name} não possui estrelas suficientes para resgatar "${instanceToManage.title}".`, variant: "destructive", duration: 7000 });
        setIsProcessingRewardAction(false);
        setIsRedeemConfirmOpen(false);
        return;
      }

      await updateChildProfile(child.id, { stars: currentChildProfile.stars - instanceToManage.starsCost });
      await updateChildRewardInstance(instanceToManage.id, { status: 'redeemed', isRedeemed: true, redeemedAt: serverTimestamp() as any });
      
      setChildRewards(prev => prev.map(r => r.id === instanceToManage.id ? {...r, status: 'redeemed', isRedeemed: true, redeemedAt: new Date() as any } : r).sort((a, b) => {
            if (a.status === 'active' && b.status !== 'active') return -1;
            if (a.status !== 'active' && b.status === 'active') return 1;
            if (a.status === 'disabled' && b.status === 'redeemed') return -1;
            if (a.status === 'redeemed' && b.status === 'disabled') return 1;
            return (b.assignedAt as any).seconds - (a.assignedAt as any).seconds; 
          }));
      setChild(prev => prev ? { ...prev, stars: currentChildProfile.stars - instanceToManage.starsCost } : null);
      toast({ title: "Recompensa Resgatada!", description: `"${instanceToManage.title}" foi marcada como resgatada por ${child.name}.` });
    } catch (error) {
      console.error("Error marking reward as redeemed:", error);
      toast({ title: "Erro ao Resgatar", description: "Não foi possível marcar a recompensa como resgatada.", variant: "destructive" });
    } finally {
      setIsProcessingRewardAction(false);
      setIsRedeemConfirmOpen(false);
      setInstanceToManage(null);
    }
  };

  const handleToggleInstanceStatus = async (instance: ChildRewardInstance, newStatus: 'active' | 'disabled') => {
    setIsProcessingRewardAction(true);
    try {
      await updateChildRewardInstance(instance.id, { status: newStatus });
      setChildRewards(prev => prev.map(r => r.id === instance.id ? {...r, status: newStatus } : r).sort((a, b) => {
            if (a.status === 'active' && b.status !== 'active') return -1;
            if (a.status !== 'active' && b.status === 'active') return 1;
            if (a.status === 'disabled' && b.status === 'redeemed') return -1;
            if (a.status === 'redeemed' && b.status === 'disabled') return 1;
            return (b.assignedAt as any).seconds - (a.assignedAt as any).seconds; 
          }));
      toast({ 
        title: "Status da Recompensa Atualizado", 
        description: `A recompensa "${instance.title}" agora está ${newStatus === 'active' ? 'ativa' : 'inativa'} para ${child?.name}.` 
      });
    } catch (error) {
      console.error(`Error toggling reward instance status:`, error);
      toast({ title: "Erro ao Atualizar Status", description: "Não foi possível alterar o status da recompensa.", variant: "destructive" });
    } finally {
      setIsProcessingRewardAction(false);
    }
  };
  
  const handleDeleteInstance = async () => {
    if (!instanceToManage) return;
    setIsProcessingRewardAction(true);
    try {
      await deleteChildRewardInstance(instanceToManage.id);
      setChildRewards(prev => prev.filter(r => r.id !== instanceToManage.id));
      toast({ title: "Atribuição Removida", description: `A recompensa "${instanceToManage.title}" foi removida de ${child?.name}.` });
    } catch (error) {
      console.error("Error deleting reward instance:", error);
      toast({ title: "Erro ao Remover Atribuição", description: "Não foi possível remover a recompensa.", variant: "destructive" });
    } finally {
      setIsProcessingRewardAction(false);
      setIsDeleteInstanceConfirmOpen(false);
      setInstanceToManage(null);
    }
  };

  const filteredChildRewards = useMemo(() => {
    if (instanceStatusFilter === 'all') {
      return childRewards;
    }
    return childRewards.filter(reward => reward.status === instanceStatusFilter);
  }, [childRewards, instanceStatusFilter]);

  const getStatusFilterDisplayName = (filterValue: typeof instanceStatusFilter) => {
    switch (filterValue) {
      case 'active': return 'Ativas';
      case 'redeemed': return 'Resgatadas';
      case 'disabled': return 'Inativas';
      default: return 'Todas';
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Carregando dados do Mini Herois...</p>
      </div>
    );
  }

  if (!child) {
     return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-200px)]">
        <p className="text-lg text-destructive">Mini Herois não encontrado.</p>
        <Button onClick={() => router.push('/dashboard')} className="mt-4">
            Voltar ao Painel
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => router.back()} className="shadow-sm">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
      </div>

      <Card className="shadow-xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/20 via-background to-accent/10 p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <Avatar className="h-28 w-28 border-4 border-primary text-5xl shadow-md">
              {child.avatar ? <AvatarImage src={child.avatar} alt={child.name} /> : null}
              <AvatarFallback className="bg-accent text-accent-foreground font-bold">
                {getInitials(child.name)}
              </AvatarFallback>
            </Avatar>
            <div className="text-center sm:text-left flex-grow">
              <CardTitle className="text-4xl font-headline text-primary">{child.name}</CardTitle>
              <CardDescription className="text-base mt-1">
                Idade: {child.age} Anos
              </CardDescription>
               <div className="mt-2 flex items-center justify-center sm:justify-start space-x-4 text-sm">
                <span className="font-semibold">Nível: {child.level}</span>
                <span className="font-semibold text-accent flex items-center"><StarIcon className="inline-block h-4 w-4 mr-1 fill-accent" /> {child.stars}</span>
                <span className="font-semibold">XP: {child.xp}</span>
              </div>
              <div className="mt-3 text-center sm:text-left">
                <span className="text-sm text-muted-foreground align-middle">
                  <ShieldCheck className="mr-1 h-4 w-4 inline-block text-primary relative -top-px" /> Código de Acesso:
                </span>
                <span className="ml-2 text-xl font-bold text-accent tracking-wider bg-accent/10 px-2 py-1 rounded-md shadow-sm">
                  {child.accessCode}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-2 bg-muted/50 p-1 rounded-lg">
          <TabsTrigger value="overview" className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"><User className="mr-2 h-4 w-4" />Visão Geral</TabsTrigger>
          <TabsTrigger value="tasks" className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"><ListChecks className="mr-2 h-4 w-4" />Tarefas</TabsTrigger>
          <TabsTrigger value="rewards" className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"><StarIcon className="mr-2 h-4 w-4" />Recompensas</TabsTrigger>
          <TabsTrigger value="edit" className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"><Edit3 className="mr-2 h-4 w-4" />Editar Perfil</TabsTrigger>
        </TabsList>
        
        <div className="mt-4">
          <TabsContent value="overview">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Visão Geral de {child.name}</CardTitle>
                <CardDescription>Resumo das atividades e progresso.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>Aqui você verá um resumo das atividades recentes, tarefas pendentes e recompensas disponíveis para {child.name}.</p>
                <p>Mais gráficos e estatísticas de progresso aparecerão aqui em breve!</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-card border-border hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg">Tarefas Recentes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">Nenhuma tarefa recente. (Funcionalidade a ser implementada)</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card border-border hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg">Recompensas Resgatadas Recentemente</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">Nenhuma recompensa resgatada recentemente. (Funcionalidade a ser implementada)</p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="tasks">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Tarefas de {child.name}</CardTitle>
                <CardDescription>Gerencie e atribua novas tarefas para ajudar {child.name} a crescer.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">A funcionalidade de gerenciamento detalhado de tarefas está em desenvolvimento.</p>
                <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                  <ListChecks className="mr-2 h-4 w-4" /> Adicionar Nova Tarefa
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="rewards">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Recompensas Atribuídas a {child.name}</CardTitle>
                <CardDescription>Veja e gerencie as recompensas disponíveis para {child.name}.</CardDescription>
                <div className="pt-4">
                  <Label className="text-sm font-medium text-muted-foreground">Filtrar por Status da Recompensa:</Label>
                  <RadioGroup
                    value={instanceStatusFilter}
                    onValueChange={(value) => setInstanceStatusFilter(value as 'all' | 'active' | 'redeemed' | 'disabled')}
                    className="flex flex-wrap gap-x-4 gap-y-2 pt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="all" id={`instance-filter-all-${childId}`} />
                      <Label htmlFor={`instance-filter-all-${childId}`} className="cursor-pointer hover:text-primary text-sm font-normal">Todas</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="active" id={`instance-filter-active-${childId}`} />
                      <Label htmlFor={`instance-filter-active-${childId}`} className="cursor-pointer hover:text-primary text-sm font-normal">Ativas</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="redeemed" id={`instance-filter-redeemed-${childId}`} />
                      <Label htmlFor={`instance-filter-redeemed-${childId}`} className="cursor-pointer hover:text-primary text-sm font-normal">Resgatadas</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="disabled" id={`instance-filter-disabled-${childId}`} />
                      <Label htmlFor={`instance-filter-disabled-${childId}`} className="cursor-pointer hover:text-primary text-sm font-normal">Inativas</Label>
                    </div>
                  </RadioGroup>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={() => router.push('/dashboard/rewards')} variant="outline" className="mb-4 shadow-sm">
                  <ExternalLink className="mr-2 h-4 w-4" /> Ir para o Catálogo (Atribuir Novas)
                </Button>
                {isLoadingRewards ? (
                  <div className="flex justify-center items-center py-10">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="ml-3 text-muted-foreground">Carregando recompensas...</p>
                  </div>
                ) : filteredChildRewards.length === 0 ? (
                  <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg">
                    <PackageSearch className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                    <p className="text-lg text-muted-foreground">
                      {childRewards.length === 0 
                        ? `${child.name} ainda não tem recompensas atribuídas.`
                        : `Nenhuma recompensa encontrada com o status "${getStatusFilterDisplayName(instanceStatusFilter)}".`
                      }
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {childRewards.length === 0 
                        ? 'Vá ao catálogo para atribuir algumas!'
                        : 'Tente um filtro diferente ou verifique o catálogo.'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredChildRewards.map((instance) => {
                      const categoryDetails = getCategoryDetails(instance.category);
                      const CategoryIconComponent = categoryDetails?.icon;
                      return (
                        <Card key={instance.id} className="shadow-sm hover:shadow-md transition-shadow flex flex-col">
                          <CardHeader>
                            <div className="flex justify-between items-start">
                              <CardTitle className="text-lg">{instance.title}</CardTitle>
                              <Badge variant={getRewardStatusBadgeVariant(instance.status)} className="capitalize text-xs">
                                {getRewardStatusText(instance.status)}
                              </Badge>
                            </div>
                            {instance.description && <CardDescription className="text-xs pt-1 line-clamp-2">{instance.description}</CardDescription>}
                          </CardHeader>
                          <CardContent className="space-y-2 flex-grow text-sm">
                            {categoryDetails && (
                              <div className="flex items-center">
                                 <span className={`mr-2 p-1 rounded-full ${categoryDetails.colorClasses.split(' ')[0]}`}>
                                  {CategoryIconComponent && <CategoryIconComponent className={`h-4 w-4 ${categoryDetails.colorClasses.split(' ')[1]}`} />}
                                 </span>
                                <span className={`px-2 py-0.5 rounded-full text-xs border ${categoryDetails.colorClasses}`}>
                                  {categoryDetails.label}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center text-muted-foreground">
                              <StarIcon className="h-4 w-4 mr-1.5 text-yellow-400 fill-yellow-400" />
                              Custo: {instance.starsCost} estrelas
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Atribuída em: {new Date((instance.assignedAt as any).seconds * 1000).toLocaleDateString()}
                            </p>
                            {instance.status === 'redeemed' && instance.redeemedAt && (
                              <p className="text-xs text-green-600 font-medium">
                                Resgatada em: {new Date((instance.redeemedAt as any).seconds * 1000).toLocaleDateString()}
                              </p>
                            )}
                          </CardContent>
                          <CardFooter>
                            {instance.status !== 'redeemed' ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm" className="w-full shadow-sm" disabled={isProcessingRewardAction}>
                                    <MoreHorizontal className="mr-2 h-4 w-4" /> Ações
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                  <DropdownMenuLabel>Gerenciar para {child.name}</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  {instance.status === 'active' && (
                                    <>
                                      <DropdownMenuItem onClick={() => { setInstanceToManage(instance); setIsRedeemConfirmOpen(true); }} disabled={isProcessingRewardAction}>
                                        <CheckCircle className="mr-2 h-4 w-4 text-green-500" /> Marcar como Resgatada
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleToggleInstanceStatus(instance, 'disabled')} disabled={isProcessingRewardAction}>
                                        <XCircle className="mr-2 h-4 w-4 text-orange-500" /> Tornar Inativa para {child.name}
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  {instance.status === 'disabled' && (
                                    <DropdownMenuItem onClick={() => handleToggleInstanceStatus(instance, 'active')} disabled={isProcessingRewardAction}>
                                      <CheckCircle className="mr-2 h-4 w-4 text-green-500" /> Reativar para {child.name}
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => { setInstanceToManage(instance); setIsDeleteInstanceConfirmOpen(true); }} 
                                    className="text-destructive focus:text-destructive-foreground focus:bg-destructive"
                                    disabled={isProcessingRewardAction}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" /> Remover Atribuição
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : (
                              <Button variant="ghost" size="sm" className="w-full text-green-600" disabled>
                                <CheckCircle className="mr-2 h-4 w-4" /> Recompensa Já Resgatada
                              </Button>
                            )}
                          </CardFooter>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="edit">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Editar Perfil de {child.name}</CardTitle>
                <CardDescription>Atualize as informações da criança e configurações.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <EditChildProfileForm child={child} onProfileUpdate={handleProfileUpdate} />
                
                <div className="space-y-3">
                  <Button 
                    variant="outline" 
                    onClick={handleRegenerateAccessCode} 
                    disabled={isRegeneratingCode}
                    className="w-full shadow-sm"
                  >
                    {isRegeneratingCode ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Regenerar Código de Acesso
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full shadow-sm" disabled={isDeleting}>
                        {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        Excluir Perfil de {child.name}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. Isso excluirá permanentemente o perfil de {child.name} e todos os seus dados associados (tarefas, recompensas, progresso).
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteProfile} className="bg-destructive hover:bg-destructive/90">
                          {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          Sim, Excluir Perfil
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      {/* Redeem Confirmation Dialog */}
      {instanceToManage && isRedeemConfirmOpen && child && (
        <AlertDialog open={isRedeemConfirmOpen} onOpenChange={setIsRedeemConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Resgate de Recompensa</AlertDialogTitle>
              <AlertDialogDescription>
                Você tem certeza que deseja marcar a recompensa "{instanceToManage.title}" ({instanceToManage.starsCost} estrelas) como resgatada por {child.name}? Isso deduzirá as estrelas do saldo de {child.name}.
                <br/>
                Saldo atual de estrelas de {child.name}: {child.stars}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsRedeemConfirmOpen(false)} disabled={isProcessingRewardAction}>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleMarkAsRedeemed} 
                className="bg-green-600 hover:bg-green-700" 
                disabled={isProcessingRewardAction || child.stars < instanceToManage.starsCost}
              >
                {isProcessingRewardAction ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                Sim, Marcar como Resgatada
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      
      {/* Delete Instance Confirmation Dialog */}
      {instanceToManage && isDeleteInstanceConfirmOpen && (
         <AlertDialog open={isDeleteInstanceConfirmOpen} onOpenChange={setIsDeleteInstanceConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Remoção da Atribuição</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover a atribuição da recompensa "{instanceToManage.title}" para {child?.name}? Esta ação não pode ser desfeita para esta criança específica.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsDeleteInstanceConfirmOpen(false)} disabled={isProcessingRewardAction}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteInstance} className="bg-destructive hover:bg-destructive/90" disabled={isProcessingRewardAction}>
                {isProcessingRewardAction ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Sim, Remover Atribuição
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

    </div>
  );
}
