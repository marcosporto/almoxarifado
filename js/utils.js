/* Funções puras do app — Almoxarifado UDESC
 *
 * "Puras" = só recebem entrada e devolvem saída. Não tocam a tela, o IndexedDB
 * nem a rede. Por isso são as únicas que dá para testar fora do navegador.
 * Ficavam soltas dentro do <script> do index.html; saíram para cá para que o
 * Vitest consiga carregá-las (ver tests/utils.test.js).
 *
 * ATENÇÃO: este arquivo é carregado como script comum (não é módulo ES), de
 * propósito — o index.html não tem build e o código dele chama estas funções
 * pelo nome global. O bloco do final expõe as mesmas funções para o Node,
 * que é como o Vitest as enxerga.
 */
(function (global) {
  'use strict';

  // Compara textos do jeito que uma pessoa espera: "A10" vem depois de "A9".
  function natCmp(a, b) {
    return String(a || '').localeCompare(String(b || ''), 'pt', { numeric: true, sensitivity: 'base' });
  }

  // Normaliza código de item ignorando zeros à esquerda ("007" e "7" são o mesmo).
  function normCod(c) {
    return String(c == null ? '' : c).trim().replace(/^0+/, '');
  }

  // "aaaa-mm-dd" -> "dd/mm/aaaa". Se não tiver as três partes, devolve como veio.
  function fmtDate(iso) {
    if (!iso) return '';
    const p = iso.split('-');
    return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : iso;
  }

  // Date -> "aaaa-mm-dd" (formato que o <input type="date"> espera).
  function ymd(d) {
    const p = n => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  // Escapa texto para poder ir dentro do HTML sem virar marcacao.
  // IMPORTANTE: cobre os cinco caracteres que importam em conteudo de texto e em
  // atributos ENTRE ASPAS. Nao e suficiente para atributo sem aspas, para dentro de
  // <script>/<style>, nem para montar URL. Todo uso atual no index.html cai nos dois
  // casos cobertos (ver tests/utils.test.js).
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // Data/hora ISO -> "dd/mm/aaaa hh:mm", no fuso LOCAL de quem está olhando.
  // Se a string tiver fuso ("...Z"), o horário é convertido; se não tiver, é lido
  // como horário de parede. Entrada que o Date não entende volta como veio.
  function fmtDateTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return String(iso);
    const p = n => String(n).padStart(2, '0');
    return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  // "1.0 - PECA" -> "Unid.: PECA" (mostra só o nome da unidade de distribuição).
  // Pega o trecho DEPOIS do último hífen — ver a ressalva em tests/utils.test.js
  // sobre unidades cujo próprio nome contém hífen.
  function fmtUnidade(u) {
    if (!u) return '';
    const p = String(u).split('-');
    const nome = (p.length > 1 ? p[p.length - 1] : p[0]).trim();
    return nome ? 'Unid.: ' + nome : '';
  }

  const api = { natCmp, normCod, fmtDate, ymd, esc, fmtDateTime, fmtUnidade };

  // No navegador: vira global, como era antes. No Node/Vitest: vira export.
  Object.assign(global, api);
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
