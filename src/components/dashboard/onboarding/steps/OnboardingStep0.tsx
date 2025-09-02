
"use client";

import { Rocket } from 'lucide-react';
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

const steps = [
    "Criar o Perfil.",
    "Turno escolar.",
    "Atividades Extras.",
    "Missões Essenciais.",
    "Aprovar a Rotina de Missões criada."
];

export function OnboardingStep0() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in-50 duration-500 h-full">
      <h2 className="text-2xl font-bold font-headline">Olá, {user?.name || 'Responsável'}!</h2>

      <p className="text-muted-foreground max-w-2xl">
        Sou a <strong>Aura</strong>, sua assistente pessoal no Mini Herois. Estou aqui para transformar a rotina do seu filho em uma aventura mágica, de forma rápida e guiada.
      </p>
      
      <div className="text-left bg-muted/50 p-4 rounded-lg border w-full max-w-2xl">
          <h3 className="font-semibold mb-2">São 5 passos simples:</h3>
          <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
            {steps.map((step, index) => (
              <li key={index}><strong>PASSO {index + 1}:</strong> {step}</li>
            ))}
          </ul>
      </div>

       <p className="text-sm italic pt-2 text-center text-muted-foreground font-semibold">Relaxe e curta o fluxo. Vou te ajudar em tudo! É rápido e prático.</p>
    </div>
  );
}
