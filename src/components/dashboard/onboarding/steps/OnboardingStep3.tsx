
"use client";

import { useFormContext } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import * as z from "zod";

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

export function OnboardingStep3() {
  const { control } = useFormContext();

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      <div className="text-center">
        <h2 className="text-2xl font-bold font-headline">Os Treinos Especiais</h2>
        <p className="text-muted-foreground">Agora, vamos adicionar os treinos que aprimoram os talentos do nosso herói. Você pode descrever tudo de uma vez!</p>
      </div>

      <FormField
        control={control}
        name="extraActivitiesText"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Atividades Extras, Remédios e Acompanhamentos</FormLabel>
            <FormControl>
              <Textarea
                rows={5}
                placeholder="Exemplo: Aula de natação seg e qua às 16h; Judô toda sexta às 18h; Psicóloga terça 10h; Remédio todo dia 20h"
                {...field}
              />
            </FormControl>
            <FormDescription>
              Escreva livremente as atividades, dias e horários. O nosso Mago da Organização vai entender!
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="essentialRoutines"
        render={() => (
          <FormItem>
            <div className="mb-4">
                <FormLabel>Rotinas Essenciais</FormLabel>
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
                        className="flex flex-row items-start space-x-3 space-y-0"
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
