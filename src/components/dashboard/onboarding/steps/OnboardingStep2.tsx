
"use client";

import { useFormContext } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import type { SchoolShift } from "@/lib/types";
import { schoolShifts } from "@/lib/types";
import * as z from "zod";
import { cn } from "@/lib/utils";
import { Sun, CloudSun, Moon, Info, Utensils } from "lucide-react";
import React, { useEffect, useCallback } from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { TimePicker } from "../../missions/TimePicker";

export const onboardingSchemaStep2 = z.object({
  schoolShift: z.enum(['morning', 'afternoon', 'full_time', 'not_applicable']),
  schoolShiftStart: z.string().optional(),
  schoolShiftEnd: z.string().optional(),
  mealsAtSchool: z.object({
    lunch: z.boolean().default(false),
    dinner: z.boolean().default(false),
  }).optional(),
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

  const handleShiftChange = (value: string) => {
    const shift = value as SchoolShift;
    setValue('schoolShift', shift);
    
    let start = '';
    let end = '';
    let mealsAtSchool = { lunch: false, dinner: false };

    switch (shift) {
      case 'morning':
        start = '07:30'; end = '12:00'; mealsAtSchool = { lunch: false, dinner: false }; break;
      case 'afternoon':
        start = '13:00'; end = '17:30'; mealsAtSchool = { lunch: false, dinner: false }; break;
      case 'full_time':
        start = '08:00'; end = '18:00'; mealsAtSchool = { lunch: true, dinner: false }; break;
      case 'not_applicable':
        mealsAtSchool = { lunch: false, dinner: false }; break;
    }
    setValue('schoolShiftStart', start);
    setValue('schoolShiftEnd', end);
    setValue('mealsAtSchool', mealsAtSchool);
  };
  
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
            {schoolShift === 'full_time' && (
              <div className="md:col-span-2">
                <Alert variant="default" className="border-primary/20 bg-primary/5">
                  <Info className="h-4 w-4 text-primary" />
                  <AlertTitle className="font-semibold text-primary">Refeições na Escola</AlertTitle>
                  <AlertDescription className="text-primary/90">
                    <div className="space-y-2 mt-2">
                      <FormField control={control} name="mealsAtSchool.lunch" render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><Label className="font-normal">Almoça na escola</Label></FormItem>
                      )}/>
                      <FormField control={control} name="mealsAtSchool.dinner" render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><Label className="font-normal">Janta na escola (se aplicável)</Label></FormItem>
                      )}/>
                    </div>
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </>
      </div>
    </div>
  );
}
