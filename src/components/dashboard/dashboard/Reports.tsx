
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFamily } from '@/contexts/FamilyContext';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';

export function Reports() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleExport = () => {
    toast({
      title: "Em Desenvolvimento",
      description: "A funcionalidade de exportação de relatórios está sendo aprimorada e estará disponível em breve!",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <FileText className="text-chart-4" />
            Relatórios
        </CardTitle>
        <CardDescription>Exporte relatórios de desempenho e evolução para compartilhar e comemorar.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleExport} variant="secondary" className="w-full" disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
          Gerar PDF de Rotinas (Em Breve)
        </Button>
      </CardContent>
    </Card>
  );
}
