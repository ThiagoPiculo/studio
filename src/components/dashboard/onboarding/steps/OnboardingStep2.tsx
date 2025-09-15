
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
    
    switch (shift) {
      case 'morning':
        start = '07:00'; end = '11:30';
        break;
      case 'afternoon':
        start = '13:00'; end = '17:30';
        break;
      case 'full_time':
        start = '08:00'; end = '18:00';
        break;
      case 'not_applicable':
        break;
    }
    setValue('schoolShiftStart', start);
    setValue('schoolShiftEnd', end);
    
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

      <div className={cn("grid grid-cols-2 gap-6 p-4 border rounded-lg animate-in fade-in duration-300", schoolShift === 'not_applicable' ? 'hidden' : 'grid')}>
          <>
            <FormField control={control} name="schoolShiftStart" render={({ field }) => (
              <FormItem><FormLabel>Entrada na Escola</FormLabel><FormControl><TimePicker {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={control} name="schoolShiftEnd" render={({ field }) => (
              <FormItem><FormLabel>Saída da Escola</FormLabel><FormControl><TimePicker {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </>
      </div>

       <Alert variant="default" className="border-primary/20 bg-primary/5">
          <Info className="h-4 w-4 text-primary" />
          <AlertTitle className="font-semibold text-primary">Dica do Assistente</AlertTitle>
          <AlertDescription className="text-primary/90">
            A rotina será criada com base nestes horários. Fique tranquilo(a), você poderá ajustar e personalizar tudo depois na tela 'Rotina de Missões'!
          </AlertDescription>
        </Alert>
    </div>
  );
}
