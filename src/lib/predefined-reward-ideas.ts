
import type { RewardCategory } from '@/lib/types';
import { Crown, PartyPopper, ShoppingBag, GraduationCap, HeartHandshake, type LucideIcon } from 'lucide-react';

export interface PredefinedRewardIdea {
  title: string;
  description?: string;
  userCategory: string; // A categoria principal do usuário (ex: "Privilégios")
  userSubCategory?: string; // A subcategoria do usuário (ex: "Controle")
  suggestedAppCategory: RewardCategory; // A categoria correspondente do app (USA OS NOVOS IDs)
  isMaterialSuggestion?: boolean; // Se a sugestão tende a ser material
  // suggestedStarsCost?: number; // Opcional: custo sugerido
}

export interface PredefinedRewardGroup {
  userCategory: string;
  description: string; // Descrição para o grupo principal
  icon: LucideIcon;
  items: PredefinedRewardIdea[];
}

export const predefinedRewardGroups: PredefinedRewardGroup[] = [
  {
    userCategory: "Privilégios",
    description: "Recompensas que dão à criança um senso de autonomia, controle e confiança, ensinando sobre tomada de decisão e responsabilidade de uma forma leve e divertida.",
    icon: Crown,
    items: [
      // Controle
      {
        title: "Escolher o filme da família",
        description: "A criança escolhe o filme que a família assistirá na noite de cinema.",
        userCategory: "Privilégios",
        userSubCategory: "Controle",
        suggestedAppCategory: "privileges",
        isMaterialSuggestion: false,
      },
      {
        title: "DJ Oficial da Viagem",
        description: "Escolher a playlist de músicas durante uma viagem de carro.",
        userCategory: "Privilégios",
        userSubCategory: "Controle",
        suggestedAppCategory: "privileges",
        isMaterialSuggestion: false,
      },
      {
        title: "Chef da Noite Auxiliar",
        description: "Ajudar a escolher o cardápio do jantar (entre opções pré-definidas).",
        userCategory: "Privilégios",
        userSubCategory: "Controle",
        suggestedAppCategory: "privileges",
        isMaterialSuggestion: false,
      },
      {
        title: "Decidir a Atividade do Fim de Semana",
        description: "Decidir qual jogo de tabuleiro ou atividade em família será feito.",
        userCategory: "Privilégios",
        userSubCategory: "Controle",
        suggestedAppCategory: "privileges",
        isMaterialSuggestion: false,
      },
      {
        title: "Fotógrafo da Família por um Dia",
        description: "Usar o celular de um dos pais (com supervisão) para registrar momentos.",
        userCategory: "Privilégios",
        userSubCategory: "Controle",
        suggestedAppCategory: "privileges",
        isMaterialSuggestion: false,
      },
      {
        title: "Planejar Café da Manhã Especial",
        description: "Planejar o menu do café da manhã especial de sábado.",
        userCategory: "Privilégios",
        userSubCategory: "Controle",
        suggestedAppCategory: "privileges",
        isMaterialSuggestion: false,
      },
      // Flexibilidade
      {
        title: "30 Minutos Extras de Tela",
        description: "Tempo extra de videogame, tablet ou TV.",
        userCategory: "Privilégios",
        userSubCategory: "Flexibilidade",
        suggestedAppCategory: "privileges", // Pode ser 'experiences' ou 'privileges' dependendo da abordagem. Mantendo privileges por enquanto.
        isMaterialSuggestion: false,
      },
      {
        title: "Dormir 30 Minutos Mais Tarde",
        description: "Em um dia de fim de semana, dormir um pouco depois do horário habitual.",
        userCategory: "Privilégios",
        userSubCategory: "Flexibilidade",
        suggestedAppCategory: "privileges",
        isMaterialSuggestion: false,
      },
      {
        title: "Vale-Pular-Tarefa",
        description: "Direito a pular uma tarefa doméstica de baixo impacto por um dia (deve ser usado com sabedoria!).",
        userCategory: "Privilégios",
        userSubCategory: "Flexibilidade",
        suggestedAppCategory: "privileges",
        isMaterialSuggestion: false,
      },
      {
        title: "Ter 15 minutos livres extras",
        description: "Ter 15 minutos de 'tempo livre' extra antes de começar a lição de casa.",
        userCategory: "Privilégios",
        userSubCategory: "Flexibilidade",
        suggestedAppCategory: "privileges",
        isMaterialSuggestion: false,
      },
      {
        title: "Escolher usar uma roupa especial",
        description: "Escolher usar uma roupa 'especial' (fantasia, capa de herói) em um dia normal em casa.",
        userCategory: "Privilégios",
        userSubCategory: "Flexibilidade",
        suggestedAppCategory: "privileges",
        isMaterialSuggestion: false,
      },
      // Exclusividade
      {
        title: "Encontro exclusivo 1-para-1",
        description: "Um 'encontro exclusivo' com o pai ou a mãe para uma atividade 1-para-1.",
        userCategory: "Privilégios",
        userSubCategory: "Exclusividade",
        suggestedAppCategory: "experiences", // Mais alinhado com experiências
        isMaterialSuggestion: false,
      },
      {
        title: "O Dia do Sim (com Regras)",
        description: "Dentro de regras pré-definidas, os pais se comprometem a dizer 'sim' aos pedidos da criança por um período.",
        userCategory: "Privilégios",
        userSubCategory: "Exclusividade",
        suggestedAppCategory: "privileges",
        isMaterialSuggestion: false,
      },
      {
        title: "Direito a contar a primeira história",
        description: "Direito a contar a primeira história na hora de dormir.",
        userCategory: "Privilégios",
        userSubCategory: "Exclusividade",
        suggestedAppCategory: "privileges",
        isMaterialSuggestion: false,
      },
      {
        title: "Café da manhã ou lanche especial na cama",
        description: "Ter um café da manhã ou lanche especial servido na cama.",
        userCategory: "Privilégios",
        userSubCategory: "Exclusividade",
        suggestedAppCategory: "experiences", // Alinhado com experiências
        isMaterialSuggestion: false,
      },
      {
        title: "Ser o primeiro a experimentar algo novo",
        description: "Ser o primeiro a experimentar algo novo que a família comprou.",
        userCategory: "Privilégios",
        userSubCategory: "Exclusividade",
        suggestedAppCategory: "privileges",
        isMaterialSuggestion: false,
      },
    ],
  },
  {
    userCategory: "Experiências",
    description: "O foco aqui é criar memórias afetivas e fortalecer laços, que são as recompensas mais duradouras e alinhadas ao propósito do MiniHeróis de conectar a família.",
    icon: PartyPopper,
    items: [
      // Em Família
      {
        title: "Piquenique temático",
        description: "Piquenique no parque ou na praia com um tema divertido.",
        userCategory: "Experiências",
        userSubCategory: "Em Família",
        suggestedAppCategory: "experiences",
        isMaterialSuggestion: false,
      },
      {
        title: "Acampamento na sala",
        description: "Acampamento na sala de estar, com cabana de lençóis e lanternas.",
        userCategory: "Experiências",
        userSubCategory: "Em Família",
        suggestedAppCategory: "experiences",
        isMaterialSuggestion: false,
      },
      {
        title: "Caça ao tesouro em casa",
        description: "Caça ao tesouro com pistas e um pequeno prêmio no final.",
        userCategory: "Experiências",
        userSubCategory: "Em Família",
        suggestedAppCategory: "experiences",
        isMaterialSuggestion: false,
      },
      {
        title: "Noite de culinária divertida",
        description: "Fazer pizzas, cookies ou um bolo divertido em família.",
        userCategory: "Experiências",
        userSubCategory: "Em Família",
        suggestedAppCategory: "experiences",
        isMaterialSuggestion: false,
      },
      {
        title: "Sessão de fotos temáticas",
        description: "Sessão de fotos em casa, com fantasias e cenários improvisados.",
        userCategory: "Experiências",
        userSubCategory: "Em Família",
        suggestedAppCategory: "experiences",
        isMaterialSuggestion: false,
      },
      {
        title: "Cápsula do tempo familiar",
        description: "Fazer uma 'cápsula do tempo' em família para ser aberta no futuro.",
        userCategory: "Experiências",
        userSubCategory: "Em Família",
        suggestedAppCategory: "experiences",
        isMaterialSuggestion: false,
      },
      {
        title: "Noite de Karaokê em família",
        description: "Noite de Karaokê com as músicas favoritas de todos.",
        userCategory: "Experiências",
        userSubCategory: "Em Família",
        suggestedAppCategory: "experiences",
        isMaterialSuggestion: false,
      },
      // Social
      {
        title: "Festa do pijama com amigos",
        description: "Convidar um ou dois amigos para uma festa do pijama.",
        userCategory: "Experiências",
        userSubCategory: "Social",
        suggestedAppCategory: "experiences",
        isMaterialSuggestion: false,
      },
      {
        title: "Levar amigo para passeio",
        description: "Direito de levar um amigo para um passeio em família (cinema, parque).",
        userCategory: "Experiências",
        userSubCategory: "Social",
        suggestedAppCategory: "experiences",
        isMaterialSuggestion: false,
      },
      {
        title: "Olimpíada no quintal",
        description: "Organizar uma pequena 'olimpíada' no quintal ou parque com os amigos.",
        userCategory: "Experiências",
        userSubCategory: "Social",
        suggestedAppCategory: "experiences",
        isMaterialSuggestion: false,
      },
      {
        title: "Chamada de vídeo estendida",
        description: "Uma chamada de vídeo mais longa com um primo ou amigo que mora longe.",
        userCategory: "Experiências",
        userSubCategory: "Social",
        suggestedAppCategory: "experiences",
        isMaterialSuggestion: false,
      },
      // Cultural
      {
        title: "Passeio cultural interativo",
        description: "Passeio a um museu interativo, zoológico ou planetário.",
        userCategory: "Experiências",
        userSubCategory: "Cultural",
        suggestedAppCategory: "experiences",
        isMaterialSuggestion: false,
      },
      {
        title: "Estreia no cinema",
        description: "Ir ao cinema para assistir a um filme de estreia.",
        userCategory: "Experiências",
        userSubCategory: "Cultural",
        suggestedAppCategory: "experiences",
        isMaterialSuggestion: false,
      },
      {
        title: "Visita a jardim botânico ou feira",
        description: "Visitar um jardim botânico ou uma feira de ciências.",
        userCategory: "Experiências",
        userSubCategory: "Cultural",
        suggestedAppCategory: "experiences",
        isMaterialSuggestion: false,
      },
      {
        title: "Peça de teatro infantil",
        description: "Ir a uma peça de teatro infantil.",
        userCategory: "Experiências",
        userSubCategory: "Cultural",
        suggestedAppCategory: "experiences",
        isMaterialSuggestion: false,
      },
    ],
  },
  {
    userCategory: "Itens Materiais (com Ressalvas)",
    description: "Recompensas tangíveis, mas sempre conectadas a um propósito, como um hobby ou o desenvolvimento de uma habilidade, para evitar o consumismo puro. Lembre-se de evitar condicionar itens essenciais.",
    icon: ShoppingBag,
    items: [
      // Relacionados a Hobbies
      {
        title: "Livro novo escolhido",
        description: "Um livro novo escolhido pela criança na livraria.",
        userCategory: "Itens Materiais",
        userSubCategory: "Relacionados a Hobbies",
        suggestedAppCategory: "material_items",
        isMaterialSuggestion: true,
      },
      {
        title: "Kit de arte específico",
        description: "Um kit de arte ou material específico (aquarelas, argila, canetas especiais).",
        userCategory: "Itens Materiais",
        userSubCategory: "Relacionados a Hobbies",
        suggestedAppCategory: "material_items",
        isMaterialSuggestion: true,
      },
      {
        title: "Acessório para esporte",
        description: "Um acessório para um esporte que pratica (meião de futebol, munhequeira).",
        userCategory: "Itens Materiais",
        userSubCategory: "Relacionados a Hobbies",
        suggestedAppCategory: "material_items",
        isMaterialSuggestion: true,
      },
      {
        title: "Partitura nova",
        description: "Partitura de uma música nova para o instrumento que estuda.",
        userCategory: "Itens Materiais",
        userSubCategory: "Relacionados a Hobbies",
        suggestedAppCategory: "material_items",
        isMaterialSuggestion: true,
      },
      {
        title: "Adesivos decorativos",
        description: "Adesivos novos para decorar o skate, bicicleta ou caderno.",
        userCategory: "Itens Materiais",
        userSubCategory: "Relacionados a Hobbies",
        suggestedAppCategory: "material_items",
        isMaterialSuggestion: true,
      },
      // Necessidades Planejadas
      {
        title: "Escolher modelo/cor de item planejado",
        description: "O direito de escolher o modelo/cor de um tênis ou roupa que já seria comprado.",
        userCategory: "Itens Materiais",
        userSubCategory: "Necessidades Planejadas",
        suggestedAppCategory: "material_items",
        isMaterialSuggestion: true,
      },
      {
        title: "Escolher estampa de material escolar",
        description: "Escolher a estampa da mochila ou do estojo para o próximo ano letivo.",
        userCategory: "Itens Materiais",
        userSubCategory: "Necessidades Planejadas",
        suggestedAppCategory: "material_items",
        isMaterialSuggestion: true,
      },
      // Pequenos Mimos
      {
        title: "Pacote de figurinhas",
        description: "Pacote de figurinhas para um álbum.",
        userCategory: "Itens Materiais",
        userSubCategory: "Pequenos Mimos",
        suggestedAppCategory: "material_items",
        isMaterialSuggestion: true,
      },
      {
        title: "Gibi ou revista em quadrinhos",
        description: "Um gibi ou revista em quadrinhos.",
        userCategory: "Itens Materiais",
        userSubCategory: "Pequenos Mimos",
        suggestedAppCategory: "material_items",
        isMaterialSuggestion: true,
      },
      {
        title: "Chaveiro de personagem",
        description: "Um chaveiro do seu personagem favorito.",
        userCategory: "Itens Materiais",
        userSubCategory: "Pequenos Mimos",
        suggestedAppCategory: "material_items",
        isMaterialSuggestion: true,
      },
      {
        title: "Massinha de modelar nova cor",
        description: "Massinha de modelar de uma cor diferente.",
        userCategory: "Itens Materiais",
        userSubCategory: "Pequenos Mimos",
        suggestedAppCategory: "material_items",
        isMaterialSuggestion: true,
      },
    ],
  },
  {
    userCategory: "Desenvolvimento Pessoal",
    description: "Recompensas que incentivam diretamente o aprendizado e a exploração de novos talentos, alinhadas à Teoria das Múltiplas Inteligências.",
    icon: GraduationCap,
    items: [
      // Aprendizado
      {
        title: "Aula experimental",
        description: "Uma aula experimental (música, esporte, programação, artes marciais).",
        userCategory: "Desenvolvimento Pessoal",
        userSubCategory: "Aprendizado",
        suggestedAppCategory: "personal_development",
        isMaterialSuggestion: false,
      },
      {
        title: "Kit de ciências",
        description: "Um kit de ciências (química, vulcões, fósseis).",
        userCategory: "Desenvolvimento Pessoal",
        userSubCategory: "Aprendizado",
        suggestedAppCategory: "personal_development", // Pode ser 'material_items' se o foco for o item, ou 'personal_development' se o foco for a atividade de aprendizado.
        isMaterialSuggestion: true,
      },
      {
        title: "Curso online rápido",
        description: "Inscrição em um curso online rápido sobre um tema de interesse.",
        userCategory: "Desenvolvimento Pessoal",
        userSubCategory: "Aprendizado",
        suggestedAppCategory: "personal_development",
        isMaterialSuggestion: false,
      },
      {
        title: "App ou jogo educativo premium",
        description: "Um aplicativo ou jogo educativo premium.",
        userCategory: "Desenvolvimento Pessoal",
        userSubCategory: "Aprendizado",
        suggestedAppCategory: "personal_development",
        isMaterialSuggestion: false, // O app em si é digital.
      },
      {
        title: "Assinatura de revista infantil educativa",
        description: "Assinatura de uma revista infantil educativa.",
        userCategory: "Desenvolvimento Pessoal",
        userSubCategory: "Aprendizado",
        suggestedAppCategory: "personal_development", // Pode ser 'material_items' (revista física) ou 'personal_development'.
        isMaterialSuggestion: true,
      },
      // Criatividade
      {
        title: "Kit Faça Você Mesmo (DIY)",
        description: "Kit de 'faça você mesmo' (construção de robô, criação de bijuterias).",
        userCategory: "Desenvolvimento Pessoal",
        userSubCategory: "Criatividade",
        suggestedAppCategory: "personal_development",
        isMaterialSuggestion: true,
      },
      {
        title: "Diário ou caderno de desenho de qualidade",
        description: "Um diário ou caderno de desenho de alta qualidade.",
        userCategory: "Desenvolvimento Pessoal",
        userSubCategory: "Criatividade",
        suggestedAppCategory: "material_items",
        isMaterialSuggestion: true,
      },
      {
        title: "Ingressos para oficina criativa",
        description: "Ingressos para uma oficina de arte ou teatro.",
        userCategory: "Desenvolvimento Pessoal",
        userSubCategory: "Criatividade",
        suggestedAppCategory: "experiences", // Alinhado com experiências.
        isMaterialSuggestion: false,
      },
      {
        title: "Microfone de brinquedo",
        description: "Um microfone de brinquedo para cantar e gravar a própria voz.",
        userCategory: "Desenvolvimento Pessoal",
        userSubCategory: "Criatividade",
        suggestedAppCategory: "material_items",
        isMaterialSuggestion: true,
      },
      // Saúde e Bem-estar
      {
        title: "Dia em parque de aventuras",
        description: "Um dia em um parque de trampolins ou de arvorismo.",
        userCategory: "Desenvolvimento Pessoal",
        userSubCategory: "Saúde e Bem-estar",
        suggestedAppCategory: "experiences",
        isMaterialSuggestion: false,
      },
      {
        title: "Item para atividade física",
        description: "Um item que incentive atividade física (corda, bambolê, patins).",
        userCategory: "Desenvolvimento Pessoal",
        userSubCategory: "Saúde e Bem-estar",
        suggestedAppCategory: "material_items",
        isMaterialSuggestion: true,
      },
      {
        title: "Dia de spa em casa",
        description: "Um 'dia de spa' em casa, com massagem nos pés e cuidados divertidos.",
        userCategory: "Desenvolvimento Pessoal",
        userSubCategory: "Saúde e Bem-estar",
        suggestedAppCategory: "experiences",
        isMaterialSuggestion: false,
      },
    ],
  },
  {
    userCategory: "Impacto e Generosidade",
    description: "Recompensas que ensinam sobre empatia, cidadania e o prazer de ajudar, transformando o Mini Herói em um herói também para o mundo.",
    icon: HeartHandshake,
    items: [
      // Doação
      {
        title: "Doar brinquedo/livro novo",
        description: "Escolher um brinquedo ou livro novo para ser doado em seu nome.",
        userCategory: "Impacto e Generosidade",
        userSubCategory: "Doação",
        suggestedAppCategory: "impact_generosity",
        isMaterialSuggestion: false, 
      },
      {
        title: "Doação familiar para ONG",
        description: "A família faz uma doação para uma ONG escolhida pelo Mini Herói.",
        userCategory: "Impacto e Generosidade",
        userSubCategory: "Doação",
        suggestedAppCategory: "impact_generosity",
        isMaterialSuggestion: false,
      },
      {
        title: "Apadrinhar uma árvore",
        description: "A família 'apadrinha' uma árvore em um projeto de reflorestamento.",
        userCategory: "Impacto e Generosidade",
        userSubCategory: "Doação",
        suggestedAppCategory: "impact_generosity",
        isMaterialSuggestion: false,
      },
      // Voluntariado
      {
        title: "Ajudar em abrigo de animais",
        description: "Passar uma tarde em família ajudando em um abrigo de animais.",
        userCategory: "Impacto e Generosidade",
        userSubCategory: "Voluntariado",
        suggestedAppCategory: "impact_generosity", // Pode ser 'experiences' também
        isMaterialSuggestion: false,
      },
      {
        title: "Mutirão de limpeza",
        description: "Participar de um mutirão de limpeza de uma praça ou praia local.",
        userCategory: "Impacto e Generosidade",
        userSubCategory: "Voluntariado",
        suggestedAppCategory: "impact_generosity", // Pode ser 'experiences' também
        isMaterialSuggestion: false,
      },
      {
        title: "Ajudar em campanha de agasalho",
        description: "Ajudar a organizar os donativos em uma campanha de agasalho.",
        userCategory: "Impacto e Generosidade",
        userSubCategory: "Voluntariado",
        suggestedAppCategory: "impact_generosity",
        isMaterialSuggestion: false,
      },
      // Atos de Gentileza
      {
        title: "Preparar lanches para doar",
        description: "Preparar e entregar lanches para pessoas em situação de rua.",
        userCategory: "Impacto e Generosidade",
        userSubCategory: "Atos de Gentileza",
        suggestedAppCategory: "impact_generosity",
        isMaterialSuggestion: false,
      },
      {
        title: "Desenho/cartão para vizinho",
        description: "Fazer um desenho ou cartão e entregar a um vizinho idoso.",
        userCategory: "Impacto e Generosidade",
        userSubCategory: "Atos de Gentileza",
        suggestedAppCategory: "impact_generosity",
        isMaterialSuggestion: false,
      },
      {
        title: "Comprar flores para presentear",
        description: "Comprar flores com os pais para dar de presente surpresa a um parente.",
        userCategory: "Impacto e Generosidade",
        userSubCategory: "Atos de Gentileza",
        suggestedAppCategory: "impact_generosity", // Pode ser 'material_items' (as flores) ou 'impact_generosity' pelo ato.
        isMaterialSuggestion: true, // As flores são materiais
      },
    ],
  },
];
