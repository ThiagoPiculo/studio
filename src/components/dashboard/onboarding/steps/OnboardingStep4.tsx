
"use client";

import { useFormContext } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { predefinedMissionGroups } from "@/lib/predefined-missions";
import { OnboardingFormValues } from "../OnboardingForm";
import { useFieldArray } from "react-hook-form";

const essentialRoutinesGroup = predefinedMissionGroups.find(g => g.userCategory === 'Rotinas Essencial (diárias)');
const essentialRoutines = essentialRoutinesGroup ? essentialRoutinesGroup.items.map(item => ({ id: item.title, label: item.title, emoji: item.emoji })) : [];


export function OnboardingStep4() {
  const { control, watch } = useFormContext<OnboardingFormValues>();
  const { fields, append, remove } = useFieldArray({
      control,
      name: "essentialRoutines" as any // Use `any` to bypass strict typing issues with field array on simple string arrays
  });

  const selectedRoutines = watch('essentialRoutines') || [];

  const handleRoutineToggle = (routineName: string, isChecked: boolean) => {
    const index = selectedRoutines.indexOf(routineName);
    if (isChecked) {
        if (index === -1) {
            append(routineName as never); // `as never` is a workaround for RHF string array typing
        }
    } else {
        if (index > -1) {
            remove(index);
        }
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allRoutineNames = essentialRoutines.map(r => r.label);
      remove(); // Clear existing
      append(allRoutineNames.map(name => name as never)); // Append all
    } else {
      remove(); // remove all
    }
  };

  const allSelected = essentialRoutines.every(r => selectedRoutines.includes(r.label));

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      <div className="text-center">
        <p className="text-muted-foreground">Estas são as tarefas diárias que formam a base de um grande herói. Selecione as que fazem sentido para a rotina que vamos criar.</p>
      </div>

      <div>
        <div className="flex items-center space-x-2 mb-4 border-b pb-2">
            <Checkbox
                id="select-all-routines"
                checked={allSelected}
                onCheckedChange={handleSelectAll}
            />
            <label htmlFor="select-all-routines" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Selecionar Todas as Rotinas Essenciais
            </label>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {essentialRoutines.map((item) => {
                const isChecked = selectedRoutines.includes(item.label);
                return (
                    <div key={item.id} className="flex items-center space-x-2 rounded-md border p-3 hover:bg-accent/50">
                        <Checkbox
                            id={item.id}
                            checked={isChecked}
                            onCheckedChange={(checked) => handleRoutineToggle(item.label, !!checked)}
                        />
                        <Label htmlFor={item.id} className="flex-1 cursor-pointer flex items-center gap-2">
                            <span className="text-xl">{item.emoji}</span>
                            {item.label}
                        </Label>
                    </div>
                )
            })}
        </div>
      </div>
    </div>
  );
}
