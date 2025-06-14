
"use client";

import React, { useEffect, useState, useMemo } from 'react';
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
import { Gift, PlusCircle, Star as StarIcon, PackageSearch, Loader2, Tag, Users, MoreHorizontal, Edit3, Trash2, PackagePlus, ExternalLink, ListChecks } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { getRewardTemplatesByOwnerOrFamily, deleteRewardTemplate } from '@/lib/firebase/firestore';
import type { RewardTemplate, RewardCategoryDetails } from '@/lib/types';
import { rewardCategories } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';

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

  const templatesDescription = `Catálogo de modelos de recompensa para ${currentContextName}.`;

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
      case 'archived': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline flex items-center">
            <PackagePlus className="mr-3 h-8 w-8 text-primary" />
            Catálogo de Recompensas
          </CardTitle>
          <CardDescription>
            {templatesDescription} Crie modelos que podem ser atribuídos aos seus Mini Herois.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/dashboard/rewards/new">
            <Button className="w-full md:w-auto bg-accent text-accent-foreground hover:bg-accent/90">
              <PlusCircle className="mr-2 h-5 w-5" /> Criar Novo Modelo de Recompensa
            </Button>
          </Link>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-3 text-muted-foreground">Carregando modelos de recompensa...</p>
        </div>
      ) : error ? (
        <p className="text-destructive text-center py-10">{error}</p>
      ) : rewardTemplates.length === 0 ? (
        <Card className="text-center py-10">
          <CardContent>
            <PackageSearch className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">Nenhum modelo de recompensa encontrado neste catálogo.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Crie seu primeiro modelo para começar a atribuir recompensas!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rewardTemplates.map((template) => {
            const categoryDetails = getCategoryDetails(template.category);
            const CategoryIconComponent = categoryDetails?.icon;
            return (
              <Card key={template.id} className="shadow-md hover:shadow-lg transition-shadow flex flex-col">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl">{template.title}</CardTitle>
                    <Badge variant={getStatusBadgeVariant(template.status)} className="capitalize">
                        {template.status === 'active' ? 'Ativo' : 'Arquivado'}
                    </Badge>
                  </div>
                  {template.description && (
                    <CardDescription className="text-sm pt-1">{template.description}</CardDescription>
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
                    <Tag className="h-5 w-5 mr-1.5 text-gray-500" />
                    Tipo: {template.isMaterial ? "Material" : "Não Material"}
                  </div>
                  {template.updatedAt && (
                    <p className="text-xs text-muted-foreground">
                      Atualizado em: {new Date((template.updatedAt as any).seconds * 1000).toLocaleDateString()}
                    </p>
                  )}
                </CardContent>
                <CardFooter className="flex-col space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => toast({ title: "Funcionalidade em Breve", description: "Atribuir este modelo a Mini Herois."})}
                    disabled={isProcessingAction}
                  >
                    <ListChecks className="mr-2 h-4 w-4" /> Atribuir a Mini Herois
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
                      {/* Futuramente: Arquivar/Desarquivar */}
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
      
      {templateToDelete && (
        <AlertDialog open={!!templateToDelete} onOpenChange={() => setTemplateToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o modelo de recompensa "{templateToDelete.title}"? Esta ação não pode ser desfeita e pode afetar recompensas já atribuídas se não houver verificação adicional (a ser implementada).
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
    </div>
  );
}
