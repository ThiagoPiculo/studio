
"use client";

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Settings as SettingsIcon, User, Palette, Bell, Blocks, ArrowRight } from 'lucide-react';
import { ThemeSwitcher } from '@/components/dashboard/settings/ThemeSwitcher';

export default function SettingsPage() {
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
