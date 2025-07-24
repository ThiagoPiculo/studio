
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function Reports() {
  const { toast } = useToast();

  const handleExport = () => {
    toast({
      title: "Funcionalidade em Desenvolvimento",
      description: "A exportação de relatórios estará disponível em breve!",
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
        <Button onClick={handleExport} variant="secondary" className="w-full" disabled>
          Exportar Relatório (Em Breve)
        </Button>
      </CardContent>
    </Card>
  );
}
