
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
  updateRecurringMissionInstance,
  getMissionTemplateById,
} from '@/lib/firebase/firestore';
import { Loader2, Users, AlertCircle, ListChecks, Edit, CalendarDays } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useForm, FormProvider } from 'react-hook-form';
import { Form } from '@/components/ui/form';
import { weekdays } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';
import { RecurrenceControl } from './RecurrenceControl';
import { formatRecurrenceSummary } from '@/lib/calendar-utils';

export type EditRecurrenceMode = 'single' | 'forward' | 'all';

interface AssignMissionDialogProps {
  template: MissionTemplate | null;
  instanceToEdit?: MissionInstance | null;
  occurrenceDate?: Date | null;
  editMode?: EditRecurrenceMode;
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
export type AssignmentFormValues = z.infer<typeof assignmentFormSchema>;


function CustomizeScheduleDialog({
    child,
    initialSchedule,
    onSave,
    onCancel,
}: {
    child: ChildProfile,
    initialSchedule: AssignmentFormValues,
    onSave: (schedule: AssignmentFormValues) => void,
    onCancel: () => void,
}) {
    const form = useForm<AssignmentFormValues>({
        resolver: zodResolver(assignmentFormSchema),
        defaultValues: initialSchedule,
    });
    
    const onSubmit = (data: AssignmentFormValues) => {
        onSave(data);
    };

    return (
        <Dialog open={true} onOpenChange={onCancel}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Personalizar Agendamento</DialogTitle>
                    <DialogDescription>
                        Ajuste o agendamento da missão para "{child.name}".
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                        <RecurrenceControl />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
                            <Button type="submit">Salvar Agendamento</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

export function AssignMissionDialog({ template, instanceToEdit, occurrenceDate, editMode = 'all', isOpen, onOpenChange, onAssigned }: AssignMissionDialogProps) {
  const { user } = useAuth();
  const { currentContext, availableContexts } = useFamily();
  const { toast } = useToast();

  const [eligibleChildren, setEligibleChildren] = useState<ChildProfile[]>([]);
  const [selectedChildren, setSelectedChildren] = useState<Record<string, boolean>>({});
  const [existingAssignments, setExistingAssignments] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<MissionTemplate | null>(template);
  const [childToCustomize, setChildToCustomize] = useState<ChildProfile | null>(null);
  const [customSchedules, setCustomSchedules] = useState<Record<string, AssignmentFormValues>>({});

  const isEditInstanceMode = !!instanceToEdit;

  const editForm = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentFormSchema),
    defaultValues: {},
  });
  
  const getInitials = (name?: string | null) => {
    if (!name) return "MH"; 
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };
  
  const getScheduleForChild = (childId: string): AssignmentFormValues => {
    if (customSchedules[childId]) {
      return customSchedules[childId];
    }
    if (!currentTemplate) {
        return { isRecurring: false, startDate: null, dueDate: new Date(), recurrenceRule: null };
    }
    return {
        isRecurring: !!currentTemplate.isRecurring,
        startDate: currentTemplate.startDate?.toDate() ?? null,
        dueDate: currentTemplate.dueDate?.toDate() ?? null,
        recurrenceRule: currentTemplate.recurrenceRule ? {
            ...currentTemplate.recurrenceRule,
            endDate: currentTemplate.recurrenceRule.endDate?.toDate() ?? null,
        } : null,
    };
  };

  const handleSaveCustomization = (childId: string, schedule: AssignmentFormValues) => {
    setCustomSchedules(prev => ({ ...prev, [childId]: schedule }));
    setChildToCustomize(null);
  };

  useEffect(() => {
    const initializeDialog = async () => {
      if (!isOpen || !user) return;

      setIsLoading(true);
      setCustomSchedules({}); // Reset customizations on open
      
      let finalTemplate = template;
      if (instanceToEdit && !template) {
        const fetchedTemplate = await getMissionTemplateById(instanceToEdit.templateId);
        if (!fetchedTemplate) {
          toast({ title: "Erro", description: "Modelo da missão não encontrado.", variant: "destructive"});
          onOpenChange(false);
          return;
        }
        finalTemplate = fetchedTemplate;
      }
      setCurrentTemplate(finalTemplate);
      
      if (isEditInstanceMode && instanceToEdit) {
        const children = await getChildProfilesForAttribution(user.uid, currentContext);
        setEligibleChildren(children);

        let initialRecurrenceRule = null;
        if (instanceToEdit.recurrenceRule) {
            const rule = instanceToEdit.recurrenceRule as any;
            initialRecurrenceRule = {
                ...rule,
                endDate: rule.endDate?.toDate ? rule.endDate.toDate() : (rule.endDate || null)
            }
        }
        editForm.reset({
            isRecurring: !!instanceToEdit.isRecurring,
            startDate: instanceToEdit.startDate?.toDate() || null,
            dueDate: instanceToEdit.dueDate?.toDate() || null,
            recurrenceRule: initialRecurrenceRule,
        });
      } else if (!isEditInstanceMode && finalTemplate) {
          try {
            const children = await getChildProfilesForAttribution(user.uid, currentContext);
            setEligibleChildren(children);

            const assignmentsPromises = children.map(async (child) => {
              const activeInstances = await getActiveChildMissionInstancesByTemplateAndChild(finalTemplate!.id, child.id);
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
            toast({ title: "Erro ao Carregar Crianças", variant: "destructive" });
          }
      }

      setIsLoading(false);
    }
    initializeDialog();
  }, [isOpen, template, instanceToEdit, user, currentContext, toast, editForm, isEditInstanceMode, onOpenChange]);

  const familyChildren = useMemo(() => {
    return eligibleChildren.filter(child => child.familyId).sort((a,b) => a.name.localeCompare(b.name));
  }, [eligibleChildren]);
  
  const personalChildren = useMemo(() => {
    return eligibleChildren.filter(child => !child.familyId).sort((a,b) => a.name.localeCompare(b.name));
  }, [eligibleChildren]);

  const familyName = useMemo(() => {
    if (currentContext === 'my-space') return '';
    return availableContexts.find(c => c.id === currentContext)?.name || '';
  }, [currentContext, availableContexts]);


  const handleChildSelection = (childId: string, isSelected: boolean) => {
    setSelectedChildren(prev => ({ ...prev, [childId]: isSelected }));
  };

  const onEditSubmit = async (values: AssignmentFormValues) => {
     if (!instanceToEdit || !occurrenceDate) {
        toast({ title: "Erro", description: "Dados insuficientes para editar a missão.", variant: "destructive"});
        return;
      }
      setIsProcessing(true);
      try {
        await updateRecurringMissionInstance(instanceToEdit.id, editMode, values, occurrenceDate);
        toast({ title: "Agendamento Atualizado!", description: "A missão foi reagendada com sucesso."});
        onAssigned?.();
        onOpenChange(false);
      } catch (error: any) {
        console.error("Error updating recurring mission instance:", error);
        toast({ title: "Erro ao Editar", description: error.message, variant: "destructive" });
      } finally {
        setIsProcessing(false);
      }
  };

  const handleAssignSubmit = async () => {
    if (!currentTemplate) return;
    setIsProcessing(true);

    const promises: Promise<any>[] = [];
    let addedCount = 0;
    let removedCount = 0;

    for (const child of eligibleChildren) {
      const childId = child.id;
      const hadAssignmentInitially = !!existingAssignments[childId];
      const hasAssignmentNow = !!selectedChildren[childId];

      if (hadAssignmentInitially && !hasAssignmentNow) {
        // Remove assignment
        promises.push(deleteMissionInstancesByTemplateAndChild(currentTemplate.id, childId));
        removedCount++;
      } else if (!hadAssignmentInitially && hasAssignmentNow) {
        // Add assignment
        const schedule = getScheduleForChild(child.id);
        const finalTemplatePayload = { ...currentTemplate, ...schedule };
        const instanceData = {
          templateId: currentTemplate.id,
          childId: child.id,
          ownerId: child.ownerId,
          familyId: child.familyId || null,
        };
        promises.push(addMissionInstance(instanceData, finalTemplatePayload));
        addedCount++;
      }
    }

    if (promises.length === 0) {
      toast({ title: "Nenhuma alteração detectada", description: "Nenhuma missão foi adicionada ou removida." });
      onOpenChange(false);
      setIsProcessing(false);
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
      toast({ title: "Erro ao atualizar atribuições", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const renderChildList = (children: ChildProfile[]) => (
    children.map(child => {
      const childId = `child-mission-assign-${child.id}`;
      const scheduleSummary = formatRecurrenceSummary(getScheduleForChild(child.id));
      const hasCustomSchedule = !!customSchedules[child.id];
      const isAlreadyAssigned = existingAssignments[child.id];
      const isSelected = selectedChildren[child.id];

      const getStatusText = () => {
        if (isAlreadyAssigned) {
          return isSelected ? "Atribuição mantida." : "Atribuição será removida.";
        }
        return isSelected ? scheduleSummary : "Não atribuído.";
      }

      return (
        <div
          key={child.id}
          className="flex flex-col p-3 rounded-md border bg-card"
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                     <Checkbox
                        id={childId}
                        checked={!!selectedChildren[child.id]}
                        onCheckedChange={(checked) => handleChildSelection(child.id, !!checked)}
                    />
                    <Label htmlFor={childId} className="flex items-center gap-2 cursor-pointer">
                        <Avatar
                        className="h-8 w-8 ring-1 ring-offset-background ring-[var(--ring-color)]"
                        style={child.color ? { '--ring-color': child.color } as React.CSSProperties : {}}
                        >
                            <AvatarImage src={child.avatar} alt={child.name} />
                            <AvatarFallback className="text-xs" style={child.color ? { backgroundColor: child.color } : {}}>
                            {getInitials(child.name)}
                            </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">
                            {child.name}
                        </span>
                    </Label>
                </div>
                {!isAlreadyAssigned && (
                  <Button
                      type="button"
                      variant={hasCustomSchedule ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setChildToCustomize(child)}
                      className="h-8"
                  >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {hasCustomSchedule ? 'Editar Agenda' : 'Personalizar'}
                  </Button>
                )}
            </div>
            <p className="text-xs text-muted-foreground pl-10 pt-1">
                {getStatusText()}
            </p>
        </div>
      )
    })
  );

  const renderAssignToChildren = () => (
    <>
      <div className="space-y-2">
          {isLoading ? (
              <div className="flex items-center justify-center h-40">
                  <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                  <p>Carregando crianças...</p>
              </div>
              ) : eligibleChildren.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 text-primary" />
                  Nenhum Mini Herói encontrado para atribuição.
              </div>
              ) : (
              <ScrollArea className="h-64 mt-2 pr-3">
                  <div className="space-y-3">
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
    </>
  );

  const getEditDescription = () => {
    switch(editMode) {
      case 'single': return 'Você está editando apenas esta ocorrência da missão. Todas as outras permanecerão inalteradas.';
      case 'forward': return 'Você está editando esta e todas as futuras ocorrências da missão.';
      case 'all': default: return 'Você está editando todas as ocorrências (passadas e futuras) desta missão para este herói.';
    }
  };

  const getDialogTitle = () => {
    if (isEditInstanceMode) {
        return `Editar Missão para ${eligibleChildren.find(c => c.id === instanceToEdit?.childId)?.name || 'o Herói'}`;
    }
    return 'Atribuir Missão';
  };
  
  const getDialogDescription = () => {
      if (isEditInstanceMode) {
          return getEditDescription();
      }
      return `Selecione os heróis e personalize o agendamento para a missão "${currentTemplate?.title}".`;
  }
  
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            {isEditInstanceMode ? <Edit className="h-6 w-6 text-primary" /> : <ListChecks className="h-6 w-6 text-primary" />}
            {getDialogTitle()}
          </DialogTitle>
          <DialogDescription>
            {getDialogDescription()}
          </DialogDescription>
        </DialogHeader>

        {isEditInstanceMode ? (
            <Form {...editForm}>
                <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 pt-4">
                     <RecurrenceControl />
                     <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="outline" disabled={isProcessing}>Cancelar</Button></DialogClose>
                        <Button type="submit" disabled={isProcessing}>
                            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />}
                            Salvar Agendamento
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        ) : (
            <div className="space-y-4 pt-4">
                {renderAssignToChildren()}
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="outline" disabled={isProcessing}>Cancelar</Button></DialogClose>
                    <Button onClick={handleAssignSubmit} disabled={isProcessing || isLoading}>
                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />}
                        Confirmar Atribuições
                    </Button>
                </DialogFooter>
            </div>
        )}
        
        {childToCustomize && (
            <CustomizeScheduleDialog 
                child={childToCustomize}
                initialSchedule={getScheduleForChild(childToCustomize.id)}
                onSave={(schedule) => handleSaveCustomization(childToCustomize.id, schedule)}
                onCancel={() => setChildToCustomize(null)}
            />
        )}
      </DialogContent>
    </Dialog>
  );
}
