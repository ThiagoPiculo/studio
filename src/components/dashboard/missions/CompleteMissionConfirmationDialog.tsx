
"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, Lightbulb } from "lucide-react";

interface CompleteMissionConfirmationDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onConfirm: () => void;
  onConfirmAndDismiss: () => void;
}

export function CompleteMissionConfirmationDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  onConfirmAndDismiss,
}: CompleteMissionConfirmationDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-yellow-500" />
            Dica de Mestre Herói!
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 pt-2 text-base text-muted-foreground">
                <p>Que tal chamar seu herói para dar o 'check' final na missão?</p>
                <p>Quando a criança marca a tarefa, ela consolida a conquista. Esse pequeno gesto tem um grande poder de <strong>motivação</strong> e transforma o dever em uma <strong>vitória pessoal</strong> para ele.</p>
                <p>Este <strong>ato de autonomia</strong> é um passo importante para construir a confiança e a responsabilidade.</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-col sm:items-stretch gap-2">
           <AlertDialogAction onClick={onConfirm}>
                Continuar mesmo assim
            </AlertDialogAction>
            <Button variant="secondary" onClick={onConfirmAndDismiss}>
                Entendi, concluir e não me lembrar hoje
            </Button>
            <AlertDialogCancel>Deixar para o herói marcar</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
