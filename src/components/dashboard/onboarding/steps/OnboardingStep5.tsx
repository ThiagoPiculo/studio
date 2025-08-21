
"use client";

import { useFormContext } from "react-hook-form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { weekdayLabels } from "@/lib/types";
import { Wand2, Loader2 } from "lucide-react";
import type { OnboardingFormValues } from "../OnboardingForm";

interface OnboardingStep5Props {
  isLoading?: boolean;
}

export function OnboardingStep5({ isLoading }: OnboardingStep5Props) {
  const { getValues } = useFormContext<OnboardingFormValues>();
  const allActivities = [...(getValues().extraActivities || []), ...(getValues().essentialRoutines || [])];

  const essentialRoutines = getValues().essentialRoutines || [];
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

  if (allActivities.length === 0) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold font-headline">Resumo da Rotina</h2>
        <p className="text-muted-foreground">Nenhuma rotina foi gerada ou adicionada. Você pode voltar para adicionar ou pular e configurar manualmente mais tarde.</p>
      </div>
    );
  }
  
  const renderScheduleItems = (items: { name: string; emoji: string; time: string; days: string[] }[]) => (
    items.map((item, index) => (
        <div key={`${item.name}-${index}`} className="flex items-center gap-2 sm:gap-4 text-sm">
            <Badge variant="secondary" className="w-16 justify-center shrink-0">{item.time}</Badge>
            <div className="font-semibold flex-grow truncate flex items-center gap-2">
                <span className="text-xl">{item.emoji}</span>
                <span>{item.name}</span>
            </div>
            <div className="flex gap-1 flex-shrink-0 flex-wrap justify-end max-w-[150px] sm:max-w-none">
                {item.days?.map((day: string) => (
                     <Badge key={day} variant="outline" className="w-8 h-8 flex items-center justify-center p-0">{weekdayLabels[day as keyof typeof weekdayLabels]?.short || '?'}</Badge>
                ))}
            </div>
        </div>
    ))
  );

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
                        <h3 className="font-semibold text-muted-foreground">Rotina Essencial (Sugerida pela IA)</h3>
                        <div className="space-y-3">
                           {renderScheduleItems(essentialRoutines)}
                        </div>
                    </div>
                )}
                 {(essentialRoutines.length > 0 && manualActivities.length > 0) && <Separator className="my-4" />}

                {manualActivities.length > 0 && (
                    <div className="space-y-2">
                        <h3 className="font-semibold text-muted-foreground">Atividades Extras Agendadas</h3>
                         <div className="space-y-3">
                           {renderScheduleItems(manualActivities)}
                        </div>
                    </div>
                )}
            </div>
        </ScrollArea>
      </div>
    </div>
  );
}
