
"use client";

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';
import { Progress } from '@/components/ui/progress';

interface LevelUpPathProps {
  currentLevel: number;
  currentTotalStars: number; 
}

const Milestone = ({
  label,
  starGoal,
  isCurrent,
  isCompleted,
  progressPercentage,
  isLast,
}: {
  label: string;
  starGoal: number;
  isCurrent: boolean;
  isCompleted: boolean;
  progressPercentage: number;
  isLast: boolean;
}) => {
  return (
    <div className="flex flex-col items-center flex-1 min-w-0">
      <div className="relative w-full flex items-center mb-1">
        <Progress value={isCompleted ? 100 : isCurrent ? progressPercentage : 0} className="h-2.5 w-full" />
        {!isLast && (
             <div className={cn(
                "absolute -right-3 sm:-right-4 w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center border-4 border-background shadow-md"
            )}>
                <Star
                    className={cn(
                        "h-5 w-5 sm:h-6 sm:w-6 transition-all",
                        isCompleted ? 'text-yellow-500 fill-yellow-500/20' : 
                        isCurrent ? 'text-yellow-600' : 
                        'text-muted-foreground/50'
                    )}
                />
            </div>
        )}
      </div>
      <span className="text-xs font-semibold text-foreground text-center">{label}</span>
      <span className="text-xs text-muted-foreground text-center">{starGoal} ★</span>
    </div>
  );
};

export function LevelUpPath({ currentLevel, currentTotalStars }: LevelUpPathProps) {
  const calculateLevelDetails = (level: number): { startStars: number, endStars: number } => {
      if (level <= 1) return { startStars: 0, endStars: 100 };
      let totalStarsForPreviousLevels = 0;
      for (let i = 1; i < level; i++) {
          totalStarsForPreviousLevels += 100 + (i - 1) * 50;
      }
      const starsNeededForThisLevel = 100 + (level - 1) * 50;
      return {
          startStars: totalStarsForPreviousLevels,
          endStars: totalStarsForPreviousLevels + starsNeededForThisLevel,
      };
  };

  const levelData = useMemo(() => {
    const data = [];
    const startLevel = Math.max(1, currentLevel > 1 ? currentLevel - 1 : 1);

    for (let i = 0; i < 3; i++) {
        const level = startLevel + i;
        const { startStars, endStars } = calculateLevelDetails(level);
        const starsForThisLevel = endStars - startStars;
        const starsInThisLevel = currentTotalStars - startStars;

        const progressPercentage = starsForThisLevel > 0 
            ? Math.max(0, Math.min(100, (starsInThisLevel / starsForThisLevel) * 100))
            : 0;
        
        data.push({
            level: level,
            label: `Nível ${level}`,
            xpGoal: endStars,
            isCompleted: level < currentLevel,
            isCurrent: level === currentLevel,
            progressPercentage: progressPercentage
        });
    }
    return data;
  }, [currentLevel, currentTotalStars]);

  return (
    <div className="w-full">
        <div className="flex items-start justify-between gap-2 sm:gap-4">
            {levelData.map((data, index) => (
                 <Milestone
                    key={data.level}
                    label={data.label}
                    starGoal={data.xpGoal}
                    isCompleted={data.isCompleted}
                    isCurrent={data.isCurrent}
                    progressPercentage={data.progressPercentage}
                    isLast={index === levelData.length - 1}
                />
            ))}
        </div>
    </div>
  );
}
