

"use client";

import { BadgeCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';
import { Progress } from '@/components/ui/progress';

interface LevelUpPathProps {
  currentLevel: number;
  currentXp: number; // This will now be totalStars
}

const Milestone = ({
  label,
  xpGoal,
  isCurrent,
  isCompleted,
  progressPercentage,
}: {
  label: string;
  xpGoal: number;
  isCurrent: boolean;
  isCompleted: boolean;
  progressPercentage: number;
}) => {
  return (
    <div className="flex flex-col items-start flex-1 min-w-0">
      <div className="relative w-full flex items-center mb-1 isolate">
        <Progress value={isCompleted ? 100 : isCurrent ? progressPercentage : 0} className="h-2.5 w-full" />
        <div className={cn(
            "absolute -right-3 sm:-right-4 w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center border-4 border-background shadow-md z-10 bg-background"
        )}>
             <BadgeCheck
                className={cn(
                    "h-5 w-5 sm:h-6 sm:w-6 transition-all",
                    isCompleted ? 'text-blue-500 fill-blue-500/20' : 
                    isCurrent ? 'text-blue-600' : 
                    'text-muted-foreground/50'
                )}
            />
        </div>
      </div>
      <span className="text-xs font-semibold text-foreground">{label}</span>
      <span className="text-xs text-muted-foreground">{xpGoal} ★</span>
    </div>
  );
};

export function LevelUpPath({ currentLevel, currentXp: currentTotalStars }: LevelUpPathProps) {
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
            {levelData.map((data) => (
                 <Milestone
                    key={data.level}
                    label={data.label}
                    xpGoal={data.xpGoal}
                    isCompleted={data.isCompleted}
                    isCurrent={data.isCurrent}
                    progressPercentage={data.progressPercentage}
                />
            ))}
        </div>
    </div>
  );
}
