# Mini Herois - Construtor de Hábitos

Bem-vindo ao Mini Herois, uma plataforma gamificada projetada para ajudar pais e responsáveis a gerenciar tarefas e incentivar a formação de hábitos saudáveis em crianças de uma maneira divertida e positiva.

## 🚀 Sobre o Projeto

O Mini Herois transforma a rotina diária em uma jornada épica. As crianças se tornam heróis em suas próprias aventuras, completando missões (tarefas) para ganhar estrelas e pontos de experiência (XP), que podem ser trocados por recompensas. O objetivo é fortalecer laços familiares através do reforço positivo e da colaboração.

## ✨ Funcionalidades Principais

- **Gamificação Completa:** Sistema de Níveis, XP (Pontos de Experiência) e Estrelas (moeda do jogo).
- **Quadro de Missões:** Crie e gerencie missões (tarefas) com recompensas personalizadas.
- **Quadro de Recompensas:** Defina recompensas que as crianças podem "comprar" com as estrelas que ganham.
- **Agendamento Flexível:** Atribua missões recorrentes ou únicas com horários personalizados para cada criança.
- **Alianças de Herois:** Convide outros responsáveis (cônjuge, avós, especialistas) para gerenciar a jornada dos heróis em equipe, com diferentes níveis de permissão.
- **Login Infantil Seguro:** As crianças acessam um portal simplificado usando um código numérico de 6 dígitos.
- **Painéis de Controle:** Acompanhe o progresso, as missões concluídas e as recompensas resgatadas através de dashboards visuais.

## 🛠️ Tecnologias Utilizadas

Este projeto foi construído com uma stack moderna e robusta, focada em performance e escalabilidade:

- **Frontend:** [Next.js](https://nextjs.org/) (com App Router) e [React](https://react.dev/)
- **Estilização:** [Tailwind CSS](https://tailwindcss.com/) e [ShadCN UI](https://ui.shadcn.com/) para componentes.
- **Backend e Banco de Dados:** [Firebase](https://firebase.google.com/) (Firestore, Authentication, Storage).
- **Inteligência Artificial:** [Genkit](https://firebase.google.com/docs/genkit) para funcionalidades de IA, como sugestão de missões.
- **Linguagem:** [TypeScript](https://www.typescriptlang.org/)

## Como Começar

Para explorar a aplicação, comece pela página inicial em `src/app/page.tsx`, que direciona para os fluxos de login de responsáveis e de crianças. A lógica principal do dashboard para usuários autenticados está em `src/app/dashboard/`.
