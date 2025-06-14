
# Design System - Mini Heroi

Este documento descreve os princípios visuais e de componentes para o projeto Mini Heroi, visando manter a consistência e a qualidade da interface do usuário.

## 1. Paleta de Cores

As cores são definidas em `src/app/globals.css` usando variáveis HSL CSS. O sistema suporta temas claro (light) e escuro (dark).

### Tema Claro (Padrão)

- **Background (`--background`):** `250 60% 97%` (Lilás Muito, Muito Claro - quase branco)
- **Foreground (`--foreground`):** `250 40% 25%` (Roxo Escuro Profundo - para texto principal)
- **Card (`--card`):** `250 60% 100%` (Branco - para fundos de cards)
- **Card Foreground (`--card-foreground`):** `250 40% 25%` (Roxo Escuro Profundo - para texto em cards)
- **Popover (`--popover`):** `250 60% 100%` (Branco)
- **Popover Foreground (`--popover-foreground`):** `250 40% 25%`
- **Primary (`--primary`):** `250 65% 60%` (Lilás Vibrante - cor principal para botões, links, destaques)
- **Primary Foreground (`--primary-foreground`):** `250 60% 98%` (Quase Branco - para texto em cima da cor primária)
- **Secondary (`--secondary`):** `250 60% 85%` (Lilás Mais Claro - para elementos secundários)
- **Secondary Foreground (`--secondary-foreground`):** `250 40% 25%` (Roxo Escuro Profundo - para texto em cima da cor secundária)
- **Muted (`--muted`):** `250 50% 90%` (Lilás Suave - para fundos de elementos discretos, como badges ou inputs)
- **Muted Foreground (`--muted-foreground`):** `250 30% 45%` (Roxo Médio - para texto silenciado ou descrições)
- **Accent (`--accent`):** `270 70% 65%` (Roxo Levemente Azulado - para destaques sutis e elementos de foco)
- **Accent Foreground (`--accent-foreground`):** `250 60% 98%` (Quase Branco - para texto em cima da cor de destaque)
- **Destructive (`--destructive`):** `0 72% 51%` (Vermelho Padrão - para ações destrutivas, erros)
- **Destructive Foreground (`--destructive-foreground`):** `0 0% 98%` (Branco - para texto em cima da cor destrutiva)
- **Border (`--border`):** `250 50% 88%` (Borda Lilás Clara)
- **Input (`--input`):** `250 50% 92%` (Fundo de Input Lilás Bem Claro - para campos de formulário)
- **Ring (`--ring`):** `250 65% 60%` (Lilás Vibrante - para anéis de foco em elementos interativos)

### Tema Escuro

- **Background (`--background`):** `250 20% 12%` (Roxo Muito Escuro)
- **Foreground (`--foreground`):** `250 60% 95%` (Lilás Muito Claro)
- **Card (`--card`):** `250 20% 15%` (Roxo Escuro para Cards)
- **Card Foreground (`--card-foreground`):** `250 60% 95%`
- **Popover (`--popover`):** `250 20% 15%`
- **Popover Foreground (`--popover-foreground`):** `250 60% 95%`
- **Primary (`--primary`):** `250 65% 65%` (Lilás Vibrante, levemente mais claro no escuro)
- **Primary Foreground (`--primary-foreground`):** `250 20% 10%` (Roxo Mais Escuro)
- **Secondary (`--secondary`):** `250 50% 45%` (Roxo Médio Escuro)
- **Secondary Foreground (`--secondary-foreground`):** `250 60% 95%`
- **Muted (`--muted`):** `250 25% 30%` (Roxo Escuro Suave)
- **Muted Foreground (`--muted-foreground`):** `250 50% 80%` (Lilás Claro)
- **Accent (`--accent`):** `270 70% 70%` (Roxo Levemente Azulado, mais claro no escuro)
- **Accent Foreground (`--accent-foreground`):** `250 20% 10%`
- **Destructive (`--destructive`):** `0 63% 45%` (Vermelho Escuro)
- **Destructive Foreground (`--destructive-foreground`):** `0 0% 98%`
- **Border (`--border`):** `250 30% 35%` (Borda Roxo Escuro)
- **Input (`--input`):** `250 30% 28%` (Fundo de Input Roxo Escuro)
- **Ring (`--ring`):** `250 65% 65%`

Cores para gráficos (`--chart-1` a `--chart-5`) também são definidas para ambos os temas.

## 2. Tipografia

As fontes são configuradas em `tailwind.config.ts`:

- **Fonte do Corpo (`font-body`):** 'PT Sans', 'sans-serif'
- **Fonte de Títulos (`font-headline`):** 'PT Sans', 'sans-serif' (mesma do corpo para consistência, mas geralmente usada com pesos e tamanhos maiores)
- **Fonte de Código (`font-code`):** 'monospace'

O dimensionamento do texto, peso e outros estilos são gerenciados principalmente através das classes utilitárias do Tailwind CSS e dos padrões estabelecidos pelos componentes ShadCN.

## 3. Espaçamento e Layout

- O espaçamento (padding, margin, gap) é aplicado usando as classes utilitárias do Tailwind CSS (ex: `p-4`, `m-2`, `space-y-4`, `gap-4`).
- Recomenda-se o uso de valores consistentes da escala padrão do Tailwind (0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, etc.) para manter a harmonia visual.

## 4. Bordas e Raio

- **Raio da Borda (`--radius`):** `0.5rem`. Este valor é a base para os raios de borda `lg`, `md`, e `sm` definidos em `tailwind.config.ts`.
  - `lg`: `var(--radius)` (0.5rem)
  - `md`: `calc(var(--radius) - 2px)`
  - `sm`: `calc(var(--radius) - 4px)`
- As cores das bordas geralmente usam `hsl(var(--border))`.

## 5. Componentes

- **Biblioteca Principal:** ShadCN UI. Os componentes são adicionados ao projeto (em `src/components/ui`) e podem ser personalizados conforme necessário.
- **Estilização:** Os componentes ShadCN são estilizados primariamente através das variáveis CSS definidas em `src/app/globals.css` e classes utilitárias do Tailwind CSS.
- **Consistência:** Ao usar componentes, priorize as variantes e props fornecidas pelo ShadCN para manter a consistência. Crie novos componentes reutilizáveis quando um padrão de UI se repetir.

## 6. Iconografia

- **Biblioteca de Ícones:** `lucide-react`.
- **Uso:** Certifique-se de que o ícone desejado existe na biblioteca `lucide-react` antes de usá-lo. Evite usar ícones que não fazem parte da biblioteca, a menos que seja estritamente necessário (nesse caso, use SVGs inline).

---

Este documento será atualizado conforme o design system evolui.
      