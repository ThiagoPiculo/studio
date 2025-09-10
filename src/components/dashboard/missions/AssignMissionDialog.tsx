
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
import type { MissionTemplate, ChildProfile, MissionInstance, SchoolShift, FamilyRole } from '@/lib/types';
import {
  getChildProfilesForAttribution,
  addMissionInstance,
  updateRecurringMissionInstance,
  deleteMissionInstancesByTemplateAndChild,
  getMissionTemplateById,
  getChildProfileById,
  getActiveMissionInstancesByTemplate
} from '@/lib/firebase/firestore';
import { Loader2, Users, AlertCircle, Target, Edit, CalendarDays, Save, ArrowLeft, XCircle, NotebookPen, Info, CircleDot, Link as LinkIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useForm, FormProvider } from 'react-hook-form';
import { Form } from '@/components/ui/form';
import { RecurrenceControl } from './RecurrenceControl';
import type { EditRecurrenceMode } from './EditRecurrenceDialog';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import Link from 'next/link';
import { getDateObject } from '@/lib/calendar-utils';


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
                code: 'custom',
                path: ['recurrenceRule.endDate'],
                message: "A data de fim da recorrência não pode ser anterior à data de início.",
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
  recurrenceEditMode?: EditRecurrenceMode | null;
  occurrenceDate?: Date | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAssigned?: () => void;
}

const schoolShiftMap: Record<SchoolShift, string> = {
    morning: 'Manhã',
    afternoon: 'Tarde',
    full_time: 'Integral',
    not_applicable: 'Não se aplica'
};

export function AssignMissionDialog({ template, instanceToEdit, recurrenceEditMode, occurrenceDate, isOpen, onOpenChange, onAssigned }: AssignMissionDialogProps) {
  const { user } = useAuth();
  const { currentContext, availableContexts, currentRole } = useFamily();
  const canEdit = useMemo(() => {
    if (currentContext === 'my-space') return true;
    if (!currentRole) return false;
    const editableRoles: FamilyRole[] = ['Owner', 'Co-Owner', 'Guardian'];
    return editableRoles.includes(currentRole as FamilyRole);
  }, [currentContext, currentRole]);
  const { toast } = useToast();

  const [effectiveTemplate, setEffectiveTemplate] = useState<MissionTemplate | MissionInstance | null>(template || instanceToEdit);

  const [view, setView] = useState<'list' | 'schedule'>('list');
  const [selectedChild, setSelectedChild] = useState<ChildProfile | null>(null);

  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [existingAssignments, setExistingAssignments] = useState<Record<string, MissionInstance>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

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
  
  const familyChildren = useMemo(() => children.filter(c => c.familyId).sort((a,b) => a.name.localeCompare(b.name)), [children]);
  const personalChildren = useMemo(() => children.filter(c => !c.familyId).sort((a,b) => a.name.localeCompare(b.name)), [children]);

  const resetDialogState = useCallback(() => {
      setView('list');
      setSelectedChild(null);
      form.reset({});
  }, [form]);
  
  const prepareScheduleForm = useCallback((instance: MissionInstance | null) => {
    if (!effectiveTemplate) return;
    const source = instance || effectiveTemplate;
    
    let startDate = getDateObject(source.startDate);
    let dueDate = getDateObject(source.dueDate);

    // If it's a new assignment, set sensible defaults
    if (!instance) {
      const today = new Date();
      startDate = source.isRecurring ? today : null;
      dueDate = !source.isRecurring ? today : new Date();
    } else if (!startDate && !dueDate) { // Fallback for old instances without dates
        dueDate = new Date();
    }
    
    const initialValues: AssignmentFormValues = {
      isRecurring: !!source.isRecurring,
      startDate: startDate,
      dueDate: dueDate || new Date(), // Default due date for form validity
      recurrenceRule: null,
    };

    if (source.recurrenceRule) {
        const rule = source.recurrenceRule as any;
        initialValues.recurrenceRule = { 
            ...rule, 
            endDate: getDateObject(rule.endDate) 
        };
    } else if (source.isRecurring) {
        // Provide a default recurrence rule if none exists for a recurring mission
        initialValues.recurrenceRule = { freq: 'DAILY', interval: 1 };
    }

    form.reset(initialValues);
  }, [form, effectiveTemplate]);
  
  const fetchDataForList = useCallback(async () => {
    if (!user || !effectiveTemplate) return;
    setIsLoading(true);
    try {
      const templateId = 'templateId' in effectiveTemplate ? effectiveTemplate.templateId : effectiveTemplate.id;
      const [fetchedChildren, activeInstances] = await Promise.all([
        getChildProfilesForAttribution(user.uid, currentContext),
        getActiveMissionInstancesByTemplate(user.uid, templateId, currentContext)
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
    if (!isOpen) {
      resetDialogState();
      return;
    }
    
    const initialize = async () => {
        setIsLoading(true);
        if (instanceToEdit) {
            try {
                const fetchedChild = await getChildProfileById(instanceToEdit.childId);
                if (!fetchedChild) {
                    toast({ title: "Erro", description: "Herói não encontrado para esta missão.", variant: 'destructive' });
                    onOpenChange(false);
                    return;
                }
                const templateId = instanceToEdit.templateId;
                const fetchedTemplate = await getMissionTemplateById(templateId);
                 if (!fetchedTemplate) {
                    toast({ title: "Erro", description: "O modelo desta missão não foi encontrado ou foi arquivado.", variant: 'destructive' });
                    onOpenChange(false);
                    return;
                }
                setEffectiveTemplate(fetchedTemplate);
                setChildren([fetchedChild]);
                setSelectedChild(fetchedChild);
                prepareScheduleForm(instanceToEdit);
                setView('schedule');
            } catch (error) {
                console.error("Error initializing edit dialog:", error);
                toast({ title: "Erro ao carregar dados da edição", variant: 'destructive' });
                onOpenChange(false);
            } finally {
                setIsLoading(false);
            }
        } else if (template) {
            setEffectiveTemplate(template);
            await fetchDataForList();
            setView('list');
        }
    };

    initialize();
}, [isOpen, instanceToEdit, template, fetchDataForList, onOpenChange, prepareScheduleForm, toast]);


  const handleSelectChild = (child: ChildProfile) => {
    const existingInstance = existingAssignments[child.id];
    setSelectedChild(child);
    prepareScheduleForm(existingInstance || null);
    setView('schedule');
  };
  
  const handleUnassign = async () => {
    if (!user || !effectiveTemplate || !selectedChild) return;
    const templateId = 'templateId' in effectiveTemplate ? effectiveTemplate.templateId : effectiveTemplate.id;
    setIsProcessing(true);
    try {
      await deleteMissionInstancesByTemplateAndChild(user, templateId, selectedChild.id);
      toast({ title: "Missão Desatribuída", description: `${effectiveTemplate.title} foi removida de ${selectedChild.name}.` });
      fetchDataForList();
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

      if (existingInstance && recurrenceEditMode) {
          const editDate = occurrenceDate || getDateObject(existingInstance.startDate) || getDateObject(existingInstance.dueDate);
          if (!editDate) throw new Error("Data da ocorrência não encontrada para edição.");
          
          await updateRecurringMissionInstance(existingInstance.id, recurrenceEditMode, data, editDate);
          toast({ title: "Agendamento Atualizado!" });
      } else {
          if (!('ownerId' in effectiveTemplate)) throw new Error("Cannot assign from an instance.");

          const instanceData = {
              templateId: effectiveTemplate.id,
              childId: selectedChild.id,
              ownerId: selectedChild.ownerId,
              familyId: selectedChild.familyId || null,
          };
          const finalSchedulePayload = { ...effectiveTemplate, ...data };
          await addMissionInstance(user, instanceData, finalSchedulePayload);
          toast({ title: "Missão Agendada!", description: `${effectiveTemplate.title} foi agendada para ${selectedChild.name}.` });
      }
      onAssigned?.();
      
      if(instanceToEdit){
         onOpenChange(false);
      } else {
        fetchDataForList();
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
  
  const renderScheduleView = () => {
    const shiftLabel = selectedChild?.schoolShift ? schoolShiftMap[selectedChild.schoolShift] : null;

    return (
      <FormProvider {...form}>
        <form id="schedule-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="flex items-center justify-center p-2 rounded-md bg-muted/50 text-xs text-muted-foreground gap-2">
              <NotebookPen className="h-4 w-4 shrink-0" />
              {selectedChild?.schoolShift && selectedChild.schoolShift !== 'not_applicable' ? (
                  <p>
                      Turno Escolar: <strong>{shiftLabel} ({selectedChild.schoolShiftStart} - {selectedChild.schoolShiftEnd})</strong>
                  </p>
              ) : (
                   <Link href={`/dashboard/child/${selectedChild?.id}/manage?tab=edit`} className="hover:underline text-primary font-semibold">
                      Lembrete: defina o turno escolar do herói →
                   </Link>
              )}
          </div>
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
  };

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
                : <>Configure o agendamento de <strong className="text-foreground">"{effectiveTemplate?.title}"</strong> para <strong className="text-foreground">{selectedChild?.name}</strong>.</>
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
            <DialogFooter className="mt-4 flex-col gap-2 text-left">
                <div className="flex items-center gap-2 text-xs text-muted-foreground w-full">
                    <Info className="h-4 w-4 shrink-0" />
                    <p>
                        Para escolher outros heróis, feche a tela e troque o espaço de trabalho no topo da página.
                    </p>
                </div>
                <div className="self-end">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
                </div>
            </DialogFooter>
          )}

        </DialogContent>
      </Dialog>
    </>
  );
}
