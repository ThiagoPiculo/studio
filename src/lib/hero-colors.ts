export const heroColors = [
  '#FF5733', // Laranja Avermelhado
  '#FFC300', // Amarelo Ouro
  '#33FF57', // Verde Limão
  '#33D4FF', // Ciano Céu
  '#3357FF', // Azul Royal
  '#8D33FF', // Roxo Elétrico
  '#FF33F6', // Rosa Choque
  '#FF336E', // Vermelho Melancia
  '#2ECC71', // Verde Esmeralda
  '#3498DB', // Azul Celeste
  '#9B59B6', // Roxo Ametista
  '#F1C40F', // Amarelo Girassol
  '#E67E22', // Laranja Cenoura
  '#E74C3C', // Vermelho Alizarina
  '#1ABC9C', // Turquesa
  '#2980B9', // Azul Belize
  '#8E44AD', // Roxo Wisteria
  '#F39C12', // Laranja
  '#D35400', // Laranja Abóbora
  '#C0392B', // Vermelho Romã
  '#16A085', // Verde Mar
  '#27AE60', // Verde Nepal
  '#34495E', // Azul Wet Asphalt
  '#7F8C8D', // Cinza Prateado
] as const;

export type HeroColor = (typeof heroColors)[number];
