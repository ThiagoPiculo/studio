

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
import { Loader2, Save, Settings, Sparkles, Wand2, Bot, Zap, Network, BotMessageSquare, Calendar, Workflow, School, ThumbsUp, Palette } from 'lucide-react';
import { ThemeSwitcher } from '@/components/dashboard/settings/ThemeSwitcher';
import type { InitialPage } from '@/lib/types';
import { FeatureVoteCard } from '@/components/dashboard/settings/FeatureVoteCard';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const initialPages: { id: InitialPage; label: string }[] = [
    { id: 'heroes', label: 'Resumo do Dia' },
    { id: 'agenda', label: 'Rotina de Missões' },
    { id: 'missions', label: 'Quadro de Missões' },
    { id: 'rewards', label: 'Quadro de Recompensas' },
    { id: 'family', label: 'Aliança de Herois' },
];

export default function SettingsPage() {
    const { user, loading: authLoading } = useAuth();
    const { availableContexts } = useFamily();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    
    const [initialPage, setInitialPage] = useState<InitialPage>('heroes');
    const [initialContext, setInitialContext] = useState<string>('my-space');

    useEffect(() => {
        if (user?.settings) {
            setInitialPage(user.settings.initialPage || 'heroes');
            setInitialContext(user.settings.initialContext || 'my-space');
        }
    }, [user]);

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

            <Accordion type="single" collapsible className="w-full" defaultValue="general-settings">
                <AccordionItem value="integrations" asChild>
                    <Card>
                        <CardHeader>
                            <AccordionTrigger className="w-full p-0 hover:no-underline">
                                <CardTitle className="flex items-center gap-2">
                                    <Sparkles className="h-5 w-5 text-primary"/> Futuras Integrações
                                </CardTitle>
                            </AccordionTrigger>
                            <CardDescription>Conecte o Mini Herois a outros serviços. Vote nas suas ideias favoritas para nos ajudar a priorizar!</CardDescription>
                        </CardHeader>
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
                        <CardHeader>
                        <AccordionTrigger className="w-full p-0 hover:no-underline">
                                <CardTitle className="flex items-center gap-2">
                                    <Settings className="h-5 w-5 text-primary"/> Configurações Gerais
                                </CardTitle>
                            </AccordionTrigger>
                            <CardDescription>Personalize o comportamento do aplicativo de acordo com suas preferências.</CardDescription>
                        </CardHeader>
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
