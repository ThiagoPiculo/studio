
"use client";

import { useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { ChildProfile } from "@/lib/types";
import { getInitials, cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";

interface HeroSelectorProps {
  heroes: ChildProfile[];
  selectedHeroId: string | null;
  onSelectHero: (id: string | null) => void;
  showAllOption?: boolean;
}

export function HeroSelector({ heroes, selectedHeroId, onSelectHero, showAllOption = false }: HeroSelectorProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
        const scrollAmount = direction === 'left' ? -200 : 200;
        scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }

  return (
    <div className="relative group w-full">
        <Button 
            variant="outline" 
            size="icon" 
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full shadow-md hidden md:flex opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => scroll('left')}
        >
            <ChevronLeft className="h-4 w-4" />
        </Button>
      <ScrollArea className="w-full whitespace-nowrap rounded-md">
        <div className="flex w-max space-x-4 p-4" ref={scrollContainerRef}>
          {showAllOption && (
            <button
              onClick={() => onSelectHero(null)}
              className="flex flex-col items-center gap-2 text-center w-20 transition-transform duration-200 hover:scale-105"
            >
              <div
                className={cn(
                  "h-16 w-16 md:h-20 md:w-20 rounded-full flex items-center justify-center transition-all duration-300 ring-2 ring-offset-2 ring-offset-background",
                  selectedHeroId === null ? 'ring-primary bg-primary/10' : 'ring-transparent bg-muted/50'
                )}
              >
                <Users className={cn("h-8 w-8 md:h-10 md:w-10", selectedHeroId === null ? 'text-primary' : 'text-muted-foreground')} />
              </div>
              <span className={cn(
                    "text-xs md:text-sm font-medium w-full truncate",
                    selectedHeroId === null ? "text-primary" : "text-muted-foreground"
                )}>
                  Todos
                </span>
            </button>
          )}

          {heroes.map((hero) => (
            <button
              key={hero.id}
              onClick={() => onSelectHero(hero.id)}
              className="flex flex-col items-center gap-2 text-center w-20 transition-transform duration-200 hover:scale-105"
            >
              <Avatar
                className={cn(
                  "h-16 w-16 md:h-20 md:w-20 transition-all duration-300 ring-2 ring-offset-2 ring-offset-background",
                  selectedHeroId === hero.id
                    ? 'ring-primary'
                    : 'ring-transparent'
                )}
              >
                <AvatarImage src={hero.avatar} alt={hero.name} />
                <AvatarFallback
                  className="font-bold text-xl"
                  style={{ backgroundColor: hero.color }}
                >
                  {getInitials(hero.name)}
                </AvatarFallback>
              </Avatar>
              <span className={cn(
                  "text-xs md:text-sm font-medium w-full truncate",
                  selectedHeroId === hero.id ? "text-primary" : "text-muted-foreground"
              )}>
                {hero.name}
              </span>
            </button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="h-0" />
      </ScrollArea>
      <Button 
            variant="outline" 
            size="icon" 
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full shadow-md hidden md:flex opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => scroll('right')}
        >
            <ChevronRight className="h-4 w-4" />
        </Button>
    </div>
  );
}
