/* Testes da busca de itens (js/search.js).
 *
 * Rodar com:  npm test        (ou: node --test)
 *
 * PARA QUE SERVEM: fixam o comportamento da busca ATUAL antes de a feature de
 * busca por foto acrescentar uma pontuação nova. Se um dia a busca digitada
 * mudar sem querer, é aqui que a mudança aparece — e não na tela de quem está
 * conferindo estoque.
 *
 * Os números das asserções (10000, 2000, 232, 64, 20, 12, 5) são os pesos reais
 * da função, medidos antes de escrever o teste. São propositalmente exatos: o
 * objetivo desta suíte é travar o comportamento, não descrevê-lo por cima.
 *
 * js/utils.js é carregado PRIMEIRO porque search.js usa norm() e escapeRe_() como
 * globais — exatamente como acontece no navegador pela ordem das tags <script>.
 */
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');

const { norm } = require('../js/utils.js');
const { searchScore_, searchFilter_ } = require('../js/search.js');

// Itens de exemplo, tirados do almoxarifado real (ver a aba Estoque).
const BORRIFADOR = {
  codigo: '55115002',
  descricao: 'BORRIFADOR - AGUA PLASTICO 500ML',
  codigoBarras: '',
  palavrasChave: 'borrifador, spray, plastico, 500ml, pulverizador',
};
const CANETA = {
  codigo: '99',
  descricao: 'CANETA ESFEROGRAFICA AZUL',
  codigoBarras: '7891234',
  palavrasChave: 'caneta, bic, azul',
};
const PAPEL = {
  codigo: '150',
  descricao: 'PAPEL HIGIENICO BRANCO PACOTE 8 ROLOS',
  codigoBarras: '',
  palavrasChave: '',
};
const AZULEJO = { codigo: '200', descricao: 'TINTA AZULEJO', codigoBarras: '', palavrasChave: '' };
const CABO = { codigo: '500', descricao: 'CABO 99 METROS', codigoBarras: '', palavrasChave: '' };

// Chama searchScore_ do jeito que o app chama: a consulta normalizada e as palavras separadas.
function nota(item, consulta) {
  const q = norm(consulta);
  const tokens = q ? q.split(/\s+/).filter(Boolean) : [];
  return searchScore_(item, q, tokens);
}

describe('searchScore_ — regra E: todas as palavras precisam aparecer', () => {
  // ESTE é o comportamento que a busca por foto NÃO pode herdar: a IA escolhe as
  // palavras, e uma palavra a mais que não esteja na planilha zeraria o resultado.
  test('uma palavra ausente descarta o item, por mais que as outras casem', () => {
    assert.equal(nota(CANETA, 'caneta esferografica azul tampa plastico'), -1);
    assert.equal(nota(CANETA, 'caneta azul'), 64);      // sem "tampa"/"plastico", casa
  });

  test('a palavra pode estar em qualquer campo, não só na descrição', () => {
    // "spray" não existe na descrição; está só nas palavras-chave. É o caso que
    // motivou a coluna Palavras-chave existir.
    assert.equal(nota(BORRIFADOR, 'spray'), 12);
    assert.notEqual(nota(BORRIFADOR, 'spray'), -1);
  });

  test('palavra que não existe em nenhum campo devolve -1', () => {
    assert.equal(nota(CANETA, 'geladeira'), -1);
    assert.equal(nota(BORRIFADOR, 'borrifador geladeira'), -1);
  });

  test('aceita as palavras em qualquer ordem, com a mesma nota', () => {
    assert.equal(nota(BORRIFADOR, 'agua borrifador'), 52);
    assert.equal(nota(BORRIFADOR, 'borrifador agua'), 52);
  });
});

describe('searchScore_ — pesos que definem o ranking', () => {
  test('código igual à consulta domina tudo (10000), porque é identificador único', () => {
    assert.equal(nota(CANETA, '99'), 10000);
  });

  test('código de barras igual à consulta domina igual (10000)', () => {
    assert.equal(nota(CANETA, '7891234'), 10000);
  });

  test('começo do código vale menos que o código inteiro (2000 contra 10000)', () => {
    assert.equal(nota(CANETA, '9'), 2000);
    assert.ok(nota(CANETA, '9') < nota(CANETA, '99'));
  });

  test('descrição que começa com a consulta ganha bônus de 200', () => {
    // 232 = 200 (começo da descrição) + 20 (palavra inteira) + 12 (palavra-chave)
    assert.equal(nota(BORRIFADOR, 'borrifador'), 232);
  });

  test('palavra inteira na descrição vale mais que pedaço de palavra (20 contra 5)', () => {
    assert.equal(nota(PAPEL, 'rolos'), 20);   // "ROLOS" inteiro
    assert.equal(nota(PAPEL, 'rolo'), 5);     // pedaço de "ROLOS"
  });

  test('palavra-chave soma 12 além do que a descrição já deu', () => {
    // 32 = 20 (palavra inteira na descrição) + 12 (aparece nas palavras-chave)
    assert.equal(nota(CANETA, 'azul'), 32);
    // No AZULEJO "azul" é só pedaço e não há palavra-chave: sobra 5.
    assert.equal(nota(AZULEJO, 'azul'), 5);
  });

  test('ignora acento e maiúscula, como a busca digitada sempre fez', () => {
    assert.equal(nota(BORRIFADOR, 'BORRIFADOR'), nota(BORRIFADOR, 'borrifador'));
    assert.equal(nota(BORRIFADOR, 'AGUA'), nota(BORRIFADOR, 'água'));
  });

  test('termo com ponto é buscado literalmente, não como curinga de regex', () => {
    // Sem escapeRe_, o ponto casaria qualquer caractere e "1.5" acharia "165".
    const item = { codigo: '1', descricao: 'PARAFUSO 1.5MM', codigoBarras: '', palavrasChave: '' };
    const outro = { codigo: '2', descricao: 'PARAFUSO 165MM', codigoBarras: '', palavrasChave: '' };
    assert.ok(nota(item, '1.5') >= 0);
    assert.equal(nota(outro, '1.5'), -1);
  });
});

describe('searchFilter_ — filtra e ordena do mais relevante ao menos', () => {
  test('busca vazia devolve a lista inteira, na ordem em que veio', () => {
    const lista = [BORRIFADOR, CANETA, PAPEL];
    assert.deepEqual(searchFilter_(lista, '').map(i => i.codigo), ['55115002', '99', '150']);
    assert.deepEqual(searchFilter_(lista, '   ').map(i => i.codigo), ['55115002', '99', '150']);
  });

  test('descarta quem não casa', () => {
    assert.deepEqual(searchFilter_([BORRIFADOR, CANETA, PAPEL], 'azul').map(i => i.codigo), ['99']);
    assert.deepEqual(searchFilter_([BORRIFADOR, CANETA], 'geladeira'), []);
  });

  test('quem casa no código vem antes de quem casa na descrição', () => {
    // CABO tem "99" na descrição (20); CANETA tem "99" como código (10000).
    assert.deepEqual(searchFilter_([CABO, CANETA], '99').map(i => i.codigo), ['99', '500']);
  });

  test('palavra inteira vem antes de pedaço de palavra', () => {
    // CANETA casa "azul" inteiro (32); AZULEJO casa só como pedaço (5).
    assert.deepEqual(searchFilter_([AZULEJO, CANETA], 'azul').map(i => i.codigo), ['99', '200']);
  });

  test('a ordem das palavras digitadas não muda o conjunto de resultados', () => {
    const lista = [BORRIFADOR, CANETA, PAPEL];
    assert.deepEqual(
      searchFilter_(lista, 'agua borrifador').map(i => i.codigo),
      searchFilter_(lista, 'borrifador agua').map(i => i.codigo)
    );
  });

  test('não altera a lista recebida (o app reusa o mesmo array)', () => {
    const lista = [BORRIFADOR, CANETA, PAPEL];
    searchFilter_(lista, 'azul');
    assert.deepEqual(lista.map(i => i.codigo), ['55115002', '99', '150']);
  });
});
