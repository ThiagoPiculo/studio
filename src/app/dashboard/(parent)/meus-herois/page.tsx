
"use client";

import SpaceSelector from "@/components/dashboard/SpaceSelector";
import { Users } from "lucide-react";

export default function MeusHeroisPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-primary" />
                <div>
                    <h2 className="text-3xl font-headline font-bold">Meus Mini Heróis</h2>
                    <p className="text-muted-foreground">Selecione um espaço para gerenciar ou clique em um herói para ver seu perfil.</p>
                </div>
            </div>
            <SpaceSelector />
        </div>
    )
}
