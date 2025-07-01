
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
import { Loader2, Users, AlertCircle, ListChecks, Edit } from 'lucide-react';
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
type AssignmentFormValues = z.infer<typeof assignmentFormSchema>;

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

  const isEditInstanceMode = !!instanceToEdit;
  
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
    const initializeDialog = async () => {
      if (!isOpen || !user) return;

      setIsLoading(true);
      
      let finalTemplate = template;
      // If we are editing an instance, we might not have the template. Fetch it.
      if (instanceToEdit && !template) {
        const fetchedTemplate = await getMissionTemplateById(instanceToEdit.templateId);
        if (fetchedTemplate) {
          finalTemplate = fetchedTemplate;
          setCurrentTemplate(fetchedTemplate);
        } else {
          toast({ title: "Erro", description: "Modelo da missão não encontrado.", variant: "destructive"});
          onOpenChange(false);
          return;
        }
      } else {
        setCurrentTemplate(template);
      }

      if (!finalTemplate) {
          toast({ title: "Erro", description: "Nenhuma missão selecionada para atribuição ou edição.", variant: "destructive" });
          onOpenChange(false);
          return;
      }
      
      const sourceForScheduling = instanceToEdit || finalTemplate;
      let initialRecurrenceRule = null;
      if (sourceForScheduling.recurrenceRule) {
          const rule = sourceForScheduling.recurrenceRule as any;
          initialRecurrenceRule = {
              ...rule,
              endDate: rule.endDate?.toDate ? rule.endDate.toDate() : (rule.endDate || null)
          }
      }
      form.reset({
          isRecurring: !!sourceForScheduling.isRecurring,
          startDate: sourceForScheduling.startDate?.toDate() || null,
          dueDate: sourceForScheduling.dueDate?.toDate() || null,
          recurrenceRule: initialRecurrenceRule,
      });

      if (!isEditInstanceMode) {
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
  }, [isOpen, template, instanceToEdit, user, currentContext, toast, form, isEditInstanceMode, onOpenChange]);

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

  const getInitials = (name?: string | null) => {
    if (!name) return "MH"; 
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const onSubmit = async (values: AssignmentFormValues) => {
    setIsProcessing(true);
    if (isEditInstanceMode) {
      // Handle editing a single instance's schedule
      if (!instanceToEdit || !occurrenceDate) {
        toast({ title: "Erro", description: "Dados insuficientes para editar a missão.", variant: "destructive"});
        setIsProcessing(false);
        return;
      }
      try {
        await updateRecurringMissionInstance(instanceToEdit.id, editMode, values, occurrenceDate);
        toast({ title: "Agendamento Atualizado!", description: "A missão foi reagendada com sucesso."});
        onAssigned?.();
        onOpenChange(false);
      } catch (error: any) {
        console.error("Error updating recurring mission instance:", error);
        toast({ title: "Erro ao Editar", description: error.message, variant: "destructive" });
      }

    } else {
      // Handle assigning to multiple children (original logic)
      if (!currentTemplate) return;
      const modifiedTemplatePayload = { ...currentTemplate, ...values };

      const assignmentPromises: Promise<any>[] = [];
      let addedCount = 0;
      let removedCount = 0;

      for (const child of eligibleChildren) {
          const hadAssignment = !!existingAssignments[child.id];
          const hasAssignment = !!selectedChildren[child.id];

          if (hadAssignment && !hasAssignment) {
              assignmentPromises.push(deleteMissionInstancesByTemplateAndChild(currentTemplate.id, child.id));
              removedCount++;
          } else if (!hadAssignment && hasAssignment) {
              const instanceData = { templateId: currentTemplate.id, childId: child.id, ownerId: child.ownerId, familyId: child.familyId || null };
              assignmentPromises.push(addMissionInstance(instanceData, modifiedTemplatePayload));
              addedCount++;
          }
      }
      
      if (assignmentPromises.length === 0) {
        toast({ title: "Nenhuma alteração detectada." });
      } else {
        try {
          await Promise.all(assignmentPromises);
          let toastDescription = "";
          if (addedCount > 0) toastDescription += `${addedCount} atribuições adicionadas. `;
          if (removedCount > 0) toastDescription += `${removedCount} atribuições removidas.`;
          toast({ title: "Atribuições Atualizadas!", description: toastDescription.trim() });
          onAssigned?.();
          onOpenChange(false);
        } catch(error) {
           toast({ title: "Erro ao atualizar atribuições", variant: "destructive" });
        }
      }
    }
    setIsProcessing(false);
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

  const renderAssignToChildren = () => (
    <>
      <div className="space-y-2">
          <Label className="font-semibold">Selecione os Heróis</Label>
          {isLoading ? (
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
              <ScrollArea className="h-[16.25rem] mt-2 pr-3">
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
      <Separator/>
    </>
  );

  const getEditTitle = () => {
    if (!instanceToEdit) return "Editar Agendamento";
    const child = eligibleChildren.find(c => c.id === instanceToEdit.childId);
    return `Editar Missão para ${child?.name || 'o Herói'}`;
  }

  const getEditDescription = () => {
    switch(editMode) {
      case 'single': return 'Você está editando apenas esta ocorrência da missão. Todas as outras permanecerão inalteradas.';
      case 'forward': return 'Você está editando esta e todas as futuras ocorrências da missão.';
      case 'all':
      default:
        return 'Você está editando todas as ocorrências (passadas e futuras) desta missão para este herói.';
    }
  }

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            {isEditInstanceMode ? <Edit className="h-6 w-6 text-primary" /> : <ListChecks className="h-6 w-6 text-primary" />}
            {isEditInstanceMode ? getEditTitle() : "Atribuir Missão"}
          </DialogTitle>
          <DialogDescription>
            {isEditInstanceMode 
              ? getEditDescription()
              : `Selecione os heróis e configure o agendamento para a missão "${currentTemplate?.title}".`
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {!isEditInstanceMode && renderAssignToChildren()}
                
                <div className="space-y-2">
                    <Label className="font-semibold">Opções de Agendamento</Label>
                     <p className="text-xs text-muted-foreground">
                        Ajuste as datas para esta atribuição. As configurações do catálogo serão usadas como padrão.
                    </p>
                    <RecurrenceControl />
                </div>
                
                <DialogFooter className="pt-4">
                    <DialogClose asChild>
                        <Button type="button" variant="outline" disabled={isProcessing}>Cancelar</Button>
                    </DialogClose>
                    <Button 
                        type="submit"
                        disabled={isProcessing || isLoading}
                    >
                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />}
                        Salvar Alterações
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
