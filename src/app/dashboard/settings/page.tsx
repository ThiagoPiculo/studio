

"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Loader2, Save, Settings, Sparkles, Bell, CheckCircle, UserPlus, Award, Edit3, Trash2, UserCheck, UserX, NotebookPen, Link as LinkIcon, Users, PlusCircle, Calendar, Workflow, School, BotMessageSquare } from 'lucide-react';
import { ThemeSwitcher } from '@/components/dashboard/settings/ThemeSwitcher';
import type { InitialPage, NotificationPreferences, NotificationType } from '@/lib/types';
import { FeatureVoteCard } from '@/components/dashboard/settings/FeatureVoteCard';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Switch } from '@/components/ui/switch';


const initialPages: { id: InitialPage; label: string }[] = [
    { id: 'dashboard', label: 'Espaços com Mini Herois' },
    { id: 'heroes', label: 'Resumo do Dia' },
    { id: 'dashboard', label: 'Painel de Progressos' },
    { id: 'mural', label: 'Mural Completo' },
    { id: 'agenda', label: 'Rotina de Missões' },
    { id: 'school-schedule', label: 'Rotina Escolar'},
    { id: 'missions', label: 'Quadro de Missões' },
    { id: 'rewards', label: 'Quadro de Recompensas' },
    { id: 'achievements', label: 'Quadro de Medalhas'},
    { id: 'family', label: 'Aliança de Herois' },
];

const notificationSettings: {
  category: string;
  items: { id: NotificationType; label: string; description: string; icon: React.ElementType }[];
}[] = [
  {
    category: 'Progresso dos Herois',
    items: [
      { id: 'mission_completed', label: 'Missão Concluída', description: 'Quando uma criança marca uma missão como concluída.', icon: CheckCircle },
      { id: 'reward_redeemed', label: 'Recompensa Resgatada', description: 'Quando uma criança usa suas estrelas para resgatar uma recompensa.', icon: Award },
      { id: 'new_level', label: 'Subiu de Nível', description: 'Quando uma criança acumula XP suficiente para subir de nível.', icon: Sparkles },
      { id: 'new_badge', label: 'Nova Medalha Desbloqueada', description: 'Quando uma criança atinge os critérios para desbloquear uma nova medalha.', icon: Award },
    ],
  },
  {
    category: 'Atividade da Aliança',
    items: [
      { id: 'alliance_join_request', label: 'Pedido para Entrar na Aliança', description: 'Alerta para aprovar um novo membro que usou o código de convite.', icon: UserPlus },
      { id: 'alliance_join_approved', label: 'Novo Membro na Aliança', description: 'Avisa quando um novo membro foi aprovado e entrou na sua aliança.', icon: UserCheck },
    ],
  },
  {
    category: 'Gestão dos Quadros',
    items: [
      { id: 'template_created', label: 'Nova Missão/Recompensa Criada', description: 'Quando um colaborador adiciona um novo item a um quadro da aliança.', icon: PlusCircle },
      { id: 'template_updated', label: 'Missão/Recompensa Atualizada', description: 'Quando um item de um quadro da aliança é modificado.', icon: Edit3 },
      { id: 'template_deleted', label: 'Missão/Recompensa Removida', description: 'Quando um item é removido de um quadro da aliança.', icon: Trash2 },
    ],
  },
  {
    category: 'Gestão de Rotinas',
    items: [
      { id: 'instance_assigned', label: 'Atividade Atribuída a Herói', description: 'Quando uma missão ou recompensa é atribuída a um herói na aliança.', icon: UserCheck },
      { id: 'instance_unassigned', label: 'Atribuição Removida de Herói', description: 'Quando uma atribuição de missão/recompensa é removida de um herói.', icon: UserX },
    ],
  },
  {
    category: 'Rotina Escolar',
    items: [
      { id: 'school_schedule_entry_created', label: 'Aula Adicionada', description: 'Quando um colaborador adiciona uma nova aula na rotina escolar.', icon: PlusCircle },
      { id: 'school_schedule_entry_updated', label: 'Aula Atualizada', description: 'Quando um colaborador modifica uma aula existente na rotina escolar.', icon: Edit3 },
      { id: 'school_schedule_entry_deleted', label: 'Aula Removida', description: 'Quando um colaborador remove uma aula da rotina escolar.', icon: Trash2 },
    ],
  },
];


export default function SettingsPage() {
    const { user, loading: authLoading } = useAuth();
    const { availableContexts } = useFamily();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    
    const [initialPage, setInitialPage] = useState<InitialPage>('heroes');
    const [initialContext, setInitialContext] = useState<string>('my-space');
    const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>({});


    useEffect(() => {
        if (user?.settings) {
            setInitialPage(user.settings.initialPage || 'heroes');
            setInitialContext(user.settings.initialContext || 'my-space');
            // Set all preferences to true by default if not specified
            const defaultPrefs: NotificationPreferences = {};
            notificationSettings.flatMap(cat => cat.items).forEach(item => {
                defaultPrefs[item.id] = true;
            });
            setNotificationPrefs({ ...defaultPrefs, ...(user.settings.notifications || {}) });
        }
    }, [user]);

    const handleNotificationChange = (id: NotificationType, checked: boolean) => {
        setNotificationPrefs(prev => ({ ...prev, [id]: checked }));
    };

    const handleSaveChanges = async () => {
        if (!user) {
            toast({ title: "Você não está autenticado.", variant: "destructive" });
            return;
        }
        setIsSaving(true);
        try {
            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, {
                'settings.initialPage': initialPage,
                'settings.initialContext': initialContext,
                'settings.notifications': notificationPrefs,
            });
            toast({ title: "Configurações Salvas!", description: "Suas preferências foram atualizadas." });
        } catch (error) {
            console.error("Error saving settings:", error);
            toast({ title: "Erro ao Salvar", description: "Não foi possível salvar suas configurações.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };
    
    if (authLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
             <Card>
                <CardHeader className="flex flex-row justify-between items-start">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-3xl font-headline">
                            <Settings className="h-8 w-8 text-primary"/>
                            Configurações
                        </CardTitle>
                        <CardDescription>Gerencie as configurações da sua conta e preferências do aplicativo.</CardDescription>
                    </div>
                     <ThemeSwitcher />
                </CardHeader>
            </Card>

            <Accordion type="multiple" defaultValue={['general-settings', 'notifications']} className="w-full space-y-4">
                 <AccordionItem value="notifications" asChild>
                    <Card>
                        <AccordionTrigger className="p-6 hover:no-underline w-full group text-left">
                            <CardHeader className="p-0">
                                <CardTitle className="flex items-center gap-2">
                                    <Bell className="h-5 w-5 text-primary"/> Preferências de Notificação
                                </CardTitle>
                                <CardDescription>Escolha quais alertas você deseja receber.</CardDescription>
                            </CardHeader>
                        </AccordionTrigger>
                        <AccordionContent asChild>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 pt-2">
                                {notificationSettings.map(category => (
                                    <div key={category.category} className="space-y-4">
                                        <h3 className="font-semibold text-lg">{category.category}</h3>
                                        {category.items.map(item => (
                                            <div key={item.id} className="flex items-start justify-between gap-4 p-3 rounded-lg border bg-muted/30">
                                                <div className="flex items-start gap-3">
                                                    <item.icon className="h-5 w-5 text-muted-foreground mt-0.5"/>
                                                    <div>
                                                        <Label htmlFor={`notif-${item.id}`} className="font-medium cursor-pointer">{item.label}</Label>
                                                        <p className="text-xs text-muted-foreground">{item.description}</p>
                                                    </div>
                                                </div>
                                                <Switch
                                                    id={`notif-${item.id}`}
                                                    checked={notificationPrefs[item.id] !== false} // default to true if undefined
                                                    onCheckedChange={(checked) => handleNotificationChange(item.id, checked)}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </CardContent>
                        </AccordionContent>
                    </Card>
                </AccordionItem>
                <AccordionItem value="integrations" asChild>
                    <Card>
                         <AccordionTrigger className="p-6 hover:no-underline w-full group text-left">
                            <CardHeader className="p-0">
                                <CardTitle className="flex items-center gap-2">
                                    <Sparkles className="h-5 w-5 text-primary"/> Futuras Integrações
                                </CardTitle>
                                <CardDescription>Conecte o Mini Herois a outros serviços. Vote nas suas ideias favoritas para nos ajudar a priorizar!</CardDescription>
                            </CardHeader>
                        </AccordionTrigger>
                        <AccordionContent asChild>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FeatureVoteCard
                                        featureId="google_calendar"
                                        icon={Calendar}
                                        title="Google Agenda"
                                        description="Sincronize missões e prazos automaticamente com a sua agenda do Google para nunca perder uma aventura."
                                    />
                                    <FeatureVoteCard
                                        featureId="amazon_alexa"
                                        icon={BotMessageSquare}
                                        title="Amazon Alexa"
                                        description="Receba lembretes de missões e marque-as como concluídas usando simples comandos de voz."
                                    />
                                    <FeatureVoteCard
                                        featureId="ifttt"
                                        icon={Workflow}
                                        title="IFTTT (If This Then That)"
                                        description="Crie automações personalizadas, como acender uma luz inteligente quando uma missão for concluída."
                                    />
                                    <FeatureVoteCard
                                        featureId="google_classroom"
                                        icon={School}
                                        title="Google Classroom"
                                        description="Importe automaticamente tarefas e trabalhos escolares como missões para seus herois."
                                    />
                                </div>
                            </CardContent>
                        </AccordionContent>
                    </Card>
                </AccordionItem>
                <AccordionItem value="general-settings" asChild>
                     <Card>
                        <AccordionTrigger className="p-6 hover:no-underline w-full group text-left">
                            <CardHeader className="p-0">
                                <CardTitle className="flex items-center gap-2">
                                    <Settings className="h-5 w-5 text-primary"/> Configurações Gerais
                                </CardTitle>
                                <CardDescription>Personalize o comportamento do aplicativo de acordo com suas preferências.</CardDescription>
                            </CardHeader>
                        </AccordionTrigger>
                        <AccordionContent asChild>
                            <CardContent className="space-y-6 pt-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="initial-page">Tela inicial após login</Label>
                                        <Select value={initialPage} onValueChange={(v) => setInitialPage(v as InitialPage)}>
                                            <SelectTrigger id="initial-page">
                                                <SelectValue placeholder="Selecione uma tela..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {initialPages.map(page => (
                                                    <SelectItem key={page.id} value={page.id}>{page.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground">Escolha para qual tela você é direcionado ao entrar.</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="initial-context">Espaço de trabalho inicial</Label>
                                        <Select value={initialContext} onValueChange={setInitialContext}>
                                            <SelectTrigger id="initial-context">
                                                <SelectValue placeholder="Selecione um espaço..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableContexts.map(context => (
                                                    <SelectItem key={context.id} value={context.id}>
                                                        {context.id === 'my-space' ? context.name : `Aliança: ${context.name}`}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground">Escolha qual espaço abrir ao iniciar o aplicativo.</p>
                                    </div>
                                </div>
                            </CardContent>
                        </AccordionContent>
                    </Card>
                </AccordionItem>
            </Accordion>
            
            <div className="flex justify-end">
                <Button onClick={handleSaveChanges} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Salvar Alterações
                </Button>
            </div>
        </div>
    );
}
