
"use client";

import { useState, useEffect } from 'react';
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
import type { RewardTemplate, ChildProfile, ChildRewardInstance } from '@/lib/types';
import { 
  getChildProfilesForAttribution, 
  addChildRewardInstance,
  getActiveChildRewardInstancesByTemplateAndChild 
} from '@/lib/firebase/firestore';
import { Loader2, Users, AlertCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface AssignRewardDialogProps {
  template: RewardTemplate | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAssigned?: () => void;
}

export function AssignRewardDialog({ template, isOpen, onOpenChange, onAssigned }: AssignRewardDialogProps) {
  const { user } = useAuth();
  const { currentContext } = useFamily();
  const { toast } = useToast();

  const [eligibleChildren, setEligibleChildren] = useState<ChildProfile[]>([]);
  const [selectedChildren, setSelectedChildren] = useState<Record<string, boolean>>({});
  const [existingAssignments, setExistingAssignments] = useState<Record<string, boolean>>({}); // childId -> true if active assignment exists
  const [isLoadingChildren, setIsLoadingChildren] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    if (isOpen && template && user) {
      setIsLoadingChildren(true);
      setEligibleChildren([]);
      setSelectedChildren({});
      setExistingAssignments({});

      const fetchChildrenAndAssignments = async () => {
        try {
          const children = await getChildProfilesForAttribution(user.uid, currentContext);
          setEligibleChildren(children);

          const assignmentsPromises = children.map(async (child) => {
            const activeInstances = await getActiveChildRewardInstancesByTemplateAndChild(template.id, child.id);
            return { childId: child.id, hasActiveInstance: activeInstances.length > 0 };
          });
          const assignmentsResults = await Promise.all(assignmentsPromises);
          const newExistingAssignments: Record<string, boolean> = {};
          assignmentsResults.forEach(res => {
            newExistingAssignments[res.childId] = res.hasActiveInstance;
          });
          setExistingAssignments(newExistingAssignments);

        } catch (error) {
          console.error("Error fetching children or assignments:", error);
          toast({ title: "Erro ao Carregar Crianças", description: "Não foi possível buscar os Mini Herois elegíveis.", variant: "destructive" });
        } finally {
          setIsLoadingChildren(false);
        }
      };
      fetchChildrenAndAssignments();
    }
  }, [isOpen, template, user, currentContext, toast]);

  const handleChildSelection = (childId: string, isSelected: boolean) => {
    setSelectedChildren(prev => ({ ...prev, [childId]: isSelected }));
  };

  const getInitials = (name?: string | null) => {
    if (!name) return "MH"; 
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const handleAssign = async () => {
    if (!template || !user) return;

    const childrenToAssign = Object.entries(selectedChildren)
      .filter(([_, isSelected]) => isSelected)
      .map(([childId, _]) => childId);

    if (childrenToAssign.length === 0) {
      toast({ title: "Nenhum Herói Selecionado", description: "Por favor, escolha pelo menos um Mini Herói para a missão.", variant: "default" });
      return;
    }

    setIsAssigning(true);
    let assignedCount = 0;
    try {
      const assignmentPromises = childrenToAssign.map(childId => {
        const childOwnerId = eligibleChildren.find(c => c.id === childId)?.ownerId || user.uid;
        
        const instanceData: Omit<ChildRewardInstance, 'id' | 'assignedAt' | 'updatedAt' | 'status' | 'isRedeemed' | 'redeemedAt' | 'title' | 'description' | 'category' | 'starsCost' | 'isMaterial'> = {
          templateId: template.id,
          childId: childId,
          ownerId: childOwnerId, // Use child's ownerId or current user if not available (fallback)
          familyId: currentContext === 'my-space' ? null : currentContext,
        };
        return addChildRewardInstance(instanceData, template);
      });

      await Promise.all(assignmentPromises);
      assignedCount = assignmentPromises.length;
      toast({
        title: "Missões de Recompensa Lançadas!",
        description: `A recompensa foi atribuída para ${assignedCount} ${assignedCount === 1 ? "Mini Herói" : "Mini Herois"}.`,
      });
      onAssigned?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error assigning rewards:", error);
      toast({ title: "Erro ao Atribuir", description: "Não foi possível atribuir as recompensas. Tente novamente.", variant: "destructive" });
    } finally {
      setIsAssigning(false);
    }
  };
  
  if (!template) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> Atribuir Recompensa
          </DialogTitle>
          <DialogDescription>
            Atribua o modelo "<span className="font-semibold text-primary">{template.title}</span>" ({template.starsCost} estrelas) aos Mini Herois abaixo.
          </DialogDescription>
        </DialogHeader>

        {isLoadingChildren ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
            <p>Carregando Mini Herois...</p>
          </div>
        ) : eligibleChildren.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <AlertCircle className="h-10 w-10 mx-auto mb-2 text-primary" />
            Nenhum Mini Herói encontrado neste contexto para atribuição. 
            <br/>Adicione crianças ou verifique o contexto familiar.
          </div>
        ) : (
          <ScrollArea className="max-h-[40vh] my-4 pr-3">
            <div className="space-y-3">
              {eligibleChildren.map(child => (
                <div 
                  key={child.id} 
                  className={`flex items-center justify-between p-3 rounded-md border ${existingAssignments[child.id] ? 'bg-muted/30 opacity-70' : 'bg-card hover:bg-muted/20'}`}
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10 border-2 border-primary/50">
                       {child.avatar ? <AvatarImage src={child.avatar} alt={child.name} /> : null}
                       <AvatarFallback className="bg-accent text-accent-foreground text-sm">
                         {getInitials(child.name)}
                       </AvatarFallback>
                    </Avatar>
                    <div>
                      <Label htmlFor={`child-${child.id}`} className={`font-medium ${existingAssignments[child.id] ? 'text-muted-foreground' : ''}`}>
                        {child.name}
                      </Label>
                      {existingAssignments[child.id] && (
                        <p className="text-xs text-accent">Já possui esta recompensa ativa.</p>
                      )}
                    </div>
                  </div>
                  {!existingAssignments[child.id] && (
                    <Checkbox
                      id={`child-${child.id}`}
                      checked={!!selectedChildren[child.id]}
                      onCheckedChange={(checked) => handleChildSelection(child.id, !!checked)}
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
            disabled={isAssigning || isLoadingChildren || eligibleChildren.length === 0 || Object.values(selectedChildren).every(v => !v)}
          >
            {isAssigning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />}
            Confirmar Atribuição
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
