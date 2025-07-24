
"use client";

import { Star, Gem, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

interface LevelUpPathProps {
  currentLevel: number;
  currentXp: number;
}

const Milestone = ({
  level,
  label,
  xpForThisLevel,
  xpInThisLevel,
  isCurrent,
  isCompleted,
  isNext,
  color,
}: {
  level: number;
  label: string;
  xpForThisLevel: number;
  xpInThisLevel: number;
  isCurrent: boolean;
  isCompleted: boolean;
  isNext: boolean;
  color: string;
}) => {
  const progressPercentage = xpForThisLevel > 0 ? (xpInThisLevel / xpForThisLevel) * 100 : 0;
  
  const Icon = useMemo(() => {
    if (isCompleted) return Star;
    if (isCurrent) return Gem;
    return Package;
  }, [isCompleted, isCurrent]);

  return (
    <div className="flex flex-col items-center flex-1 min-w-0">
      <div className="relative w-full flex items-center mb-2">
        {/* Path Background */}
        <div className="h-2.5 bg-muted rounded-full w-full" />
        {/* Path Progress */}
        <div
          className="absolute h-2.5 rounded-full transition-all duration-500"
          style={{ width: `${progressPercentage}%`, backgroundColor: color }}
        />
        {/* Icon Container */}
        <div className={cn(
            "absolute -right-3 sm:-right-4 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border-4 border-background shadow-md",
            isCompleted || isCurrent ? 'bg-primary/10' : 'bg-muted'
        )}>
             <Icon
                className={cn(
                    "h-6 w-6 sm:h-7 sm:h-7",
                    isCompleted && 'text-yellow-400 fill-yellow-400',
                    isCurrent && 'text-purple-500',
                    isNext && 'text-muted-foreground'
                )}
            />
        </div>
      </div>
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
    </div>
  );
};

export function LevelUpPath({ currentLevel, currentXp }: LevelUpPathProps) {
  const calculateLevelDetails = (level: number) => {
    if (level <= 1) return { startXp: 0, endXp: 100 };
    const xpForPreviousLevels = (level - 2) * (level - 1) * 25 + (level - 1) * 100;
    const xpNeededForCurrentLevel = 100 + (level - 1) * 50;
    return {
      startXp: xpForPreviousLevels,
      endXp: xpForPreviousLevels + xpNeededForCurrentLevel,
    };
  };

  const levelData = useMemo(() => {
    const data = [];
    const startLevel = Math.max(1, currentLevel - 1);

    for (let i = 0; i < 3; i++) {
        const level = startLevel + i;
        const details = calculateLevelDetails(level + 1);
        const xpForThisLevel = details.endXp - details.startXp;
        const xpInThisLevel = Math.max(0, Math.min(currentXp - details.startXp, xpForThisLevel));
        
        data.push({
            level: level,
            label: `Nível ${level}`,
            xpForThisLevel,
            xpInThisLevel,
            isCompleted: level < currentLevel,
            isCurrent: level === currentLevel,
            isNext: level > currentLevel,
        });
    }
    return data;
  }, [currentLevel, currentXp]);

  return (
    <div className="w-full space-y-4">
        <div className="flex items-start justify-between gap-2 sm:gap-4">
            {levelData.map((data, index) => (
                 <Milestone
                    key={data.level}
                    level={data.level}
                    label={data.label}
                    xpForThisLevel={data.xpForThisLevel}
                    xpInThisLevel={data.xpInThisLevel}
                    isCompleted={data.isCompleted}
                    isCurrent={data.isCurrent}
                    isNext={data.isNext}
                    color={data.isCompleted ? '#fcd34d' : '#a855f7'} // yellow for completed, purple for current
                />
            ))}
        </div>
         <p className="text-xs text-muted-foreground text-center">
            Complete missões para ganhar XP e avançar para o próximo nível!
        </p>
    </div>
  );
}

