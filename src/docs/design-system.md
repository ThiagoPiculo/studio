# Design System - Mini Herois

Este documento descreve os princípios visuais e de componentes para o projeto Mini Herois, visando manter a consistência e a qualidade da interface do usuário.

## 1. Filosofia Visual

A identidade visual do Mini Herois é **divertida, moderna e acolhedora**. O design utiliza cantos arredondados generosos, cores suaves e um efeito de sombra sutil que dá uma sensação tátil e tridimensional aos elementos, criando um ambiente amigável e encorajador tanto para as crianças quanto para os responsáveis.

## 2. Paleta de Cores

As cores são definidas em `src/app/globals.css` usando variáveis HSL CSS. O sistema suporta temas claro (light) e escuro (dark).

### Tema Claro (Padrão)

- **Background (`--background`):** `250 60% 97%` (Lilás Muito, Muito Claro - quase branco)
- **Foreground (`--foreground`):** `250 40% 25%` (Roxo Escuro Profundo - para texto principal)
- **Card (`--card`):** `250 60% 99%` (Branco - para fundos de cards)
- **Primary (`--primary`):** `250 65% 60%` (Lilás Vibrante - cor principal para botões, links, destaques)
- **Accent (`--accent`):** `270 70% 65%` (Roxo Levemente Azulado - para destaques sutis e elementos de foco)
- **Destructive (`--destructive`):** `0 72% 51%` (Vermelho Padrão - para ações destrutivas, erros)

### Tema Escuro

- **Background (`--background`):** `250 20% 12%` (Roxo Muito Escuro)
- **Foreground (`--foreground`):** `250 60% 95%` (Lilás Muito Claro)
- **Card (`--card`):** `250 20% 15%` (Roxo Escuro para Cards)
- **Primary (`--primary`):** `250 65% 65%` (Lilás Vibrante, levemente mais claro no escuro)
- **Accent (`--accent`):** `270 70% 70%` (Roxo Levemente Azulado, mais claro no escuro)
- **Destructive (`--destructive`):** `0 63% 45%` (Vermelho Escuro)

## 3. Tipografia

As fontes são configuradas em `tailwind.config.ts`:

- **Fonte Principal (`font-body` e `font-headline`):** 'PT Sans', 'sans-serif'. Usada para todos os textos para garantir consistência e legibilidade.

## 4. Espaçamento e Layout

- O espaçamento (padding, margin, gap) é aplicado usando as classes utilitárias do Tailwind CSS (ex: `p-4`, `m-2`, `space-y-4`).
- A abordagem "utility-first" do Tailwind garante consistência e rapidez no desenvolvimento de layouts.

## 5. Bordas, Raio e Sombras

- **Raio da Borda (`--radius`):** `1.25rem`. Um raio bem generoso que define a aparência suave e moderna dos componentes.
- **Sombras (Claymorphism):** O aplicativo utiliza um efeito de sombra personalizado chamado `shadow-clay` (e suas variações `hover` e `inset`). Este estilo, por vezes chamado de "claymorphism" ou Neumorfismo suave, cria a ilusão de que os elementos são extrudados do fundo, como se fossem de argila macia, reforçando a estética tátil e amigável da interface.

## 6. Componentes

- **Biblioteca Principal:** ShadCN UI. Os componentes são adicionados ao projeto (em `src/components/ui`) e estilizados através das variáveis CSS e classes do Tailwind.

## 7. Iconografia

- **Biblioteca de Ícones:** `lucide-react`. Escolhida por seu design limpo, leve e consistente, que complementa a estética geral do aplicativo.
