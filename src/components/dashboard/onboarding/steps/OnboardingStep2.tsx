
"use client";

import { useFormContext } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import type { SchoolShift } from "@/lib/types";
import { schoolShifts } from "@/lib/types";
import * as z from "zod";
import { cn } from "@/lib/utils";
import { Sun, CloudSun, Moon, Info, Utensils, AlertTriangle } from "lucide-react";
import React, { useEffect, useCallback } from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { TimePicker } from "../../missions/TimePicker";
import { addMinutes, format, parse } from "date-fns";

export const onboardingSchemaStep2 = z.object({
  schoolShift: z.enum(['morning', 'afternoon', 'full_time', 'not_applicable']),
  schoolShiftStart: z.string().optional(),
  schoolShiftEnd: z.string().optional(),
  mealsAtSchool: z.object({
    lunch: z.boolean().default(false),
    dinner: z.boolean().default(false),
  }),
}).superRefine((data, ctx) => {
    if (data.schoolShift !== 'not_applicable') {
        if (!data.schoolShiftStart) ctx.addIssue({ code: "custom", path: ["schoolShiftStart"], message: "Horário de início é obrigatório." });
        if (!data.schoolShiftEnd) ctx.addIssue({ code: "custom", path: ["schoolShiftEnd"], message: "Horário de fim é obrigatório." });
        if (data.schoolShiftStart && data.schoolShiftEnd && data.schoolShiftEnd <= data.schoolShiftStart) {
            ctx.addIssue({ code: 'custom', path: ['schoolShiftEnd'], message: "O horário final deve ser depois do inicial." });
        }
    }
});

const shiftDetails = {
    morning: { icon: Sun, color: 'text-yellow-500' },
    afternoon: { icon: CloudSun, color: 'text-orange-500' },
    full_time: { icon: Sun, color: 'text-indigo-500' },
    not_applicable: { icon: Moon, color: 'text-gray-500' }
}

export function OnboardingStep2() {
  const { control, watch, setValue } = useFormContext();
  const schoolShift = watch('schoolShift');
  const schoolShiftStart = watch('schoolShiftStart');

  const handleShiftChange = useCallback((value: string) => {
    const shift = value as SchoolShift;
    setValue('schoolShift', shift);
    
    let start = '';
    let end = '';
    let mealsAtSchool = { lunch: false, dinner: false };
    
    switch (shift) {
      case 'morning':
        start = '07:00'; end = '11:30'; mealsAtSchool = { lunch: false, dinner: false };
        break;
      case 'afternoon':
        start = '13:00'; end = '17:30'; mealsAtSchool = { lunch: false, dinner: false };
        break;
      case 'full_time':
        start = '08:00'; end = '18:00'; mealsAtSchool = { lunch: true, dinner: true };
        break;
      case 'not_applicable':
        mealsAtSchool = { lunch: false, dinner: false }; break;
    }
    setValue('schoolShiftStart', start);
    setValue('schoolShiftEnd', end);
    setValue('mealsAtSchool', mealsAtSchool);
    
  }, [setValue]);
  
  useEffect(() => {
    if (schoolShift === 'morning' || schoolShift === 'afternoon') {
      if (schoolShiftStart) {
        try {
          const [hours, minutes] = schoolShiftStart.split(':').map(Number);
          const startDate = new Date();
          startDate.setHours(hours, minutes, 0, 0);
          const endDate = addMinutes(startDate, 4 * 60 + 30);
          const endTimeString = format(endDate, 'HH:mm');
          setValue('schoolShiftEnd', endTimeString);
        } catch(e) {
          console.error("Invalid time for shift calculation");
        }
      }
    }
  }, [schoolShift, schoolShiftStart, setValue]);


  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      <div className="text-center">
        <p className="text-muted-foreground">Esta informação é a peça central para montar uma rotina que funciona.</p>
      </div>

      <FormField
        control={control}
        name="schoolShift"
        render={({ field }) => (
          <FormItem>
            <FormControl>
                <RadioGroup onValueChange={handleShiftChange} value={field.value} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {schoolShifts.map(s => {
                        const details = shiftDetails[s.id as keyof typeof shiftDetails] || shiftDetails.not_applicable;
                        const Icon = details.icon;
                        return (
                           <FormItem key={s.id}>
                                <FormControl>
                                    <RadioGroupItem value={s.id} id={s.id} className="sr-only peer" />
                                </FormControl>
                                <Label 
                                    htmlFor={s.id} 
                                    className={cn(
                                        "flex flex-col items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-colors h-full",
                                        "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
                                    )}
                                >
                                    <Icon className={cn("h-8 w-8 mb-2", details.color)} />
                                    {s.label}
                                </Label>
                            </FormItem>
                        )
                    })}
                </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-lg animate-in fade-in duration-300", schoolShift === 'not_applicable' ? 'hidden' : 'grid')}>
          <>
            <FormField control={control} name="schoolShiftStart" render={({ field }) => (
              <FormItem><FormLabel>Horário de Entrada</FormLabel><FormControl><TimePicker {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={control} name="schoolShiftEnd" render={({ field }) => (
              <FormItem><FormLabel>Horário de Saída</FormLabel><FormControl><TimePicker {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </>
      </div>

       <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Ponto de Atenção</AlertTitle>
          <AlertDescription>
            Os horários informados aqui são a base para o Assistente criar a rotina. Alterações futuras no turno não atualizarão automaticamente as missões já criadas. Você pode ajustar manualmente na tela de "Rotina de Missões".
          </AlertDescription>
        </Alert>
    </div>
  );
}
