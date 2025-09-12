
"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreateFamilyDialog } from "./CreateFamilyDialog";
import { Users } from "lucide-react";

export function CreateAllianceCard() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Criar Nova Aliança</CardTitle>
          <CardDescription>
            Crie um espaço compartilhado para convidar outros responsáveis e gerenciar os Mini Herois em equipe.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-sm text-muted-foreground">
                Ao criar uma aliança, seus heróis que estão em "Cuidar Solo" serão movidos automaticamente para este novo espaço colaborativo.
            </p>
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={() => setIsDialogOpen(true)}>
            <Users className="mr-2 h-4 w-4" /> Criar Aliança
          </Button>
        </CardFooter>
      </Card>
      <CreateFamilyDialog isOpen={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </>
  );
}
