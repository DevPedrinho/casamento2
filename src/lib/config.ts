/**
 * Dados do casamento em um único lugar — é aqui que os noivos ajustam
 * horário, endereço e textos sem precisar mexer nas páginas.
 */
export const CASAMENTO = {
  noiva: "Deysiane",
  noivo: "Pedro",
  lema: "Amor que acolhe",
  frase: "Um amor que cuida, se adapta e escolhe caminhar junto.",
  /** Data e hora da cerimônia no fuso de Brasília (UTC-3). */
  dataISO: "2027-05-22T16:00:00-03:00",
  dataExtenso: "22 de maio de 2027",
  dataCurta: "22 • 05 • 2027",
  horaCerimonia: "16h00",
  horaRecepcao: "18h00",
  local: {
    nome: "A definir",
    endereco: "Endereço a confirmar",
    cidade: "Brasil",
    mapsUrl: "",
  },
  trajes: "Esporte fino",
  contatoEmail: "",
  /**
   * Música da timeline. Coloque o arquivo em public/audio/ e aponte aqui.
   * Vazio = o player nem aparece, em vez de quebrar.
   */
  musica: {
    arquivo: "",
    titulo: "",
    artista: "",
  },
} as const;

/** Data do casamento como objeto Date, usada na contagem regressiva. */
export const DATA_CASAMENTO = new Date(CASAMENTO.dataISO);
