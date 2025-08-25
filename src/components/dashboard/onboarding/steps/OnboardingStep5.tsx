
"use client";

import React from 'react';
import type { ProcessScheduleOutput } from '@/ai/flows/process-schedule-text';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { weekdayLabels, Weekday } from "@/lib/types";
import { Loader2, Wand2, Sun, Moon, CloudSun, Star, CalendarDays, FlaskConical } from "lucide-react";
import { TimePicker } from "../../missions/TimePicker";
import { Button } from '@/components/ui/button';

interface ScheduleItem {
  activity: string;
  emoji: string;
  type: 'school_entry' | 'school_exit' | 'extra_activity' | 'essential_routine' | 'free_time';
  category: string;
  startTime: string;
  endTime: string;
  days: Weekday[];
}

interface OnboardingStep5Props {
  isLoading?: boolean;
  schedule: ProcessScheduleOutput | null;
  onScheduleChange: (index: number, newTime: string) => void;
  childName: string;
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
                <div className="grid grid-cols-1 gap-1.5 shrink-0">
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

export function OnboardingStep5({ isLoading, schedule, onScheduleChange, childName }: OnboardingStep5Props) {
  const { weekdayRoutines, weekendRoutines, extraActivities } = React.useMemo(() => {
    if (!schedule || !schedule.schedule) {
        return { weekdayRoutines: [], weekendRoutines: [], extraActivities: [] };
    }
    const weekdays = new Set(['MO', 'TU', 'WE', 'TH', 'FR']);
    const weekends = new Set(['SA', 'SU']);

    const weekdayItems = schedule.schedule.filter(item => 
        (item.type === 'essential_routine' || item.type === 'school_entry' || item.type === 'school_exit') && 
        item.days.some(day => weekdays.has(day))
    );

    const weekendItems = schedule.schedule.filter(item => 
        (item.type === 'essential_routine') &&
        item.days.some(day => weekends.has(day))
    );
    
    const extras = schedule.schedule.filter(item => item.type === 'extra_activity');
    
    weekdayItems.sort((a, b) => a.startTime.localeCompare(b.startTime));
    weekendItems.sort((a, b) => a.startTime.localeCompare(b.startTime));
    extras.sort((a, b) => a.startTime.localeCompare(b.startTime));

    return { weekdayRoutines: weekdayItems, weekendRoutines: weekendItems, extraActivities: extras };
  }, [schedule]);

  if (isLoading) {
    return (
        <div className="flex flex-col items-center justify-center text-center h-full animate-in fade-in-50 duration-500">
            <div className="relative">
                <FlaskConical className="h-24 w-24 text-primary animate-bounce" />
            </div>
            <h2 className="mt-6 text-2xl font-bold font-headline">
                Preparando a Poção da Rotina para {childName}!
            </h2>
            <p className="mt-2 text-muted-foreground max-w-md">
                Estou misturando uma pitada de organização com a diversão das atividades favoritas de {childName}. Um momento, a magia está acontecendo!
            </p>
        </div>
    );
  }

  if (!schedule || schedule.schedule.length === 0) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold font-headline">Revisão da Rotina</h2>
        <p className="text-muted-foreground">Nenhuma rotina foi gerada. Você pode voltar para adicionar mais atividades ou pular e configurar manually mais tarde.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-center flex-grow">Ajuste os horários se necessário para refinar a rotina.</p>
      </div>
      
      <div className="max-h-[400px]">
        <ScrollArea className="h-full pr-4">
            <div className="space-y-4">
                <ScheduleSection 
                  title="Missões da Rotina Essencial (Seg a Sex)"
                  icon={CalendarDays}
                  items={weekdayRoutines}
                  schedule={schedule.schedule}
                  onScheduleChange={onScheduleChange}
                />
                 <ScheduleSection 
                  title="Missões da Rotina Essencial (Fim de Semana)"
                  icon={CalendarDays}
                  items={weekendRoutines}
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
