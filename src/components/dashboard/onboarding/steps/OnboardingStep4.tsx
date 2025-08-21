
"use client";

import { useFormContext } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { predefinedMissionGroups } from "@/lib/predefined-missions";
import { useEffect } from "react";

const essentialRoutinesGroup = predefinedMissionGroups.find(g => g.userCategory === 'Rotinas Essencial (diárias)');
const essentialRoutines = essentialRoutinesGroup ? essentialRoutinesGroup.items.map(item => ({ id: item.title, label: item.title, emoji: item.emoji })) : [];

interface OnboardingStep4Props {
    onGenerate: () => void;
}

export function OnboardingStep4({ onGenerate }: OnboardingStep4Props) {
  const { control, setValue, getValues, watch } = useFormContext();
  
  const selectedRoutines = watch('essentialRoutines');
  const allSelected = selectedRoutines?.length === essentialRoutines.length;
  
  // By default, all essential routines are selected
  useEffect(() => {
    if (!getValues('essentialRoutines') || getValues('essentialRoutines').length === 0) {
        setValue('essentialRoutines', essentialRoutines.map(r => r.label));
    }
  }, [setValue, getValues]);
  
  const handleSelectAll = (checked: boolean) => {
      setValue('essentialRoutines', checked ? essentialRoutines.map(r => r.label) : []);
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      <div className="text-center">
        <h2 className="text-2xl font-bold font-headline">Rotinas Essenciais do Herói</h2>
        <p className="text-muted-foreground">Estas são as tarefas diárias que formam a base de um grande herói. Selecione quais delas farão parte da rotina. A IA irá sugerir os melhores horários para elas!</p>
      </div>

      <FormField
        control={control}
        name="essentialRoutines"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between mb-4 border-b pb-2">
                <FormLabel className="text-lg font-semibold">Selecione as Rotinas</FormLabel>
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
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {essentialRoutines.map((item) => (
                <FormField
                    key={item.id}
                    control={control}
                    name="essentialRoutines"
                    render={({ field }) => {
                    return (
                        <FormItem
                        key={item.id}
                        className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 hover:bg-accent/50"
                        >
                        <FormControl>
                            <Checkbox
                            checked={field.value?.includes(item.label)}
                            onCheckedChange={(checked) => {
                                const newValue = checked
                                ? [...(field.value || []), item.label]
                                : field.value?.filter((value) => value !== item.label);
                                field.onChange(newValue);
                            }}
                            />
                        </FormControl>
                        <FormLabel className="font-normal w-full cursor-pointer flex items-center gap-2">
                            <span className="text-xl">{item.emoji}</span>
                            {item.label}
                        </FormLabel>
                        </FormItem>
                    )
                    }}
                />
                ))}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="flex justify-end pt-4">
        <Button type="button" onClick={onGenerate}>
           Gerar Rotina Mágica
        </Button>
      </div>
    </div>
  );
}
