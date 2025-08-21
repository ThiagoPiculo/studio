
"use client";

import { useFormContext, useFieldArray } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { TimePicker } from "../../school-schedule/TimePicker";
import { predefinedMissionGroups } from "@/lib/predefined-missions";
import { Trash2 } from "lucide-react";
import { allWeekdays, weekdayLabels } from "@/lib/types";

const routines = [
  { id: 'acordar', label: 'Hora de Acordar' },
  { id: 'cafe', label: 'Tomar café da manhã' },
  { id: 'almoco', label: 'Almoçar' },
  { id: 'jantar', label: 'Jantar' },
  { id: 'dever', label: 'Fazer lição de casa' },
  { id: 'mochila', label: 'Organizar a mochila para amanhã' },
  { id: 'banho', label: 'Tomar banho' },
  { id: 'dormir', label: 'Hora de dormir' },
];

function ActivityScheduler({ categoryIndex, activityIndex, remove }: { categoryIndex: number, activityIndex: number, remove: (index: number) => void }) {
    const { control, watch } = useFormContext();
    const fieldName = `extraActivities.${activityIndex}`;
    const activity = watch(fieldName);

    return (
        <div className="p-3 border rounded-lg space-y-3 bg-muted/50 mt-2 relative">
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
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 text-destructive"
                onClick={() => remove(activityIndex)}
            >
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
    )
}

export function OnboardingStep3() {
  const { control, getValues, setValue } = useFormContext();
  const { fields, append, remove } = useFieldArray({
      control,
      name: "extraActivities"
  });

  const handleActivityToggle = (activityName: string, isChecked: boolean) => {
    if (isChecked) {
        append({ name: activityName, days: [], time: '16:00' });
    } else {
        const indexToRemove = fields.findIndex(field => (field as any).name === activityName);
        if (indexToRemove > -1) {
            remove(indexToRemove);
        }
    }
  };


  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      <div className="text-center">
        <h2 className="text-2xl font-bold font-headline">Os Treinos Especiais</h2>
        <p className="text-muted-foreground">Agora, vamos adicionar os treinos que aprimoram os talentos do nosso herói. Você pode adicionar quantos quiser antes de avançar.</p>
      </div>

      <Accordion type="multiple" className="w-full space-y-2">
        {predefinedMissionGroups.slice(1, 5).map((group, groupIndex) => (
            <AccordionItem value={group.userCategory} key={group.userCategory} className="border rounded-lg px-4">
                <AccordionTrigger>
                    <div className="flex items-center gap-3">
                        <group.icon className="h-6 w-6 text-primary" />
                        <span className="font-semibold">{group.userCategory}</span>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {group.items.map(item => {
                            const currentFieldIndex = fields.findIndex(f => (f as any).name === item.title);
                            const isChecked = currentFieldIndex > -1;

                            return (
                                <div key={item.title} className="space-y-2">
                                     <div className="flex items-center space-x-2 rounded-md border p-3 hover:bg-accent/50">
                                         <Checkbox
                                            id={`${group.userCategory}-${item.title}`}
                                            checked={isChecked}
                                            onCheckedChange={(checked) => handleActivityToggle(item.title, !!checked)}
                                         />
                                        <Label htmlFor={`${group.userCategory}-${item.title}`} className="flex-1 cursor-pointer flex items-center gap-2">
                                          <span className="text-xl">{item.emoji}</span>
                                          {item.title}
                                        </Label>
                                    </div>
                                    {isChecked && <ActivityScheduler categoryIndex={groupIndex} activityIndex={currentFieldIndex} remove={remove} />}
                                </div>
                            )
                        })}
                    </div>
                </AccordionContent>
            </AccordionItem>
        ))}
      </Accordion>


      <FormField
        control={control}
        name="essentialRoutines"
        render={() => (
          <FormItem>
            <div className="mb-4">
                <FormLabel className="text-lg font-semibold">Rotinas Essenciais</FormLabel>
                <FormDescription>
                    Quais destas rotinas diárias você quer que o Mago organize automaticamente?
                </FormDescription>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {routines.map((item) => (
                <FormField
                    key={item.id}
                    control={control}
                    name="essentialRoutines"
                    render={({ field }) => {
                    return (
                        <FormItem
                        key={item.id}
                        className="flex flex-row items-center space-x-3 space-y-0"
                        >
                        <FormControl>
                            <Checkbox
                            checked={field.value?.includes(item.label)}
                            onCheckedChange={(checked) => {
                                return checked
                                ? field.onChange([...(field.value || []), item.label])
                                : field.onChange(
                                    field.value?.filter(
                                        (value) => value !== item.label
                                    )
                                    )
                            }}
                            />
                        </FormControl>
                        <FormLabel className="font-normal">
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
    </div>
  );
}
