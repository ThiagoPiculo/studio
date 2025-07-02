
import { ChildLoginForm } from '@/components/auth/ChildLoginForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, ListChecks, Star as StarIcon, Trophy, HelpCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ChildLoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-transparent p-4 selection:bg-accent selection:text-accent-foreground">
      <Card className="w-full max-w-sm overflow-hidden shadow-clay rounded-2xl transition-all hover:shadow-clay-hover">
        <CardHeader className="text-center p-6">
          <div className="mb-4 flex justify-center group">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center shadow-clay mb-3">
              <Sparkles className="h-12 w-12 text-primary filter drop-shadow-lg group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <CardTitle className="font-headline text-3xl">Olá, Mini Herois!</CardTitle>
          <CardDescription className="text-muted-foreground">
            Sua próxima missão está pronta! Use sua <strong>Chave Secreta de Herói</strong> para começar a aventura.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <ChildLoginForm />
          <div className="mt-8 space-y-3">
            <div className="flex items-center justify-start text-sm text-muted-foreground">
              <ListChecks className="h-5 w-5 mr-2 text-primary filter drop-shadow-sm" />
              <span>Complete suas missões diárias!</span>
            </div>
            <div className="flex items-center justify-start text-sm text-muted-foreground">
              <StarIcon className="h-5 w-5 mr-2 text-yellow-400 fill-yellow-400 filter drop-shadow-sm" />
              <span>Ganhe estrelas brilhantes!</span>
            </div>
            <div className="flex items-center justify-start text-sm text-muted-foreground">
              <Trophy className="h-5 w-5 mr-2 text-orange-500 filter drop-shadow-sm" />
              <span>Conquiste recompensas incríveis!</span>
            </div>
          </div>
          <p className="mt-8 text-center text-sm text-muted-foreground">
            É um pai/mãe/responsável?{' '}
            <Link href="/auth/login" className="font-medium text-primary hover:underline">
              Acesse sua central
            </Link>
          </p>
        </CardContent>
      </Card>
      <Link href="/" className="mt-8 inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar à tela inicial
      </Link>
    </div>
  );
}
