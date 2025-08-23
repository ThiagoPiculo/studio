
"use client";

import { Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from '@/components/ui/carousel';
import { Badge } from '@/components/ui/badge';
import { Home, Rocket, Star, Gift, Target, Heart, Users, CheckCircle } from 'lucide-react';
import Loading from './loading';

function WelcomePageContent() {
  const { user } = useAuth();
  const router = useRouter();

  const slides = [
    {
      title: `Olá, ${user?.name || 'Grande Líder'}! Transforme a Rotina em uma Aventura Divertida!`,
      icon: Rocket,
      content: (
        <>
          <p>Com a ajuda do nosso Assistente Heroi, vamos te guiar para cadastrar seus Mini Herois e a Rotina de Missões diárias de forma prática e rápida (em poucos passos).</p>
          <p>Cansada de repetir as mesmas coisas todos os dias? O MiniHeróis é o seu parceiro para transformar o 'escovar os dentes' ou 'fazer a lição' em Missões Heroicas. Você vai usar a linguagem que as crianças amam (estrelas, níveis, recompensas) para motivá-las a cumprir suas responsabilidades de forma autônoma. É menos estresse para você, e mais diversão para eles.</p>
          <p className="font-bold text-primary">Juntos, vamos forjar o herói que existe nos seus Mini Heróis!</p>
        </>
      ),
      buttonText: "Entendi! Como a mágica funciona?"
    },
    {
      title: "Transformando o Dever em Aventura",
      icon: Star,
      content: (
        <div className="space-y-4 text-left">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-full"><Target className="h-6 w-6 text-primary" /></div>
            <div>
              <h4 className="font-semibold">Você Lança as Missões</h4>
              <p className="text-sm">As tarefas do dia a dia se transformam em missões heroicas que você define. Não se preocupe, o Assistente Heroi te ajuda e é muito rápido e fácil.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-400/10 rounded-full"><Star className="h-6 w-6 text-yellow-500" /></div>
            <div>
              <h4 className="font-semibold">Eles Conquistam Estrelas Mágicas</h4>
              <p className="text-sm">Seu filho completa as missões e acumula estrelas pelo esforço e pela coragem de enfrentar e concluir cada desafio.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500/10 rounded-full"><Gift className="h-6 w-6 text-green-600" /></div>
            <div>
              <h4 className="font-semibold">Juntos, Vocês Celebram as Recompensas</h4>
              <p className="text-sm">Com as estrelas, ele resgata prêmios que vocês definiram juntos, transformando esforço em memórias felizes e conquistas reais.</p>
            </div>
          </div>
        </div>
      ),
      buttonText: "Adorei! E como eu gerencio isso?"
    },
    {
      title: "Cuidar Solo ou Cuidar em Aliança?",
      icon: Users,
      content: (
         <div className="flex flex-col md:flex-row gap-4 text-left">
            <div className="p-4 border rounded-lg bg-background flex-1">
                <h4 className="font-semibold flex items-center gap-2 mb-2"><Home className="h-5 w-5 text-chart-2" /> Cuidar Solo</h4>
                <p className="text-sm">Sabemos que na jornada de cuidar solo há muitos pratinhos para equilibrar. O Mini Heróis foi pensado para ser seu parceiro, ajudando a criar e organizar a rotina, a diminuir a carga mental.</p>
            </div>
            <div className="p-4 border rounded-lg bg-background flex-1">
                <h4 className="font-semibold flex items-center gap-2 mb-2"><Users className="h-5 w-5 text-chart-4" /> Cuidar em Aliança</h4>
                <p className="text-sm">A qualquer momento, você pode convidar outros guardiões para formar uma Aliança de Heróis e trabalhar em equipe, garantindo consistência e apoio.</p>
            </div>
         </div>
      ),
      buttonText: "Incrível! Quero começar agora!"
    },
    {
      title: "Tudo Pronto para Iniciar a Aventura?",
      icon: CheckCircle,
      content: (
        <>
          <p>Nosso Assistente Heroi vai te guiar em um passo a passo mágico de 5 minutos para cadastrar seu primeiro herói e criar uma rotina base inteligente e personalizada.</p>
          <p className="font-bold text-primary">É a forma mais rápida de preparar o mapa da jornada e liberar os superpoderes do seu filho!</p>
        </>
      ),
      buttonText: "Sim, começar com o Assistente Mágico!"
    }
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Carousel className="w-full max-w-xl" opts={{ loop: false }}>
        <CarouselContent>
          {slides.map((slide, index) => (
            <CarouselItem key={index}>
              <Card className="shadow-2xl rounded-2xl">
                <CardContent className="flex flex-col items-center justify-center p-4 sm:p-6 text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center shadow-md mb-2">
                        <slide.icon className="h-8 w-8 text-primary" />
                    </div>
                  <h2 className="text-xl md:text-2xl font-bold font-headline">{slide.title}</h2>
                  <div className="text-sm text-muted-foreground space-y-3">{slide.content}</div>
                  
                  {index < slides.length - 1 ? (
                    <CarouselNext className="relative static translate-y-0 mt-4">
                        {slide.buttonText}
                    </CarouselNext>
                  ) : (
                    <Button onClick={() => router.push('/dashboard/novo-heroi')} size="lg" className="mt-4">
                        {slide.buttonText}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </div>
  );
}


export default function WelcomePage() {
    return (
        <Suspense fallback={<Loading />}>
            <WelcomePageContent />
        </Suspense>
    )
}
