"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFamily } from '@/contexts/FamilyContext';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { getChildProfilesForAttribution, getMissionInstancesForContext, getSchoolScheduleForContext } from '@/lib/firebase/firestore';
import { generateFamilyRoutinePDF } from '@/lib/pdf-generator';

export function Reports() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentContext, availableContexts } = useFamily();
  const [isLoading, setIsLoading] = useState(false);
  
  const familyName = availableContexts.find(c => c.id === currentContext)?.name || 'Pessoal';

  const handleExport = async () => {
    if (!user) {
        toast({ title: "Usuário não encontrado.", variant: "destructive"});
        return;
    }
    
    setIsLoading(true);
    toast({ title: "Gerando seu relatório em PDF...", description: "Isso pode levar alguns segundos." });
    
    try {
        const familyIdToQuery = currentContext === 'my-space' ? null : currentContext;

        const [children, missions, schedule] = await Promise.all([
            getChildProfilesForAttribution(user.uid, currentContext),
            getMissionInstancesForContext(user.uid, familyIdToQuery),
            getSchoolScheduleForContext(user.uid, familyIdToQuery)
        ]);
        
        if (children.length === 0) {
            toast({ title: "Nenhum Herói para o Relatório", description: "Cadastre ou selecione uma aliança com heróis para gerar o relatório.", variant: "default"});
            return;
        }

        await generateFamilyRoutinePDF(children, missions, schedule, familyName);

    } catch (error) {
        console.error("Error generating PDF:", error);
        toast({ title: "Erro ao Gerar PDF", description: "Não foi possível gerar o relatório. Tente novamente.", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
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
          Gerar PDF de Rotinas
        </Button>
      </CardContent>
    </Card>
  );
}
