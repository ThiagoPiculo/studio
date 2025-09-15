
"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { MissionInstance } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Star, Trophy, Sun, CloudSun, Moon } from 'lucide-react';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface VictoryParadeProps {
  data: {
    period: 'Manhã' | 'Tarde' | 'Noite';
    missions: MissionInstance[];
    stars: number;
  } | null;
  onDone: () => void;
}

const periodDetails = {
    Manhã: { icon: Sun, color: 'text-yellow-500' },
    Tarde: { icon: CloudSun, color: 'text-orange-500' },
    Noite: { icon: Moon, color: 'text-indigo-500' }
};

export function VictoryParade({ data, onDone }: VictoryParadeProps) {
  const { width, height } = useWindowSize();
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (data) {
      setShowConfetti(true);
      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, 6000); 
      return () => clearTimeout(timer);
    }
  }, [data]);

  if (!data) return null;

  const PeriodIcon = periodDetails[data.period].icon;
  const periodColor = periodDetails[data.period].color;

  return (
    <>
      {showConfetti && <Confetti width={width} height={height} recycle={false} numberOfPieces={400} gravity={0.1} colors={['#FFD700', '#FF33F6', '#33D4FF', '#34D399', '#FF5733']} />}
      <Dialog open={!!data} onOpenChange={(isOpen) => !isOpen && onDone()}>
        <DialogContent className="sm:max-w-md bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/50 dark:to-purple-900/50 border-0 shadow-2xl overflow-hidden">
            <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,#fff,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25 dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.5))]"></div>
            <div className="relative p-6 pt-12 flex flex-col items-center justify-center text-center space-y-4">
              
              <div className="p-4 bg-amber-400/20 rounded-full shadow-lg border-4 border-white dark:border-slate-800">
                <Trophy className="h-16 w-16 text-amber-500" strokeWidth={1.5} />
              </div>

              <DialogHeader>
                <DialogTitle className="text-3xl font-bold font-headline text-primary flex items-center justify-center gap-2">
                    <PeriodIcon className={cn("h-8 w-8", periodColor)} />
                    Missões da {data.period} Concluídas!
                </DialogTitle>
                <DialogDescription className="text-muted-foreground pt-1">Você é um verdadeiro herói! Veja suas conquistas:</DialogDescription>
              </DialogHeader>

              <ScrollArea className="max-h-40 w-full bg-white/50 dark:bg-slate-900/50 rounded-lg border p-2">
                <div className="space-y-2 text-left">
                  {data.missions.map(mission => (
                    <div key={mission.id} className="flex items-center gap-3 p-2 rounded-md bg-green-500/10 text-sm">
                      <span className="text-xl">{mission.emoji || '🎯'}</span>
                      <span className="flex-grow font-medium line-through text-muted-foreground">{mission.title}</span>
                      <span className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        +{mission.starsReward} <Star className="h-4 w-4 fill-amber-400" />
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              <div className="pt-4 space-y-2">
                <p className="text-lg font-semibold">Total de estrelas ganhas neste período:</p>
                <div className="flex items-center justify-center gap-2 text-amber-500 text-5xl font-bold [text-shadow:0_2px_4px_rgba(255,255,255,0.5)]">
                    <Star className="h-12 w-12 fill-current" />
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
