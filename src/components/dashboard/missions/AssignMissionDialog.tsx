
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
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
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import type { MissionTemplate, ChildProfile, MissionInstance } from '@/lib/types';
import {
  getChildProfilesForAttribution,
  addMissionInstance,
  getActiveMissionInstancesByTemplate,
  updateRecurringMissionInstance,
  deleteMissionInstancesByTemplateAndChild,
  getChildProfileById,
} from '@/lib/firebase/firestore';
import { Loader2, Users, AlertCircle, Target, Edit, CalendarDays, Save, ArrowLeft, XCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useForm, FormProvider } from 'react-hook-form';
import { Form } from '@/components/ui/form';
import { RecurrenceControl } from './RecurrenceControl';
import { EditRecurrenceDialog, type EditRecurrenceMode } from './EditRecurrenceDialog';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useUserRole } from '@/hooks/useUserRole';
import { format } from 'date-fns';

const recurrenceRuleSchema = z.object({
  freq: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
  interval: z.coerce.number().min(1),
  byDay: z.array(z.enum(['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'])).optional(),
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

interface AssignMissionDialogProps {
  template: MissionTemplate | null;
  instanceToEdit?: MissionInstance | null;
  occurrenceDate?: Date | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAssigned?: () => void;
}

export function AssignMissionDialog({ template, instanceToEdit, occurrenceDate, isOpen, onOpenChange, onAssigned }: AssignMissionDialogProps) {
  const { user } = useAuth();
  const { currentContext, availableContexts } = useFamily();
  const { canEdit } = useUserRole();
  const { toast } = useToast();

  const effectiveTemplate = template || instanceToEdit;

  const [view, setView] = useState<'list' | 'schedule'>('list');
  const [selectedChild, setSelectedChild] = useState<ChildProfile | null>(null);

  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [existingAssignments, setExistingAssignments] = useState<Record<string, MissionInstance>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const [isRecurrenceEditModalOpen, setIsRecurrenceEditModalOpen] = useState(false);
  const [recurrenceEditMode, setRecurrenceEditMode] = useState<EditRecurrenceMode>('all');
  
  const form = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentFormSchema),
  });

  const getInitials = (name?: string | null) => {
    if (!name) return "MH"; 
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };
  
  const familyName = useMemo(() => {
    if (currentContext === 'my-space') return '';
    return availableContexts.find(c => c.id === currentContext)?.name || '';
  }, [currentContext, availableContexts]);
  
  const familyChildren = useMemo(() => children.filter(c => c.familyId), [children]);
  const personalChildren = useMemo(() => children.filter(c => !c.familyId), [children]);

  const resetDialogState = useCallback(() => {
      setView('list');
      setSelectedChild(null);
      form.reset({});
  }, [form]);

  const fetchData = useCallback(async () => {
    if (!user || !effectiveTemplate) return;
    setIsLoading(true);
    try {
      const [fetchedChildren, activeInstances] = await Promise.all([
        getChildProfilesForAttribution(user.uid, currentContext),
        getActiveMissionInstancesByTemplate(effectiveTemplate.templateId || effectiveTemplate.id, currentContext)
      ]);
      setChildren(fetchedChildren);
      const assignmentsMap = activeInstances.reduce((acc, instance) => {
        acc[instance.childId] = instance;
        return acc;
      }, {} as Record<string, MissionInstance>);
      setExistingAssignments(assignmentsMap);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ title: "Erro ao carregar dados", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user, effectiveTemplate, currentContext, toast]);
  
  useEffect(() => {
    const initialize = async () => {
        if (instanceToEdit) {
            setIsLoading(true);
            try {
                const child = await getChildProfileById(instanceToEdit.childId);
                if (child) {
                    setChildren([child]);
                    setSelectedChild(child);
                    prepareScheduleForm(instanceToEdit);
                    setView('schedule');
                } else {
                    toast({ title: "Erro", description: "Herói não encontrado para esta missão.", variant: 'destructive' });
                    onOpenChange(false);
                }
            } catch (error) {
                toast({ title: "Erro ao carregar dados da edição", variant: 'destructive' });
                onOpenChange(false);
            } finally {
                setIsLoading(false);
            }
        } else if (template) {
            await fetchData();
            setView('list');
        }
    };
    
    if (isOpen) {
        initialize();
    } else {
        resetDialogState();
    }
  }, [isOpen, instanceToEdit, template, fetchData, onOpenChange, resetDialogState, toast]);


  const handleSelectChild = (child: ChildProfile) => {
    const existingInstance = existingAssignments[child.id];
    setSelectedChild(child);
    
    if (existingInstance && existingInstance.isRecurring) {
        setIsRecurrenceEditModalOpen(true);
    } else {
        prepareScheduleForm(existingInstance || null);
        setView('schedule');
    }
  };
  
  const handleRecurrenceEditSelect = (mode: EditRecurrenceMode) => {
      setIsRecurrenceEditModalOpen(false);
      setRecurrenceEditMode(mode);
      prepareScheduleForm(existingAssignments[selectedChild!.id]);
      setView('schedule');
  };

  const prepareScheduleForm = (instance: MissionInstance | null) => {
    const source = instance || effectiveTemplate;
    if (!source) return;

    let startDate = source.startDate?.toDate() ?? null;
    let dueDate = source.dueDate?.toDate() ?? new Date();

    if(!instance) {
        const today = new Date();
        startDate = source.isRecurring ? today : null;
        dueDate = !source.isRecurring ? today : new Date();
    }

    const initialValues: AssignmentFormValues = {
        isRecurring: !!source.isRecurring,
        startDate: startDate,
        dueDate: dueDate,
        recurrenceRule: null,
    };

    if (source.recurrenceRule) {
        const rule = source.recurrenceRule as any;
        initialValues.recurrenceRule = { 
            ...rule, 
            endDate: rule.endDate?.toDate ? rule.endDate.toDate() : (rule.endDate || null) 
        };
    } else if (source.isRecurring) {
        initialValues.recurrenceRule = { freq: 'DAILY', interval: 1 };
    }

    form.reset(initialValues);
  };
  
  const handleUnassign = async () => {
    if (!user || !effectiveTemplate || !selectedChild) return;
    const templateId = effectiveTemplate.templateId || effectiveTemplate.id;
    setIsProcessing(true);
    try {
      await deleteMissionInstancesByTemplateAndChild(user, templateId, selectedChild.id);
      toast({ title: "Missão Desatribuída", description: `${effectiveTemplate.title} foi removida de ${selectedChild.name}.` });
      fetchData();
      resetDialogState();
    } catch (error) {
      console.error("Error unassigning mission:", error);
      toast({ title: "Erro ao desatribuir", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };


  const onSubmit = async (data: AssignmentFormValues) => {
    if (!user || !effectiveTemplate || !selectedChild) return;
    setIsProcessing(true);
    
    try {
      const existingInstance = instanceToEdit || existingAssignments[selectedChild.id];

      if (existingInstance) {
          const editDate = occurrenceDate || existingInstance.startDate?.toDate() || existingInstance.dueDate?.toDate();
          if (!editDate) throw new Error("Data da ocorrência não encontrada para edição.");
          
          await updateRecurringMissionInstance(existingInstance.id, recurrenceEditMode, data, editDate);
          toast({ title: "Agendamento Atualizado!" });
      } else {
          const finalTemplatePayload = { ...effectiveTemplate, ...data };
          const instanceData = {
              templateId: effectiveTemplate.id,
              childId: selectedChild.id,
              ownerId: selectedChild.ownerId,
              familyId: selectedChild.familyId || null,
          };
          await addMissionInstance(user, instanceData, finalTemplatePayload);
          toast({ title: "Missão Agendada!", description: `${effectiveTemplate.title} foi agendada para ${selectedChild.name}.` });
      }
      onAssigned?.();
      // If we are in edit mode, just close the dialog. Otherwise, reset for next assignment.
      if(instanceToEdit){
         onOpenChange(false);
      } else {
        fetchData();
        resetDialogState();
      }
    } catch (error) {
      console.error("Error saving assignment:", error);
      toast({ title: "Erro ao salvar agendamento", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const renderChildList = () => (
    <div className="space-y-4">
       {familyChildren.length > 0 && (
          <div className="space-y-2">
              <Label className="text-sm font-semibold text-muted-foreground">Na Aliança "{familyName}"</Label>
              {familyChildren.map(child => renderChildItem(child))}
          </div>
      )}
      {personalChildren.length > 0 && familyChildren.length > 0 && <Separator />}
      {personalChildren.length > 0 && (
          <div className="space-y-2">
              <Label className="text-sm font-semibold text-muted-foreground">No Seu Espaço Pessoal</Label>
              {personalChildren.map(child => renderChildItem(child))}
          </div>
      )}
    </div>
  );
  
  const renderChildItem = (child: ChildProfile) => {
    const isAssigned = !!existingAssignments[child.id];
    return (
      <div key={child.id} className="flex items-center justify-between p-3 rounded-md border bg-card">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10 ring-2 ring-offset-background ring-[var(--ring-color)]" style={{'--ring-color': child.color} as React.CSSProperties}>
            <AvatarImage src={child.avatar} alt={child.name} />
            <AvatarFallback style={{backgroundColor: child.color}}>{getInitials(child.name)}</AvatarFallback>
          </Avatar>
          <span className="font-medium">{child.name}</span>
        </div>
        <Button
          variant={isAssigned ? "secondary" : "default"}
          size="sm"
          onClick={() => handleSelectChild(child)}
          disabled={!canEdit}
        >
          {isAssigned ? <Edit className="mr-2 h-4 w-4" /> : <CalendarDays className="mr-2 h-4 w-4" />}
          {isAssigned ? "Editar Agenda" : "Agendar"}
        </Button>
      </div>
    );
  };
  
  const renderScheduleView = () => (
    <FormProvider {...form}>
       <form id="schedule-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
        <RecurrenceControl />
        <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between w-full pt-4">
            <div>
              {(instanceToEdit || existingAssignments[selectedChild!.id]) && (
                  <Button type="button" variant="destructive" onClick={handleUnassign} disabled={isProcessing || !canEdit}>
                      <XCircle className="mr-2 h-4 w-4" /> Desatribuir
                  </Button>
              )}
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:space-x-2 gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={() => instanceToEdit ? onOpenChange(false) : setView('list')}>
                  {instanceToEdit ? 'Cancelar' : <><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</>}
                </Button>
                <Button type="submit" disabled={isProcessing || !canEdit}>
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Salvar Agenda
                </Button>
            </div>
        </DialogFooter>
      </form>
    </FormProvider>
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Target className="h-6 w-6 text-primary" />
              {instanceToEdit ? 'Editar Missão' : 'Agendar Missão'}
            </DialogTitle>
            <DialogDescription>
              {view === 'list' 
                ? `Selecione um herói para agendar a missão "${effectiveTemplate?.title}".` 
                : `Configure o agendamento de "${effectiveTemplate?.title}" para ${selectedChild?.name}.`
              }
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center h-40"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : view === 'list' ? (
             <ScrollArea className="max-h-[50vh] mt-2 pr-3">
              {children.length > 0 ? renderChildList() : (
                 <div className="text-center py-6 text-muted-foreground">
                    <AlertCircle className="h-10 w-10 mx-auto mb-2 text-primary" />
                    Nenhum herói encontrado para atribuição.
                  </div>
              )}
            </ScrollArea>
          ) : (
            renderScheduleView()
          )}

          {view === 'list' && (
            <DialogFooter className="mt-4">
              <DialogClose asChild><Button variant="outline">Fechar</Button></DialogClose>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
      
      {selectedChild && existingAssignments[selectedChild.id] && (
         <EditRecurrenceDialog 
            isOpen={isRecurrenceEditModalOpen}
            onOpenChange={setIsRecurrenceEditModalOpen}
            onSelect={handleRecurrenceEditSelect}
            missionInstance={existingAssignments[selectedChild.id]}
            occurrenceDate={occurrenceDate || existingAssignments[selectedChild.id].startDate?.toDate() || new Date()}
         />
      )}
    </>
  );
}

    