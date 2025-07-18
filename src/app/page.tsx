
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Crown, Heart, Star, Award, Sparkles, Rocket } from 'lucide-react';

const CornerIcon = ({ icon: Icon, className }: { icon: React.ElementType, className: string }) => (
    <div className={`absolute w-10 h-10 bg-card rounded-xl shadow-clay flex items-center justify-center ${className}`}>
        <Icon className="h-6 w-6 text-primary filter drop-shadow-md" />
    </div>
);


export default function WelcomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center bg-transparent p-6 selection:bg-primary selection:text-primary-foreground">
        <header className="w-full max-w-7xl mx-auto flex items-center justify-center py-4 px-2">
            <div className="flex items-center justify-center space-x-2 md:space-x-4">
                <Rocket className="h-9 w-9 md:h-12 md:w-12 text-primary filter drop-shadow-md animate-float" />
                <span className="font-headline text-4xl md:text-5xl font-bold text-primary whitespace-nowrap">Mini Herois</span>
            </div>
        </header>
      <main className="flex flex-col items-center w-full max-w-5xl mx-auto text-center mt-8 sm:mt-16">
        
        <h1 className="text-3xl md:text-4xl font-bold text-primary mb-4 font-headline [text-shadow:1px_1px_2px_hsl(var(--primary)/0.2)]">
          Crianças em Missões Heroicas!
        </h1>
        <p className="text-lg text-foreground/80 max-w-2xl mb-16">
          Fortalecendo laços familiares com reforço positivo e diversão gamificada.
        </p>

        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
            <Card className="shadow-clay rounded-2xl p-6 text-center transition-all hover:shadow-clay-hover hover:-translate-y-1">
                <CardHeader className="p-0 items-center mb-4">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center shadow-clay mb-3 group">
                        <Crown className="h-9 w-9 text-primary filter drop-shadow-lg group-hover:scale-110 transition-transform" />
                    </div>
                    <CardTitle className="text-2xl font-semibold font-headline">Sou Responsável</CardTitle>
                </CardHeader>
                <CardDescription className="text-base text-muted-foreground mb-6">
                    Crie missões personalizadas, defina recompensas e acompanhe o progresso dos seus Mini Herois. Gerencie a Aliança Familiar completa.
                </CardDescription>
                <Link href="/auth/login" passHref>
                    <Button size="lg" className="w-full rounded-xl text-lg shadow-clay hover:shadow-clay-hover active:shadow-clay-inset">
                        Começar Jornada
                    </Button>
                </Link>
            </Card>
            <Card className="shadow-clay rounded-2xl p-6 text-center transition-all hover:shadow-clay-hover hover:-translate-y-1">
                 <CardHeader className="p-0 items-center mb-4">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center shadow-clay mb-3 group">
                        <Heart className="h-9 w-9 text-primary filter drop-shadow-lg group-hover:scale-110 transition-transform" />
                    </div>
                    <CardTitle className="text-2xl font-semibold font-headline">Sou um Mini Heroi</CardTitle>
                </CardHeader>
                <CardDescription className="text-base text-muted-foreground mb-6">
                    Complete missões divertidas, ganhe estrelas ⭐, suba de nível 🚀 e desbloqueie conquistas incríveis! Sua jornada heroica começa aqui.
                </CardDescription>
                <Link href="/child-login" passHref>
                    <Button size="lg" className="w-full rounded-xl text-lg shadow-clay hover:shadow-clay-hover active:shadow-clay-inset">
                        Começar Jornada
                    </Button>
                </Link>
            </Card>
        </div>

        <div className="relative w-full max-w-4xl mb-16 h-0">
            <CornerIcon icon={Star} className="top-0 left-0 -translate-x-1/3 -translate-y-1/3 rotate-[-15deg]" />
            <CornerIcon icon={Award} className="top-0 right-0 translate-x-1/3 -translate-y-1/3 rotate-[15deg]" />
            <CornerIcon icon={Sparkles} className="bottom-0 right-1/2 translate-x-1/2 translate-y-1/3" />
        </div>

      </main>

      <footer className="mt-auto pt-16 text-center">
        <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} Mini Herois. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
