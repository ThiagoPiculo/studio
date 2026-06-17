# Migração Firebase → Supabase

Registro da migração completa do MiniHerois de Firebase para Supabase.

## Resumo

O app foi totalmente migrado de **Firebase** (Auth, Firestore, Storage) para
**Supabase** (Auth, PostgreSQL, Storage), mantendo a integração de IA
(Genkit/Gemini) intacta.

## Banco de dados

- Schema PostgreSQL com **12 tabelas** + Row-Level Security (RLS):
  `user_profiles`, `child_profiles`, `families`, `family_memberships`,
  `family_invitations`, `mission_templates`, `mission_instances`,
  `reward_templates`, `child_reward_instances`, `school_schedule_entries`,
  `dreams`, `notifications`.
- Trigger `on_auth_user_created` → cria `user_profiles` automaticamente no signup.
- Políticas RLS por `auth.uid()` (proprietário) e membros de aliança.

## Autenticação

- Google OAuth via `supabase.auth.signInWithOAuth` (redirect).
- Login admin (email/senha), reset de senha e código de acesso da criança.
- `AuthContext` reescrito usando `supabase.auth.onAuthStateChange`.

## Camada de dados

- Novo `src/lib/supabase/config.ts` — exporta o client `supabase`.
- Novo `src/lib/supabase/auth.ts` — funções de autenticação.
- Novo `src/lib/supabase/db.ts` — substitui todo `src/lib/firebase/firestore.ts`
  (notificações, perfis, famílias, missões, recompensas, agenda escolar etc.).
- Listeners em tempo real (`onSnapshot`) substituídos por **Supabase Realtime**
  (`postgres_changes`) com recarga via funções `get*`.

## Storage

- Avatares migrados para o bucket `avatars` do Supabase Storage
  (upload com `upsert` + URL pública com cache-busting).

## Arquivos migrados (principais)

| Arquivo | Mudança |
|---|---|
| `contexts/AuthContext.tsx` | Reescrito para Supabase Auth |
| `contexts/FamilyContext.tsx` | Realtime de memberships e crianças |
| `components/layout/Notifications.tsx` | Realtime de notificações |
| `app/dashboard/(parent)/heroes/page.tsx` | Missões via Supabase |
| `app/dashboard/(parent)/agenda/page.tsx` | Missões via Supabase |
| `components/dashboard/heroes/HeroesSummary.tsx` | Missões + crianças |
| `components/dashboard/child/ChildDashboard.tsx` | Perfil + missões da criança |
| `app/dashboard/(parent)/profile/page.tsx` | Update de perfil via Supabase |
| `app/dashboard/(parent)/settings/page.tsx` | Settings em JSONB |
| `components/dashboard/EditChildProfileForm.tsx` | Upload no Supabase Storage |
| `app/api/cron/clear-old-invitations/route.ts` | Delete via service role |

## Bug crítico corrigido

`src/lib/supabase/db.ts` tinha `'use server'` no topo, fazendo o client rodar
no servidor **sem a sessão do browser** → `auth.uid()` retornava `null` e o RLS
bloqueava inserts (erro `42501`). Removido para o client rodar autenticado.

## Pendências

- [ ] Configurar `SUPABASE_SERVICE_ROLE_KEY` (cron de convites).
- [ ] Adicionar `GOOGLE_GENAI_API_KEY` no `.env.local` (geração de rotina por IA).
- [ ] Remover código morto em `src/lib/firebase/`.
- [ ] Deploy no Vercel (substituindo Firebase Hosting).
