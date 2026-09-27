/* Busca de itens — Almoxarifado UDESC
 *
 * Pontuação de relevância e filtragem. Só funções PURAS: recebem os itens por
 * parâmetro e devolvem número ou lista. Não tocam a tela, o IndexedDB nem a rede.
 * Ficavam soltas dentro do <script> do index.html; saíram para cá para que o
 * runner do Node consiga carregá-las (ver tests/search.test.js).
 *
 * DEPENDE de js/utils.js (funções norm e escapeRe_), que precisa ser carregado
 * ANTES deste arquivo. No navegador isso é a ordem das tags <script> no
 * index.html; no Node, o teste faz require('../js/utils.js') primeiro, o que
 * define as duas como globais — o mesmo que a tag <script> faz.
 *
 * ATENÇÃO: este arquivo é carregado como script comum (não é módulo ES), de
 * propósito — o index.html não tem build e o código dele chama estas funções
 * pelo nome global. O bloco do final expõe as mesmas funções para o Node.
 */
(function (global) {
  'use strict';

  // Nota de relevância de um item para a busca (q já normalizado; tokens = palavras da busca).
  // Devolve -1 se NÃO casa (alguma palavra não aparece em nenhum campo). Código e código de
  // barras são identificadores ÚNICOS, então casar neles DOMINA o ranking (vão pro topo).
  function searchScore_(it, q, tokens) {
    const desc = norm(it.descricao), cod = norm(it.codigo), bar = norm(it.codigoBarras), kw = norm(it.palavrasChave);
    const hay = desc + ' ' + cod + ' ' + bar + ' ' + kw;
    for (const t of tokens) { if (!hay.includes(t)) return -1; }    // E (AND): todas as palavras
    let s = 0;
    if (cod === q || bar === q) s += 10000;                         // match único / definitivo
    else if (cod.startsWith(q) || bar.startsWith(q)) s += 2000;     // digitou parte do código
    if (desc.startsWith(q)) s += 200;
    for (const t of tokens) {
      if (new RegExp('(^|[^a-z0-9])' + escapeRe_(t) + '([^a-z0-9]|$)').test(desc)) s += 20; // palavra inteira
      else if (desc.includes(t)) s += 5;                                                     // pedaço
      if (kw.includes(t)) s += 12;                                                           // palavra-chave
    }
    return s;
  }

  // Filtra + ordena uma lista por relevância (usado nas buscas de separação e saída avulsa).
  function searchFilter_(list, raw) {
    const q = norm(raw); if (!q) return list;
    const tokens = q.split(/\s+/).filter(Boolean);
    return list.map(it => ({ it, s: searchScore_(it, q, tokens) }))
      .filter(x => x.s >= 0).sort((a, b) => b.s - a.s).map(x => x.it);
  }

  /* ---------- Modo foto: a IA descreve, a busca procura ---------- */

  // Quantos candidatos a busca por foto mostra. Acima disso é ruído: o objetivo é
  // escolher entre poucos, não filtrar uma lista grande.
  const TETO_CANDIDATOS_FOTO = 12;

  // Nota de relevância quando as palavras vieram da IA, não do usuário.
  //
  // A DIFERENÇA em relação a searchScore_ é proposital e é o motivo desta função existir:
  // aqui NÃO se exige que todas as palavras casem. Quem digita escolhe as próprias palavras;
  // a IA escolhe as dela, e um único termo a mais que não esteja na planilha zeraria o
  // resultado na regra E. Ex.: a IA diz "caneta esferografica azul tampa plastico" e o item
  // é só "CANETA ESFEROGRAFICA AZUL" — searchScore_ devolve -1, esta devolve nota positiva.
  //
  // Pontua por QUANTAS palavras casaram e com que peso, reusando os mesmos pesos da busca
  // digitada. Item que não casa NENHUMA palavra sai do resultado (-1).
  //
  // O código é comparado com cada TERMO (e não com a consulta inteira, como em searchScore_)
  // porque a IA devolve uma lista de termos: se o OCR leu o código de barras da etiqueta, ele
  // chega como um termo no meio dos outros, e casar nele é definitivo.
  function photoScore_(it, tokens) {
    const desc = norm(it.descricao), cod = norm(it.codigo), bar = norm(it.codigoBarras), kw = norm(it.palavrasChave);
    let s = 0, casaram = 0;
    for (const t of tokens) {
      let ganho = 0;
      if (cod === t || bar === t) ganho += 10000;                                            // OCR leu o identificador
      if (new RegExp('(^|[^a-z0-9])' + escapeRe_(t) + '([^a-z0-9]|$)').test(desc)) ganho += 20; // palavra inteira
      else if (desc.includes(t)) ganho += 5;                                                  // pedaço
      if (kw.includes(t)) ganho += 12;                                                        // palavra-chave
      if (ganho > 0) { s += ganho; casaram++; }
    }
    return casaram === 0 ? -1 : s;
  }

  // Candidatos da busca por foto: filtra, ordena do mais provável ao menos e corta no teto.
  // O corte e a ordenação ficam AQUI, e não no render(), para poderem ser testados.
  //
  // Sem termos devolve lista VAZIA — de propósito diferente de searchFilter_, onde consulta
  // vazia significa "mostre tudo". Aqui significa que a IA não identificou nada, e mostrar o
  // inventário inteiro seria pior que mostrar nada.
  function searchFilterFoto_(list, raw) {
    const q = norm(raw);
    const tokens = q ? q.split(/\s+/).filter(Boolean) : [];
    if (!tokens.length) return [];
    return list.map(it => ({ it, s: photoScore_(it, tokens) }))
      .filter(x => x.s >= 0).sort((a, b) => b.s - a.s).slice(0, TETO_CANDIDATOS_FOTO).map(x => x.it);
  }

  const api = { searchScore_, searchFilter_, photoScore_, searchFilterFoto_ };

  // No navegador: vira global, como era antes. No Node: vira export.
  Object.assign(global, api);
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
