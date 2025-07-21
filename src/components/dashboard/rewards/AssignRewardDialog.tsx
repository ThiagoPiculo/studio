
"use client";

import { useState, useEffect, useMemo, Fragment } from 'react';
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
  getActiveChildRewardInstancesByTemplateAndChild,
  deleteChildRewardInstancesByTemplateAndChild,
} from '@/lib/firebase/firestore';
import { Loader2, Users, AlertCircle, Gift } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useUserRole } from '@/hooks/useUserRole';

interface AssignRewardDialogProps {
  template: RewardTemplate | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAssigned?: () => void;
}

export function AssignRewardDialog({ template, isOpen, onOpenChange, onAssigned }: AssignRewardDialogProps) {
  const { user } = useAuth();
  const { canEdit } = useUserRole();
  const { currentContext, availableContexts } = useFamily();
  const { toast } = useToast();

  const [eligibleChildren, setEligibleChildren] = useState<ChildProfile[]>([]);
  const [selectedChildren, setSelectedChildren] = useState<Record<string, boolean>>({});
  const [existingAssignments, setExistingAssignments] = useState<Record<string, boolean>>({});
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
          const initialSelection: Record<string, boolean> = {};

          assignmentsResults.forEach(res => {
            newExistingAssignments[res.childId] = res.hasActiveInstance;
            initialSelection[res.childId] = res.hasActiveInstance;
          });
          
          setExistingAssignments(newExistingAssignments);
          setSelectedChildren(initialSelection);

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
  
  const { familyChildren, personalChildren } = useMemo(() => {
    const family: ChildProfile[] = [];
    const personal: ChildProfile[] = [];
    eligibleChildren.forEach(child => {
        if (child.familyId) {
            family.push(child);
        } else {
            personal.push(child);
        }
    });
    return { familyChildren: family.sort((a,b) => a.name.localeCompare(b.name)), personalChildren: personal.sort((a,b) => a.name.localeCompare(b.name)) };
  }, [eligibleChildren]);

  const familyName = useMemo(() => {
    if (currentContext === 'my-space') return '';
    return availableContexts.find(c => c.id === currentContext)?.name || '';
  }, [currentContext, availableContexts]);


  const handleChildSelection = (childId: string, isSelected: boolean) => {
    setSelectedChildren(prev => ({ ...prev, [childId]: isSelected }));
  };

  const getInitials = (name?: string | null) => {
    if (!name) return "MH"; 
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const handleAssign = async () => {
    if (!template || !user) return;

    setIsAssigning(true);
    const promises: Promise<any>[] = [];
    let addedCount = 0;
    let removedCount = 0;

    for (const child of eligibleChildren) {
        const childId = child.id;
        const hadAssignmentInitially = !!existingAssignments[childId];
        const hasAssignmentNow = !!selectedChildren[childId];

        if (hadAssignmentInitially && !hasAssignmentNow) {
            // Remove assignment
            promises.push(deleteChildRewardInstancesByTemplateAndChild(user, template.id, childId));
            removedCount++;
        } else if (!hadAssignmentInitially && hasAssignmentNow) {
            // Add assignment
            const instanceData: Omit<ChildRewardInstance, 'id' | 'assignedAt' | 'updatedAt' | 'status' | 'isRedeemed' | 'redeemedAt' | 'title' | 'description' | 'category' | 'starsCost' | 'isMaterial'> = {
              templateId: template.id,
              childId: child.id,
              ownerId: child.ownerId,
              familyId: child.familyId || null,
            };
            promises.push(addChildRewardInstance(user, instanceData, template));
            addedCount++;
        }
    }

    if (promises.length === 0) {
        toast({ title: "Nenhuma alteração detectada", description: "Nenhuma recompensa foi adicionada ou removida." });
        onOpenChange(false);
        setIsAssigning(false);
        return;
    }

    try {
        await Promise.all(promises);

        let toastDescription = "";
        if (addedCount > 0) toastDescription += `${addedCount} ${addedCount === 1 ? 'recompensa foi atribuída' : 'recompensas foram atribuídas'}. `;
        if (removedCount > 0) toastDescription += `${removedCount} ${removedCount === 1 ? 'atribuição foi removida' : 'atribuições foram removidas'}.`;

        toast({
            title: "Recompensas Atualizadas!",
            description: toastDescription.trim(),
        });
        onAssigned?.();
        onOpenChange(false);
    } catch (error) {
        console.error("Error updating reward assignments:", error);
        toast({ title: "Erro ao Atualizar", description: "Não foi possível salvar as alterações. Tente novamente.", variant: "destructive" });
    } finally {
        setIsAssigning(false);
    }
  };
  
  const renderChildList = (children: ChildProfile[]) => (
    children.map(child => {
        const childId = `child-reward-${child.id}`;

        return (
            <Label
              key={child.id}
              htmlFor={childId}
              className={cn(
                "flex items-center justify-between p-3 rounded-md border bg-card hover:bg-muted/20",
                canEdit ? "cursor-pointer" : "cursor-not-allowed opacity-70"
              )}
            >
            <div className="flex items-center space-x-3">
                <Avatar
                className="h-10 w-10 ring-2 ring-offset-background ring-[var(--ring-color)]"
                style={child.color ? { '--ring-color': child.color } as React.CSSProperties : {}}
                >
                    <AvatarImage src={child.avatar} alt={child.name} />
                    <AvatarFallback className="text-sm" style={child.color ? { backgroundColor: child.color } : {}}>
                    {getInitials(child.name)}
                    </AvatarFallback>
                </Avatar>
                <div>
                  <span className="font-medium">
                      {child.name}
                  </span>
                </div>
            </div>
            <Checkbox
              id={childId}
              checked={!!selectedChildren[child.id]}
              onCheckedChange={(checked) => handleChildSelection(child.id, !!checked)}
              disabled={!canEdit}
            />
            </Label>
        )
    })
);

  if (!template) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Gift className="h-6 w-6 text-primary" /> Gerenciar Recompensa
          </DialogTitle>
          <DialogDescription>
            Atribua ou remova a recompensa "<span className="font-semibold text-primary">{template.title}</span>" ({template.starsCost} estrelas).
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
            Nenhum Mini Herói encontrado para atribuição. 
            <br/>Adicione crianças ou verifique o contexto da aliança.
          </div>
        ) : (
          <ScrollArea className="h-[16.25rem] mt-2 pr-3">
              <div className="space-y-3">
                  {familyChildren.length > 0 && (
                      <div className="space-y-2">
                          <Label className="text-sm font-semibold text-muted-foreground">Na Aliança "{familyName}"</Label>
                          {renderChildList(familyChildren)}
                      </div>
                  )}

                  {personalChildren.length > 0 && familyChildren.length > 0 && <Separator className="my-4" />}
                  
                  {personalChildren.length > 0 && (
                      <div className="space-y-2">
                           <Label className="text-sm font-semibold text-muted-foreground">No Seu Espaço Pessoal</Label>
                           {renderChildList(personalChildren)}
                      </div>
                  )}
              </div>
          </ScrollArea>
        )}

        <DialogFooter className="mt-6">
          <DialogClose asChild>
            <Button variant="outline" disabled={isAssigning}>Cancelar</Button>
          </DialogClose>
          <Button 
            onClick={handleAssign} 
            disabled={isAssigning || isLoadingChildren || !canEdit}
          >
            {isAssigning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />}
            Confirmar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
