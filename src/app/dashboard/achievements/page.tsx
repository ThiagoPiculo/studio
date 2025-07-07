
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Medal } from "lucide-react";

export default function AchievementsPage() {
  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline flex items-center">
            <Medal className="mr-3 h-8 w-8 text-primary" />
            Mural de Conquistas
          </CardTitle>
          <CardDescription>
            Acompanhe todas as medalhas e troféus que seus heróis desbloquearam em suas jornadas.
          </CardDescription>
        </CardHeader>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Conquistas por Herói</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Em breve: Filtre e visualize as conquistas individuais de cada Mini Herói.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Próximas Conquistas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Em breve: Veja quais conquistas estão mais próximas de serem desbloqueadas pela sua equipe.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
