
"use client";

import { Check, Slash } from "lucide-react";
import { heroColors, type HeroColor } from "@/lib/hero-colors";
import { cn } from "@/lib/utils";

interface ColorSelectorProps {
  value: HeroColor;
  onChange: (color: HeroColor) => void;
  disabledColors?: HeroColor[];
}

export function ColorSelector({ value, onChange, disabledColors = [] }: ColorSelectorProps) {
  return (
    <div className="grid grid-cols-8 gap-2">
      {heroColors.map((color) => {
        const isTaken = disabledColors.includes(color) && color !== value;
        return (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            disabled={isTaken}
            className={cn(
              "h-10 w-10 rounded-full border-2 transition-all duration-200 ease-in-out flex items-center justify-center",
              value === color
                ? "border-primary ring-2 ring-offset-2 ring-primary"
                : "border-transparent hover:scale-110",
              isTaken && "opacity-40 cursor-not-allowed"
            )}
            style={{ backgroundColor: color }}
            aria-label={isTaken ? `Cor ${color} em uso` : `Selecionar cor ${color}`}
            title={isTaken ? `Cor em uso por outro herói` : `Selecionar cor`}
          >
            {value === color && <Check className="h-6 w-6 text-white mix-blend-difference" />}
            {isTaken && <Slash className="h-6 w-6 text-white mix-blend-difference" />}
          </button>
        );
      })}
    </div>
  );
}
