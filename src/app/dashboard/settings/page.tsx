
"use client";

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Settings as SettingsIcon, User, Palette, Bell, Blocks, ArrowRight, ThumbsUp, Loader2 } from 'lucide-react';
import { ThemeSwitcher } from '@/components/dashboard/settings/ThemeSwitcher';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getFeatureVoteCount, toggleUserFeatureVote, getUserFeatureVote } from '@/lib/firebase/firestore';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [integrationLikes, setIntegrationLikes] = useState(0);
  const [hasLikedIntegration, setHasLikedIntegration] = useState(false);
  const [isLoadingLikes, setIsLoadingLikes] = useState(true);

  const featureId = 'integrations';

  useEffect(() => {
    if (!user) {
      setIsLoadingLikes(false);
      return;
    }
  
    async function fetchLikeData() {
      setIsLoadingLikes(true);
      try {
        const [count, hasLiked] = await Promise.all([
          getFeatureVoteCount(featureId),
          getUserFeatureVote(user.uid, featureId)
        ]);
        setIntegrationLikes(count);
        setHasLikedIntegration(hasLiked);
      } catch (error) {
        console.error("Error fetching like data:", error);
      } finally {
        setIsLoadingLikes(false);
      }
    }

    fetchLikeData();
  }, [user]);

  const handleLikeIntegration = async () => {
    if (!user) {
      toast({ title: "Você precisa estar logado para votar.", variant: "destructive" });
      return;
    }
    
    const originalLikedState = hasLikedIntegration;
    const originalLikes = integrationLikes;

    // Optimistic update
    const newLikedState = !hasLikedIntegration;
    setHasLikedIntegration(newLikedState);
    setIntegrationLikes(prev => newLikedState ? prev + 1 : prev - 1);

    try {
      await toggleUserFeatureVote(user.uid, featureId);
      if (newLikedState) {
          toast({
              title: "Obrigado pelo seu feedback!",
              description: "Sua opinião nos ajuda a priorizar novas funcionalidades.",
          });
      }
    } catch (error) {
      console.error("Error toggling feature vote:", error);
      toast({ title: "Erro", description: "Não foi possível registrar seu voto.", variant: "destructive"});
      // Revert optimistic update on error
      setHasLikedIntegration(originalLikedState);
      setIntegrationLikes(originalLikes);
    }
  };


  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-4">
            <SettingsIcon className="h-8 w-8 text-primary" />
            <div>
              <CardTitle className="text-3xl font-headline">Configurações</CardTitle>
              <CardDescription>
                Gerencie as configurações da sua conta e preferências do aplicativo.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5 text-primary" /> Tema Visual</CardTitle>
            <CardDescription>Escolha a aparência do aplicativo.</CardDescription>
          </CardHeader>
          <CardContent>
            <ThemeSwitcher />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-primary" /> Gerenciamento da Conta</CardTitle>
            <CardDescription>Acesse e edite suas informações de perfil.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/profile">
                <Button className="w-full">
                    Ir para o Perfil <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-primary" /> Preferências de Notificação</CardTitle>
            <CardDescription>Escolha como você quer ser notificado. (Funcionalidade em desenvolvimento)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50 opacity-60">
                <Label htmlFor="summary-emails" className="flex flex-col gap-1 cursor-not-allowed">
                  <span className="font-semibold">Resumos semanais por e-mail</span>
                  <span className="font-normal text-xs text-muted-foreground">Receba um relatório do progresso dos heróis.</span>
                </Label>
                <Switch id="summary-emails" disabled />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50 opacity-60">
                 <Label htmlFor="mission-alerts" className="flex flex-col gap-1 cursor-not-allowed">
                  <span className="font-semibold">Alertas de missões importantes</span>
                   <span className="font-normal text-xs text-muted-foreground">Seja notificado sobre missões próximas do prazo.</span>
                </Label>
                <Switch id="mission-alerts" disabled />
              </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Blocks className="h-5 w-5 text-primary" /> Integrações</CardTitle>
             <CardDescription>Conecte o Mini Herois a outros serviços.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              (Em breve) Imagine conectar sua agenda Google ou receber lembretes na Alexa. Estamos trabalhando para tornar isso possível!
            </p>
            <div className="mt-4 pt-4 border-t flex items-center justify-between">
              <p className="text-sm font-semibold text-muted-foreground">Gostou da ideia?</p>
              <Button
                variant={hasLikedIntegration ? 'secondary' : 'outline'}
                size="sm"
                onClick={handleLikeIntegration}
                disabled={isLoadingLikes}
                className="shadow-sm"
              >
                {isLoadingLikes ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ThumbsUp className={cn("mr-2 h-4 w-4", hasLikedIntegration && "fill-current text-primary")} />
                )}
                {integrationLikes} {integrationLikes === 1 ? 'Like' : 'Likes'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
