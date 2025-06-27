
"use client";

import { Check } from "lucide-react";
import { heroColors, type HeroColor } from "@/lib/hero-colors";
import { cn } from "@/lib/utils";

interface ColorSelectorProps {
  value: HeroColor;
  onChange: (color: HeroColor) => void;
}

export function ColorSelector({ value, onChange }: ColorSelectorProps) {
  return (
    <div className="grid grid-cols-8 gap-2">
      {heroColors.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className={cn(
            "h-10 w-10 rounded-full border-2 transition-all duration-200 ease-in-out flex items-center justify-center",
            value === color
              ? "border-primary ring-2 ring-offset-2 ring-primary"
              : "border-transparent hover:scale-110"
          )}
          style={{ backgroundColor: color }}
          aria-label={`Select color ${color}`}
        >
          {value === color && <Check className="h-6 w-6 text-white mix-blend-difference" />}
        </button>
      ))}
    </div>
  );
}
