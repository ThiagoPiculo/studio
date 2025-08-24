
"use client";

import { Rocket } from 'lucide-react';
import React from 'react';

const steps = [
    "Criar o Perfil do seu Mini Herói.",
    "Indicar o turno da escola para a Rotina Escolar.",
    "Adicionar as Atividades Extras (Aulas de Idioma, Esporte, Artes).",
    "Selecionar as Tarefas Essenciais do dia a dia que selecionarei.",
    "Revisar e aprovar a Rotina de Missões criada por mim!"
];

export function OnboardingStep0() {
  return (
    <div className="flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in-50 duration-500 h-full">
      <div className="flex items-center gap-4">
          <Rocket className="h-10 w-10 text-primary" />
          <h2 className="text-2xl font-bold font-headline">Boas-vindas da Aura!</h2>
      </div>

      <p className="text-muted-foreground max-w-lg">
        Sou a <strong>Aura</strong>, sua assistente pessoal no Mini Herois. Estou aqui para transformar a rotina do seu filho em uma aventura mágica, de forma rápida e guiada.
      </p>
      
      <div className="text-left bg-muted/50 p-4 rounded-lg border w-full max-w-md">
          <h3 className="font-semibold mb-2">São 5 passos simples:</h3>
          <ul className="space-y-1.5 text-sm text-muted-foreground list-decimal list-inside">
            {steps.map((step, index) => (
              <li key={index}><strong>PASSO {index + 1}:</strong> {step.replace(`PASSO ${index + 1}: `, '')}</li>
            ))}
          </ul>
          <p className="text-xs italic mt-3 text-center">Relaxe e curta o fluxo. Vou te ajudar em tudo! É rápido e prático.</p>
      </div>

    </div>
  );
}
