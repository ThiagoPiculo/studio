
"use client";

import { useFormContext } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { TimePicker } from "../../missions/TimePicker";
import * as z from "zod";
import { useEffect } from "react";
import { parseTime, formatTime } from "@/lib/calendar-utils";
import type { SchoolShift } from "@/lib/types";

export const onboardingSchemaStep3 = z.object({
  wakeUpTime: z.string({ required_error: "O horário de acordar é obrigatório." }).regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Horário inválido."),
  lunchTime: z.string({ required_error: "O horário do almoço é obrigatório." }).regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Horário inválido."),
  dinnerTime: z.string({ required_error: "O horário do jantar é obrigatório." }).regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Horário inválido."),
  sleepTime: z.string({ required_error: "O horário de dormir é obrigatório." }).regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Horário inválido."),
});

const anchorTimeFields = [
    { name: 'wakeUpTime', label: 'Hora de Acordar', emoji: '⏰', microCopy: 'Sugestão calculada com base no horário escolar.' },
    { name: 'lunchTime', label: 'Hora do Almoço', emoji: '🍽️', microCopy: 'Sugestão calculada com base no horário escolar.' },
    { name: 'dinnerTime', label: 'Hora do Jantar', emoji: '🍽️', microCopy: 'Sugestão calculada com base no horário escolar.' },
    { name: 'sleepTime', label: 'Hora de Dormir', emoji: '😴', microCopy: 'Sugestão calculada com base no horário escolar.' },
] as const;

export function OnboardingStep3() {
  const { control, watch, setValue } = useFormContext();
  const schoolShift: SchoolShift = watch('schoolShift');
  const schoolShiftStart = watch('schoolShiftStart');
  const schoolShiftEnd = watch('schoolShiftEnd');

  useEffect(() => {
    const calculateAnchorTimes = () => {
        let wakeUp = parseTime('07:00');
        let lunch = parseTime('12:00');
        let dinner = parseTime('18:00');
        let sleep = parseTime('21:00');

        const schoolStartMinutes = parseTime(schoolShiftStart);
        const schoolEndMinutes = parseTime(schoolShiftEnd);

        switch(schoolShift) {
            case 'morning':
                wakeUp = schoolStartMinutes - 60;
                lunch = schoolEndMinutes + 30;
                dinner = schoolEndMinutes + 6 * 60;
                sleep = schoolEndMinutes + 9 * 60;
                break;
            case 'afternoon':
                wakeUp = schoolStartMinutes - 5 * 60;
                lunch = schoolStartMinutes - 45;
                dinner = schoolEndMinutes + 30;
                sleep = schoolEndMinutes + 4.5 * 60;
                break;
            case 'full_time':
                 wakeUp = schoolStartMinutes - 60;
                 // Lunch and dinner are based on user checkbox, but we set a default here
                 lunch = schoolEndMinutes + 30;
                 dinner = schoolEndMinutes + 30; // Fallback, real logic is in the form
                 sleep = 21 * 60; // Fixed suggestion
                 break;
            case 'not_applicable':
                lunch = parseTime('12:00');
                wakeUp = lunch - 4 * 60;
                dinner = lunch + 6 * 60;
                sleep = lunch + 10 * 60;
                break;
        }

        setValue('wakeUpTime', formatTime(wakeUp));
        setValue('lunchTime', formatTime(lunch));
        setValue('dinnerTime', formatTime(dinner));
        setValue('sleepTime', formatTime(sleep));
    };
    
    if (schoolShift) {
        calculateAnchorTimes();
    }

  }, [schoolShift, schoolShiftStart, schoolShiftEnd, setValue]);
  
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

    