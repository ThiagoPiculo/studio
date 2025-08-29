
"use client";

import { useFormContext } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { TimePicker } from "../../missions/TimePicker";
import * as z from "zod";
import { Bed, Sunrise, Utensils } from "lucide-react";
import React from 'react';

export const onboardingSchemaStep3 = z.object({
  wakeUpTime: z.string().optional(),
  lunchTime: z.string({ required_error: "O horário do almoço é obrigatório." }).regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Horário inválido."),
  dinnerTime: z.string().optional(),
  sleepTime: z.string().optional(),
});


const anchorTimeFields = [
    { name: 'wakeUpTime', label: 'Hora de Acordar', icon: Sunrise, microCopy: 'A base para um dia energizado. (5h antes da escola)' },
    { name: 'lunchTime', label: 'Hora do Almoço', icon: Utensils, microCopy: 'Pausa para recarregar as energias. (45min antes da escola)' },
    { name: 'dinnerTime', label: 'Hora do Jantar', icon: Utensils, microCopy: 'Momento de união em família. (30min após a escola)' },
    { name: 'sleepTime', label: 'Hora de Dormir', icon: Bed, microCopy: 'Essencial para o crescimento. (4h30 após a escola)' },
] as const;

export function OnboardingStep3() {
  const { control } = useFormContext();
  
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
        <div className="text-center">
            <p className="text-muted-foreground">Defina os horários essenciais que servem de base para toda a rotina. Nossas sugestões são calculadas a partir do turno escolar que você informou.</p>
        </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {anchorTimeFields.map(item => (
           <FormField
            key={item.name}
            control={control}
            name={item.name}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                    <item.icon className="h-5 w-5 text-primary" /> 
                    {item.label}
                </FormLabel>
                <FormControl>
                  <TimePicker {...field} />
                </FormControl>
                 <FormDescription className="text-xs">{item.microCopy}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
      </div>
    </div>
  );
}
