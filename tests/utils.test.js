/* Testes das funções puras do app (js/utils.js).
 *
 * Rodar com:  npm test        (ou: node --test)
 *
 * Usa o runner embutido no Node (node:test) — de propósito, sem instalar nada.
 * Assim o projeto continua sem node_modules, o que importa aqui porque a pasta
 * fica dentro do Google Drive e a sincronização não lida bem com milhares de
 * arquivos pequenos.
 */
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');

const { natCmp, normCod, fmtDate } = require('../js/utils.js');

describe('natCmp — ordenação "natural" de textos', () => {
  test('coloca A10 depois de A9 (a ordem alfabética faria o contrário)', () => {
    assert.ok(natCmp('A10', 'A9') > 0);
    assert.ok(natCmp('A9', 'A10') < 0);
  });

  test('ignora maiúsculas/minúsculas e acentos', () => {
    assert.equal(natCmp('armario', 'ARMÁRIO'), 0);
  });

  test('trata nulo, indefinido e vazio como string vazia', () => {
    assert.equal(natCmp(null, ''), 0);
    assert.equal(natCmp(undefined, ''), 0);
    assert.equal(natCmp(null, undefined), 0);
  });

  test('serve como comparador de sort, que é o uso real no app', () => {
    const locais = ['Sala 2', 'Sala 10', 'Sala 1'];
    assert.deepEqual([...locais].sort(natCmp), ['Sala 1', 'Sala 2', 'Sala 10']);
  });
});

describe('normCod — normalização de código de item', () => {
  test('ignora zeros à esquerda, que é o motivo da função existir', () => {
    assert.equal(normCod('007'), '7');
    assert.equal(normCod('0000123'), '123');
  });

  test('preserva zeros que não estão à esquerda', () => {
    assert.equal(normCod('1007'), '1007');
    assert.equal(normCod('100'), '100');
  });

  test('remove espaços em volta', () => {
    assert.equal(normCod('  007  '), '7');
    assert.equal(normCod('\t42\n'), '42');
  });

  test('aceita número, não só texto', () => {
    assert.equal(normCod(7), '7');
  });

  test('trata nulo, indefinido e vazio como string vazia', () => {
    assert.equal(normCod(null), '');
    assert.equal(normCod(undefined), '');
    assert.equal(normCod(''), '');
  });

  // ATENÇÃO: comportamento atual, provavelmente indesejado — ver CONCERNS.md.
  // Um código composto só de zeros vira string vazia, e aí passa a "casar" com
  // código vazio em findItemByCodigo(). O teste registra o que o código faz
  // hoje; mudar isso é decisão de produto, não de refatoração.
  test('código só de zeros vira vazio (comportamento atual, ver ressalva)', () => {
    assert.equal(normCod('0'), '');
    assert.equal(normCod('000'), '');
  });
});

describe('fmtDate — "aaaa-mm-dd" para "dd/mm/aaaa"', () => {
  test('converte a data no formato que o app recebe da planilha', () => {
    assert.equal(fmtDate('2026-09-26'), '26/09/2026');
    assert.equal(fmtDate('2026-01-01'), '01/01/2026');
  });

  test('devolve vazio para nulo, indefinido e vazio', () => {
    assert.equal(fmtDate(''), '');
    assert.equal(fmtDate(null), '');
    assert.equal(fmtDate(undefined), '');
  });

  test('devolve o valor original quando não tem as três partes', () => {
    assert.equal(fmtDate('2026-09'), '2026-09');
    assert.equal(fmtDate('sem data'), 'sem data');
  });

  // ATENÇÃO: a função só reposiciona os pedaços, não valida nada.
  test('não valida a data: mês 13 e dia 45 passam batido (comportamento atual)', () => {
    assert.equal(fmtDate('2026-13-45'), '45/13/2026');
  });

  // ATENÇÃO: se a planilha devolver a data como número em vez de texto, quebra.
  // Registrado para que a falha apareça aqui e não na tela do usuário.
  test('estoura se receber número em vez de texto (comportamento atual)', () => {
    assert.throws(() => fmtDate(20260926), TypeError);
  });
});
