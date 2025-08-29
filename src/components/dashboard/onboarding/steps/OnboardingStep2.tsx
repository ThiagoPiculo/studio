
"use client";

import { useFormContext } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { TimePicker } from "../../missions/TimePicker";
import type { SchoolShift } from "@/lib/types";
import { schoolShifts } from "@/lib/types";
import * as z from "zod";
import { cn } from "@/lib/utils";
import { Sun, CloudSun, Moon, Utensils, Info, Sunrise, Bed, Tablet, Youtube } from "lucide-react";
import React, { useEffect, useCallback } from 'react';
import { addMinutes, format, subMinutes } from "date-fns";
import { parseTime as parseTimeToMinutes } from "@/lib/calendar-utils";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";

export const onboardingSchemaStep2 = z.object({
  schoolShift: z.enum(['morning', 'afternoon', 'full_time', 'not_applicable']),
  schoolShiftStart: z.string().optional(),
  schoolShiftEnd: z.string().optional(),
  wakeUpTime: z.string().optional(),
  lunchTime: z.string().optional(),
  dinnerTime: z.string().optional(),
  sleepTime: z.string().optional(),
  screenTimeBefore: z.string().optional(),
  screenTimeAfter: z.string().optional(),
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
     if (data.schoolShift === 'not_applicable' && !data.lunchTime) {
        ctx.addIssue({ code: "custom", path: ["lunchTime"], message: "Horário do almoço é obrigatório." });
    }
});

const shiftDetails = {
    morning: { icon: Sun, color: 'text-yellow-500', activeClass: 'data-[state=checked]:bg-yellow-500/10 data-[state=checked]:border-yellow-500/30 data-[state=checked]:text-yellow-700' },
    afternoon: { icon: CloudSun, color: 'text-orange-500', activeClass: 'data-[state=checked]:bg-orange-500/10 data-[state=checked]:border-orange-500/30 data-[state=checked]:text-orange-700' },
    full_time: { icon: Sun, color: 'text-indigo-500', activeClass: 'data-[state=checked]:bg-indigo-500/10 data-[state=checked]:border-indigo-500/30 data-[state=checked]:text-indigo-700' },
    not_applicable: { icon: Moon, color: 'text-gray-500', activeClass: 'data-[state=checked]:bg-gray-500/10 data-[state=checked]:border-gray-500/30 data-[state=checked]:text-gray-700'}
}

function formatTime(date: Date): string {
    return format(date, 'HH:mm');
}

export function OnboardingStep2() {
  const { control, watch, setValue, getValues } = useFormContext();
  const childName = getValues('name');
  const schoolShift = watch('schoolShift');
  
  const calculateAndSetAnchorTimes = useCallback(() => {
    const shift = getValues('schoolShift') as SchoolShift;
    const start = getValues('schoolShiftStart');
    const end = getValues('schoolShiftEnd');
    const lunch = getValues('lunchTime');

    // Reset screen times before recalculating
    setValue('screenTimeBefore', '');
    setValue('screenTimeAfter', '');

    if (shift !== 'not_applicable' && start && end) {
        const startDate = new Date(`1970-01-01T${start}:00`);
        const endDate = new Date(`1970-01-01T${end}:00`);
        
        switch (shift) {
            case 'morning':
                setValue('wakeUpTime', formatTime(addMinutes(startDate, -60)));
                setValue('lunchTime', formatTime(addMinutes(endDate, 30)));
                setValue('dinnerTime', formatTime(addMinutes(endDate, 360)));
                setValue('sleepTime', formatTime(addMinutes(endDate, 540)));
                break;
            case 'afternoon':
                setValue('wakeUpTime', formatTime(subMinutes(startDate, 300)));
                setValue('lunchTime', formatTime(subMinutes(startDate, 45)));
                setValue('dinnerTime', formatTime(addMinutes(endDate, 30)));
                setValue('sleepTime', formatTime(addMinutes(endDate, 270)));
                break;
            case 'full_time':
                setValue('wakeUpTime', formatTime(subMinutes(startDate, 60)));
                setValue('lunchTime', '12:00');
                setValue('dinnerTime', '18:30');
                setValue('sleepTime', '21:00');
                break;
        }
        setValue('screenTimeBefore', formatTime(subMinutes(startDate, 60)));
        setValue('screenTimeAfter', formatTime(addMinutes(endDate, 60)));
    } else if (shift === 'not_applicable' && lunch) {
        const lunchDate = new Date(`1970-01-01T${lunch}:00`);
        setValue('wakeUpTime', formatTime(subMinutes(lunchDate, 240)));
        setValue('dinnerTime', formatTime(addMinutes(lunchDate, 360)));
        setValue('sleepTime', formatTime(addMinutes(lunchDate, 600)));
        setValue('screenTimeBefore', formatTime(subMinutes(lunchDate, 60)));
        setValue('screenTimeAfter', formatTime(addMinutes(lunchDate, 60)));
    }
  }, [getValues, setValue]);

  useEffect(() => {
    calculateAndSetAnchorTimes();
  }, [schoolShift, calculateAndSetAnchorTimes]);

  const handleShiftChange = (value: string) => {
    const shift = value as SchoolShift;
    setValue('schoolShift', shift);
    
    let start = '';
    let end = '';
    let lunch = '12:00';
    let mealsAtSchool = { lunch: false, dinner: false };

    switch (shift) {
      case 'morning':
        start = '07:30'; end = '12:00'; break;
      case 'afternoon':
        start = '13:00'; end = '17:30'; break;
      case 'full_time':
        start = '08:00'; end = '18:00'; mealsAtSchool = { lunch: true, dinner: true }; break;
      case 'not_applicable':
        lunch = '12:00'; break;
    }
    setValue('schoolShiftStart', start);
    setValue('schoolShiftEnd', end);
    setValue('lunchTime', lunch);
    setValue('mealsAtSchool', mealsAtSchool);
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      <div className="text-center">
        <p className="text-muted-foreground">Marque o turno, se precisar, ajuste hora de entrada e saída. Os horários âncora da rotina serão sugeridos abaixo, mas você pode ajustá-los!</p>
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

       <Separator />

      <div className="space-y-4">
        <h3 className="font-semibold text-lg text-center">Horários de Âncora da Rotina</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-4 border rounded-lg bg-muted/30">
            <FormField control={control} name="wakeUpTime" render={({ field }) => (
              <FormItem><FormLabel className="flex items-center gap-2"><Sunrise className="h-4 w-4"/> Acordar</FormLabel><FormControl><TimePicker {...field} /></FormControl><FormMessage /></FormItem>
            )} />
             <FormField control={control} name="lunchTime" render={({ field }) => (
              <FormItem><FormLabel className="flex items-center gap-2"><Utensils className="h-4 w-4"/> Almoço</FormLabel><FormControl><TimePicker {...field} /></FormControl><FormMessage /></FormItem>
            )} />
             <FormField control={control} name="dinnerTime" render={({ field }) => (
              <FormItem><FormLabel className="flex items-center gap-2"><Utensils className="h-4 w-4"/> Jantar</FormLabel><FormControl><TimePicker {...field} /></FormControl><FormMessage /></FormItem>
            )} />
             <FormField control={control} name="sleepTime" render={({ field }) => (
              <FormItem><FormLabel className="flex items-center gap-2"><Bed className="h-4 w-4"/> Dormir</FormLabel><FormControl><TimePicker {...field} /></FormControl><FormMessage /></FormItem>
            )} />
        </div>
      </div>
      
       <Separator />

      <div className="space-y-4">
        <h3 className="font-semibold text-lg text-center">Horários de Tela (Opcional)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-lg bg-muted/30">
            <FormField control={control} name="screenTimeBefore" render={({ field }) => (
              <FormItem><FormLabel className="flex items-center gap-2"><Tablet className="h-4 w-4"/> Tela (Manhã/Antes)</FormLabel><FormControl><TimePicker {...field} /></FormControl><FormMessage /></FormItem>
            )} />
             <FormField control={control} name="screenTimeAfter" render={({ field }) => (
              <FormItem><FormLabel className="flex items-center gap-2"><Youtube className="h-4 w-4"/> Tela (Tarde/Depois)</FormLabel><FormControl><TimePicker {...field} /></FormControl><FormMessage /></FormItem>
            )} />
        </div>
      </div>
    </div>
  );
}
