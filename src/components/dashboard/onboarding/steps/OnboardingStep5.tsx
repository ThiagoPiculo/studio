
"use client";

import React from 'react';
import type { ProcessScheduleOutput } from '@/lib/schedule-generator';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { weekdayLabels, Weekday } from "@/lib/types";
import { Loader2, Wand2, Sun, Moon, CloudSun, Star, CalendarDays, FlaskConical, BrainCircuit, NotebookPen } from "lucide-react";
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
  childName: string;
}

const getPeriod = (time: string): 'morning' | 'afternoon' | 'night' => {
    if (!time || !time.includes(':')) return 'morning'; // Fallback
    const hour = parseInt(time.split(':')[0], 10);
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'night';
}

const ScheduleSection = ({ title, icon: Icon, items }: { title: string, icon: React.ElementType, items: ScheduleItem[] }) => {
  if (items.length === 0) return null;

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <h3 className="font-semibold flex items-center gap-2 text-primary">
        <Icon className="h-5 w-5" />
        {title}
      </h3>
      <div className="space-y-3">
        {items.map((item, index) => {
          const IconComponent = item.type === 'school_entry' ? NotebookPen : Star;
          
          return (
            <div key={`${item.activity}-${index}`} className="flex items-center gap-2 sm:gap-3 text-sm">
                <div className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded-md shrink-0">
                    {item.startTime}
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

export function OnboardingStep5({ isLoading, schedule, childName }: OnboardingStep5Props) {
  const { morning, afternoon, night, freeTime } = React.useMemo(() => {
    if (!schedule || !schedule.schedule) {
        return { morning: [], afternoon: [], night: [], freeTime: '' };
    }
    
    const allItems = [...schedule.schedule].sort((a,b) => a.startTime.localeCompare(b.startTime));
    
    return {
        morning: allItems.filter(item => getPeriod(item.startTime) === 'morning'),
        afternoon: allItems.filter(item => getPeriod(item.startTime) === 'afternoon'),
        night: allItems.filter(item => getPeriod(item.startTime) === 'night'),
        freeTime: schedule.freeTime
    };
  }, [schedule]);

  if (isLoading) {
    return (
        <div className="flex flex-col items-center justify-center text-center h-full animate-in fade-in-50 duration-500">
            <div className="relative">
                <BrainCircuit className="h-24 w-24 text-primary animate-pulse" />
            </div>
            <h2 className="mt-6 text-2xl font-bold font-headline">
                Consultando o Oráculo da Organização...
            </h2>
            <p className="mt-2 text-muted-foreground max-w-md">
                Estou analisando os horários e atividades de {childName} para criar a rotina perfeita. Um momento, a mágica está acontecendo!
            </p>
        </div>
    );
  }

  if (!schedule || schedule.schedule.length === 0) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold font-headline">Revisão da Rotina</h2>
        <p className="text-muted-foreground">Nenhuma rotina foi gerada. Você pode voltar para adicionar mais atividades ou pular e configurar manualmente mais tarde.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      <div className="text-center">
        <p className="text-muted-foreground">Esta é a rotina que o assistente criou. Se tudo estiver certo, podemos confirmar e iniciar a jornada!</p>
      </div>
      
      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-4">
            <ScheduleSection 
              title="Período da Manhã"
              icon={Sun}
              items={morning}
            />
            <ScheduleSection 
              title="Período da Tarde"
              icon={CloudSun}
              items={afternoon}
            />
            <ScheduleSection 
              title="Período da Noite"
              icon={Moon}
              items={night}
            />

            <Separator className="my-4" />

            <div className="space-y-2 p-3">
                  <h3 className="font-semibold text-muted-foreground">Momentos Livres Identificados</h3>
                  <p className="text-sm text-muted-foreground italic pl-2">{freeTime}</p>
            </div>
        </div>
      </ScrollArea>
    </div>
  );
}
