
"use client";

import { useFormContext, useFieldArray } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { predefinedMissionGroups } from "@/lib/predefined-missions";
import { useEffect, useState } from "react";
import { ActivityFormValues, OnboardingFormValues } from "../OnboardingForm";
import { Wand2, Loader2 } from "lucide-react";
import { processScheduleText, type ProcessScheduleTextInput } from "@/ai/flows/process-schedule-text";
import { useToast } from "@/hooks/use-toast";
import { allWeekdays, weekdayLabels, Weekday } from "@/lib/types";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { TimePicker } from "../../missions/TimePicker";

const essentialRoutinesGroup = predefinedMissionGroups.find(g => g.userCategory === 'Rotinas Essencial (diárias)');
const essentialRoutines = essentialRoutinesGroup ? essentialRoutinesGroup.items.map(item => ({ id: item.title, label: item.title, emoji: item.emoji })) : [];

function ActivityScheduler({ activityIndex }: { activityIndex: number }) {
    const { control } = useFormContext();
    const fieldName = `essentialRoutines.${activityIndex}`;

    return (
        <div className="p-3 border rounded-lg space-y-3 bg-muted/50 mt-2">
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
             <FormField
                control={control}
                name={`${fieldName}.time`}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-xs">Horário</FormLabel>
                        <FormControl>
                           <TimePicker {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
    )
}

export function OnboardingStep4() {
  const { control, setValue, getValues, watch } = useFormContext<OnboardingFormValues>();
  const { fields, append, remove, replace } = useFieldArray({
      control,
      name: "essentialRoutines"
  });
  
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const selectedRoutineNames = watch('essentialRoutines')?.map(r => r.name) || [];

  const handleRoutineToggle = (routineName: string, emoji: string, isChecked: boolean) => {
    const index = fields.findIndex(field => (field as any).name === routineName);
    if (isChecked) {
        if (index === -1) {
            append({ name: routineName, emoji: emoji, days: [], time: '08:00' });
        }
    } else {
        if (index > -1) {
            remove(index);
        }
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
        const routinesToAppend = essentialRoutines
            .filter(r => !selectedRoutineNames.includes(r.label))
            .map(r => ({ name: r.label, emoji: r.emoji, days: [], time: '08:00' }));
        append(routinesToAppend);
    } else {
        remove(); // remove all
    }
  };

  const handleGenerateSchedules = async () => {
      setIsGenerating(true);
      const values = getValues();
      const birthDate = new Date(values.birthDate as string);
      const age = new Date().getFullYear() - birthDate.getFullYear();
      
      const routinesToSchedule = values.essentialRoutines?.map(r => r.name) || [];
      if (routinesToSchedule.length === 0) {
        toast({ title: "Selecione ao menos uma rotina", variant: 'default' });
        setIsGenerating(false);
        return;
      }

      const input: ProcessScheduleTextInput = {
          childAge: age,
          childName: values.name,
          schoolShift: values.schoolShift,
          schoolStartTime: values.schoolShiftStart,
          schoolEndTime: values.schoolShiftEnd,
          essentialRoutines: routinesToSchedule,
      };

      try {
          const result = await processScheduleText(input);
          const currentRoutines = getValues('essentialRoutines') || [];
          const updatedRoutines: ActivityFormValues[] = [];
          
          currentRoutines.forEach(currentRoutine => {
              const aiSuggestion = result.schedule.find(s => s.activity === currentRoutine.name);
              if (aiSuggestion) {
                  updatedRoutines.push({
                      ...currentRoutine,
                      days: aiSuggestion.days as Weekday[],
                      time: aiSuggestion.startTime,
                  });
              } else {
                  updatedRoutines.push(currentRoutine);
              }
          });
          replace(updatedRoutines);
          toast({ title: "Horários preenchidos!", description: "A IA sugeriu os melhores horários. Ajuste se necessário."});
      } catch (error) {
          toast({ title: "Erro ao gerar horários", variant: "destructive" });
      } finally {
          setIsGenerating(false);
      }
  }

  const allSelected = fields.length === essentialRoutines.length && fields.length > 0;

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      <div className="text-center">
        <h2 className="text-2xl font-bold font-headline">Rotinas Essenciais do Herói</h2>
        <p className="text-muted-foreground">Estas são as tarefas diárias que formam a base de um grande herói. Selecione as que fazem sentido e clique em "Preencher Automático" para que a IA sugira os melhores horários!</p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4 border-b pb-2">
            <div className="flex items-center space-x-2">
                <Checkbox
                    id="select-all-routines"
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                />
                <label htmlFor="select-all-routines" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Selecionar Todas
                </label>
            </div>
            <Button type="button" size="sm" onClick={handleGenerateSchedules} disabled={isGenerating}>
                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Wand2 className="mr-2 h-4 w-4"/>}
                Preencher Automático
            </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {essentialRoutines.map((item) => {
                const currentFieldIndex = fields.findIndex(f => (f as any).name === item.label);
                const isChecked = currentFieldIndex > -1;

                return (
                    <div key={item.id} className="space-y-2">
                        <div className="flex items-center space-x-2 rounded-md border p-3 hover:bg-accent/50">
                            <Checkbox
                                id={item.id}
                                checked={isChecked}
                                onCheckedChange={(checked) => handleRoutineToggle(item.label, item.emoji, !!checked)}
                            />
                            <Label htmlFor={item.id} className="flex-1 cursor-pointer flex items-center gap-2">
                                <span className="text-xl">{item.emoji}</span>
                                {item.label}
                            </Label>
                        </div>
                        {isChecked && <ActivityScheduler activityIndex={currentFieldIndex} />}
                    </div>
                )
            })}
        </div>
      </div>
    </div>
  );
}
