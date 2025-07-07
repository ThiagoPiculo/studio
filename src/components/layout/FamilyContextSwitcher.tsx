
"use client";
import { useFamily } from '@/contexts/FamilyContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { Home, ChevronsUpDown, Loader2, Link as LinkIcon } from 'lucide-react';

export function FamilyContextSwitcher() {
  const { currentContext, setCurrentContext, availableContexts, isLoading } = useFamily();
  const { user } = useAuth();

  const handleContextChange = (value: string) => {
    setCurrentContext(value);
  };
  
  const currentContextData = availableContexts.find(c => c.id === currentContext);

  if (!user || availableContexts.length <= 1) return null;
  
  if (isLoading) {
    return (
      <Button variant="outline" className="w-[220px] justify-start h-9" disabled>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Carregando...
      </Button>
    );
  }

  const getDisplayName = (context?: { id: string; name: string }) => {
    if (!context) return "Carregando...";
    if (context.id === 'my-space') return context.name;
    return `Aliança: ${context.name}`;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full max-w-[240px] justify-between h-9">
          <div className="flex items-center gap-2 truncate">
            {currentContext === 'my-space' ? <Home className="h-4 w-4 shrink-0" /> : <LinkIcon className="h-4 w-4 shrink-0 text-chart-4" />}
            <span className="truncate text-sm font-medium">{getDisplayName(currentContextData)}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]" align="start">
        <DropdownMenuLabel>Mudar contexto</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={currentContext} onValueChange={handleContextChange}>
          {availableContexts.map((context) => (
            <DropdownMenuRadioItem key={context.id} value={context.id} className="cursor-pointer">
              <div className="flex items-center gap-2">
                {context.id === 'my-space' ? <Home className="h-4 w-4" /> : <LinkIcon className="h-4 w-4 text-chart-4" />}
                <span>{getDisplayName(context)}</span>
              </div>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
