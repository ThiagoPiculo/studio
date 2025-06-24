import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Shield, Sparkles, Star, Trophy, HeartHandshake } from 'lucide-react';

export default function WelcomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 selection:bg-primary selection:text-primary-foreground">
      <header className="text-center mb-12">
        <h1 className="text-6xl font-bold text-primary mb-3 font-headline">Mini Herois</h1>
        <p className="text-xl text-foreground/80">
          Transforme pequenos hábitos em grandes conquistas!
        </p>
      </header>

      <main className="flex flex-col items-center w-full">
        <Card className="w-full max-w-md shadow-2xl rounded-xl mb-16">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-3xl font-semibold">Bem-vindo!</CardTitle>
            <CardDescription className="text-lg text-muted-foreground mt-1">Você é...</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4 p-6 pt-2">
            <Link href="/auth/login" className="flex-1">
              <Button variant="outline" size="lg" className="w-full h-20 text-lg border-2 border-primary/30 text-foreground group transition-colors hover:bg-accent hover:text-accent-foreground hover:border-accent">
                <div className="flex flex-col items-center">
                  <Shield className="h-8 w-8 mb-1 text-primary group-hover:scale-110 transition-transform" />
                  Pai/Mãe/Responsável
                </div>
              </Button>
            </Link>
            <Link href="/child-login" className="flex-1">
              <Button variant="outline" size="lg" className="w-full h-20 text-lg border-2 border-primary/30 text-foreground group transition-colors hover:bg-accent hover:text-accent-foreground hover:border-accent">
                <div className="flex flex-col items-center">
                  <Sparkles className="h-8 w-8 mb-1 text-primary group-hover:scale-110 transition-transform" />
                  Criança
                </div>
              </Button>
            </Link>
          </CardContent>
        </Card>

        <section className="w-full max-w-5xl mx-auto p-8 bg-primary/5 rounded-2xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center p-4 rounded-lg">
              <div className="p-4 bg-primary/10 rounded-full mb-4 inline-block ring-4 ring-primary/20">
                <Star className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-1 text-foreground">Micro-hábitos</h3>
              <p className="text-muted-foreground">
                Pequenas conquistas diárias que constroem grandes mudanças.
              </p>
            </div>
            <div className="flex flex-col items-center p-4 rounded-lg">
              <div className="p-4 bg-primary/10 rounded-full mb-4 inline-block ring-4 ring-primary/20">
                <Trophy className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-1 text-foreground">Recompensas</h3>
              <p className="text-muted-foreground">
                Incentivos e prêmios personalizados para cada criança.
              </p>
            </div>
            <div className="flex flex-col items-center p-4 rounded-lg">
              <div className="p-4 bg-primary/10 rounded-full mb-4 inline-block ring-4 ring-primary/20">
                <HeartHandshake className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-1 text-foreground">Conexão Familiar</h3>
              <p className="text-muted-foreground">
                Fortalecimento dos laços entre pais e filhos.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-16 text-center">
        <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} Mini Herois. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
