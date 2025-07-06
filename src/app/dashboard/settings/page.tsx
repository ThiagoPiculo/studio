
"use client";

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Settings as SettingsIcon, User, Palette, Bell, Blocks, ArrowRight, ThumbsUp, Loader2, UserPlus, CheckCircle, Award } from 'lucide-react';
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import type { NotificationType } from '@/lib/types';


const notificationSettingsConfig: {
  category: string;
  items: {
    key: NotificationType;
    icon: React.ElementType;
    label: string;
    description: string;
    confirmation: {
        title: string;
        description: string;
    }
  }[]
}[] = [
  {
    category: "Progresso dos Herois",
    items: [
      {
        key: 'mission_completed',
        icon: CheckCircle,
        label: "Missão Concluída",
        description: "Quando uma criança marca uma missão como concluída.",
        confirmation: {
            title: "Desativar alertas de Missão Concluída?",
            description: "Você não será mais notificado imediatamente quando uma missão for concluída. Você ainda poderá ver o progresso na página da criança."
        }
      },
      {
        key: 'reward_redeemed',
        icon: Award,
        label: "Recompensa Resgatada",
        description: "Quando uma criança usa suas estrelas para resgatar uma recompensa.",
        confirmation: {
            title: "Desativar alertas de Recompensa Resgatada?",
            description: "Você não saberá imediatamente quando uma recompensa for resgatada, o que pode ser importante para recompensas que exigem sua ação (como um passeio)."
        }
      },
      {
        key: 'new_level',
        icon: Award,
        label: "Subiu de Nível",
        description: "Quando uma criança acumula XP suficiente para subir de nível.",
         confirmation: {
            title: "Desativar alertas de Nível?",
            description: "Você não verá mais as comemorações quando uma criança atingir um novo nível de progresso."
        }
      },
    ]
  },
  {
    category: "Atividade da Aliança",
    items: [
      {
        key: 'alliance_join_request',
        icon: UserPlus,
        label: "Pedido para Entrar na Aliança",
        description: "Alerta para aprovar um novo membro que usou o código de convite.",
         confirmation: {
            title: "Desativar alertas de Pedidos para Entrar?",
            description: "Você não será notificado sobre novos pedidos para entrar na sua aliança, o que pode fazer com que novos membros não consigam participar."
        }
      },
      {
        key: 'alliance_join_approved',
        icon: CheckCircle,
        label: "Novo Membro na Aliança",
        description: "Avisa quando um novo membro foi aprovado e entrou na sua aliança.",
        confirmation: {
            title: "Desativar alertas de Novos Membros?",
            description: "Você não saberá quando novos colaboradores se juntarem à sua aliança para gerenciar os herois."
        }
      }
    ]
  }
];


export default function SettingsPage() {
  const { user } = useAuth();
  const { availableContexts } = useFamily();
  const { toast } = useToast();
  const [integrationLikes, setIntegrationLikes] = useState(0);
  const [hasLikedIntegration, setHasLikedIntegration] = useState(false);
  const [isLoadingLikes, setIsLoadingLikes] = useState(true);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  
  const [confirmationDetails, setConfirmationDetails] = useState<{ key: NotificationType; title: string; description: string; } | null>(null);

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

  const handleSettingUpdate = async (key: string, value: any) => {
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

  const handleSwitchChange = (key: NotificationType, checked: boolean, confirmation: { title: string; description: string; }) => {
    if (checked) {
      handleSettingUpdate(`notifications.${key}`, true);
    } else {
      setConfirmationDetails({ key, ...confirmation });
    }
  };

  const handleConfirmChange = () => {
    if (confirmationDetails) {
      handleSettingUpdate(`notifications.${confirmationDetails.key}`, false);
      setConfirmationDetails(null);
    }
  };


  const settings = {
    initialPage: user?.settings?.initialPage || 'agenda',
    initialContext: user?.settings?.initialContext || 'my-space',
    notifications: user?.settings?.notifications || {},
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
            <div className="flex items-center gap-2">
              <Label htmlFor="theme-switcher-button" className="text-sm font-medium">Tema visual</Label>
              <ThemeSwitcher />
            </div>
          </div>
        </CardHeader>
      </Card>
      
      <AlertDialog open={!!confirmationDetails} onOpenChange={(isOpen) => !isOpen && setConfirmationDetails(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmationDetails?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmationDetails?.description}
              <br/><br/>
              Recomendamos manter esta notificação ativada para uma melhor experiência. Deseja mesmo desativá-la?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmChange} className="bg-destructive hover:bg-destructive/90">
                Desativar Mesmo Assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><SettingsIcon className="h-5 w-5 text-primary" /> Configurações Gerais</CardTitle>
                <CardDescription>Personalize o comportamento do aplicativo de acordo com suas preferências.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted">
                    <Label htmlFor="initial-page-select" className="flex flex-col gap-1 pr-4">
                        <span className="font-semibold">Tela inicial após login</span>
                        <span className="font-normal text-xs text-muted-foreground">Escolha para qual tela você é direcionado ao entrar.</span>
                    </Label>
                    <Select
                        value={settings.initialPage}
                        onValueChange={(value) => handleSettingUpdate('initialPage', value)}
                        disabled={isUpdatingSettings}
                    >
                        <SelectTrigger id="initial-page-select" className="w-auto sm:w-[180px] flex-shrink-0">
                            <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="dashboard">Crianças</SelectItem>
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
                        onValueChange={(value) => handleSettingUpdate('initialContext', value)}
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
            </CardContent>
        </Card>

        <div className="lg:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-primary" /> Preferências de Notificação</CardTitle>
                    <CardDescription>Escolha quais alertas você deseja receber.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    {notificationSettingsConfig.map(category => (
                        <div key={category.category} className="space-y-3 break-inside-avoid">
                            <h3 className="font-semibold text-md">{category.category}</h3>
                            {category.items.map(item => {
                                const Icon = item.icon;
                                const isChecked = settings.notifications[item.key] !== false; // Default to true if undefined
                                return (
                                    <div key={item.key} className="flex items-start justify-between p-3 rounded-lg border bg-muted/50">
                                        <Label htmlFor={item.key} className="flex flex-col gap-1 pr-4 cursor-pointer">
                                            <span className="font-medium flex items-center gap-2"><Icon className="h-4 w-4"/> {item.label}</span>
                                            <span className="font-normal text-xs text-muted-foreground">{item.description}</span>
                                        </Label>
                                        <Switch
                                            id={item.key}
                                            checked={isChecked}
                                            onCheckedChange={(checked) => handleSwitchChange(item.key, checked, item.confirmation)}
                                            disabled={isUpdatingSettings}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>


        <Card className="lg:col-span-2">
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
