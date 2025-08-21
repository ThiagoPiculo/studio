
"use client";

import { Wand2, Loader2 } from "lucide-react";

interface OnboardingStep4Props {
    isLoading: boolean;
    childName: string;
}

export function OnboardingStep4({ isLoading, childName }: OnboardingStep4Props) {
  return (
    <div className="flex flex-col items-center justify-center text-center h-full animate-in fade-in-50 duration-500">
      <div className="relative">
          {isLoading ? (
            <Loader2 className="h-24 w-24 text-primary animate-spin" />
          ) : (
            <Wand2 className="h-24 w-24 text-primary" />
          )}
      </div>
      <h2 className="mt-6 text-2xl font-bold font-headline">
        {isLoading ? "Consultando o Oráculo da Organização..." : "Magia Realizada!"}
      </h2>
      <p className="mt-2 text-muted-foreground max-w-md">
        {isLoading 
          ? `Aguarde um momento enquanto o Mago usa a IA do Google para forjar uma 'Rotina Essencial' perfeita para ${childName}.`
          : "O 'Pergaminho da Rotina Diária' foi criado! Vamos ver como ficou."
        }
      </p>
    </div>
  );
}
