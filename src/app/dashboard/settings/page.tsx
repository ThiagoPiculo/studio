
"use client";

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Settings as SettingsIcon, User, Palette, Bell, Blocks, ArrowRight, ThumbsUp, Loader2, UserPlus, CheckCircle, Award, CalendarDays, Mic, Zap, School } from 'lucide-react';
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';


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
      {
        key: 'new_badge',
        icon: Award,
        label: "Nova Conquista Desbloqueada",
        description: "Quando uma criança atinge os critérios para desbloquear uma nova conquista.",
        confirmation: {
            title: "Desativar alertas de Novas Conquistas?",
            description: "Você não será mais notificado quando uma nova conquista for desbloqueada, o que pode diminuir a celebração dos feitos."
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

const featureIdeas = [
  {
    id: 'integration_google_calendar',
    icon: CalendarDays,
    title: 'Google Agenda',
    description: 'Sincronize missões e prazos automaticamente com a sua agenda do Google para nunca perder uma aventura.'
  },
  {
    id: 'integration_amazon_alexa',
    icon: Mic,
    title: 'Amazon Alexa',
    description: 'Receba lembretes de missões e marque-as como concluídas usando simples comandos de voz.'
  },
  {
    id: 'integration_ifttt',
    icon: Zap,
    title: 'IFTTT (If This Then That)',
    description: 'Crie automações personalizadas, como acender uma luz inteligente quando uma missão for concluída.'
  },
  {
    id: 'integration_google_classroom',
    icon: School,
    title: 'Google Classroom',
    description: 'Importe automaticamente tarefas e trabalhos escolares como missões para seus herois.'
  }
];


export default function SettingsPage() {
  const { user } = useAuth();
  const { availableContexts } = useFamily();
  const { toast } = useToast();
  
  const [featureVotes, setFeatureVotes] = useState<Record<string, { count: number; liked: boolean }>>({});
  const [isLoadingVotes, setIsLoadingVotes] = useState(true);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  
  const [confirmationDetails, setConfirmationDetails] = useState<{ key: NotificationType; title: string; description: string; } | null>(null);

  useEffect(() => {
    if (!user) {
      setIsLoadingVotes(false);
      return;
    }
  
    async function fetchAllVoteData() {
      setIsLoadingVotes(true);
      const voteData: Record<string, { count: number; liked: boolean }> = {};
      
      const promises = featureIdeas.map(async (feature) => {
        try {
          const [count, hasLiked] = await Promise.all([
            getFeatureVoteCount(feature.id),
            getUserFeatureVote(user.uid, feature.id)
          ]);
          voteData[feature.id] = { count, liked: hasLiked };
        } catch (error) {
           console.error(`Failed to load votes for ${feature.id}`, error);
           voteData[feature.id] = { count: 0, liked: false };
        }
      });

      await Promise.all(promises);
      setFeatureVotes(voteData);
      setIsLoadingVotes(false);
    }

    fetchAllVoteData();
  }, [user]);

  const handleLikeFeature = async (featureId: string) => {
    if (!user) {
      toast({ title: "Você precisa estar logado para votar.", variant: "destructive" });
      return;
    }
    
    const originalState = featureVotes[featureId] || { count: 0, liked: false };

    setFeatureVotes(prevVotes => {
        const newLikedState = !originalState.liked;
        const newCount = newLikedState ? originalState.count + 1 : Math.max(0, originalState.count - 1);
        return {
            ...prevVotes,
            [featureId]: { count: newCount, liked: newLikedState }
        };
    });

    try {
      await toggleUserFeatureVote(user.uid, featureId);
      if (!originalState.liked) {
          const feature = featureIdeas.find(f => f.id === featureId);
          toast({
              title: "Obrigado pelo seu feedback!",
              description: `Seu voto para "${feature?.title}" nos ajuda a priorizar novas funcionalidades.`,
          });
      }
    } catch (error) {
      console.error("Error toggling feature vote:", error);
      toast({ title: "Erro", description: "Não foi possível registrar seu voto.", variant: "destructive"});
      setFeatureVotes(prevVotes => ({ ...prevVotes, [featureId]: originalState }));
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
        <Card className="lg:col-span-2 p-0">
            <Accordion type="single" collapsible className="w-full" defaultValue="integrations">
                <AccordionItem value="integrations" className="border-b-0">
                    <AccordionTrigger className="p-6 hover:no-underline">
                        <div className="flex flex-col items-start text-left space-y-1.5">
                            <h2 className="text-2xl font-semibold leading-none tracking-tight flex items-center gap-2">
                                <Blocks className="h-5 w-5 text-primary" /> Futuras Integrações
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Conecte o Mini Herois a outros serviços. Vote nas suas ideias favoritas para nos ajudar a priorizar!
                            </p>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                        <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {featureIdeas.map((feature) => {
                                const Icon = feature.icon;
                                const voteInfo = featureVotes[feature.id] || { count: 0, liked: false };
                                return (
                                    <div key={feature.id} className="p-4 border rounded-lg flex flex-col justify-between">
                                        <div>
                                            <h4 className="font-semibold flex items-center gap-2"><Icon className="h-4 w-4 text-muted-foreground" /> {feature.title}</h4>
                                            <p className="text-sm text-muted-foreground mt-1 mb-3">{feature.description}</p>
                                        </div>
                                        <Button
                                            variant={voteInfo.liked ? 'secondary' : 'outline'}
                                            size="sm"
                                            onClick={() => handleLikeFeature(feature.id)}
                                            disabled={isLoadingVotes}
                                            className="shadow-sm w-fit"
                                        >
                                            {isLoadingVotes ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <ThumbsUp className={cn("mr-2 h-4 w-4", voteInfo.liked && "fill-current text-primary")} />
                                            )}
                                            {voteInfo.count} {voteInfo.count === 1 ? 'Like' : 'Likes'}
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </Card>

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
                            <SelectItem value="dashboard">Painel</SelectItem>
                            <SelectItem value="heroes">Mini Herois</SelectItem>
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
      </div>
    </div>
  );
}
