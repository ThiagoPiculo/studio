
"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { weekdayLabels } from "@/lib/types";
import { Wand2, Loader2, Sun, Moon, CloudSun, ListChecks, Star } from "lucide-react";
import type { ProcessScheduleOutput, ScheduleItem } from "../OnboardingForm";
import { useFormContext } from "react-hook-form";
import { TimePicker } from "../../school-schedule/TimePicker";
import React from 'react';

interface OnboardingStep5Props {
  isLoading?: boolean;
  schedule: ProcessScheduleOutput | null;
  onScheduleChange: (index: number, newTime: string) => void;
}


const ScheduleSection = ({ title, icon: Icon, items, schedule, onScheduleChange }: { title: string, icon: React.ElementType, items: ScheduleItem[], schedule: ScheduleItem[], onScheduleChange: (index: number, newTime: string) => void }) => {
  if (items.length === 0) return null;

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <h3 className="font-semibold flex items-center gap-2 text-primary">
        <Icon className="h-5 w-5" />
        {title}
      </h3>
      <div className="space-y-3">
        {items.map((item, index) => {
          const globalIndex = schedule.findIndex(s => s === item);
          return (
            <div key={`${item.activity}-${index}`} className="flex items-center gap-2 sm:gap-3 text-sm">
                <div className="grid grid-cols-2 gap-1.5 shrink-0">
                    <TimePicker 
                        value={item.startTime}
                        onChange={(newTime) => onScheduleChange(globalIndex, newTime)}
                    />
                </div>
                <div className="flex-grow flex items-center gap-2">
                    <span className="text-xl">{item.emoji}</span>
                    <div className="flex flex-col">
                        <span className="font-semibold">{item.activity}</span>
                        <div className="text-xs text-muted-foreground">
                            {item.days.map(d => weekdayLabels[d as keyof typeof weekdayLabels].short).join(', ')}
                        </div>
                    </div>
                </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function OnboardingStep5({ isLoading, schedule, onScheduleChange }: OnboardingStep5Props) {

  const { essentialRoutines, extraActivities } = React.useMemo(() => {
    if (!schedule || !schedule.schedule) {
        return { essentialRoutines: [], extraActivities: [] };
    }
    const essentials = schedule.schedule.filter(
        item => item.type === 'essential_routine' || item.type === 'school_entry' || item.type === 'school_exit'
    );
    const extras = schedule.schedule.filter(item => item.type === 'extra_activity');
    
    essentials.sort((a, b) => a.startTime.localeCompare(b.startTime));
    extras.sort((a, b) => a.startTime.localeCompare(b.startTime));

    return { essentialRoutines: essentials, extraActivities: extras };
  }, [schedule]);

  
  if (isLoading) {
    return (
        <div className="flex flex-col items-center justify-center text-center h-full animate-in fade-in-50 duration-500">
            <div className="relative">
                <Loader2 className="h-24 w-24 text-primary animate-spin" />
                <Wand2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-10 w-10 text-primary/80" />
            </div>
            <h2 className="mt-6 text-2xl font-bold font-headline">
                Consultando o Oráculo da Organização...
            </h2>
            <p className="mt-2 text-muted-foreground max-w-md">
                Aguarde um momento enquanto o Mago usa a IA do Google para forjar uma 'Rotina Essencial' perfeita.
            </p>
        </div>
    );
  }

  if (!schedule || schedule.schedule.length === 0) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold font-headline">Resumo da Rotina</h2>
        <p className="text-muted-foreground">Nenhuma rotina foi gerada. Você pode voltar para adicionar mais atividades ou pular e configurar manualmente mais tarde.</p>
      </div>
    );
  }
  

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      <div className="text-center">
        <h2 className="text-2xl font-bold font-headline">O Pergaminho da Rotina Diária</h2>
        <p className="text-muted-foreground">Aqui está o plano mágico completo, separado entre a rotina essencial e as atividades extras para maior clareza. Se precisar, ajuste os horários antes de dar vida a esta jornada!</p>
      </div>
      
      <div className="max-h-[400px]">
        <ScrollArea className="h-full pr-4">
            <div className="space-y-4">
                <ScheduleSection 
                  title="Missões da Rotina Essencial"
                  icon={ListChecks}
                  items={essentialRoutines}
                  schedule={schedule.schedule}
                  onScheduleChange={onScheduleChange}
                />
                 <ScheduleSection 
                  title="Atividades Extras"
                  icon={Star}
                  items={extraActivities}
                  schedule={schedule.schedule}
                  onScheduleChange={onScheduleChange}
                />

                <Separator className="my-4" />

                <div className="space-y-2 p-3">
                     <h3 className="font-semibold text-muted-foreground">Momentos Livres Identificados</h3>
                     <p className="text-sm text-muted-foreground italic pl-2">{schedule.freeTime}</p>
                </div>
            </div>
        </ScrollArea>
      </div>
    </div>
  );
}
