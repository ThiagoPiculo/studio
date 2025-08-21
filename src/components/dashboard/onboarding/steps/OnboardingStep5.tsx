
"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { weekdayLabels } from "@/lib/types";
import { Wand2, Loader2, Sun, Moon, CloudSun } from "lucide-react";
import type { ProcessScheduleOutput } from "@/ai/flows/process-schedule-text";

interface OnboardingStep5Props {
  isLoading?: boolean;
  schedule: ProcessScheduleOutput | null;
}

const getPeriodOfDay = (time: string): 'morning' | 'afternoon' | 'night' => {
    const hour = parseInt(time.split(':')[0], 10);
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'night';
};

const periodConfig = {
    morning: { icon: Sun, label: 'Manhã', color: 'text-yellow-600', bg: 'bg-yellow-500/5' },
    afternoon: { icon: CloudSun, label: 'Tarde', color: 'text-orange-600', bg: 'bg-orange-500/5' },
    night: { icon: Moon, label: 'Noite', color: 'text-indigo-600', bg: 'bg-indigo-500/5' },
}

export function OnboardingStep5({ isLoading, schedule }: OnboardingStep5Props) {

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
  
  const groupedSchedule = schedule.schedule.reduce((acc, item) => {
    const period = getPeriodOfDay(item.startTime);
    if (!acc[period]) {
        acc[period] = [];
    }
    acc[period].push(item);
    return acc;
  }, {} as Record<'morning' | 'afternoon' | 'night', typeof schedule.schedule>);

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      <div className="text-center">
        <h2 className="text-2xl font-bold font-headline">O Pergaminho da Rotina Diária</h2>
        <p className="text-muted-foreground">Aqui está o plano mágico completo. Se estiver tudo certo, vamos dar vida a esta jornada!</p>
      </div>
      
      <div className="max-h-[350px] p-4 border rounded-lg bg-muted/20">
        <ScrollArea className="h-full pr-4">
            <div className="space-y-4">
                {(['morning', 'afternoon', 'night'] as const).map((period) => {
                    const items = groupedSchedule[period];
                    if (!items || items.length === 0) return null;
                    const { icon: Icon, label, color, bg } = periodConfig[period];
                    return (
                        <div key={period} className={`space-y-3 p-3 rounded-lg ${bg}`}>
                            <h3 className={`font-semibold flex items-center gap-2 ${color}`}>
                                <Icon className="h-5 w-5" />
                                {label}
                            </h3>
                            <div className="space-y-3">
                                {items.map((item, index) => (
                                    <div key={`${item.activity}-${index}`} className="flex items-start gap-2 sm:gap-4 text-sm">
                                        <Badge variant="secondary" className="w-16 justify-center shrink-0 mt-1">{item.startTime}</Badge>
                                        <div className="flex-grow">
                                            <div className="font-semibold flex items-center gap-2">
                                                <span className="text-xl">{item.emoji}</span>
                                                <span>{item.activity}</span>
                                            </div>
                                            <div className="text-xs text-muted-foreground pl-8">
                                                {item.days.map(d => weekdayLabels[d as keyof typeof weekdayLabels].short).join(', ')}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
                 <div className="space-y-2 pt-4 p-3">
                     <h3 className="font-semibold text-muted-foreground">Momentos Livres Identificados</h3>
                     <p className="text-sm text-muted-foreground italic pl-2">{schedule.freeTime}</p>
                </div>
            </div>
        </ScrollArea>
      </div>
    </div>
  );
}
