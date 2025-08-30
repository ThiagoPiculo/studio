
"use client";

import { useFormContext } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { TimePicker } from "../../missions/TimePicker";
import * as z from "zod";
import React from 'react';

export const onboardingSchemaStep3 = z.object({
  wakeUpTime: z.string({ required_error: "O horário de acordar é obrigatório." }).regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Horário inválido."),
  lunchTime: z.string({ required_error: "O horário do almoço é obrigatório." }).regex(/^([01]\d|2[0-5]\d)$/, "Horário inválido."),
  dinnerTime: z.string({ required_error: "O horário do jantar é obrigatório." }).regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Horário inválido."),
  sleepTime: z.string({ required_error: "O horário de dormir é obrigatório." }).regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Horário inválido."),
});


const anchorTimeFields = [
    { name: 'wakeUpTime', label: 'Hora de Acordar', emoji: '⏰', microCopy: 'Sugestão: 5h antes da escola.' },
    { name: 'lunchTime', label: 'Hora do Almoço', emoji: '🍽️', microCopy: 'Sugestão: 45min antes da escola.' },
    { name: 'dinnerTime', label: 'Hora do Jantar', emoji: '🍽️', microCopy: 'Sugestão: 30min após a escola.' },
    { name: 'sleepTime', label: 'Hora de Dormir', emoji: '😴', microCopy: 'Sugestão: 4h30 após a escola.' },
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
                    <span className="text-2xl">{item.emoji}</span>
                    <span className="font-semibold">{item.label}</span>
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
