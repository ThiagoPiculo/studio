
"use client";

import * as React from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Lightbulb } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CompleteMissionConfirmationDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onConfirm: (dismiss: boolean) => void;
}

export function CompleteMissionConfirmationDialog({
  isOpen,
  onOpenChange,
  onConfirm,
}: CompleteMissionConfirmationDialogProps) {
  const [dismissToday, setDismissToday] = React.useState(false);

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
        <div className="flex items-center space-x-2 pt-2">
          <Checkbox id="dismiss-today" checked={dismissToday} onCheckedChange={(checked) => setDismissToday(!!checked)} />
          <Label htmlFor="dismiss-today" className="text-sm font-medium text-muted-foreground">
            Não me lembrar novamente hoje.
          </Label>
        </div>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogAction 
                onClick={() => onConfirm(dismissToday)}
                className={cn(buttonVariants({ variant: "secondary" }), "w-full sm:w-auto")}
            >
                Continuar mesmo assim
            </AlertDialogAction>
             <AlertDialogCancel className={cn(buttonVariants({ variant: "default" }), "w-full sm:w-auto")}>
                Deixar para o herói marcar
            </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
