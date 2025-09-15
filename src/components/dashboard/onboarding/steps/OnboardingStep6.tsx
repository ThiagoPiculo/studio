
"use client";

import React from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import type { ScheduleItem, OnboardingFormValues } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from '@/components/ui/badge';
import { weekdayLabels, allWeekdays, type Weekday } from "@/lib/types";
import { Loader2, Wand2, BrainCircuit, Sparkles } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { TimePicker } from '../../missions/TimePicker';
import { FormField, FormItem, FormControl, FormLabel, FormMessage } from '@/components/ui/form';

const DayScheduleTab = ({ day, control }: { day: Weekday, control: any }) => {
  const { fields } = useFieldArray({
      control,
      name: "schedule",
  });

  const itemsForDay = React.useMemo(() => {
    return fields
        .map((field, index) => ({ ...field, originalIndex: index }))
        .filter(item => (item as any).days.includes(day))
        .sort((a,b) => (a as any).startTime.localeCompare((b as any).startTime));
  }, [fields, day]);
  
  const blocks = itemsForDay.reduce((acc, item) => {
    const blockName = (item as any).type === 'extra_activity' ? 'Atividades Extras' : ((item as any).block || 'Outras Atividades');
    if (!acc[blockName]) {
      acc[blockName] = [];
    }
    acc[blockName].push(item);
    return acc;
  }, {} as Record<string, any[]>);
  
  const blockOrder = [
    'Atividades Extras', 'Rotina Hora de Acordar', 'Rotina Saindo para escola',
    'Rotina Hora da Escola', 'Rotina Hora do Almoço', 'Rotina Tarefas Escolares',
    'Rotina Lanche da tarde', 'Rotina Hora do Jantar', 'Rotina Hora de Dormir', 'Outras Atividades'
  ];

  const sortedBlockNames = Object.keys(blocks).sort((a, b) => {
    const indexA = blockOrder.indexOf(a);
    const indexB = blockOrder.indexOf(b);
    if (indexA === -1) return 1; if (indexB === -1) return -1;
    return indexA - indexB;
  });

  if(itemsForDay.length === 0) {
    return <div className="text-center text-muted-foreground p-8">Nenhuma atividade neste dia.</div>
  }

  return (
    <Accordion type="multiple" defaultValue={sortedBlockNames} className="w-full space-y-2">
      {sortedBlockNames.map(blockName => {
        const isExtraActivityBlock = blockName === 'Atividades Extras';
        const isSchoolBlock = blockName === 'Rotina Hora da Escola';
        return (
            <AccordionItem value={blockName} key={blockName} className="border rounded-lg px-4 data-[state=open]:bg-muted/30 transition-colors">
              <AccordionTrigger className="hover:no-underline">
                 <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                       {isExtraActivityBlock && <Sparkles className="h-5 w-5 text-primary" />}
                       <span className="font-semibold">{blockName}</span>
                    </div>
                    <Badge variant="secondary" className="mr-2">{blocks[blockName].length}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2">
                <div className="space-y-2">
                  {blocks[blockName].map((item: any, index) => (
                    <div 
                        key={item.id} 
                        className={`flex items-center gap-2 sm:gap-3 text-sm p-3 rounded-md ${isExtraActivityBlock ? 'bg-primary/10' : isSchoolBlock ? 'bg-indigo-500/10' : 'bg-background'}`}
                      >
                        <FormField
                            control={control}
                            name={`schedule.${item.originalIndex}.startTime`}
                            render={({ field }) => (
                                <FormItem className="w-28 shrink-0">
                                    <FormControl>
                                        <TimePicker {...field} />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        <div className="flex-grow flex items-center gap-2">
                            <span className="text-xl">{item.emoji}</span>
                            <div className="flex flex-col">
                                <span className="font-semibold">{item.activity}</span>
                            </div>
                        </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
        )
      })}
    </Accordion>
  )
}

interface OnboardingStep6Props {
  isLoading: boolean;
}

export function OnboardingStep6({ isLoading }: OnboardingStep6Props) {
  const { control, watch } = useFormContext<OnboardingFormValues>();
  const schedule = watch('schedule');

  const scheduleCountsByDay = React.useMemo(() => {
      const counts: Record<Weekday, number> = { MO: 0, TU: 0, WE: 0, TH: 0, FR: 0, SA: 0, SU: 0 };
      if (!schedule) return counts;
      schedule.forEach(item => {
          (item.days || []).forEach(day => {
              counts[day as Weekday] = (counts[day as Weekday] || 0) + 1;
          });
      });
      return counts;
  }, [schedule]);


  if (isLoading) {
    return (
        <div className="flex flex-col items-center justify-center text-center h-full animate-in fade-in-50 duration-500">
            <div className="relative">
                <BrainCircuit className="h-24 w-24 text-primary animate-pulse" />
            </div>
            <h2 className="mt-6 text-2xl font-bold font-headline">
                Forjando a Jornada do Herói...
            </h2>
            <p className="mt-2 text-muted-foreground max-w-md">
                Estamos criando um mapa de missões e aventuras diárias. A jornada do seu Mini Herói está prestes a começar!
            </p>
        </div>
    );
  }

  if (!schedule || schedule.length === 0) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold font-headline">Revisão da Rotina</h2>
        <p className="text-muted-foreground">Nenhuma rotina foi gerada. Você pode voltar para adicionar mais atividades ou pular e configurar manualmente mais tarde.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in-50 duration-500">
      <div className="text-center">
        <p className="text-muted-foreground">Esta é a rotina que o assistente criou. Se tudo estiver certo, podemos confirmar e iniciar a jornada!</p>
      </div>
      
       <Tabs defaultValue="MO" className="w-full">
            <TabsList className="grid w-full grid-cols-7 h-auto p-1 bg-muted/50 rounded-lg">
                {allWeekdays.map(day => (
                    <TabsTrigger 
                        key={day} 
                        value={day} 
                        className="flex-col gap-1 h-auto py-2 px-1 text-xs sm:text-sm data-[state=active]:shadow-lg relative"
                    >
                       <span className="font-semibold">{weekdayLabels[day].short}</span>
                       {scheduleCountsByDay[day] > 0 && (
                          <Badge variant="secondary" className="absolute -top-1 -right-1 h-4 w-4 justify-center p-0">{scheduleCountsByDay[day]}</Badge>
                       )}
                    </TabsTrigger>
                ))}
            </TabsList>
             <div className="mt-4">
                {allWeekdays.map(day => (
                    <TabsContent key={day} value={day}>
                        <DayScheduleTab day={day} control={control} />
                    </TabsContent>
                ))}
             </div>
        </Tabs>
    </div>
  );
}
