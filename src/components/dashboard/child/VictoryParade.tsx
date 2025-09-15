
"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { MissionInstance } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Star, CheckCircle } from 'lucide-react';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';

interface VictoryParadeProps {
  data: {
    period: 'Manhã' | 'Tarde' | 'Noite';
    missions: MissionInstance[];
    stars: number;
  } | null;
  onDone: () => void;
}

export function VictoryParade({ data, onDone }: VictoryParadeProps) {
  const { width, height } = useWindowSize();
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (data) {
      setShowConfetti(true);
      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, 6000); // Stop confetti after 6 seconds
      return () => clearTimeout(timer);
    }
  }, [data]);

  if (!data) return null;

  return (
    <>
      {showConfetti && <Confetti width={width} height={height} recycle={false} numberOfPieces={300} />}
      <Dialog open={!!data} onOpenChange={(isOpen) => !isOpen && onDone()}>
        <DialogContent className="sm:max-w-md bg-gradient-to-br from-background to-primary/5">
            <div className="p-6 text-center space-y-4">
              <h2 className="text-3xl font-bold font-headline text-primary">Missões da {data.period} Concluídas!</h2>
              <p className="text-muted-foreground">Você é um verdadeiro herói! Veja suas conquistas:</p>
              
              <div className="space-y-2 text-left max-h-48 overflow-y-auto pr-2">
                {data.missions.map(mission => (
                  <div key={mission.id} className="flex items-center gap-2 p-2 rounded-md bg-green-500/10">
                    <CheckCircle className="h-5 w-5 text-green-600"/>
                    <span className="flex-grow font-medium line-through text-muted-foreground">{mission.title}</span>
                    <span className="font-semibold text-amber-600 flex items-center gap-1">
                      +{mission.starsReward} <Star className="h-4 w-4" />
                    </span>
                  </div>
                ))}
              </div>
              
              <div className="pt-4 space-y-2">
                <p className="text-lg font-semibold">Total de estrelas ganhas neste período:</p>
                <div className="flex items-center justify-center gap-2 text-amber-500 text-4xl font-bold">
                    <Star className="h-10 w-10 fill-current" />
                    <span>{data.stars}</span>
                </div>
              </div>
              
              <Button onClick={onDone} className="w-full mt-4" size="lg">Continuar Jornada!</Button>
            </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
