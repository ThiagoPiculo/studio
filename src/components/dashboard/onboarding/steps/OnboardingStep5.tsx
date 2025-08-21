
"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { weekdayLabels } from "@/lib/types";

interface OnboardingStep5Props {
  schedule: any | null;
}

export function OnboardingStep5({ schedule }: OnboardingStep5Props) {
  if (!schedule) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold font-headline">Resumo da Rotina</h2>
        <p className="text-muted-foreground">Nenhuma rotina foi gerada. Você pode pular esta etapa e configurar manualmente.</p>
      </div>
    );
  }

  const { schedule: dailySchedules, freeTime } = schedule;

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      <div className="text-center">
        <h2 className="text-2xl font-bold font-headline">O Pergaminho da Rotina Diária</h2>
        <p className="text-muted-foreground">Aqui está o plano mágico gerado pela IA. Se estiver tudo certo, vamos dar vida a esta jornada!</p>
      </div>
      
      <div className="max-h-[350px] p-4 border rounded-lg">
        <ScrollArea className="h-full pr-2">
            <div className="space-y-4">
            {dailySchedules?.map((item: any, index: number) => (
                <div key={index} className="flex items-center gap-2 sm:gap-4 text-sm">
                    <Badge variant="secondary" className="w-16 justify-center shrink-0">{item.startTime}</Badge>
                    <span className="text-xl shrink-0">{item.emoji}</span>
                    <div className="font-semibold flex-grow truncate">{item.activity}</div>
                    <div className="flex gap-1 flex-shrink-0">
                        {item.days?.map((day: string) => (
                             <Badge key={day} variant="outline" className="w-8 h-8 flex items-center justify-center p-0">{weekdayLabels[day as keyof typeof weekdayLabels].short}</Badge>
                        ))}
                    </div>
                </div>
            ))}
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
