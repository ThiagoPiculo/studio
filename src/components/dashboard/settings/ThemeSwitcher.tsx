"use client"

import * as React from "react"
import { Sun, Moon, Laptop } from "lucide-react"
import { Button } from "@/components/ui/button"

type Theme = "light" | "dark" | "system"

export function ThemeSwitcher() {
  const [theme, setTheme] = React.useState<Theme>("system")

  // On initial mount, read the theme from localStorage
  React.useEffect(() => {
    const storedTheme = localStorage.getItem("theme") as Theme | null
    if (storedTheme && ["light", "dark", "system"].includes(storedTheme)) {
      setTheme(storedTheme)
    }
  }, [])

  // Whenever the theme state changes, apply it to the DOM and save to localStorage
  React.useEffect(() => {
    const root = window.document.documentElement
    
    // Determine if dark mode should be active
    const isDark =
      theme === "dark" ||
      (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)
    
    // Apply or remove the 'dark' class
    root.classList.toggle("dark", isDark)
    
    // Persist the preference
    localStorage.setItem("theme", theme)
  }, [theme])

  const cycleTheme = () => {
    const themes: Theme[] = ["light", "dark", "system"];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const renderIcon = () => {
    switch (theme) {
      case "light":
        return <Sun className="h-5 w-5" />;
      case "dark":
        return <Moon className="h-5 w-5" />;
      case "system":
        return <Laptop className="h-5 w-5" />;
      default:
        return <Laptop className="h-5 w-5" />;
    }
  };
  
  const getTooltipText = () => {
     switch (theme) {
      case "light":
        return "Mudar para tema escuro";
      case "dark":
        return "Mudar para tema do sistema";
      case "system":
        return "Mudar para tema claro";
    }
  }

  return (
    <Button variant="ghost" size="icon" onClick={cycleTheme} aria-label={getTooltipText()}>
        {renderIcon()}
    </Button>
  )
}
