
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Rocket, Star, Gift, Target, Heart, Shield, Sparkles, UserCheck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { getInitials } from '@/lib/utils';
import { Calendar1Icon } from '@/components/icons/Calendar1Icon';
import Image from 'next/image';

// Componente do Cabeçalho Fixo
function LandingPageHeader() {
  return (
    <header className="sticky top-0 z-50 w-full bg-background/80 py-3 backdrop-blur-sm border-b">
      <div className="container mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-primary">
          <div className="relative h-7 w-7 p-1 bg-primary/10 rounded-lg flex items-center justify-center">
            <Rocket className="h-5 w-5 text-primary" />
          </div>
          <span className="text-xl font-bold font-headline">Mini Heróis</span>
        </Link>
        <div className="flex items-center gap-2">
          <Button asChild>
            <Link href="/auth/login">Login</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/auth/register">Comece Grátis</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

// Seção Principal (Hero Section)
function HeroSection() {
  return (
    <section className="py-16 md:py-24 text-center">
      <div className="container mx-auto">
        <h1 className="text-4xl md:text-6xl font-extrabold font-headline text-primary [text-shadow:1px_1px_2px_hsl(var(--primary)/0.2)]">
          Transforme a Rotina dos Seus Filhos em uma Aventura Divertida
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
          A plataforma gamificada que ajuda a construir hábitos, incentivar a responsabilidade e fortalecer laços familiares através de missões e recompensas.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Button size="lg" asChild>
            <Link href="/auth/register">Comece Grátis</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

// Seção "Como Funciona"
function HowItWorksSection() {
  const steps = [
    { icon: Target, title: "1. Crie Missões", description: "Transforme tarefas diárias como 'arrumar a cama' em missões heroicas." },
    { icon: Star, title: "2. Ganhe Estrelas", description: "Ao completar missões, seu filho acumula estrelas como reconhecimento pelo esforço." },
    { icon: Gift, title: "3. Resgate Recompensas", description: "Use as estrelas para conquistar prêmios incríveis que vocês definiram juntos." },
  ];
  return (
    <section id="como-funciona" className="py-16 bg-muted/50">
      <div className="container mx-auto text-center">
        <h2 className="text-3xl font-bold font-headline mb-2">Como a Mágica Acontece?</h2>
        <p className="text-muted-foreground mb-12 max-w-xl mx-auto">O ciclo heroico é simples, divertido e poderoso para criar hábitos duradouros.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <Card key={index} className="text-center shadow-clay hover:shadow-clay-hover transition-all">
              <CardHeader>
                <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center shadow-clay mb-3">
                  <step.icon className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="font-headline">{step.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{step.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

// Seção de Benefícios
function BenefitsSection() {
    const benefits = [
        { icon: Shield, title: "Crie Autonomia e Responsabilidade", description: "Seus filhos aprendem a gerenciar suas próprias tarefas e se sentem orgulhosos de suas conquistas." },
        { icon: Heart, title: "Fortaleça Laços Familiares", "description": "As melhores recompensas são experiências compartilhadas, criando memórias que duram para sempre." },
        { icon: Sparkles, title: "Reduza o Estresse Diário", description: "Menos discussões sobre 'o que fazer agora' e mais tempo de qualidade juntos, com uma rotina clara e divertida." },
        { icon: UserCheck, title: "Reforço Positivo na Prática", description: "Motive através do incentivo e da celebração, em vez da punição, construindo uma autoestima saudável." },
    ];
    return (
        <section id="beneficios" className="py-16">
            <div className="container mx-auto">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold font-headline">Mais que um App, um Aliado da Família</h2>
                    <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">Veja como o Mini Heróis pode transformar o dia a dia da sua casa.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {benefits.map((benefit) => (
                        <div key={benefit.title} className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                <benefit.icon className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold font-headline">{benefit.title}</h3>
                                <p className="mt-1 text-muted-foreground">{benefit.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// Seção de Depoimentos
function TestimonialsSection() {
  const testimonials = [
    { name: "Juliana M.", role: "Mãe do Léo, 7 anos", text: "O Mini Heróis mudou nossa rotina da água para o vinho. A briga para escovar os dentes virou uma caça às estrelas. É incrível!", avatar: "https://i.pravatar.cc/150?img=1" },
    { name: "Carlos S.", role: "Pai da Sofia, 9 anos", text: "Minha filha agora pede para fazer as tarefas para juntar estrelas para a 'noite de cinema'. Fortaleceu muito nosso vínculo.", avatar: "https://i.pravatar.cc/150?img=32" },
  ];
  return (
    <section id="depoimentos" className="py-16 bg-muted/50">
      <div className="container mx-auto text-center">
        <h2 className="text-3xl font-bold font-headline">O Que Dizem os Líderes de Aliança</h2>
        <p className="text-muted-foreground mt-2 mb-12">Pais e responsáveis que já embarcaram nesta jornada.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="text-left shadow-clay">
              <CardContent className="p-6">
                <p className="text-muted-foreground italic">"{testimonial.text}"</p>
                <div className="flex items-center gap-4 mt-4">
                  <Avatar>
                    <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
                    <AvatarFallback>{getInitials(testimonial.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

// Seção de FAQ
function FaqSection() {
    const faqs = [
        { q: "Para qual idade o Mini Heróis é indicado?", a: "Recomendamos o Mini Heróis para crianças de 4 a 12 anos. Nessa fase, a gamificação é extremamente eficaz para a construção de hábitos e o desenvolvimento do senso de responsabilidade." },
        { q: "Posso usar com mais de um filho?", a: "Sim! Você pode cadastrar quantos Mini Heróis quiser. Cada um terá seu próprio perfil, com suas missões, recompensas e progresso individual." },
        { q: "É possível convidar outro responsável para ajudar?", a: "Com certeza! Através do sistema de 'Alianças', você pode convidar outro pai, mãe, avós ou cuidadores para gerenciar a rotina dos heróis em equipe, garantindo consistência." },
        { q: "O aplicativo é seguro para crianças?", a: "Totalmente. A interface da criança é um ambiente controlado e seguro, focado apenas em suas missões e recompensas. Não há anúncios ou acesso a conteúdos externos." },
    ];
    return (
        <section id="faq" className="py-16">
            <div className="container mx-auto max-w-3xl">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold font-headline">Perguntas Frequentes</h2>
                    <p className="text-muted-foreground mt-2">Tirando todas as suas dúvidas sobre a jornada.</p>
                </div>
                <Accordion type="single" collapsible className="w-full">
                    {faqs.map((faq, index) => (
                        <AccordionItem value={`item-${index}`} key={index}>
                            <AccordionTrigger className="text-left">{faq.q}</AccordionTrigger>
                            <AccordionContent className="text-base">
                                {faq.a}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </div>
        </section>
    );
}

// Seção de CTA Final
function FinalCtaSection() {
    return (
        <section className="py-20 bg-primary/90 text-primary-foreground">
            <div className="container mx-auto text-center">
                <h2 className="text-3xl font-extrabold font-headline">Pronto para Começar a Aventura?</h2>
                <p className="mt-3 max-w-xl mx-auto text-lg opacity-90">Junte-se a milhares de famílias e descubra o poder de transformar a rotina em uma jornada heroica.</p>
                <div className="mt-8">
                     <Button size="lg" variant="secondary" asChild>
                        <Link href="/auth/register">Comece Grátis</Link>
                    </Button>
                </div>
            </div>
        </section>
    );
}

// Rodapé
function LandingPageFooter() {
    return (
        <footer className="py-8 bg-background">
            <div className="container mx-auto text-center text-muted-foreground text-sm">
                <p>&copy; {new Date().getFullYear()} Mini Heróis. Todos os direitos reservados.</p>
                 <Link href="/dashboard/child-login" className="mt-2 inline-block font-medium text-primary hover:underline">
                    É um Mini Herói? Acesse seu portal aqui!
                </Link>
            </div>
        </footer>
    );
}


export default function LandingPage() {
  return (
    <div className="bg-background text-foreground">
      <LandingPageHeader />
      <main>
        <HeroSection />
        <HowItWorksSection />
        <BenefitsSection />
        <TestimonialsSection />
        <FaqSection />
        <FinalCtaSection />
      </main>
      <LandingPageFooter />
    </div>
  );
}
