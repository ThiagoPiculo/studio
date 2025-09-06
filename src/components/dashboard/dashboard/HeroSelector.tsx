

"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { ChildProfile } from "@/lib/types";
import { getInitials, cn } from "@/lib/utils";
import { ChevronsUpDown, Users, User, Link as LinkIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { useFamily } from "@/contexts/FamilyContext";
import { useEffect } from "react";

interface HeroSelectorProps {
  heroes: ChildProfile[];
  selectedHeroId: string | null;
  onSelectHero: (id: string | null) => void;
  showAllOption?: boolean;
}

export function HeroSelector({ heroes, selectedHeroId, onSelectHero, showAllOption = false }: HeroSelectorProps) {

  const selectedHero = heroes.find(h => h.id === selectedHeroId);
  const { currentContext } = useFamily();

  // Effect to deselect hero if they don't belong to the current context
  useEffect(() => {
      if (selectedHeroId) {
          const heroBelongsToContext = heroes.some(h => h.id === selectedHeroId);
          if (!heroBelongsToContext) {
              onSelectHero(null);
          }
      }
  }, [heroes, selectedHeroId, onSelectHero, currentContext]);


  return (
     <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full sm:w-[320px] justify-between shadow-sm p-2">
                <div className="flex items-center gap-3 truncate">
                    {selectedHero ? (
                        <Avatar className="h-7 w-7 ring-2 ring-offset-background ring-[var(--ring-color)]" style={selectedHero.color ? { '--ring-color': selectedHero.color } as React.CSSProperties : {}}>
                            <AvatarImage src={selectedHero.avatar} alt={selectedHero.name} />
                            <AvatarFallback style={{ backgroundColor: selectedHero.color }}>
                                {getInitials(selectedHero.name)}
                            </AvatarFallback>
                        </Avatar>
                    ) : (
                        <Users className="h-5 w-5 text-muted-foreground" />
                    )}
                    <span className="truncate font-semibold">
                        {selectedHero ? selectedHero.name : 'Todos os Mini Herois'}
                    </span>
                </div>
                <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
            <DropdownMenuRadioGroup value={selectedHeroId || 'all'} onValueChange={(value) => onSelectHero(value === 'all' ? null : value)}>
                 {showAllOption && (
                    <>
                        <DropdownMenuRadioItem value="all" className="cursor-pointer">
                           <div className="flex items-center gap-3">
                                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <span className="font-medium">Todos os Mini Herois</span>
                            </div>
                        </DropdownMenuRadioItem>
                        <DropdownMenuSeparator />
                    </>
                 )}
                 <DropdownMenuLabel>Selecione um Herói</DropdownMenuLabel>
                 {heroes.map(hero => (
                    <DropdownMenuRadioItem key={hero.id} value={hero.id} className="cursor-pointer">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-6 w-6 ring-2 ring-offset-background ring-[var(--ring-color)]" style={hero.color ? { '--ring-color': hero.color } as React.CSSProperties : {}}>
                                <AvatarImage src={hero.avatar} alt={hero.name} />
                                <AvatarFallback style={{ backgroundColor: hero.color }}>
                                    {getInitials(hero.name)}
                                </AvatarFallback>
                            </Avatar>
                            <span>{hero.name}</span>
                        </div>
                    </DropdownMenuRadioItem>
                 ))}
            </DropdownMenuRadioGroup>
        </DropdownMenuContent>
     </DropdownMenu>
  );
}
