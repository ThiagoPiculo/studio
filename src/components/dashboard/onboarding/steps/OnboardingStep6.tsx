
"use client";

import { useFormContext } from "react-hook-form";
import { AlertTriangle, BrainCircuit, Loader2 } from "lucide-react";
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface OnboardingStep6Props {
  isLoading: boolean;
  childName: string;
}

const processingSteps = [
  "Analisando dados do herói...",
  "Mapeando horário escolar e atividades extras...",
  "Distribuindo rotinas essenciais nos horários livres...",
  "Preenchendo os tempos vagos para garantir o descanso...",
  "Revisando e finalizando o mapa da jornada...",
  "Rotina gerada com sucesso!"
];

export function OnboardingStep6({ isLoading, childName }: OnboardingStep6Props) {
  const [currentStepIndex, setCurrentStepIndex] = React.useState(0);

  React.useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setCurrentStepIndex(prevIndex => {
          if (prevIndex < processingSteps.length - 1) {
            return prevIndex + 1;
          }
          clearInterval(interval);
          return prevIndex;
        });
      }, 750); // Change step every 750ms

      return () => clearInterval(interval);
    } else {
        // When not loading, ensure we show the final message if steps were shown
        if(currentStepIndex < processingSteps.length -1 && currentStepIndex > 0) {
            setCurrentStepIndex(processingSteps.length -1)
        }
    }
  }, [isLoading, currentStepIndex]);

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
        <div className="mt-6 w-full max-w-md h-24 p-4 border rounded-lg bg-muted/30 overflow-hidden">
            <AnimatePresence mode="popLayout">
                <motion.div
                    key={currentStepIndex}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-center gap-3 text-sm font-semibold"
                >
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span>{processingSteps[currentStepIndex]}</span>
                </motion.div>
            </AnimatePresence>
        </div>
    </div>
  );
}
