# Roadmap — MiniHerois

Lista viva de evoluções. Itens são adicionados a partir das conversas.
Status: 🔵 ideia · 🟡 planejado · 🟢 em andamento · ✅ concluído

---

## 🎨 Design

- 🟡 **Claymorphism fofinho** — redesign visual no estilo massinha (sombras duplas, formas infladas, pastéis).
  Começar pela dashboard da criança, em branch separada, mantendo paleta roxa.
  Atenção: modo escuro, performance em listas longas, contraste/acessibilidade.
- 🔵 Micro-animações de gamificação (confete ao concluir missão, estrelas que pulam, progresso animado).
- 🔵 Estados vazios ilustrados (substituir textos simples por ilustração + CTA).
- 🔵 Capricho na landing/login (mascote, primeira impressão).

## 🔧 Técnico / Pendências da migração

- 🟡 Configurar `SUPABASE_SERVICE_ROLE_KEY` (cron de limpeza de convites).
- 🟡 Adicionar `GOOGLE_GENAI_API_KEY` no `.env.local` (geração de rotina por IA).
- 🔵 Remover código morto em `src/lib/firebase/`.
- 🔵 Deploy no Vercel (substituindo Firebase Hosting).
- 🔵 Criar projeto Supabase separado para desenvolvimento (evitar mexer em dados de produção).

## 👥 Colaboração

- 🔵 Definir fluxo com dev secundário (branch + PR, master protegido).
- 🔵 Criar `CONTRIBUTING.md` com o fluxo de trabalho.

---

_Última atualização: 2026-06-16_
