"use client";
import { useFamily } from '@/contexts/FamilyContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Home, Users } from 'lucide-react';

export function FamilyContextSwitcher() {
  const { currentContext, setCurrentContext, availableContexts, isLoading } = useFamily();

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 rounded-md border border-input bg-background text-sm text-muted-foreground">
        Carregando contextos...
      </div>
    );
  }
  
  if (!availableContexts || availableContexts.length <= 1) { 
    return null;
  }

  return (
    <Select value={currentContext} onValueChange={(value) => setCurrentContext(value)}>
      <SelectTrigger className="w-auto min-w-[180px] h-10 gap-2 bg-transparent border-border hover:bg-accent/10 focus:ring-ring focus:ring-offset-0">
        <SelectValue>
           <div className="flex items-center gap-2">
            {currentContext === 'my-space' ? <Home className="h-4 w-4" /> : <Users className="h-4 w-4" />}
            <span>{availableContexts.find(c => c.id === currentContext)?.name ?? "Selecionar contexto..."}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {availableContexts.map((context) => (
          <SelectItem key={context.id} value={context.id}>
            <div className="flex items-center gap-2">
              {context.id === 'my-space' ? <Home className="h-4 w-4" /> : <Users className="h-4 w-4" />}
              <span>{context.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
