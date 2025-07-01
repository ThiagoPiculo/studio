# Arquitetura do Sistema de Agendamento Híbrido

Este documento detalha o funcionamento técnico e a arquitetura do sistema de agendamento de missões do aplicativo Mini Herois, projetado para oferecer tanto simplicidade quanto flexibilidade.

## O Problema a Ser Resolvido

Um dos principais desafios na gestão de tarefas para múltiplas crianças é que, embora muitas missões sejam iguais para todos (ex: "Escovar os dentes"), os horários e a frequência podem variar drasticamente para cada criança (ex: um filho estuda de manhã, outro à tarde).

O sistema precisava permitir que os responsáveis pudessem:
1.  **Agir rapidamente**, definindo uma regra única para várias crianças de uma só vez (o caso de uso de 80%).
2.  **Ter flexibilidade**, ajustando o agendamento para as necessidades individuais de cada criança sem criar redundância de dados no catálogo.

## A Solução: O Modelo Híbrido

A solução implementada é um sistema híbrido que separa o **"o quê"** (o modelo da missão) do **"quando e para quem"** (o agendamento), mas de uma forma que o segundo pode *herdar* as propriedades do primeiro.

### Estrutura de Dados

A arquitetura se baseia em duas coleções principais no Firestore:

1.  **`missionTemplates` (O Catálogo):**
    *   Funciona como uma biblioteca de **"blueprints"** de missões.
    *   Cada documento contém os dados essenciais da missão: `title`, `description`, `category`, `starsReward`, `xpReward`.
    *   Crucialmente, ele também armazena um **agendamento padrão** (`isRecurring`, `recurrenceRule`, `startDate`, `dueDate`). Este agendamento serve como ponto de partida rápido e como a regra default.

2.  **`missionInstances` (As Atribuições):**
    *   Este é o documento que efetivamente coloca uma missão na agenda de uma criança.
    *   Quando uma missão é atribuída, um documento `MissionInstance` é criado para **cada criança selecionada**.
    *   Este documento é **independente e autossuficiente**. Ele copia os dados imutáveis do `MissionTemplate` (título, recompensas), mas armazena as **suas próprias regras de agendamento**.

### Fluxo Lógico

1.  **Atribuição:** O processo começa quando o usuário clica em "Atribuir Missão" a partir do catálogo ou da agenda.
2.  **Seleção de Crianças:** Uma janela de diálogo (`AssignMissionDialog`) é aberta, listando as crianças elegíveis.
3.  **Herança de Agendamento:** Por padrão, cada criança na lista herda o agendamento do `MissionTemplate` que está sendo atribuído. Esse agendamento padrão é exibido ao lado do nome da criança.
4.  **Personalização (Opcional):**
    *   O usuário pode clicar em "Personalizar" para uma criança específica.
    *   Isso abre um segundo diálogo (`RecurrenceDialog` dentro de um componente de customização) que permite ao usuário definir um novo agendamento (`isRecurring`, `startDate`, `recurrenceRule`, etc.).
    *   Este agendamento personalizado é armazenado no estado do componente `AssignMissionDialog`, associado ao `childId` daquela criança.
5.  **Confirmação:**
    *   Ao clicar em "Confirmar Atribuições", o sistema itera sobre as crianças selecionadas.
    *   Para cada criança, ele verifica se existe um agendamento personalizado no estado do componente.
    *   Se houver, ele cria um novo documento `MissionInstance` usando esse agendamento personalizado.
    *   Se não houver, ele cria o `MissionInstance` usando o agendamento padrão do `MissionTemplate`.

### Benefícios Deste Modelo

-   **Eficiência e DRY (Don't Repeat Yourself):** O catálogo permanece limpo, sem precisar de missões duplicadas como "Dever de casa - João" e "Dever de casa - Maria".
-   **Integridade de Dados:** Cada `MissionInstance` é autossuficiente. Se o modelo original for alterado no futuro, isso não afetará as missões já agendadas, prevenindo comportamentos inesperados.
-   **Flexibilidade Total:** Permite lidar com as exceções e horários complexos do mundo real sem complicar a interface para o caso de uso mais simples.
-   **Escalabilidade:** A lógica de verificação da agenda (`isMissionScheduledForDate`) opera diretamente nos dados da `MissionInstance`, tornando o cálculo de exibição direto e performático, sem precisar consultar o `MissionTemplate` original a cada renderização do calendário.
