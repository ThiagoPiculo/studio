
"use client";

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import type { MissionTemplate, ChildProfile } from '@/lib/types';
import {
  getMissionTemplatesByOwnerOrFamily,
  addMissionInstance,
  getActiveChildMissionInstancesByTemplateAndChild,
} from '@/lib/firebase/firestore';
import { Loader2, Users, AlertCircle, PlusCircle, PackageSearch } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface AddMissionDialogProps {
  child: ChildProfile | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onMissionAdded?: () => void;
}

export function AddMissionDialog({ child, isOpen, onOpenChange, onMissionAdded }: AddMissionDialogProps) {
  const { user } = useAuth();
  const { currentContext } = useFamily();
  const { toast } = useToast();

  const [missionTemplates, setMissionTemplates] = useState<MissionTemplate[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<Record<string, boolean>>({});
  const [existingAssignments, setExistingAssignments] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    if (isOpen && child && user) {
      setIsLoading(true);
      setSelectedTemplates({});

      const fetchTemplatesAndAssignments = async () => {
        try {
          const familyIdToQuery = currentContext === 'my-space' ? null : currentContext;
          const templates = await getMissionTemplatesByOwnerOrFamily(user.uid, familyIdToQuery);
          const activeTemplates = templates.filter(t => t.status === 'active');
          setMissionTemplates(activeTemplates);

          const assignmentsPromises = activeTemplates.map(async (template) => {
            const activeInstances = await getActiveChildMissionInstancesByTemplateAndChild(template.id, child.id);
            return { templateId: template.id, hasActiveInstance: activeInstances.length > 0 };
          });

          const assignmentsResults = await Promise.all(assignmentsPromises);
          const newExistingAssignments: Record<string, boolean> = {};
          assignmentsResults.forEach(res => {
            newExistingAssignments[res.templateId] = res.hasActiveInstance;
          });
          setExistingAssignments(newExistingAssignments);

        } catch (error) {
          console.error("Error fetching mission templates:", error);
          toast({ title: "Erro ao Carregar Catálogo", description: "Não foi possível buscar as missões disponíveis.", variant: "destructive" });
        } finally {
          setIsLoading(false);
        }
      };
      fetchTemplatesAndAssignments();
    }
  }, [isOpen, child, user, currentContext, toast]);

  const handleTemplateSelection = (templateId: string, isSelected: boolean) => {
    setSelectedTemplates(prev => ({ ...prev, [templateId]: isSelected }));
  };

  const handleAssign = async () => {
    if (!child || !user) return;

    const templatesToAssign = Object.entries(selectedTemplates)
      .filter(([_, isSelected]) => isSelected)
      .map(([templateId, _]) => missionTemplates.find(t => t.id === templateId))
      .filter((t): t is MissionTemplate => !!t);

    if (templatesToAssign.length === 0) {
      toast({ title: "Nenhuma Missão Selecionada", description: "Por favor, escolha pelo menos uma missão para atribuir.", variant: "default" });
      return;
    }

    setIsAssigning(true);
    try {
      const assignmentPromises = templatesToAssign.map(template => {
        const instanceData: Omit<any, 'id' | 'assignedAt' | 'updatedAt' | 'status' | 'completedAt' | 'dueDate' | 'title' | 'description' | 'category' | 'starsReward' | 'xpReward'> = {
            templateId: template.id,
            childId: child.id,
            ownerId: child.ownerId,
            familyId: child.familyId || null,
        };
        return addMissionInstance(instanceData, template);
      });

      await Promise.all(assignmentPromises);
      toast({
        title: "Missões Atribuídas!",
        description: `${templatesToAssign.length} ${templatesToAssign.length === 1 ? "nova missão foi atribuída" : "novas missões foram atribuídas"} para ${child.name}.`,
      });
      onMissionAdded?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error assigning missions:", error);
      toast({ title: "Erro ao Atribuir", description: "Não foi possível atribuir as missões. Tente novamente.", variant: "destructive" });
    } finally {
      setIsAssigning(false);
    }
  };

  if (!child) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">Atribuir Missões a {child.name}</DialogTitle>
          <DialogDescription>Selecione as missões do catálogo para adicionar à lista de {child.name}.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
            <p>Carregando missões do catálogo...</p>
          </div>
        ) : missionTemplates.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <PackageSearch className="h-10 w-10 mx-auto mb-2 text-primary" />
            <p className='font-semibold'>Nenhuma missão ativa no catálogo.</p>
            <Link href="/dashboard/missions/new">
                <Button variant="link" className="p-0 h-auto font-semibold">Crie uma nova missão para começar.</Button>
            </Link>
          </div>
        ) : (
          <ScrollArea className="max-h-[50vh] mt-2 pr-3">
            <div className="space-y-3">
              {missionTemplates.map(template => (
                <div 
                  key={template.id} 
                  className={`flex items-center justify-between p-3 rounded-md border ${existingAssignments[template.id] ? 'bg-muted/30 opacity-70' : 'bg-card hover:bg-muted/20'}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-left">
                      <Label 
                        htmlFor={`template-mission-${template.id}`} 
                        className={`font-medium ${existingAssignments[template.id] ? 'text-muted-foreground' : 'cursor-pointer'}`}
                      >
                        {template.title}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {template.starsReward} ★ / {template.xpReward} XP
                      </p>
                      {existingAssignments[template.id] && (
                        <p className="text-xs text-accent font-semibold">Já possui esta missão ativa.</p>
                      )}
                    </div>
                  </div>
                  {!existingAssignments[template.id] && (
                    <Checkbox
                      id={`template-mission-${template.id}`}
                      checked={!!selectedTemplates[template.id]}
                      onCheckedChange={(checked) => handleTemplateSelection(template.id, !!checked)}
                    />
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="mt-6">
          <DialogClose asChild>
            <Button variant="outline" disabled={isAssigning}>Cancelar</Button>
          </DialogClose>
          <Button 
            onClick={handleAssign} 
            disabled={isAssigning || isLoading || missionTemplates.length === 0 || Object.values(selectedTemplates).every(v => !v)}
          >
            {isAssigning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
            Atribuir Selecionadas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
