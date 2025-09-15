
"use client";

import { useFormContext } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { TimePicker } from "../../missions/TimePicker";
import * as z from "zod";
import { useEffect, useMemo } from "react";
import { parseTime, formatTime } from "@/lib/calendar-utils";
import type { SchoolShift } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, Tv } from "lucide-react";
import { Switch } from "@/components/ui/switch";


export function OnboardingStep3() {
  const { control, watch, setValue } = useFormContext();
  const schoolShift: SchoolShift = watch('schoolShift');
  const schoolShiftStart = watch('schoolShiftStart');
  const schoolShiftEnd = watch('schoolShiftEnd');
  const includeScreenTime = watch('includeScreenTime');

  const anchorTimeFields = useMemo(() => {
    return [
      { name: 'wakeUpTime', label: 'Hora de Acordar', emoji: '⏰', microCopy: 'Sugestão calculada com base no horário escolar.' },
      { name: 'lunchTime', label: schoolShift === 'full_time' ? 'Hora do Almoço na escola' : 'Hora do Almoço', emoji: '🍽️', microCopy: 'Sugestão calculada com base no horário escolar.' },
      { name: 'dinnerTime', label: schoolShift === 'full_time' ? 'Hora do Jantar na escola' : 'Hora do Jantar', emoji: '🍽️', microCopy: 'Sugestão calculada com base no horário escolar.' },
      { name: 'sleepTime', label: 'Hora de Dormir', emoji: '😴', microCopy: 'Sugestão calculada com base no horário escolar.' },
    ];
  }, [schoolShift]);

  const screenTimeLabels = useMemo(() => {
    switch (schoolShift) {
      case 'morning':
        return { label1: 'Tempo de Tela (tarde)', label2: 'Tempo de Tela (noite)' };
      case 'afternoon':
        return { label1: 'Tempo de Tela (manhã)', label2: 'Tempo de Tela (após escola)' };
      case 'full_time':
        return { label1: 'Tempo de Tela (noite)', label2: null };
      case 'not_applicable':
        return { label1: 'Tempo de Tela (manhã)', label2: 'Tempo de Tela (tarde)' };
      default:
        return { label1: 'Tempo de Tela 1', label2: 'Tempo de Tela 2' };
    }
  }, [schoolShift]);


  useEffect(() => {
    const calculateAnchorTimes = () => {
        let wakeUp = parseTime('07:00');
        let lunch = parseTime('12:00');
        let dinner = parseTime('18:00');
        let sleep = parseTime('21:00');
        let screenTime1, screenTime2;


        const schoolStartMinutes = parseTime(schoolShiftStart);
        const schoolEndMinutes = parseTime(schoolShiftEnd);

        switch(schoolShift) {
            case 'morning':
                wakeUp = schoolStartMinutes - 60;
                lunch = schoolEndMinutes + 30;
                dinner = schoolEndMinutes + 6 * 60;
                sleep = schoolEndMinutes + 9 * 60;
                screenTime1 = lunch + 90; // after lunch/homework
                screenTime2 = dinner + 30; // after dinner
                break;
            case 'afternoon':
                wakeUp = schoolStartMinutes - 5 * 60;
                lunch = schoolStartMinutes - 45;
                dinner = schoolEndMinutes + 30;
                sleep = schoolEndMinutes + 4.5 * 60;
                screenTime1 = wakeUp + 120; // after morning routine/homework
                screenTime2 = dinner + 30; // after dinner
                break;
            case 'full_time':
                 lunch = parseTime('12:00'); 
                 dinner = schoolEndMinutes - 30;
                 wakeUp = schoolStartMinutes - 60;
                 sleep = schoolEndMinutes + 3 * 60;
                 screenTime1 = dinner + 30; // Only one slot after dinner
                 screenTime2 = null;
                 break;
            case 'not_applicable':
                lunch = parseTime('12:00');
                wakeUp = lunch - 4 * 60;
                dinner = lunch + 6 * 60;
                sleep = lunch + 10 * 60;
                screenTime1 = lunch - 60; // Before lunch
                screenTime2 = dinner + 30; // After dinner
                break;
        }

        setValue('wakeUpTime', formatTime(wakeUp));
        setValue('lunchTime', formatTime(lunch));
        setValue('dinnerTime', formatTime(dinner));
        setValue('sleepTime', formatTime(sleep));
        setValue('screenTime1', screenTime1 ? formatTime(screenTime1) : '');
        setValue('screenTime2', screenTime2 ? formatTime(screenTime2) : '');
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
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
      <div className="space-y-4 pt-4 border-t">
        <FormField
            control={control}
            name="includeScreenTime"
            render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-muted/30">
                    <div className="space-y-0.5">
                        <FormLabel>Incluir tempo de tela na rotina?</FormLabel>
                        <FormDescription>
                            Adicione horários definidos para o uso de telas.
                        </FormDescription>
                    </div>
                    <FormControl>
                        <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                        />
                    </FormControl>
                </FormItem>
            )}
        />
        {includeScreenTime && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8 animate-in fade-in duration-300">
                <FormField
                    control={control}
                    name="screenTime1"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                            <span className="text-2xl">📱</span>
                            <span className="font-semibold">{screenTimeLabels.label1}</span>
                        </FormLabel>
                        <FormControl>
                          <TimePicker {...field} />
                        </FormControl>
                         <FormDescription className="text-xs">Primeiro período de 1 hora de tela.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                />

                {screenTimeLabels.label2 && (
                     <FormField
                        control={control}
                        name="screenTime2"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel className="flex items-center gap-2">
                                <span className="text-2xl">📱</span>
                                <span className="font-semibold">{screenTimeLabels.label2}</span>
                            </FormLabel>
                            <FormControl>
                            <TimePicker {...field} />
                            </FormControl>
                            <FormDescription className="text-xs">Segundo período de 1 hora de tela.</FormDescription>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                )}
            </div>
        )}
      </div>

       <Alert variant="default" className="border-primary/20 bg-primary/5 mt-6">
          <Info className="h-4 w-4 text-primary" />
          <AlertTitle className="font-semibold text-primary">Dica do Assistente</AlertTitle>
          <AlertDescription className="text-primary/90">
            A rotina será criada com base nestes horários. Fique tranquilo(a), você poderá ajustar e personalizar tudo depois na tela 'Rotina de Missões'!
          </AlertDescription>
        </Alert>
    </div>
  );
}

    
