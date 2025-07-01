
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
import type { MissionTemplate, ChildProfile, MissionInstance, RecurrenceRule } from '@/lib/types';
import { 
  getChildProfilesForAttribution, 
  addMissionInstance,
  getActiveChildMissionInstancesByTemplateAndChild,
  deleteMissionInstancesByTemplateAndChild,
} from '@/lib/firebase/firestore';
import { Loader2, Users, AlertCircle, ListChecks } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { Form } from '@/components/ui/form';
import { weekdays } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';
import { RecurrenceControl } from './RecurrenceControl';

interface AssignMissionDialogProps {
  template: MissionTemplate | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAssigned?: () => void;
}

const recurrenceRuleSchema = z.object({
  freq: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
  interval: z.coerce.number().min(1),
  byDay: z.array(z.enum(weekdays)).optional(),
  endDate: z.date().optional().nullable(),
  count: z.coerce.number().min(1).optional().nullable(),
}).nullable();

const assignmentFormSchema = z.object({
  isRecurring: z.boolean().default(false),
  startDate: z.date().optional().nullable(),
  dueDate: z.date().optional().nullable(),
  recurrenceRule: recurrenceRuleSchema,
}).superRefine((data, ctx) => {
    if (data.isRecurring) {
        if (!data.startDate) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "A data de início é obrigatória para missões recorrentes.",
                path: ["startDate"],
            });
        }
        if (data.recurrenceRule?.endDate && data.startDate && data.recurrenceRule.endDate < data.startDate) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "A data de fim da recorrência não pode ser anterior à data de início.",
                path: ['recurrenceRule.endDate'],
            });
        }
    } else {
        if (!data.dueDate) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "A data de prazo é obrigatória para missões únicas.",
                path: ["dueDate"],
            });
        }
    }
});
type AssignmentFormValues = z.infer<typeof assignmentFormSchema>;


export function AssignMissionDialog({ template, isOpen, onOpenChange, onAssigned }: AssignMissionDialogProps) {
  const { user } = useAuth();
  const { currentContext, availableContexts } = useFamily();
  const { toast } = useToast();

  const [eligibleChildren, setEligibleChildren] = useState<ChildProfile[]>([]);
  const [selectedChildren, setSelectedChildren] = useState<Record<string, boolean>>({});
  const [existingAssignments, setExistingAssignments] = useState<Record<string, boolean>>({});
  const [isLoadingChildren, setIsLoadingChildren] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  const form = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentFormSchema),
    defaultValues: {
        isRecurring: false,
        startDate: null,
        dueDate: null,
        recurrenceRule: null,
    },
  });

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
            const activeInstances = await getActiveChildMissionInstancesByTemplateAndChild(template.id, child.id);
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

      let initialRecurrenceRule = null;
      if (template.recurrenceRule) {
          initialRecurrenceRule = {
              ...template.recurrenceRule,
              endDate: template.recurrenceRule.endDate?.toDate() ?? null
          }
      }
      form.reset({
          isRecurring: !!template.isRecurring,
          startDate: template.startDate?.toDate() || null,
          dueDate: template.dueDate?.toDate() || null,
          recurrenceRule: initialRecurrenceRule,
      });

      fetchChildrenAndAssignments();
    }
  }, [isOpen, template, user, currentContext, toast, form]);

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
    return { familyChildren: family, personalChildren: personal };
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

  const handleAssign = async (values: AssignmentFormValues) => {
    if (!template || !user) return;
    
    setIsAssigning(true);
    const promises: Promise<any>[] = [];
    let addedCount = 0;
    let removedCount = 0;

    const modifiedTemplate = {
        ...template,
        isRecurring: values.isRecurring,
        startDate: values.isRecurring && values.startDate ? Timestamp.fromDate(values.startDate) : null,
        dueDate: !values.isRecurring && values.dueDate ? Timestamp.fromDate(values.dueDate) : null,
        recurrenceRule: values.isRecurring && values.recurrenceRule ? {
            ...values.recurrenceRule,
            endDate: values.recurrenceRule.endDate ? Timestamp.fromDate(values.recurrenceRule.endDate) : null,
        } : null,
    };

    for (const child of eligibleChildren) {
        const childId = child.id;
        const hadAssignmentInitially = !!existingAssignments[childId];
        const hasAssignmentNow = !!selectedChildren[childId];

        if (hadAssignmentInitially && !hasAssignmentNow) {
            // Remove assignment
            promises.push(deleteMissionInstancesByTemplateAndChild(template.id, childId));
            removedCount++;
        } else if (!hadAssignmentInitially && hasAssignmentNow) {
            // Add assignment
            const instanceData: Omit<MissionInstance, 'id' | 'assignedAt' | 'updatedAt' | 'status' | 'completedAt' | 'dueDate' | 'title' | 'description' | 'category' | 'starsReward' | 'xpReward' | 'isRecurring' | 'recurrenceRule' | 'completionCount' | 'completedDates' | 'startDate'> = {
                templateId: template.id,
                childId: child.id,
                ownerId: child.ownerId,
                familyId: child.familyId || null,
            };
            promises.push(addMissionInstance(instanceData, modifiedTemplate));
            addedCount++;
        }
    }
    
    if (promises.length === 0) {
        toast({ title: "Nenhuma alteração detectada", description: "Nenhuma atribuição foi adicionada ou removida." });
        onOpenChange(false);
        setIsAssigning(false);
        return;
    }

    try {
        await Promise.all(promises);

        let toastDescription = "";
        if (addedCount > 0) toastDescription += `${addedCount} ${addedCount === 1 ? 'missão foi atribuída' : 'missões foram atribuídas'}. `;
        if (removedCount > 0) toastDescription += `${removedCount} ${removedCount === 1 ? 'atribuição foi removida' : 'atribuições foram removidas'}.`;

        toast({
            title: "Atribuições Atualizadas!",
            description: toastDescription.trim(),
        });
        onAssigned?.();
        onOpenChange(false);
    } catch (error) {
        console.error("Error updating assignments:", error);
        toast({ title: "Erro ao Atualizar", description: "Não foi possível salvar as alterações. Tente novamente.", variant: "destructive" });
    } finally {
        setIsAssigning(false);
    }
  };
  
  const renderChildList = (children: ChildProfile[]) => (
    children.map(child => {
      const childId = `child-mission-${child.id}`;

      return (
        <Label
          key={child.id}
          htmlFor={childId}
          className="flex items-center justify-between p-3 rounded-md border bg-card hover:bg-muted/20 cursor-pointer"
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
            />
        </Label>
      )
    })
  );

  if (!template) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <ListChecks className="h-6 w-6 text-primary" /> Gerenciar Missão
          </DialogTitle>
          <DialogDescription>
            Atribua ou remova a missão "<span className="font-semibold text-primary">{template.title}</span>" para os Mini Herois.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAssign)} className="space-y-4">
                <div className="space-y-2">
                    <Label className="font-semibold">Selecione os Heróis</Label>
                    {isLoadingChildren ? (
                        <div className="flex items-center justify-center h-24">
                            <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                            <p>Carregando...</p>
                        </div>
                        ) : eligibleChildren.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground text-sm">
                            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-primary" />
                            Nenhum Mini Herói encontrado para atribuição.
                        </div>
                        ) : (
                        <ScrollArea className="max-h-40 mt-2 pr-3">
                            <div className="space-y-2">
                                {familyChildren.length > 0 && (
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold text-muted-foreground">Na Família "{familyName}"</Label>
                                        {renderChildList(familyChildren)}
                                    </div>
                                )}

                                {familyChildren.length > 0 && personalChildren.length > 0 && <Separator className="my-2" />}
                                
                                {personalChildren.length > 0 && (
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold text-muted-foreground">No Seu Espaço Pessoal</Label>
                                        {renderChildList(personalChildren)}
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    )}
                </div>

                <Separator />

                <div className="space-y-2">
                    <Label className="font-semibold">Opções de Agendamento</Label>
                     <p className="text-xs text-muted-foreground">
                        Ajuste as datas para esta atribuição específica. As configurações do catálogo serão usadas como padrão.
                    </p>
                    <RecurrenceControl />
                </div>
                
                <DialogFooter className="pt-4">
                    <DialogClose asChild>
                        <Button type="button" variant="outline" disabled={isAssigning}>Cancelar</Button>
                    </DialogClose>
                    <Button 
                        type="submit"
                        disabled={isAssigning || isLoadingChildren}
                    >
                        {isAssigning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />}
                        Confirmar Alterações
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
