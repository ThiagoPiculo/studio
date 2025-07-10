export const boyColors = [
  '#3357FF', // Azul Royal
  '#33D4FF', // Ciano Céu
  '#3498DB', // Azul Celeste
  '#2980B9', // Azul Belize
  '#1ABC9C', // Turquesa
  '#16A085', // Verde Mar
  '#2ECC71', // Verde Esmeralda
  '#27AE60', // Verde Nepal
  '#FFC300', // Amarelo Ouro
  '#F1C40F', // Amarelo Girassol
  '#FF5733', // Laranja Avermelhado
  '#E67E22', // Laranja Cenoura
] as const;

export const girlColors = [
  '#FF33F6', // Rosa Choque
  '#FF336E', // Vermelho Melancia
  '#E74C3C', // Vermelho Alizarina
  '#C0392B', // Vermelho Romã
  '#8D33FF', // Roxo Elétrico
  '#9B59B6', // Roxo Ametista
  '#8E44AD', // Roxo Wisteria
  '#F9A8D4', // Rosa Claro
  '#FDBA74', // Laranja Claro
  '#FCD34D', // Amarelo Claro
  '#A7F3D0', // Verde Menta
  '#C4B5FD', // Lilás
] as const;

export const heroColors = [...boyColors, ...girlColors] as const;

export type HeroColor = (typeof heroColors)[number];
