
"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { weekdayLabels } from "@/lib/types";
import { Wand2, Loader2 } from "lucide-react";
import type { OnboardingFormValues } from "../OnboardingForm";

interface ScheduleItem {
    activity: string;
    emoji: string;
    type: 'school_entry' | 'school_exit' | 'extra_activity' | 'essential_routine';
    startTime: string;
    endTime: string;
    days: string[];
}

interface OnboardingStep5Props {
  schedule: {
      schedule: ScheduleItem[];
      freeTime: string;
  } | null;
  isLoading: boolean;
  getValues: () => OnboardingFormValues;
}

export function OnboardingStep5({ schedule, isLoading, getValues }: OnboardingStep5Props) {
  const manualActivities = getValues().extraActivities || [];

  if (isLoading) {
    return (
        <div className="flex flex-col items-center justify-center text-center h-full animate-in fade-in-50 duration-500">
            <div className="relative">
                <Loader2 className="h-24 w-24 text-primary animate-spin" />
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

  if (!schedule) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold font-headline">Resumo da Rotina</h2>
        <p className="text-muted-foreground">Nenhuma rotina foi gerada. Você pode pular esta etapa e configurar manualmente.</p>
      </div>
    );
  }

  const { schedule: aiSchedule, freeTime } = schedule;

  const essentialRoutines = aiSchedule?.filter(item => item.type === 'essential_routine' || item.type === 'school_entry' || item.type === 'school_exit') || [];
  
  const renderScheduleItems = (items: (ScheduleItem | { activity: string; emoji: string; startTime: string; days: string[] })[]) => (
    items.map((item, index) => (
        <div key={index} className="flex items-center gap-2 sm:gap-4 text-sm">
            <Badge variant="secondary" className="w-16 justify-center shrink-0">{item.startTime}</Badge>
            <div className="font-semibold flex-grow truncate flex items-center gap-2">
                <span className="text-xl">{item.emoji}</span>
                <span>{item.activity}</span>
            </div>
            <div className="flex gap-1 flex-shrink-0 flex-wrap justify-end max-w-[150px] sm:max-w-none">
                {item.days?.map((day: string) => (
                     <Badge key={day} variant="outline" className="w-8 h-8 flex items-center justify-center p-0">{weekdayLabels[day as keyof typeof weekdayLabels]?.short || '?'}</Badge>
                ))}
            </div>
        </div>
    ))
  );

  const formattedManualActivities = manualActivities.map(act => ({
    activity: act.name,
    emoji: act.emoji,
    startTime: act.time,
    days: act.days,
  }));

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      <div className="text-center">
        <h2 className="text-2xl font-bold font-headline">O Pergaminho da Rotina Diária</h2>
        <p className="text-muted-foreground">Aqui está o plano mágico completo. Se estiver tudo certo, vamos dar vida a esta jornada!</p>
      </div>
      
      <div className="max-h-[350px] p-4 border rounded-lg">
        <ScrollArea className="h-full pr-2">
            <div className="space-y-4">
                {essentialRoutines.length > 0 && (
                    <div className="space-y-2">
                        <h3 className="font-semibold text-muted-foreground">Rotina Essencial (Sugestão da IA)</h3>
                        <div className="space-y-3">
                           {renderScheduleItems(essentialRoutines)}
                        </div>
                    </div>
                )}
                 {(essentialRoutines.length > 0 && formattedManualActivities.length > 0) && <Separator className="my-4" />}

                {formattedManualActivities.length > 0 && (
                    <div className="space-y-2">
                        <h3 className="font-semibold text-muted-foreground">Atividades Extras (Agendadas por você)</h3>
                         <div className="space-y-3">
                           {renderScheduleItems(formattedManualActivities)}
                        </div>
                    </div>
                )}
            </div>
            <Separator className="my-4" />
            <div>
                <h3 className="font-semibold mb-2">Horários Livres Sugeridos</h3>
                <p className="text-sm text-muted-foreground">{freeTime}</p>
            </div>
        </ScrollArea>
      </div>
    </div>
  );
}
