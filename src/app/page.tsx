
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Crown, Heart, Star, Zap, Award, Sparkles, Rocket } from 'lucide-react';
import Image from 'next/image';

const FeatureCard = ({ icon: Icon, title, description }: { icon: React.ElementType, title: string, description: string }) => (
    <Card className="shadow-clay rounded-2xl w-full text-center p-4 h-full">
        <CardContent className="p-2 flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shadow-clay mb-2">
                <Icon className="h-7 w-7 text-primary filter drop-shadow-lg" />
            </div>
            <p className="font-semibold text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
    </Card>
);

const CornerIcon = ({ icon: Icon, className }: { icon: React.ElementType, className: string }) => (
    <div className={`absolute w-10 h-10 bg-card rounded-xl shadow-clay flex items-center justify-center ${className}`}>
        <Icon className="h-6 w-6 text-primary filter drop-shadow-md" />
    </div>
);


export default function WelcomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center bg-transparent p-6 selection:bg-primary selection:text-primary-foreground">
        <header className="w-full max-w-7xl mx-auto flex justify-between items-center py-4 px-2">
             <div className="flex items-center space-x-2">
                <Rocket className="h-8 w-8 text-primary filter drop-shadow-md" />
                <span className="font-headline text-2xl font-bold text-foreground">Mini Herois</span>
            </div>
            <nav>
                <Link href="#" passHref>
                    <Button variant="ghost">Sobre</Button>
                </Link>
            </nav>
        </header>
      <main className="flex flex-col items-center w-full max-w-5xl mx-auto text-center mt-8 sm:mt-16">
        <h1 className="text-4xl md:text-6xl font-bold text-primary mb-4 font-headline [text-shadow:1px_1px_2px_hsl(var(--primary)/0.2)]">
          Transforme Tarefas em <br/> Aventuras Heroicas!
        </h1>
        <p className="text-lg text-foreground/80 max-w-2xl mb-12">
          Uma plataforma de gamificação que fortalece laços familiares através do reforço positivo e diversão.
        </p>
        
        <div className="relative w-full max-w-4xl mb-16 h-0">
            <CornerIcon icon={Star} className="top-0 left-0 -translate-x-1/3 -translate-y-1/3 rotate-[-15deg]" />
            <CornerIcon icon={Award} className="top-0 right-0 translate-x-1/3 -translate-y-1/3 rotate-[15deg]" />
            <CornerIcon icon={Sparkles} className="bottom-0 right-1/2 translate-x-1/2 translate-y-1/3" />
        </div>

        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
            <Card className="shadow-clay rounded-2xl p-6 text-center transition-all hover:shadow-clay-hover hover:-translate-y-1">
                <CardHeader className="p-0 items-center mb-4">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center shadow-clay mb-3">
                        <Crown className="h-9 w-9 text-primary filter drop-shadow-lg" />
                    </div>
                    <CardTitle className="text-2xl font-semibold">Sou Responsável</CardTitle>
                </CardHeader>
                <CardDescription className="text-base text-muted-foreground mb-6">
                    Crie missões personalizadas, defina recompensas e acompanhe o progresso dos seus Mini Heróis. Gerencie a Aliança Familiar completa.
                </CardDescription>
                <Link href="/auth/login" passHref>
                    <Button size="lg" className="w-full rounded-xl text-lg shadow-clay hover:shadow-clay-hover active:shadow-clay-inset">
                        Começar Jornada
                    </Button>
                </Link>
            </Card>
            <Card className="shadow-clay rounded-2xl p-6 text-center transition-all hover:shadow-clay-hover hover:-translate-y-1">
                 <CardHeader className="p-0 items-center mb-4">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center shadow-clay mb-3">
                        <Heart className="h-9 w-9 text-primary filter drop-shadow-lg" />
                    </div>
                    <CardTitle className="text-2xl font-semibold">Sou um Mini Herói</CardTitle>
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

        <section className="w-full max-w-5xl mx-auto p-8 mb-16">
          <h2 className="text-3xl font-bold text-center mb-10 text-foreground">Sistema de Gamificação Completo</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            <FeatureCard icon={Star} title="Estrelas" description="Moeda do app para resgatar recompensas." />
            <FeatureCard icon={Zap} title="XP & Níveis" description="Progressão e títulos de herói." />
            <FeatureCard icon={Award} title="Conquistas" description="+150 badges colecionáveis." />
            <FeatureCard icon={Sparkles} title="Sonhos" description="Metas de longo prazo." />
          </div>
        </section>

      </main>

      <footer className="mt-16 text-center">
        <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} Mini Herois. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
