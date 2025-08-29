
"use client";

import { useFormContext } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { predefinedMissionGroups } from "@/lib/predefined-missions";
import { OnboardingFormValues } from "../OnboardingForm";
import { useFieldArray } from "react-hook-form";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

const essentialRoutinesGroup = predefinedMissionGroups.find(g => g.userCategory === 'Rotinas Essencial (diárias)');
const essentialRoutines = essentialRoutinesGroup ? essentialRoutinesGroup.items.map(item => ({ id: item.title, label: item.title, emoji: item.emoji })) : [];

const categories = {
  'Casa': predefinedMissionGroups.find(g => g.userCategory === 'Ajudar em Casa')?.items || [],
  'Saúde': predefinedMissionGroups.find(g => g.userCategory === 'Saúde e Bem-Estar')?.items || [],
  'Comportamental': predefinedMissionGroups.find(g => g.userCategory === 'Comportamental')?.items || [],
};

export function OnboardingStep4() {
  const { control, watch } = useFormContext<OnboardingFormValues>();
  const { fields, append, remove } = useFieldArray({
      control,
      name: "essentialRoutines" as any
  });

  const selectedRoutines = watch('essentialRoutines') || [];
  
  // Get anchor times from the form state
  const anchorTimes = {
    'Hora de acordar': watch('wakeUpTime'),
    'Almoçar': watch('lunchTime'),
    'Jantar': watch('dinnerTime'),
    'Hora de dormir': watch('sleepTime'),
  };

  const handleRoutineToggle = (routineName: string, isChecked: boolean) => {
    const index = selectedRoutines.indexOf(routineName);
    if (isChecked) {
        if (index === -1) append(routineName as never);
    } else {
        if (index > -1) remove(index);
    }
  };

  const allRoutines = [...essentialRoutines, ...categories.Casa, ...categories.Saúde, ...categories.Comportamental];

  const renderRoutineItem = (item: {id: string, label: string, emoji: string}) => {
    const isChecked = selectedRoutines.includes(item.id);
    const time = anchorTimes[item.id as keyof typeof anchorTimes];

    return (
        <div className="flex items-center space-x-2 rounded-md border p-3 hover:bg-accent/50 has-[:checked]:bg-primary/10 has-[:checked]:border-primary/50 transition-colors">
            <Checkbox
                id={item.id}
                checked={isChecked}
                onCheckedChange={(checked) => handleRoutineToggle(item.id, !!checked)}
            />
            <Label htmlFor={item.id} className="flex-1 cursor-pointer flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className="text-xl">{item.emoji}</span>
                    {item.id}
                </div>
                {time && (
                    <Badge variant="secondary" className="flex items-center gap-1.5 font-mono text-sm">
                        <Clock className="h-3 w-3" />
                        {time}
                    </Badge>
                )}
            </Label>
        </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      <div className="text-center">
        <p className="text-muted-foreground">Estas são as tarefas que formam a base de um grande herói. Selecione as que fazem sentido para a rotina que vamos criar.</p>
      </div>

       <Accordion type="multiple" defaultValue={['Rotinas Essenciais']} className="w-full space-y-2">
        {Object.entries({
            'Rotinas Essenciais': essentialRoutines,
            'Ajudar em Casa': categories.Casa,
            'Saúde e Bem-Estar': categories.Saúde,
            'Comportamental': categories.Comportamental,
        }).map(([category, items]) => (
            <AccordionItem value={category} key={category} className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">{category}</AccordionTrigger>
                <AccordionContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                        {items.map((item) => (
                           <div key={item.title}>
                             {renderRoutineItem({ id: item.title, label: item.title, emoji: item.emoji })}
                           </div>
                        ))}
                    </div>
                </AccordionContent>
            </AccordionItem>
        ))}
       </Accordion>

    </div>
  );
}
