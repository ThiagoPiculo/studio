# O Sistema Híbrido de Agendamento de Missões

Este documento detalha o funcionamento do sistema de agendamento de missões do aplicativo Mini Herois, projetado para oferecer tanto simplicidade quanto flexibilidade.

## O Problema a Ser Resolvido

Um dos principais desafios na gestão de tarefas para múltiplas crianças é que, embora muitas missões sejam iguais para todos (ex: "Escovar os dentes"), os horários e a frequência podem variar drasticamente para cada criança (ex: um filho estuda de manhã, outro à tarde).

O sistema precisava permitir que os responsáveis pudessem:
1.  **Agir rapidamente**, definindo uma regra única para várias crianças de uma só vez.
2.  **Ter flexibilidade**, ajustando o agendamento para as necessidades individuais de cada criança sem criar missões duplicadas no catálogo.

## A Solução: O Modelo Híbrido

A solução implementada é um sistema híbrido que separa o **"o quê"** (o modelo da missão) do **"quando e para quem"** (o agendamento), mas de uma forma que o segundo pode *herdar* as propriedades do primeiro.

### 1. Catálogo de Missões (O Modelo Padrão)

-   A tela de "Criar/Editar Missão" funciona como uma biblioteca de **modelos de missão**.
-   Cada modelo contém não apenas o título, descrição e recompensas, mas também um **agendamento padrão** (ex: "Semanalmente, toda Segunda, Quarta e Sexta, às 16h").
-   Este agendamento padrão serve como ponto de partida rápido. Se todas as crianças seguem a mesma regra, o trabalho do responsável termina aqui.

### 2. A Janela de Atribuição (Onde a Magia Acontece)

Quando um responsável decide atribuir uma missão do catálogo, ele entra na **Janela de Atribuição**, que é o coração desta funcionalidade.

-   **Herança Automática:** Ao selecionar uma ou mais crianças, todas elas herdam automaticamente o agendamento padrão definido no modelo da missão. Isso é exibido claramente ao lado do nome de cada criança.

-   **Personalização Individual:** Ao lado de cada criança na lista, há um botão **"Personalizar"**. Este é o ponto de flexibilidade. Ao clicar nele:
    -   Uma nova janela de agendamento se abre, permitindo que o responsável defina regras de data e recorrência **totalmente novas e exclusivas para aquela criança**.
    -   Após salvar a personalização, a janela principal é atualizada, mostrando que aquela criança agora tem um "Agendamento Personalizado".

### 3. Como Funciona por Trás dos Panos

-   Quando a atribuição é confirmada, o sistema não cria apenas um link para o modelo. Ele cria um documento de **`MissionInstance`** (Instância da Missão) para cada criança selecionada.
-   Cada `MissionInstance` é um **documento independente e autossuficiente**. Ele copia todas as informações do modelo (título, recompensas) e, crucialmente, armazena as **suas próprias regras de agendamento**.
-   Se a criança usou o agendamento padrão, a `MissionInstance` dela terá uma cópia das regras do modelo.
-   Se a criança teve o agendamento personalizado, a `MissionInstance` dela terá as regras que foram definidas individualmente.

### Benefícios Deste Modelo

-   **Eficiência:** Para tarefas com a mesma regra para todos, o processo é extremamente rápido: selecionar a missão, selecionar as crianças e confirmar.
-   **Flexibilidade Total:** Permite lidar com as exceções (horários diferentes, dias diferentes) sem poluir o catálogo principal com missões duplicadas como "Dever de casa - João" e "Dever de casa - Maria".
-   **Clareza:** O responsável sempre vê qual agendamento está sendo aplicado para cada criança antes de confirmar.
-   **Manutenção Simples:** A edição de uma `MissionInstance` na agenda afeta apenas aquela instância, não o modelo original ou as instâncias de outras crianças.
