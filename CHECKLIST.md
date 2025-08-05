# Checklist de Testes Pós-Refatoração

Este checklist foi criado para validar de forma holística o funcionamento do aplicativo após as importantes correções de segurança e refatoração para Server Components. Se todos os itens abaixo funcionarem como esperado, o aplicativo pode ser considerado 100% operacional.

---

### 1. Autenticação e Acesso de Usuários
- [ ] **Login (Responsável):** Tente fazer login com e-mail/senha e também com a conta do Google.
- [ ] **Cadastro (Responsável):** Crie uma nova conta de responsável usando e-mail/senha.
- [ ] **Esqueci Minha Senha:** Use a função "Esqueci minha senha" e verifique se o e-mail de redefinição chega e funciona.
- [ ] **Login (Criança):** Acesse a página de login infantil e entre usando o "Código de Acesso" de 6 dígitos de um herói.
- [ ] **Logout:** Faça logout tanto da conta de responsável quanto da conta da criança.

### 2. Gestão de Mini Herois
- [ ] **Criar Novo Herói:** Acesse `/dashboard/novo-heroi` e cadastre uma nova criança. Verifique se ela aparece corretamente.
- [ ] **Visualizar Heróis:**
    - [ ] Acesse `/dashboard/heroes` e veja se todos os seus heróis aparecem corretamente nos cards.
    - [ ] Acesse o Mural (`/dashboard/mural`) e use o seletor no topo para filtrar por um herói específico e por "Todos".
- [ ] **Editar Perfil:** No Mural (`/dashboard/mural`), vá para a aba "Editar Perfil" e tente alterar o nome e a data de nascimento de um herói. Salve e veja se a mudança refletiu.
- [ ] **Regenerar Código de Acesso:** Na mesma tela de edição, tente regenerar a "Chave Secreta do Heroi".

### 3. Gestão de Missões
- [ ] **Criar Missão:** Vá para o Quadro de Missões (`/dashboard/missions`) e crie uma nova missão no catálogo.
- [ ] **Agendar Missão na Agenda:**
    - [ ] Vá para a Agenda (`/dashboard/agenda`) e clique em "+ Adicionar Missão".
    - [ ] Selecione uma missão do catálogo e atribua a um herói.
- [ ] **Verificar Agenda:** Confira se a missão agendada aparece no dia correto. Teste as visualizações de 1 dia, 3 dias e semana.
- [ ] **Concluir Missão:** Na agenda, clique em uma missão e marque-a como "Concluída". Verifique se o status muda.
- [ ] **Verificar Progresso:** Após concluir uma missão, vá para `/dashboard/heroes` e veja se as estrelas (⭐) e o XP do herói aumentaram.

### 4. Gestão de Recompensas
- [ ] **Criar Recompensa:** Vá para o Quadro de Recompensas (`/dashboard/rewards`) e crie um novo prêmio no catálogo.
- [ ] **Atribuir Recompensa:** Clique em "Gerenciar" em uma recompensa e marque a caixa de seleção para atribuí-la a uma criança.
- [ ] **Verificar Recompensa no Mural:** Vá para o mural da criança (`/dashboard/mural`), acesse a aba "Quadro de Recompensas" e confirme se a recompensa aparece lá.
- [ ] **Resgatar Recompensa:** Se a criança tiver estrelas suficientes, tente marcar a recompensa como "Resgatada". Verifique se o saldo de estrelas dela diminui.

### 5. Sistema de Alianças (Famílias)
- [ ] **Criar Aliança:** No seu espaço pessoal, vá em `/dashboard/family` e crie uma nova aliança.
- [ ] **Convidar Membro:** Dentro da aliança, convide um outro usuário (se tiver uma conta de teste) usando o código ou o e-mail.
- [ ] **Aceitar Convite:** Na conta do usuário convidado, verifique se a notificação de convite aparece e aceite-a.
- [ ] **Verificar Membros:** Volte para a conta do proprietário e confirme se o novo membro aparece na lista.
- [ ] **Mover Herói:** No mural de um herói, na aba "Editar Perfil", tente mover o herói do seu espaço pessoal para uma aliança e vice-versa.

### 6. Navegação e Interface Geral
- [ ] **Navegação pelo Menu:** Clique em todos os itens do menu lateral e verifique se as páginas carregam sem erros.
- [ ] **Breadcrumbs (Caminho de Navegação):** Ao navegar para páginas internas (como editar uma missão), verifique se o caminho de navegação no topo da página está correto e faz sentido.
- [ ] **Páginas de Carregamento (Skeleton):** Navegue rapidamente entre as páginas e observe se as telas de carregamento ("esqueletos") aparecem de forma consistente com o layout final de cada página.
- [ ] **Responsividade:** Diminua a janela do seu navegador para simular um celular e veja se o layout se adapta corretamente, especialmente em páginas com grades como a Agenda e o Mural.
