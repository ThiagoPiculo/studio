
"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ThemeSwitcher } from "@/components/dashboard/settings/ThemeSwitcher";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Loader2, Palette, Bell, Star, LifeBuoy, Zap, GitBranch, Settings as SettingsIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { InitialPage, RewardMode } from "@/lib/types";
import { FeatureVoteCard } from "@/components/dashboard/settings/FeatureVoteCard";
import Link from "next/link";

const initialPageOptions: { value: InitialPage; label: string }[] = [
    { value: 'dashboard', label: 'Visão Geral (Padrão)' },
    { value: 'heroes', label: 'Resumo dos Herois' },
    { value: 'agenda', label: 'Agenda Semanal' },
    { value: 'mural', label: 'Mural do Último Herói Visto' },
    { value: 'missions', label: 'Quadro de Missões' },
    { value: 'rewards', label: 'Baú de Recompensas' },
];

export default function SettingsPage() {
    const { user, loading } = useAuth();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    const [rewardMode, setRewardMode] = useState<RewardMode>(user?.settings?.rewardMode || 'automatic');
    
    const handleSettingChange = async (key: string, value: any) => {
        if (!user) return;
        setIsSaving(true);
        try {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                [`settings.${key}`]: value
            });
            
            if(key === 'rewardMode') setRewardMode(value);

            toast({
                title: "Configuração Salva!",
                description: "Sua preferência foi atualizada com sucesso.",
            });
        } catch (error) {
            console.error("Error updating setting:", error);
            toast({ title: "Erro ao Salvar", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
            <SettingsIcon className="h-8 w-8 text-primary" />
            <div>
              <h2 className="text-3xl font-headline font-bold">Configurações</h2>
              <p className="text-muted-foreground">Ajuste suas preferências e explore novas funcionalidades.</p>
            </div>
        </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5 text-chart-4" />Aparência</CardTitle>
          <CardDescription>Personalize a aparência do aplicativo.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="theme-switcher">Tema do Aplicativo</Label>
            <ThemeSwitcher />
          </div>
        </CardContent>
      </Card>
      
       <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-chart-1" />Próximas Funcionalidades</CardTitle>
            <CardDescription>Nos ajude a priorizar o que construiremos a seguir! Seu voto é importante.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FeatureVoteCard
                featureId="gamification_advanced"
                icon={GitBranch}
                title="Gamificação Avançada"
                description="Introduzir 'árvores de habilidades' e caminhos de evolução para os heróis, onde subir de nível libera novas habilidades ou missões."
            />
            <FeatureVoteCard
                featureId="reports_detailed"
                icon={LifeBuoy}
                title="Relatórios para Terapeutas"
                description="Criar relatórios detalhados de progresso e comportamento que possam ser facilmente compartilhados com psicólogos e terapeutas."
            />
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground">
            Tem outra ideia? <Link href="/contato" className="underline hover:text-primary ml-1">Nos envie sua sugestão!</Link>
        </CardFooter>
      </Card>

    </div>
  );
}
