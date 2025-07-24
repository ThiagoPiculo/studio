
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
  xpGoal,
  isCurrent,
  isCompleted,
  progressPercentage,
}: {
  level: number;
  label: string;
  xpGoal: number;
  isCurrent: boolean;
  isCompleted: boolean;
  progressPercentage: number;
}) => {
  return (
    <div className="flex flex-col items-center flex-1 min-w-0">
      <div className="relative w-full flex items-center mb-1">
        {/* Path Background */}
        <div className="h-2.5 bg-muted rounded-full w-full" />
        {/* Path Progress */}
        <div
          className="absolute h-2.5 rounded-full transition-all duration-500 bg-yellow-400"
          style={{ width: `${isCompleted ? 100 : progressPercentage}%` }}
        />
        {/* Icon Container */}
        <div className={cn(
            "absolute -right-3 sm:-right-4 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border-4 border-background shadow-md",
            isCompleted || isCurrent ? 'bg-primary/10' : 'bg-muted'
        )}>
             <Star
                className={cn(
                    "h-6 w-6 sm:h-7 sm:h-7 transition-all",
                    isCompleted ? 'text-yellow-400 fill-yellow-400' : 
                    isCurrent ? 'text-yellow-500' : 
                    'text-muted-foreground/50'
                )}
            />
        </div>
      </div>
      <span className="text-xs font-semibold text-foreground">{label}</span>
      <span className="text-xs text-muted-foreground">Até {xpGoal} XP</span>
    </div>
  );
};

export function LevelUpPath({ currentLevel, currentXp }: LevelUpPathProps) {
  const calculateLevelDetails = (level: number): { startXp: number, endXp: number } => {
      if (level <= 1) return { startXp: 0, endXp: 100 };
      let totalXpForPreviousLevels = 0;
      for (let i = 1; i < level; i++) {
          totalXpForPreviousLevels += 100 + (i - 1) * 50;
      }
      const xpNeededForThisLevel = 100 + (level - 1) * 50;
      return {
          startXp: totalXpForPreviousLevels,
          endXp: totalXpForPreviousLevels + xpNeededForThisLevel,
      };
  };

  const levelData = useMemo(() => {
    const data = [];
    const startLevel = Math.max(1, currentLevel > 1 ? currentLevel - 1 : 1);

    for (let i = 0; i < 3; i++) {
        const level = startLevel + i;
        const { startXp, endXp } = calculateLevelDetails(level);
        const xpForThisLevel = endXp - startXp;
        const xpInThisLevel = currentXp - startXp;

        const progressPercentage = xpForThisLevel > 0 
            ? Math.max(0, Math.min(100, (xpInThisLevel / xpForThisLevel) * 100))
            : 0;
        
        data.push({
            level: level,
            label: `Nível ${level}`,
            xpGoal: endXp,
            isCompleted: level < currentLevel,
            isCurrent: level === currentLevel,
            progressPercentage: progressPercentage
        });
    }
    return data;
  }, [currentLevel, currentXp]);

  return (
    <div className="w-full space-y-4">
        <div className="flex items-start justify-between gap-2 sm:gap-4">
            {levelData.map((data) => (
                 <Milestone
                    key={data.level}
                    level={data.level}
                    label={data.label}
                    xpGoal={data.xpGoal}
                    isCompleted={data.isCompleted}
                    isCurrent={data.isCurrent}
                    progressPercentage={data.progressPercentage}
                />
            ))}
        </div>
         <p className="text-xs text-muted-foreground text-center">
            Complete missões para ganhar XP e avançar para o próximo nível!
        </p>
    </div>
  );
}
