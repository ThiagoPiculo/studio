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

  if (!user) return null;
  
  if (isLoading) {
    return (
      <Button variant="outline" className="w-full justify-start h-10 gap-2 px-2 text-left" disabled>
        <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="truncate text-sm font-semibold group-data-[collapsible=icon]:hidden">Carregando...</span>
        </div>
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
        <Button variant="outline" className="w-full justify-between h-10 gap-2 px-2 text-left bg-transparent border-transparent hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus:ring-sidebar-ring group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <div className="flex items-center gap-2 truncate group-data-[collapsible=icon]:gap-0">
            {currentContext === 'my-space' ? <Home className="h-4 w-4 shrink-0 text-chart-5" /> : <LinkIcon className="h-4 w-4 shrink-0 text-chart-4" />}
            <span className="truncate text-sm font-semibold group-data-[collapsible=icon]:hidden">Estou em: {getDisplayName(currentContextData)}</span>
          </div>
          <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0 group-data-[collapsible=icon]:hidden" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end">
        <DropdownMenuLabel>Mudar para:</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={currentContext} onValueChange={handleContextChange}>
          {availableContexts.map((context) => (
            <DropdownMenuRadioItem key={context.id} value={context.id} className="cursor-pointer">
              <div className="flex items-center gap-2">
                {context.id === 'my-space' ? <Home className="h-4 w-4 text-chart-5" /> : <LinkIcon className="h-4 w-4 text-chart-4" />}
                <span>{getDisplayName(context)}</span>
              </div>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
