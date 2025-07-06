
// src/app/dashboard/page.tsx

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, LayoutGrid } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline flex items-center">
            <LayoutGrid className="mr-3 h-8 w-8 text-primary" />
            Painel de Controle
          </CardTitle>
          <CardDescription>
            Sua central de análises e automações para acompanhar a jornada dos seus herois.
          </CardDescription>
        </CardHeader>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <BarChart className="text-chart-1" />
              Análise de Progresso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Em breve: Gráficos sobre a evolução de estrelas, XP e missões concluídas por heroi e por período.</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Automações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Em breve: Crie regras e gatilhos para otimizar a rotina da sua aliança.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Relatórios</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Em breve: Exporte relatórios de desempenho e evolução para compartilhar e comemorar.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
