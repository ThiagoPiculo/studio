# Arquitetura e Visão de Produto: O Sistema de "Aliança"

Este documento detalha as decisões técnicas e de produto por trás do sistema de colaboração, agora chamado "Aliança".

## 1. Por Que "Aliança"?

A substituição do termo "Família" por "Aliança" é uma decisão estratégica de branding, posicionamento e experiência do usuário.

-   **Alinhamento com a Narrativa Heroica:** "Aliança" evoca um pacto voluntário em torno de um objetivo nobre: guiar o desenvolvimento das crianças. Os adultos não são meros administradores; são membros de uma aliança de apoio ao Mini Heroi.
-   **Inclusividade e Neutralidade:** O termo é mais inclusivo do que "família", abrangendo diversas configurações de cuidado (pais separados, avós, tios, babás) sem carregar o peso emocional que a palavra "família" pode ter em certos contextos.
-   **Clareza de Papéis:** Facilita a definição de papéis como "Colaborador da Aliança", que é mais claro e empoderador do que "membro da família compartilhada".

## 2. Estrutura de Papéis (Role-Based Access Control - RBAC)

Para permitir uma colaboração rica e segura, o sistema de Aliança implementa um RBAC (Controle de Acesso Baseado em Papéis) com a seguinte hierarquia:

-   👑 **Owner (Proprietário):**
    -   **Definição:** O fundador da Aliança. Existe apenas um por Aliança.
    -   **Permissões:** Controle total. Pode convidar/remover qualquer membro, alterar o papel de qualquer membro (exceto o seu próprio), transferir a propriedade e excluir a Aliança.

-   🛡️ **Co-Owner (Co-Proprietário):**
    -   **Definição:** O "braço direito" do Proprietário, com poderes administrativos.
    -   **Permissões:** Pode convidar e remover `Guardians`, `Mentors` e `Specialists`. Não pode remover o `Owner` ou outros `Co-Owners`. Pode solicitar a transferência de propriedade da Aliança.

-   ❤️ **Guardian (Guardião):**
    -   **Definição:** O colaborador principal do dia a dia. Este é o antigo papel de "Collaborator".
    -   **Permissões:** Foco total nos Mini Herois. Pode criar, atribuir e gerenciar missões e recompensas. Não possui permissões administrativas sobre a Aliança.

-   🧑‍🏫 **Mentor:**
    -   **Definição:** Um papel de incentivo com acesso limitado.
    -   **Permissões:** Acesso de **leitura** à agenda e progresso dos heróis. Não pode editar, criar ou concluir tarefas. Ideal para irmãos mais velhos ou familiares que querem acompanhar.

-   🧐 **Specialist (Especialista):**
    -   **Definição:** Um observador profissional com acesso restrito a dados.
    -   **Permissões:** Acesso de **leitura** aos dados de progresso e conclusão de missões. Não pode fazer alterações. Ideal para terapeutas, psicopedagogos, etc.

## 3. Implementação Técnica

-   **Coleções no Firestore:**
    -   `families`: Armazena os dados da Aliança (`name`, `ownerId`, etc.).
    -   `familyMemberships`: Documentos que ligam um `userId` a uma `familyId` e definem seu `role` (ex: `Owner`, `Guardian`). Esta é a fonte da verdade para permissões.
    -   `children`: Cada perfil de criança tem um campo `familyId`, que a associa a uma Aliança.
    -   `familyInvitations`: Gerencia os convites e pedidos de entrada, com status (`pending`, `accepted`) e tipo (`invite`, `request`).

-   **Fluxo de Transferência de Propriedade:**
    1. O proprietário atual decide transferir a liderança para outro membro.
    2. Uma função segura `transferFamilyOwnership` é chamada, executando uma transação atômica no Firestore.
    3. A transação atualiza o `ownerId` no documento da `families`.
    4. A mesma transação atualiza o `role` do novo proprietário para `Owner` e o do antigo para `Co-Owner` nos documentos de `familyMemberships`.

-   **Remoção de Membros e Propriedade de Heróis:**
    -   Quando um membro é removido, a lógica foi alterada para ser mais robusta:
    -   Os perfis de Mini Herois que foram **criados por esse membro** não são mais movidos para seu espaço pessoal.
    -   Em vez disso, o campo `ownerId` desses perfis de criança é **transferido para o `ownerId` da Aliança**.
    -   Isso garante que o progresso e os perfis criados para a equipe permaneçam com a equipe, mesmo após a saída de um colaborador.
