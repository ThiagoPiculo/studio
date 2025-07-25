
"use client";

import { BadgeCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

interface LevelUpPathProps {
  currentLevel: number;
  currentXp: number;
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
    <div className="flex flex-col items-start flex-1 min-w-0 isolate">
      <div className="relative w-full flex items-center mb-1">
        {/* Path Background */}
        <div className="h-2.5 bg-muted rounded-full w-full" />
        {/* Path Progress */}
        <div
          className="absolute h-2.5 rounded-full transition-all duration-500 bg-blue-500"
          style={{ width: `${isCurrent ? progressPercentage : isCompleted ? 100 : 0}%` }}
        />
        {/* Icon Container */}
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
      <span className="text-xs text-muted-foreground">{xpGoal} XP</span>
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

