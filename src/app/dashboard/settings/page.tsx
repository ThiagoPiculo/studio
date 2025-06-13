
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings as SettingsIcon } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <SettingsIcon className="h-8 w-8 text-primary" />
            <div>
              <CardTitle className="text-3xl font-headline">Configurações</CardTitle>
              <CardDescription>
                Gerencie as configurações da sua conta e preferências do aplicativo.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Esta área está em desenvolvimento. Em breve, você poderá personalizar diversas opções aqui!
          </p>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="opacity-50">
              <CardHeader>
                <CardTitle className="text-xl">Preferências de Notificação</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">(Em breve)</p>
              </CardContent>
            </Card>
            <Card className="opacity-50">
              <CardHeader>
                <CardTitle className="text-xl">Configurações de Tema</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">(Em breve)</p>
              </CardContent>
            </Card>
            <Card className="opacity-50">
              <CardHeader>
                <CardTitle className="text-xl">Gerenciamento da Conta</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">(Em breve)</p>
              </CardContent>
            </Card>
             <Card className="opacity-50">
              <CardHeader>
                <CardTitle className="text-xl">Integrações</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">(Em breve)</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
