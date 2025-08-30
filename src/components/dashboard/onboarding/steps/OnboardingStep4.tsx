
"use client";

import { useFormContext, useFieldArray } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { TimePicker } from "../../missions/TimePicker";
import { predefinedMissionGroups } from "@/lib/predefined-missions";
import { AlertCircle, Trash2, PlusCircle } from "lucide-react";
import { allWeekdays, weekdayLabels, type Weekday } from "@/lib/types";
import { OnboardingFormValues, type ActivityFormValues } from "../OnboardingForm";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { parseTime } from "@/lib/calendar-utils";
import React, { useEffect, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import * as z from "zod";
import { FormField, FormMessage, FormControl, FormItem, FormLabel, FormDescription } from "@/components/ui/form";
import { addMinutes, format } from "date-fns";
import { Input } from "@/components/ui/input";


export const extraActivitySchema = z.object({
  name: z.string(),
  days: z.array(z.string()).min(1, "Selecione pelo menos um dia."),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Horário de início inválido."),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Horário de término inválido."),
}).refine(data => data.startTime < data.endTime, {
    message: "O término deve ser depois do início.",
    path: ["endTime"],
});

export const onboardingSchemaStep4 = z.object({
  extraActivities: z.array(extraActivitySchema).optional(),
});


function ActivityScheduler({ activityIndex, remove, hasError }: { activityIndex: number, remove: (index: number) => void, hasError: boolean }) {
    const { control, watch, setValue } = useFormContext();
    const fieldName = `extraActivities.${activityIndex}`;
    
    const schoolShift = watch('schoolShift');
    const schoolShiftStart = watch('schoolShiftStart');
    const schoolShiftEnd = watch('schoolShiftEnd');
    const activityStartTime = watch(`${fieldName}.startTime`);
    const activityEndTime = watch(`${fieldName}.endTime`);
    
    const handleStartTimeChange = useCallback((newStartTime: string) => {
        setValue(`${fieldName}.startTime`, newStartTime, { shouldValidate: true });
        
        // Automatically update endTime to be 60 minutes after startTime
        const startMinutes = parseTime(newStartTime);
        const newEndDate = addMinutes(new Date().setHours(0, 0, 0, 0), startMinutes + 60);
        const newEndTime = format(newEndDate, 'HH:mm');
        setValue(`${fieldName}.endTime`, newEndTime, { shouldValidate: true });
    }, [fieldName, setValue]);


    const hasConflict = React.useMemo(() => {
        if (schoolShift === 'not_applicable' || !activityStartTime || !activityEndTime) return false;
        
        const activityStartMinutes = parseTime(activityStartTime);
        const activityEndMinutes = parseTime(activityEndTime);
        const schoolStartMinutes = parseTime(schoolShiftStart);
        const schoolEndMinutes = parseTime(schoolShiftEnd);
        
        // Check for any overlap
        return Math.max(activityStartMinutes, schoolStartMinutes) < Math.min(activityEndMinutes, schoolEndMinutes);

    }, [schoolShift, schoolShiftStart, schoolShiftEnd, activityStartTime, activityEndTime]);

    return (
        <div className={cn("p-3 border rounded-lg space-y-3 bg-muted/50 mt-2 relative", hasError && "border-destructive ring-2 ring-destructive/50")}>
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 text-destructive"
                onClick={() => remove(activityIndex)}
            >
                <Trash2 className="h-4 w-4" />
            </Button>
            <FormField
                control={control}
                name={`${fieldName}.days`}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-xs">Dias da Semana</FormLabel>
                        <FormControl>
                            <ToggleGroup
                                type="multiple"
                                variant="outline"
                                value={field.value || []}
                                onValueChange={field.onChange}
                                className="flex flex-wrap justify-start gap-1"
                            >
                                {allWeekdays.map(day => (
                                    <ToggleGroupItem 
                                      key={day} 
                                      value={day} 
                                      className="h-7 w-7 p-0 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                                    >
                                        {weekdayLabels[day].short}
                                    </ToggleGroupItem>
                                ))}
                            </ToggleGroup>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <div className="grid grid-cols-2 gap-2">
                 <FormField
                    control={control}
                    name={`${fieldName}.startTime`}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs">Início</FormLabel>
                            <FormControl>
                               <TimePicker {...field} onChange={handleStartTimeChange} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={control}
                    name={`${fieldName}.endTime`}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs">Fim</FormLabel>
                            <FormControl>
                               <TimePicker {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
             {hasConflict && (
                <FormDescription>
                   <span className="text-destructive text-xs flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" />
                      Conflita com o horário escolar.
                   </span>
                </FormDescription>
            )}
        </div>
    )
}

const categoriesForStep4 = [
    'Terapias e Acompanhamentos de Saúde',
    'Prática de Esportes',
    'Prática de Artes',
    'Prática de Idiomas',
];

const extraActivityGroups = predefinedMissionGroups
    .filter(g => categoriesForStep4.includes(g.userCategory))
    .sort((a, b) => categoriesForStep4.indexOf(a.userCategory) - categoriesForStep4.indexOf(b.userCategory));

export interface ExtraActivityError {
    index: number;
    field: 'days' | 'time';
}

interface OnboardingStep4Props {
    errorToHighlight: ExtraActivityError | null;
}

export function OnboardingStep4({ errorToHighlight }: OnboardingStep4Props) {
  const { control, watch } = useFormContext<OnboardingFormValues>();
  const { fields, append, remove } = useFieldArray({
      control,
      name: "extraActivities"
  });
  
  const [customActivityInputs, setCustomActivityInputs] = React.useState<Record<string, Partial<ActivityFormValues>>>({});
  const { toast } = useToast();

  const [openAccordions, setOpenAccordions] = React.useState<string[]>([]);
  
  React.useEffect(() => {
    if (errorToHighlight) {
      const activityWithError = (fields[errorToHighlight.index] as any);
      if (activityWithError) {
        const groupWithError = extraActivityGroups.find(g => g.items.some(item => item.title === activityWithError.name));
        if (groupWithError && !openAccordions.includes(groupWithError.userCategory)) {
          setOpenAccordions(prev => [...prev, groupWithError.userCategory]);
        }
      }
    }
  }, [errorToHighlight, fields, openAccordions]);
  
  const allActivities = watch('extraActivities') as (ActivityFormValues & { emoji?: string })[];

  const handleActivityToggle = (activityName: string, emoji: string, isChecked: boolean) => {
    if (isChecked) {
        append({ name: activityName, days: [], startTime: '18:00', endTime: '19:00', emoji: emoji } as any);
    } else {
        const indexToRemove = fields.findIndex(field => (field as any).name === activityName);
        if (indexToRemove > -1) {
            remove(indexToRemove);
        }
    }
  };

  const handleCustomFormChange = (category: string, field: keyof ActivityFormValues, value: any) => {
    setCustomActivityInputs(prev => ({
        ...prev,
        [category]: {
            ...prev[category],
            [field]: value,
        }
    }));
  };

  const handleAddCustomActivity = (category: string) => {
    const activityData = customActivityInputs[category];
    if (!activityData || !activityData.name?.trim() || !activityData.days || activityData.days.length === 0 || !activityData.startTime || !activityData.endTime) {
        toast({
            title: "Faltam Informações",
            description: "Por favor, preencha nome, dias e horários para a nova atividade.",
            variant: "destructive"
        });
        return;
    }
    
    append({
        name: activityData.name.trim(),
        emoji: '✨', // Default emoji
        days: activityData.days,
        startTime: activityData.startTime,
        endTime: activityData.endTime,
    } as any);

    // Reset the form for that category
    setCustomActivityInputs(prev => ({
        ...prev,
        [category]: { name: '', days: [], startTime: '18:00', endTime: '19:00' }
    }));
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      <div className="text-center">
        <p className="text-muted-foreground">Agora, vamos adicionar os treinos que aprimoram os talentos do nosso herói. Marque as atividades e defina os horários fixos para cada uma delas.</p>
      </div>

      <Accordion type="multiple" value={openAccordions} onValueChange={setOpenAccordions} className="w-full space-y-2">
        {extraActivityGroups.map((group) => {
            const activitiesInGroup = allActivities?.filter(activity => 
                group.items.some(item => item.title === activity.name) ||
                !predefinedMissionGroups.flatMap(g => g.items).some(item => item.title === activity.name)
            ) || [];

            return (
                <AccordionItem value={group.userCategory} key={group.userCategory} className="border rounded-lg px-4">
                    <AccordionTrigger>
                        <div className="flex flex-col text-left items-start gap-2 w-full">
                            <div className="flex items-center gap-3">
                                <group.icon className="h-6 w-6 text-primary" />
                                <span className="font-semibold">{group.userCategory}</span>
                            </div>
                            {activitiesInGroup.length > 0 && (
                                <div className="pl-9 text-xs text-muted-foreground font-normal space-y-0.5">
                                    {activitiesInGroup.map(activity => (
                                        <p key={activity.name} className="truncate flex items-center gap-2">
                                            - <span className="text-base">{activity.emoji}</span> {activity.name}: {activity.days?.map(d => weekdayLabels[d as Weekday].short).join(', ') || 'Nenhum dia'} das {activity.startTime || 'N/A'} às {activity.endTime || 'N/A'}
                                        </p>
                                    ))}
                                </div>
                            )}
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {group.items.map(item => {
                                const currentFieldIndex = fields.findIndex(f => (f as any).name === item.title);
                                const isChecked = currentFieldIndex > -1;
                                const hasError = errorToHighlight?.index === currentFieldIndex;

                                return (
                                    <div key={item.title} className="space-y-2">
                                        <div className="flex items-center space-x-2 rounded-md border p-3 hover:bg-accent/50">
                                            <Checkbox
                                                id={`${group.userCategory}-${item.title}`}
                                                checked={isChecked}
                                                onCheckedChange={(checked) => handleActivityToggle(item.title, item.emoji, !!checked)}
                                            />
                                            <Label htmlFor={`${group.userCategory}-${item.title}`} className="flex-1 cursor-pointer flex items-center gap-2">
                                            <span className="text-xl">{item.emoji}</span>
                                            {item.title}
                                            </Label>
                                        </div>
                                        {isChecked && <ActivityScheduler activityIndex={currentFieldIndex} remove={remove} hasError={hasError} />}
                                    </div>
                                )
                            })}
                        </div>
                         <div className="mt-4 pt-4 border-t space-y-3">
                            <Label className="text-sm font-semibold">Adicionar outra atividade</Label>
                            <div className="p-3 border rounded-lg bg-background space-y-3">
                                <Input
                                    placeholder={`Ex: ${group.items[0]?.title || 'Nova Atividade'}`}
                                    value={customActivityInputs[group.userCategory]?.name || ''}
                                    onChange={(e) => handleCustomFormChange(group.userCategory, 'name', e.target.value)}
                                />
                                <ToggleGroup
                                    type="multiple"
                                    variant="outline"
                                    value={customActivityInputs[group.userCategory]?.days || []}
                                    onValueChange={(value) => handleCustomFormChange(group.userCategory, 'days', value)}
                                    className="flex flex-wrap justify-start gap-1"
                                >
                                    {allWeekdays.map(day => (
                                        <ToggleGroupItem key={day} value={day} className="h-7 w-7 p-0 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                                            {weekdayLabels[day].short}
                                        </ToggleGroupItem>
                                    ))}
                                </ToggleGroup>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <Label className="text-xs">Início</Label>
                                        <TimePicker
                                            value={customActivityInputs[group.userCategory]?.startTime || '18:00'}
                                            onChange={(value) => handleCustomFormChange(group.userCategory, 'startTime', value)}
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs">Fim</Label>
                                        <TimePicker
                                            value={customActivityInputs[group.userCategory]?.endTime || '19:00'}
                                            onChange={(value) => handleCustomFormChange(group.userCategory, 'endTime', value)}
                                        />
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    size="sm"
                                    className="w-full"
                                    onClick={() => handleAddCustomActivity(group.userCategory)}
                                >
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Adicionar à Lista
                                </Button>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            );
        })}
      </Accordion>
    </div>
  );
}
