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

  const api = { searchScore_, searchFilter_ };

  // No navegador: vira global, como era antes. No Node: vira export.
  Object.assign(global, api);
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
