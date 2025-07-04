
"use client"

import { useState, useEffect } from "react"
import { Sun, Moon, Laptop } from "lucide-react"
import { Button } from "@/components/ui/button"

type Theme = "light" | "dark" | "system"

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<Theme>("system")

  // On initial mount, read the theme from localStorage
  useEffect(() => {
    const storedTheme = localStorage.getItem("theme") as Theme | null
    if (storedTheme && ["light", "dark", "system"].includes(storedTheme)) {
      setTheme(storedTheme)
    }
  }, [])

  // Whenever the theme state changes, apply it to the DOM and save to localStorage
  useEffect(() => {
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

  return (
    <div className="flex gap-2 rounded-lg border p-1 bg-muted/50">
      <Button
        variant={theme === "light" ? "secondary" : "ghost"}
        onClick={() => setTheme("light")}
        className="flex-1"
        aria-pressed={theme === 'light'}
      >
        <Sun className="mr-2 h-4 w-4" /> Claro
      </Button>
      <Button
        variant={theme === "dark" ? "secondary" : "ghost"}
        onClick={() => setTheme("dark")}
        className="flex-1"
        aria-pressed={theme === 'dark'}
      >
        <Moon className="mr-2 h-4 w-4" /> Escuro
      </Button>
      <Button
        variant={theme === "system" ? "secondary" : "ghost"}
        onClick={() => setTheme("system")}
        className="flex-1"
        aria-pressed={theme === 'system'}
      >
        <Laptop className="mr-2 h-4 w-4" /> Sistema
      </Button>
    </div>
  )
}
