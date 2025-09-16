
'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { ChildProfile, MissionInstance } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Star, Trophy, Sun, CloudSun, Moon } from 'lucide-react';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import { cn, getInitials } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface VictoryParadeProps {
  data: {
    child: ChildProfile;
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
  const cardRef = useRef<HTMLDivElement>(null);
  const [confettiSource, setConfettiSource] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const animationFrameId = useRef<number>();

  const updateConfettiSource = () => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      setConfettiSource({
        x: rect.left,
        y: rect.top,
        w: rect.width,
        h: rect.height,
      });
    }
    animationFrameId.current = requestAnimationFrame(updateConfettiSource);
  };

  useEffect(() => {
    if (data) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 7000);
      
      // Start continuously updating the position
      animationFrameId.current = requestAnimationFrame(updateConfettiSource);

      return () => {
        clearTimeout(timer);
        if (animationFrameId.current) {
          cancelAnimationFrame(animationFrameId.current);
        }
      };
    } else {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      setConfettiSource(null);
    }
  }, [data]);

  if (!data) return null;

  const PeriodIcon = periodDetails[data.period].icon;
  const periodColor = periodDetails[data.period].color;

  return (
    <>
      {showConfetti && confettiSource && (
         <Confetti
          width={width}
          height={height}
          recycle={false}
          numberOfPieces={400}
          gravity={0.15}
          initialVelocityX={{ min: -10, max: 10 }}
          initialVelocityY={{ min: -20, max: 5 }}
          confettiSource={confettiSource}
        />
      )}
      <div 
         className="fixed inset-0 z-[100] flex items-center justify-center p-4"
         onClick={onDone}
      >
        <Card 
            ref={cardRef} 
            className="w-full max-w-sm bg-gradient-to-br from-card to-muted border-primary/20 shadow-2xl overflow-hidden text-center animate-in fade-in zoom-in-95 duration-500"
            onClick={(e) => e.stopPropagation()}
        >
            <CardHeader className="items-center space-y-3 pt-6">
                 <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20 text-3xl border-4 shadow-lg" style={{ borderColor: data.child.color }}>
                        <AvatarImage src={data.child.avatar} alt={data.child.name} />
                        <AvatarFallback style={{ backgroundColor: data.child.color }} className="font-bold">{getInitials(data.child.name)}</AvatarFallback>
                    </Avatar>
                     <div className="p-3 bg-amber-400/20 rounded-full shadow-inner">
                        <Trophy className="h-12 w-12 text-amber-500 filter drop-shadow-md" />
                     </div>
                 </div>
                <div className="space-y-1">
                    <CardTitle className="text-2xl font-headline">Parabéns, {data.child.name}!</CardTitle>
                    <CardDescription className="flex items-center justify-center gap-2">
                        <PeriodIcon className={cn("h-5 w-5", periodColor)} />
                        Você completou as missões da <strong>{data.period}</strong>!
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-1">
                    <p className="text-sm font-semibold">Total de estrelas ganhas:</p>
                    <div className="flex items-center justify-center gap-2 text-amber-500 text-5xl font-bold [text-shadow:0_1px_2px_rgba(0,0,0,0.1)]">
                        <span className="animate-in fade-in-0 slide-in-from-bottom-2 duration-700">+{data.stars}</span>
                        <Star className="h-10 w-10 fill-current animate-in fade-in-0 zoom-in-50 duration-500 delay-100" />
                    </div>
                </div>
            </CardContent>
             <div className="p-6 pt-2">
                <Button onClick={onDone} className="w-full" size="lg">Continuar Jornada!</Button>
            </div>
        </Card>
      </div>
    </>
  );
}
