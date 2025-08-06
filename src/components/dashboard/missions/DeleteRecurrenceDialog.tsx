
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trash2, CalendarX, CalendarX2 } from 'lucide-react';

export type DeleteRecurrenceMode = 'single' | 'forward' | 'all';

interface DeleteRecurrenceDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSelect: (mode: DeleteRecurrenceMode) => void;
}

export function DeleteRecurrenceDialog({ isOpen, onOpenChange, onSelect }: DeleteRecurrenceDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Excluir Missão Recorrente</DialogTitle>
          <DialogDescription>
            Como você gostaria de excluir esta missão recorrente?
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-4">
          <Button
            variant="outline"
            className="w-full justify-start h-auto p-4 text-left hover:bg-primary/10 hover:border-primary"
            onClick={() => onSelect('single')}
          >
            <CalendarX className="mr-4 h-5 w-5 text-primary flex-shrink-0" />
            <div>
              <p className="font-semibold">Apenas esta ocorrência</p>
              <p className="text-xs text-muted-foreground">Remove a missão apenas para este dia específico.</p>
            </div>
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start h-auto p-4 text-left hover:bg-primary/10 hover:border-primary"
            onClick={() => onSelect('forward')}
          >
            <CalendarX2 className="mr-4 h-5 w-5 text-primary flex-shrink-0" />
            <div>
              <p className="font-semibold">Esta e as futuras ocorrências</p>
              <p className="text-xs text-muted-foreground">Mantém as missões passadas e remove a partir deste dia.</p>
            </div>
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start h-auto p-4 text-left border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground [&>svg]:hover:text-destructive-foreground"
            onClick={() => onSelect('all')}
          >
            <Trash2 className="mr-4 h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Todas as ocorrências</p>
              <p className="text-xs text-destructive/80 group-hover:text-destructive-foreground">Remove toda a série de missões (passadas e futuras).</p>
            </div>
          </Button>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancelar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
