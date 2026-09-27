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

const { natCmp } = require('../js/utils.js');

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
