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
import { useFamily } from '@/contexts/FamilyContext';
import { useToast } from '@/hooks/use-toast';
import { getFeatureVoteCount, toggleUserFeatureVote, getUserFeatureVote } from '@/lib/firebase/firestore';
import { cn } from '@/lib/utils';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function SettingsPage() {
  const { user } = useAuth();
  const { availableContexts } = useFamily();
  const { toast } = useToast();
  const [integrationLikes, setIntegrationLikes] = useState(0);
  const [hasLikedIntegration, setHasLikedIntegration] = useState(false);
  const [isLoadingLikes, setIsLoadingLikes] = useState(true);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);

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

  const handleSettingChange = async (key: string, value: any) => {
    if (!user) return;
    setIsUpdatingSettings(true);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        [`settings.${key}`]: value,
      });
      toast({
        title: "Configuração Salva!",
        description: "Sua preferência foi atualizada.",
      });
    } catch (error) {
      console.error("Error updating setting:", error);
      toast({ title: "Erro ao Salvar", description: "Não foi possível salvar a configuração.", variant: "destructive" });
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const settings = {
    initialPage: user?.settings?.initialPage || 'agenda',
    initialContext: user?.settings?.initialContext || 'my-space',
    confirmJoinAlliance: user?.settings?.confirmJoinAlliance ?? false,
    childCanRedeemRewards: user?.settings?.childCanRedeemRewards ?? true,
  };


  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <SettingsIcon className="h-8 w-8 text-primary" />
              <div>
                <CardTitle className="text-3xl font-headline">Configurações</CardTitle>
                <CardDescription>
                  Gerencie as configurações da sua conta e preferências do aplicativo.
                </CardDescription>
              </div>
            </div>
            <ThemeSwitcher />
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <Card className="md:col-span-2">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><SettingsIcon className="h-5 w-5 text-primary" /> Configurações do Sistema</CardTitle>
                <CardDescription>Personalize o comportamento do aplicativo de acordo com suas preferências.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted">
                    <Label htmlFor="initial-page-select" className="flex flex-col gap-1 pr-4">
                        <span className="font-semibold">Tela inicial após login</span>
                        <span className="font-normal text-xs text-muted-foreground">Escolha para qual tela você é direcionado ao entrar.</span>
                    </Label>
                    <Select
                        value={settings.initialPage}
                        onValueChange={(value) => handleSettingChange('initialPage', value)}
                        disabled={isUpdatingSettings}
                    >
                        <SelectTrigger id="initial-page-select" className="w-auto sm:w-[180px] flex-shrink-0">
                            <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="dashboard">Painel do Heroi</SelectItem>
                            <SelectItem value="agenda">Agenda</SelectItem>
                            <SelectItem value="missions">Missões</SelectItem>
                            <SelectItem value="rewards">Recompensas</SelectItem>
                            <SelectItem value="family">Alianças</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                 <div className="flex items-center justify-between p-3 rounded-lg border bg-muted">
                    <Label htmlFor="initial-context-select" className="flex flex-col gap-1 pr-4">
                        <span className="font-semibold">Espaço de trabalho inicial</span>
                        <span className="font-normal text-xs text-muted-foreground">Escolha qual espaço abrir ao iniciar o aplicativo.</span>
                    </Label>
                    <Select
                        value={settings.initialContext}
                        onValueChange={(value) => handleSettingChange('initialContext', value)}
                        disabled={isUpdatingSettings || availableContexts.length <= 1}
                    >
                        <SelectTrigger id="initial-context-select" className="w-auto sm:w-[180px] flex-shrink-0">
                            <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                            {availableContexts.map(context => (
                                <SelectItem key={context.id} value={context.id}>
                                    {context.id === 'my-space' ? context.name : `Aliança: ${context.name}`}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted">
                    <Label htmlFor="confirm-join" className="flex flex-col gap-1 pr-4">
                        <span className="font-semibold">Confirmar entrada em aliança?</span>
                        <span className="font-normal text-xs text-muted-foreground">Exige sua aprovação quando outro responsável entra na sua aliança por código.</span>
                    </Label>
                    <Switch
                        id="confirm-join"
                        checked={settings.confirmJoinAlliance}
                        onCheckedChange={(checked) => handleSettingChange('confirmJoinAlliance', checked)}
                        disabled={isUpdatingSettings}
                    />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted">
                    <Label htmlFor="child-redeem" className="flex flex-col gap-1 pr-4">
                        <span className="font-semibold">Autorizar resgate de recompensa pela criança</span>
                        <span className="font-normal text-xs text-muted-foreground">Permite que a criança resgate recompensas diretamente. Se desativado, o resgate precisará da sua aprovação.</span>
                    </Label>
                    <Switch
                        id="child-redeem"
                        checked={settings.childCanRedeemRewards}
                        onCheckedChange={(checked) => handleSettingChange('childCanRedeemRewards', checked)}
                        disabled={isUpdatingSettings}
                    />
                </div>
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
