
"use client";

import React from 'react';
import type { ScheduleItem } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from '@/components/ui/badge';
import { weekdayLabels, allWeekdays, type Weekday } from "@/lib/types";
import { Loader2, Wand2, BrainCircuit } from "lucide-react";
import { Button } from '@/components/ui/button';

const getPeriod = (time: string): 'morning' | 'afternoon' | 'night' => {
    if (!time || !time.includes(':')) return 'morning'; // Fallback
    const hour = parseInt(time.split(':')[0], 10);
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'night';
}

const DayScheduleTab = ({ day, items }: { day: Weekday, items: ScheduleItem[] }) => {
  const sortedItems = [...items].sort((a,b) => a.startTime.localeCompare(b.startTime));

  if(items.length === 0) {
    return <div className="text-center text-muted-foreground p-8">Nenhuma atividade neste dia.</div>
  }

  return (
    <div className="space-y-3">
      {sortedItems.map((item, index) => (
         <div 
            key={`${item.activity}-${index}`} 
            className={`flex items-center gap-2 sm:gap-3 text-sm p-3 rounded-md ${item.type === 'extra_activity' ? 'bg-primary/10 border border-primary/20' : item.type === 'school_entry' ? 'bg-indigo-500/10 border border-indigo-500/20' : 'bg-muted/50'}`}
          >
            <div className="text-xs text-muted-foreground font-mono bg-background px-2 py-1 rounded-md shrink-0 w-14 text-center">
                {item.startTime}
            </div>
            <div className="flex-grow flex items-center gap-2">
                <span className="text-xl">{item.emoji}</span>
                <div className="flex flex-col">
                    <span className="font-semibold">{item.activity}</span>
                    {item.type === 'extra_activity' && <Badge variant="secondary" className="w-fit text-xs mt-1">Atividade Extra</Badge>}
                    {item.type === 'school_entry' && <Badge variant="secondary" className="w-fit text-xs mt-1 bg-indigo-200 text-indigo-800">Escola</Badge>}
                </div>
            </div>
        </div>
      ))}
    </div>
  )
}

interface OnboardingStep6Props {
  isLoading: boolean;
  generatedSchedule: { schedule: ScheduleItem[] } | null;
}

export function OnboardingStep6({ isLoading, generatedSchedule }: OnboardingStep6Props) {
  
  const scheduleByDay = React.useMemo(() => {
    if (!generatedSchedule || !generatedSchedule.schedule) {
        return {} as Record<Weekday, ScheduleItem[]>;
    }
    const grouped = generatedSchedule.schedule.reduce((acc, item) => {
        (item.days || []).forEach(day => {
            if (!acc[day]) {
                acc[day] = [];
            }
            acc[day].push(item);
        });
        return acc;
    }, {} as Record<Weekday, ScheduleItem[]>);

    return grouped;
  }, [generatedSchedule]);


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

  if (!generatedSchedule || !generatedSchedule.schedule || generatedSchedule.schedule.length === 0) {
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
                        className="flex-col gap-1 h-auto py-2 px-1 text-xs sm:text-sm data-[state=active]:shadow-lg"
                    >
                       <span className="font-semibold">{weekdayLabels[day].short}</span>
                    </TabsTrigger>
                ))}
            </TabsList>
             <ScrollArea className="h-[350px] mt-4 pr-3">
                {allWeekdays.map(day => (
                    <TabsContent key={day} value={day}>
                        <DayScheduleTab day={day} items={scheduleByDay[day] || []} />
                    </TabsContent>
                ))}
             </ScrollArea>
        </Tabs>
    </div>
  );
}
