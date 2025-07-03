
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
import { Home, Shield, ChevronsUpDown, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function FamilyContextSwitcher() {
  const { currentContext, setCurrentContext, availableContexts, isLoading } = useFamily();
  const { user } = useAuth();
  const router = useRouter();

  const handleContextChange = (value: string) => {
    setCurrentContext(value);
    router.push('/dashboard');
  };
  
  const currentContextData = availableContexts.find(c => c.id === currentContext);

  if (!user) return null;
  
  if (isLoading) {
    return (
      <Button variant="outline" className="w-auto min-w-[180px] justify-between h-10 gap-2" disabled>
        <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Carregando...</span>
        </div>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-auto min-w-[180px] justify-between h-10 gap-2 bg-transparent border-border hover:bg-accent/10 focus:ring-ring focus:ring-offset-0">
          <div className="flex items-center gap-2 truncate">
            {currentContext === 'my-space' ? <Home className="h-4 w-4 shrink-0" /> : <Shield className="h-4 w-4 shrink-0" />}
            <span className="truncate">{currentContextData?.name ?? "Carregando..."}</span>
          </div>
          <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end">
        <DropdownMenuLabel>Minhas Alianças</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={currentContext} onValueChange={handleContextChange}>
          {availableContexts.map((context) => (
            <DropdownMenuRadioItem key={context.id} value={context.id} className="cursor-pointer">
              <div className="flex items-center gap-2">
                {context.id === 'my-space' ? <Home className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                <span>{context.name}</span>
              </div>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
