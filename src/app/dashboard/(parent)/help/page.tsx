

"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { HelpCircle, Search, PackageSearch, Wand2, ChevronsRight, PlusCircle, Link as LinkIcon, Users } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const helpContent = [
  {
    value: "item-1",
    title: "O que são Alianças e Papéis?",
    keywords: "aliança, papéis, família, colaborador, proprietário, guardião",
    content: (
      <div className="prose prose-sm max-w-none text-muted-foreground">
        <p>No Mini Herois, uma <strong>Aliança</strong> é o seu time de confiança! É um espaço compartilhado onde você pode convidar outros responsáveis para gerenciar as missões e recompensas dos Mini Herois juntos.</p>
        <p>Para que a colaboração seja segura, existem diferentes papéis:</p>
        <ul>
          <li><strong>👑 Proprietário (Owner):</strong> O fundador da Aliança. Tem controle total para convidar/remover membros e gerenciar a aliança.</li>
          <li><strong>🛡️ Co-Proprietário (Co-Owner):</strong> O braço direito do Proprietário. Pode gerenciar membros (exceto outros Co-Owners e o Owner).</li>
          <li><strong>❤️ Guardião (Guardian):</strong> O colaborador do dia a dia. Cria, edita e gerencia missões e recompensas. Ideal para pais, mães e avós.</li>
          <li><strong>🧑‍🏫 Mentor:</strong> Acesso de visualização para incentivar, sem poder de edição. Perfeito para irmãos mais velhos.</li>
          <li><strong>🧐 Especialista (Specialist):</strong> Acesso de leitura para acompanhamento profissional (ex: terapeutas), sem poder de edição.</li>
        </ul>
      </div>
    )
  },
  {
    value: "item-2",
    title: "Como funciona o Agendamento de Missões?",
    keywords: "agendamento, missões, rotina, calendário, agendar, recorrência",
    content: (
       <div className="prose prose-sm max-w-none text-muted-foreground">
        <p>Agendar missões é flexível para se adaptar à sua realidade.</p>
        <p><strong>Caminho Rápido (Uma Regra para Todos):</strong></p>
        <ol>
          <li>Vá para <strong>Rotina de Missões</strong> e clique em <strong>+ Adicionar Missão</strong>.</li>
          <li>Escolha a missão do seu catálogo (ex: "Fazer dever de casa").</li>
          <li>Marque as crianças que participarão. Todas herdarão o mesmo horário padrão que você definiu no catálogo.</li>
          <li>Confirme e pronto! A missão estará na rotina de todos.</li>
        </ol>
        <p><strong>Caminho Personalizado (Horários Diferentes):</strong></p>
        <ol>
          <li>Siga os mesmos passos acima, selecionando todas as crianças.</li>
          <li>Antes de confirmar, ao lado do nome da criança com horário diferente, clique em <strong>"Editar Agenda"</strong>.</li>
          <li>Na nova janela, defina a regra de horário específica para aquela criança (ex: só Segundas e Quartas).</li>
          <li>Salve a regra personalizada e confirme. A criança terá a mesma missão, mas com seu próprio horário.</li>
        </ol>
      </div>
    )
  },
  {
    value: "item-3",
    title: "Qual o Poder das Recompensas?",
    keywords: "recompensas, prêmios, estrelas, gamificação, motivação",
    content: (
      <div className="prose prose-sm max-w-none text-muted-foreground">
        <p>As recompensas são o coração da gamificação do Mini Herois, transformando esforço em conquistas visíveis.</p>
        <ul>
          <li><strong>Causa e Efeito:</strong> A criança aprende que o esforço (completar missões) leva a um resultado positivo (ganhar estrelas para resgatar algo que deseja).</li>
          <li><strong>Educação Financeira Lúdica:</strong> O ato de juntar estrelas para uma recompensa maior ensina sobre poupança, paciência e planejamento.</li>
          <li><strong>Fortalecimento de Laços:</strong> As melhores recompensas são experiências compartilhadas, como uma "tarde de cinema" ou "30 minutos de brincadeira exclusiva". Elas criam memórias afetivas.</li>
        </ul>
        <p>Use o <strong>Catálogo de Recompensas</strong> para criar os tesouros que seus heróis poderão conquistar!</p>
      </div>
    )
  }
];

export default function HelpCenterPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [openItems, setOpenItems] = useState<string[]>(['comece-aqui']);

  useEffect(() => {
    const baseOpenItems = ['comece-aqui'];
    if (searchTerm.trim() !== '') {
      const matchingItems = helpContent
        .filter(item => 
          item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
          item.keywords.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .map(item => item.value);
      setOpenItems([...baseOpenItems, ...matchingItems]);
    } else {
      setOpenItems(baseOpenItems);
    }
  }, [searchTerm]);

  const filteredContent = useMemo(() => {
    if (!searchTerm.trim()) {
      return helpContent;
    }
    return helpContent.filter(item => 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.keywords.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <HelpCircle className="h-8 w-8 text-primary" />
            <div>
              <CardTitle className="text-3xl font-headline">Central de Ajuda</CardTitle>
              <CardDescription>Encontre respostas para suas dúvidas sobre o Mini Herois.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Pesquisar por palavra-chave (ex: aliança, missão)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10"
            />
          </div>
        </CardContent>
      </Card>
      
      <Accordion type="multiple" value={openItems} onValueChange={setOpenItems} className="w-full space-y-2">
        <AccordionItem value="comece-aqui" className="border rounded-lg bg-primary/5 text-card-foreground shadow-sm">
            <AccordionTrigger className="p-6 hover:no-underline w-full text-left">
                <div className="flex items-center gap-3">
                    <Wand2 className="h-6 w-6 text-primary" />
                    <span className="text-lg font-semibold">Comece por Aqui!</span>
                </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 pt-0">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <Card className="bg-background/70">
                      <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">Criar Rotina para Criança</CardTitle>
                      </CardHeader>
                      <CardContent>
                          <Button asChild className="w-full">
                              <Link href="/dashboard/assistente">
                                   Usar o Assistente de Criação
                              </Link>
                          </Button>
                      </CardContent>
                  </Card>
                  <Card className="bg-background/70">
                      <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">Colaborar em Aliança</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                          <Button asChild variant="secondary" className="w-full">
                              <Link href="/dashboard/family?action=join">
                                   Entrar em aliança com convite
                              </Link>
                          </Button>
                          <div className="grid grid-cols-2 gap-2">
                            <Button asChild variant="secondary" className="w-full">
                                <Link href="/dashboard/family?action=create">
                                    Criar Aliança
                                </Link>
                            </Button>
                             <Button asChild variant="secondary" className="w-full">
                                <Link href="/dashboard/alliances">
                                    Gerenciar Alianças
                                </Link>
                            </Button>
                          </div>
                      </CardContent>
                  </Card>
                </div>
            </AccordionContent>
        </AccordionItem>

        {filteredContent.length > 0 ? (
            filteredContent.map((item) => (
              <AccordionItem value={item.value} key={item.value} className="border rounded-lg bg-card text-card-foreground shadow-sm">
                <AccordionTrigger className="p-6 hover:no-underline w-full text-left">
                  <span className="text-lg font-semibold">{item.title}</span>
                </AccordionTrigger>
                <AccordionContent className="p-6 pt-0">
                  {item.content}
                </AccordionContent>
              </AccordionItem>
            ))
        ) : (
          <div className="text-center py-10 border-2 border-dashed border-muted-foreground/30 rounded-lg">
            <PackageSearch className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">Nenhum resultado encontrado para "{searchTerm}".</p>
            <p className="text-sm text-muted-foreground mt-1">
              Tente buscar por outras palavras-chave.
            </p>
          </div>
        )}
      </Accordion>
    </div>
  );
}
