
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
import { Calendar, CalendarClock, CalendarRange } from 'lucide-react';
import type { MissionInstance } from '@/lib/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type EditRecurrenceMode = 'single' | 'forward' | 'all';

interface EditRecurrenceDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSelect: (mode: EditRecurrenceMode) => void;
  missionInstance?: MissionInstance | null;
  occurrenceDate?: Date | null;
}

export function EditRecurrenceDialog({ isOpen, onOpenChange, onSelect, missionInstance, occurrenceDate }: EditRecurrenceDialogProps) {
  if (!missionInstance || !occurrenceDate) return null;

  const formattedDate = format(occurrenceDate, "'de' dd 'de' MMMM", { locale: ptBR });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Missão Recorrente</DialogTitle>
          <DialogDescription>
            Como você gostaria de editar esta missão?
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-4">
          <Button
            variant="outline"
            className="w-full justify-start h-auto p-4 text-left hover:bg-primary/10 hover:border-primary"
            onClick={() => onSelect('single')}
          >
            <Calendar className="mr-4 h-5 w-5 text-primary flex-shrink-0" />
            <div>
              <p className="font-semibold">Apenas este evento</p>
              <p className="text-xs text-muted-foreground">Altera somente a ocorrência {formattedDate}.</p>
            </div>
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start h-auto p-4 text-left hover:bg-primary/10 hover:border-primary"
            onClick={() => onSelect('forward')}
          >
            <CalendarClock className="mr-4 h-5 w-5 text-primary flex-shrink-0" />
            <div>
              <p className="font-semibold">Este e os eventos seguintes</p>
              <p className="text-xs text-muted-foreground">Altera a ocorrência {formattedDate} e todas as futuras.</p>
            </div>
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start h-auto p-4 text-left hover:bg-primary/10 hover:border-primary"
            onClick={() => onSelect('all')}
          >
            <CalendarRange className="mr-4 h-5 w-5 text-primary flex-shrink-0" />
            <div>
              <p className="font-semibold">Todos os eventos da série</p>
              <p className="text-xs text-muted-foreground">Altera todas as ocorrências, passadas e futuras.</p>
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
