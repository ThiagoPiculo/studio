
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import type { ChildProfile, MissionTemplate } from '@/lib/types';
import { CalendarDays, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar1Icon } from '@/components/icons/Calendar1Icon';

interface PostAssignmentSuccessDialogProps {
  isOpen: boolean;
  onDone: () => void;
  child: ChildProfile | null;
  template: MissionTemplate | null;
}

export function PostAssignmentSuccessDialog({ isOpen, onDone, child, template }: PostAssignmentSuccessDialogProps) {
  const router = useRouter();

  if (!isOpen || !child || !template) return null;

  const handleNavigation = (path: string) => {
    router.push(path);
    onDone();
  };

  const today = new Date();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onDone()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Missão Agendada com Sucesso!</DialogTitle>
          <DialogDescription>
            A missão "{template.title}" foi adicionada à rotina de {child.name}. O que você gostaria de fazer agora?
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-4">
            <Card 
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleNavigation(`/dashboard/heroes?childId=${child.id}`)}
            >
                <CardHeader className="flex flex-row items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                        <Calendar1Icon className="h-6 w-6 text-chart-5" />
                        <div>
                            <CardTitle className="text-base">Ver Rotina Hoje</CardTitle>
                            <p className="text-xs text-muted-foreground">Missões de {child.name} para hoje, {format(today, 'dd/MM')}.</p>
                        </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
            </Card>
            <Card 
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleNavigation(`/dashboard/agenda?childId=${child.id}`)}
            >
                 <CardHeader className="flex flex-row items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                        <CalendarDays className="h-6 w-6 text-chart-5" />
                        <div>
                            <CardTitle className="text-base">Ver Rotina Semanal</CardTitle>
                            <p className="text-xs text-muted-foreground">Agenda completa de missões para {child.name}.</p>
                        </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
            </Card>
        </div>
        <DialogFooter>
          <Button variant="link" onClick={onDone}>
            Voltar para o Quadro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
