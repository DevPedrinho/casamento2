/**
 * Leitor de CSV sem dependência.
 *
 * A biblioteca usual de XLSX só existe no npm em versão com vulnerabilidades
 * altas conhecidas, e o assistente lê arquivo que o usuário escolhe — não vale
 * o risco. CSV cobre o caso (é "Salvar como" no Excel e no Google Sheets) e
 * cabe em algumas dezenas de linhas auditáveis.
 */

export type Planilha = {
  cabecalho: string[];
  linhas: string[][];
};

/** Detecta o separador olhando a primeira linha: vírgula ou ponto e vírgula. */
function detectarSeparador(texto: string): string {
  const primeira = texto.slice(0, texto.indexOf("\n") + 1 || texto.length);
  const virgulas = (primeira.match(/,/g) ?? []).length;
  const pontos = (primeira.match(/;/g) ?? []).length;
  const tabs = (primeira.match(/\t/g) ?? []).length;
  if (tabs > virgulas && tabs > pontos) return "\t";
  return pontos > virgulas ? ";" : ",";
}

/**
 * Percorre caractere a caractere para respeitar aspas: um campo entre aspas
 * pode conter o separador e quebras de linha, e "" é uma aspa literal.
 */
export function lerCsv(texto: string): Planilha {
  // Remove o BOM que o Excel costuma escrever.
  const conteudo = texto.replace(/^﻿/, "");
  const sep = detectarSeparador(conteudo);

  const linhas: string[][] = [];
  let campo = "";
  let linha: string[] = [];
  let dentroDeAspas = false;

  for (let i = 0; i < conteudo.length; i++) {
    const c = conteudo[i];

    if (dentroDeAspas) {
      if (c === '"') {
        if (conteudo[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          dentroDeAspas = false;
        }
      } else {
        campo += c;
      }
      continue;
    }

    if (c === '"') {
      dentroDeAspas = true;
    } else if (c === sep) {
      linha.push(campo.trim());
      campo = "";
    } else if (c === "\n") {
      linha.push(campo.trim());
      linhas.push(linha);
      linha = [];
      campo = "";
    } else if (c !== "\r") {
      campo += c;
    }
  }

  // Último campo, quando o arquivo não termina em quebra de linha.
  if (campo || linha.length > 0) {
    linha.push(campo.trim());
    linhas.push(linha);
  }

  const naoVazias = linhas.filter((l) => l.some((c) => c !== ""));
  if (naoVazias.length === 0) return { cabecalho: [], linhas: [] };

  const [cabecalho, ...resto] = naoVazias;
  return { cabecalho, linhas: resto };
}

/** Normaliza um nome para comparação: sem acento, minúsculo, espaço único. */
export function chaveDeNome(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
