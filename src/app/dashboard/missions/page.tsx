
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
import { ListChecks, PlusCircle, Star as StarIcon, PackageSearch, Loader2, MoreHorizontal, Edit3, Trash2, Lightbulb, BadgeCheck, Xp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { getMissionTemplatesByOwnerOrFamily, deleteMissionTemplate } from '@/lib/firebase/firestore';
import type { MissionTemplate, MissionCategoryDetails } from '@/lib/types';
import { missionCategories } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';

export default function MissionsHubPage() {
  const { user } = useAuth();
  const { currentContext, availableContexts } = useFamily();
  const { toast } = useToast();
  const router = useRouter();

  const [missionTemplates, setMissionTemplates] = useState<MissionTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<MissionTemplate | null>(null);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    const familyIdToQuery = currentContext === 'my-space' ? null : currentContext;
    getMissionTemplatesByOwnerOrFamily(user.uid, familyIdToQuery)
      .then(setMissionTemplates)
      .catch((err) => {
        console.error("Error fetching mission templates:", err);
        setError("Não foi possível carregar as missões. Tente atualizar a página.");
      })
      .finally(() => setIsLoading(false));
  }, [user, currentContext]);

  const getCategoryDetails = (categoryId: MissionTemplate['category']): MissionCategoryDetails | undefined => {
    return missionCategories.find(cat => cat.id === categoryId);
  };
  
  const currentContextName = useMemo(() => {
    if (currentContext === 'my-space') return "Seu Espaço Pessoal";
    return availableContexts.find(f => f.id === currentContext)?.name || `Família ${currentContext}`;
  }, [availableContexts, currentContext]);

  const templatesDescription = `Catálogo de missões em ${currentContextName}. Crie e gerencie missões para atribuir aos seus Mini Herois.`;

  const handleDeleteConfirm = async () => {
    if (!templateToDelete) return;
    setIsProcessingAction(true);
    try {
      await deleteMissionTemplate(templateToDelete.id);
      setMissionTemplates(prev => prev.filter(rt => rt.id !== templateToDelete.id));
      toast({ title: "Missão Arquivada!", description: `A missão "${templateToDelete.title}" foi removida do catálogo.` });
    } catch (error) {
      console.error("Error deleting mission template:", error);
      toast({ title: "Erro ao Excluir Missão", description: "Não foi possível remover a missão do catálogo.", variant: "destructive" });
    } finally {
      setTemplateToDelete(null);
      setIsProcessingAction(false);
    }
  };

  const getStatusBadgeVariant = (status: MissionTemplate['status']): "default" | "secondary" | "outline" => {
    switch (status) {
      case 'active': return 'default';
      case 'archived': return 'secondary'; 
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline flex items-center">
            <ListChecks className="mr-3 h-8 w-8 text-primary" />
            Central de Missões
          </CardTitle>
          <CardDescription>
            {templatesDescription}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
           <Link href="/dashboard/missions/new">
            <Button className="w-full sm:w-auto bg-accent text-accent-foreground hover:bg-accent/90">
              <PlusCircle className="mr-2 h-5 w-5" /> Criar Nova Missão
            </Button>
          </Link>
          <Link href="/dashboard/missions/ideas">
            <Button variant="outline" className="w-full sm:w-auto">
              <Lightbulb className="mr-2 h-5 w-5" /> Ver Ideias de Missões
            </Button>
          </Link>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Missões do Catálogo</CardTitle>
          <CardDescription>Abaixo estão as missões que você já criou para o contexto atual.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="ml-3 text-muted-foreground">Carregando missões...</p>
            </div>
          ) : error ? (
            <p className="text-destructive text-center py-10">{error}</p>
          ) : missionTemplates.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg">
              <PackageSearch className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg text-muted-foreground">Nenhuma missão encontrada no seu catálogo.</p>
              <p className="text-sm text-muted-foreground mt-1">
                <Link href="/dashboard/missions/new" className="text-primary hover:underline">Crie uma nova missão</Link> ou busque inspiração nas <Link href="/dashboard/missions/ideas" className="text-primary hover:underline">ideias de missões</Link>.
              </p>
            </div>
          ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {missionTemplates.map((template) => {
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
                        Recompensa: {template.starsReward} estrelas
                      </div>
                       <div className="flex items-center text-sm text-muted-foreground">
                          <BadgeCheck className="h-5 w-5 mr-1.5 text-blue-500" />
                          Experiência (XP): {template.xpReward}
                        </div>
                    </CardContent>
                    <CardFooter className="flex-col space-y-2 pt-4">
                      <Button 
                        variant="default" 
                        className="w-full" 
                        disabled={isProcessingAction || template.status === 'archived'}
                        onClick={() => toast({ title: "Em breve!", description: "A funcionalidade de atribuir missões está em desenvolvimento."})}
                      >
                         <BadgeCheck className="mr-2 h-4 w-4" /> Atribuir a Mini Herois
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="w-full" disabled={isProcessingAction}>
                            <MoreHorizontal className="mr-2 h-4 w-4" /> Mais Ações
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>Gerenciar Missão</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => router.push(`/dashboard/missions/edit/${template.id}`)} disabled={isProcessingAction}>
                            <Edit3 className="mr-2 h-4 w-4" /> Editar Missão
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setTemplateToDelete(template)} className="text-destructive focus:text-destructive-foreground focus:bg-destructive" disabled={isProcessingAction}>
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir Missão
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
                Tem certeza que deseja excluir a missão "{templateToDelete.title}" do catálogo? As missões já atribuídas com base neste item do catálogo não serão afetadas, mas você não poderá usá-la para novas atribuições.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setTemplateToDelete(null)} disabled={isProcessingAction}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90" disabled={isProcessingAction}>
                {isProcessingAction ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Sim, Excluir Missão
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
