
/**
 * @fileoverview Biblioteca centralizada de frases de incentivo e comemoração.
 * Este arquivo organiza frases motivacionais em categorias para serem usadas
 * em diferentes contextos do aplicativo, como na conclusão de missões,
 * resgate de recompensas ou para dar um empurrãozinho extra.
 */

export const motivationalPhrases = {
  // Frases para quando uma missão é concluída com sucesso
  missionComplete: [
    "Missão cumprida, herói! Você é incrível! ✨",
    "Uau! Mais uma missão para a sua lista de vitórias! 🏆",
    "Você conseguiu! Cada missão te deixa mais forte. 💪",
    "Parabéns! Sua dedicação é seu maior superpoder. 🚀",
    "Mais um passo na sua jornada heroica! Continue assim. 🌟",
    "Isso! Tarefa concluída com sucesso. ✅",
    "Excelente trabalho! Sua responsabilidade é inspiradora. 🏅",
    "Você é uma estrela! Missão completa! ⭐",
    "Que orgulho! Você mostrou a força de um verdadeiro herói. 🛡️",
    "Booya! Mais uma missão derrotada! 🎉",
  ],

  // Frases para incentivar quando as coisas estão difíceis
  encouragement: [
    "Vamos lá, herói! Você é mais forte do que qualquer desafio. 💪",
    "Eu acredito em você! Respire fundo e tente mais uma vez. 😊",
    "Até os maiores heróis precisam de uma pausa. Descanse e volte com tudo! 🚀",
    "Não desista! Cada tentativa é um passo mais perto da vitória. 🌟",
    "Um pequeno passo de cada vez constrói uma grande jornada. Você consegue! 👣",
    "Sua coragem é maior que qualquer obstáculo. Continue em frente! 🛡️",
  ],

  // Frases para quando uma recompensa é resgatada
  rewardRedeemed: [
    "Parabéns pela sua conquista! Aproveite muito seu tesouro. 🎁",
    "Todo seu esforço valeu a pena! Curta sua recompensa. 🎉",
    "Você mereceu! Essa recompensa é o fruto da sua dedicação. 🌟",
    "É hora de celebrar! Aproveite seu prêmio, herói. 🥳",
    "Que demais! Você usou suas estrelas com sabedoria. ✨",
  ],

  // Frases de boas-vindas para o painel da criança
  welcome: [
    "Olá, herói! Qual aventura vamos encarar hoje? 🚀",
    "Que bom te ver! Suas missões de hoje estão te esperando. 💪",
    "Pronto para mais um dia de conquistas, {childName}? 🌟",
    "A jornada do herói continua! Vamos lá, {childName}! ✨",
  ],

  // Frases para quando a criança sobe de nível
  levelUp: [
    "UAU! Você subiu para o Nível {level}! Seu poder está aumentando! 🚀",
    "Parabéns, {childName}! Você alcançou o Nível {level}! Continue brilhando. ✨",
    "Incrível! Novo nível desbloqueado: Nível {level}! Você está imparável. 🏆",
  ],

  // Frases para quando uma nova medalha é conquistada
  newBadge: [
    "Conquista desbloqueada! Você ganhou a medalha '{badgeName}'! 🏅",
    "Fantástico! Uma nova medalha para sua coleção: '{badgeName}'. 🎖️",
    "Seu mural de herói ficou ainda mais brilhante com a medalha '{badgeName}'! ✨",
  ],
};

/**
 * Retorna uma frase aleatória de uma categoria específica.
 * @param category A categoria da frase (ex: 'missionComplete').
 * @param substitutions Um objeto com valores para substituir placeholders (ex: {childName: 'Leo'}).
 * @returns Uma frase aleatória da categoria, com as substituições aplicadas.
 */
export function getRandomPhrase(
  category: keyof typeof motivationalPhrases,
  substitutions: Record<string, string | number> = {}
): string {
  const phrases = motivationalPhrases[category];
  if (!phrases || phrases.length === 0) {
    return "Continue assim!";
  }
  let phrase = phrases[Math.floor(Math.random() * phrases.length)];

  // Substitui placeholders como {childName} ou {level}
  for (const key in substitutions) {
    phrase = phrase.replace(`{${key}}`, String(substitutions[key]));
  }

  return phrase;
}
