
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Loader2, Bell, Palette, Save } from 'lucide-react';
import { ThemeSwitcher } from '@/components/dashboard/settings/ThemeSwitcher';
import type { NotificationPreferences, NotificationType } from '@/lib/types';


const notificationCategories: {
    id: keyof NotificationPreferences;
    label: string;
    description: string;
}[] = [
    { id: 'alliance_join_request', label: 'Pedidos de Aliança', description: 'Quando alguém pede para entrar na sua aliança.' },
    { id: 'mission_completed', label: 'Missões Concluídas', description: 'Quando um herói completa uma missão agendada.' },
    { id: 'reward_redeemed', label: 'Recompensas Resgatadas', description: 'Quando um herói usa as estrelas para resgatar um prêmio.' },
    { id: 'new_badge', label: 'Novas Medalhas e Níveis', description: 'Quando um herói sobe de nível ou ganha uma medalha.' },
];

export default function SettingsPage() {
    const { user, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [notificationPrefs, setNotificationPrefs] = useState<Partial<NotificationPreferences>>({});

    useEffect(() => {
        if (user?.settings?.notifications) {
            setNotificationPrefs(user.settings.notifications);
        } else {
            // Default all to true if not set
            const defaultPrefs: Partial<NotificationPreferences> = {};
            notificationCategories.forEach(cat => {
                defaultPrefs[cat.id] = true;
            });
            setNotificationPrefs(defaultPrefs);
        }
    }, [user]);

    const handlePrefChange = (key: keyof NotificationPreferences, value: boolean) => {
        setNotificationPrefs(prev => ({ ...prev, [key]: value }));
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
                'settings.notifications': notificationPrefs
            });
            toast({ title: "Configurações Salvas!", description: "Suas preferências de notificação foram atualizadas." });
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
        <div className="space-y-8 max-w-2xl mx-auto">
            <Card className="shadow-xl">
                <CardHeader>
                    <CardTitle className="text-3xl font-headline">Configurações</CardTitle>
                    <CardDescription>Gerencie suas preferências de notificação e aparência do aplicativo.</CardDescription>
                </CardHeader>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-primary"/> Preferências de Notificação</CardTitle>
                    <CardDescription>Escolha quais notificações por e-mail você deseja receber. As notificações dentro do app continuarão ativas.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {notificationCategories.map(category => (
                        <div key={category.id} className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                                <Label htmlFor={`notif-${category.id}`}>{category.label}</Label>
                                <p className="text-xs text-muted-foreground">{category.description}</p>
                            </div>
                            <Switch
                                id={`notif-${category.id}`}
                                checked={notificationPrefs[category.id] ?? true}
                                onCheckedChange={(checked) => handlePrefChange(category.id, checked)}
                            />
                        </div>
                    ))}
                </CardContent>
                <CardFooter>
                     <Button onClick={handleSaveChanges} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Salvar Preferências
                    </Button>
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5 text-primary"/> Aparência</CardTitle>
                    <CardDescription>Personalize a aparência do aplicativo.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <Label>Tema</Label>
                        <ThemeSwitcher />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
