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
const { searchScore_, searchFilter_, photoScore_, searchFilterFoto_ } = require('../js/search.js');

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

/* ---------- Modo foto (a IA descreve, a busca procura) ---------- */

// Itens extras, para comparar candidatos que casam com pesos diferentes.
const CANETA_TEXTO = { codigo: '300', descricao: 'CANETA MARCA TEXTO', codigoBarras: '', palavrasChave: '' };
const LAPIS_AZUL = { codigo: '400', descricao: 'LAPIS AZUL', codigoBarras: '', palavrasChave: '' };

// Chama photoScore_ do jeito que o app vai chamar: os termos que a IA devolveu.
function notaFoto(item, termos) {
  const q = norm(termos);
  return photoScore_(item, q ? q.split(/\s+/).filter(Boolean) : []);
}

describe('photoScore_ — pontuação quando as palavras vêm da IA, não do usuário', () => {
  // ESTA é a razão de a função existir. A IA escolhe as palavras dela; se sobrar uma que não
  // está na planilha, a regra E da busca digitada devolveria lista vazia.
  test('não exige todas as palavras — o caso que motivou a feature', () => {
    const termos = 'caneta esferografica azul tampa plastico';
    assert.equal(nota(CANETA, termos), -1);        // busca digitada: descarta o item
    assert.equal(notaFoto(CANETA, termos), 84);   // modo foto: acha
  });

  test('uma palavra certa basta, mesmo acompanhada de palavra errada', () => {
    assert.equal(nota(CANETA, 'azul geladeira'), -1);
    assert.equal(notaFoto(CANETA, 'azul geladeira'), 32);
  });

  test('pontua por quantas palavras casaram: mais palavras, nota maior', () => {
    assert.equal(notaFoto(CANETA, 'caneta'), 32);         // 20 (palavra inteira) + 12 (palavra-chave)
    assert.equal(notaFoto(CANETA, 'caneta azul'), 64);    // o dobro: as duas casam
  });

  test('item que não casa NENHUMA palavra sai do resultado', () => {
    assert.equal(notaFoto(CANETA, 'geladeira freezer'), -1);
    assert.equal(notaFoto(LAPIS_AZUL, 'borrifador plastico'), -1);
  });

  test('código de barras lido na etiqueta domina o ranking (10000)', () => {
    // É o ganho de OCR: se a IA conseguiu ler o número impresso, a resposta é definitiva.
    assert.equal(notaFoto(CANETA, '7891234'), 10000);
    assert.equal(notaFoto(CANETA, '7891234 caneta azul'), 10064);  // 10000 + 64 das palavras
  });

  test('código interno lido na etiqueta domina igual', () => {
    assert.equal(notaFoto(CANETA, '99'), 10000);
  });

  // Diferença deliberada em relação à busca digitada, não esquecimento: o bônus de "descrição
  // começa com a consulta" não faz sentido aqui, porque a ordem das palavras da IA é arbitrária.
  test('não dá bônus de começo de descrição, ao contrário da busca digitada', () => {
    assert.equal(nota(CANETA, 'caneta'), 232);        // 200 (começo) + 20 + 12
    assert.equal(notaFoto(CANETA, 'caneta'), 32);     // sem os 200
  });

  test('item sem palavras-chave nem código de barras não quebra', () => {
    const magro = { codigo: '1', descricao: 'CANETA', codigoBarras: undefined, palavrasChave: undefined };
    assert.equal(notaFoto(magro, 'caneta'), 20);
  });

  test('ignora acento e maiúscula, como o resto da busca', () => {
    assert.equal(notaFoto(BORRIFADOR, 'AGUA'), notaFoto(BORRIFADOR, 'água'));
  });

  test('não altera a busca digitada: searchScore_ continua exigindo tudo', () => {
    // Guarda contra o erro mais fácil de cometer aqui — "consertar" o AND junto.
    assert.equal(nota(CANETA, 'caneta esferografica azul tampa plastico'), -1);
    assert.equal(nota(CANETA, 'azul geladeira'), -1);
  });
});

describe('searchFilterFoto_ — lista de candidatos da busca por foto', () => {
  test('ordena do mais provável ao menos provável', () => {
    // CANETA casa as duas palavras (64); LAPIS_AZUL e CANETA_TEXTO casam uma só (20 cada).
    assert.deepEqual(
      searchFilterFoto_([LAPIS_AZUL, CANETA_TEXTO, CANETA], 'caneta azul').map(i => i.codigo),
      ['99', '400', '300']
    );
  });

  // COMPORTAMENTO ALTERADO em 2026-09-27, a pedido do usuário. Antes este teste esperava
  // ['99','300'] — o item do OCR em primeiro, os outros candidatos abaixo. Ao fotografar um
  // código de barras no uso real, ele recebeu o item certo em primeiro E 11 candidatos
  // irrelevantes, e pediu o comportamento de leitor de código: código e código de barras são
  // identificadores ÚNICOS, então não há o que ranquear ao lado.
  test('identificador lido na etiqueta manda sozinho: mostra SÓ aquele item', () => {
    assert.deepEqual(
      searchFilterFoto_([CANETA_TEXTO, CANETA], '7891234 caneta').map(i => i.codigo),
      ['99']
    );
  });

  test('o identificador dispensa o mínimo de palavras: uma só basta', () => {
    // Só o número casa; "codigo", "barras" e "etiqueta" não existem no item. Sem a exceção,
    // a regra do mínimo cortaria justamente o item certo.
    assert.deepEqual(
      searchFilterFoto_([CANETA_TEXTO, CANETA], 'codigo barras etiqueta 7891234').map(i => i.codigo),
      ['99']
    );
  });

  test('número curto NÃO é tratado como identificador, para não sequestrar o resultado', () => {
    // CABO tem código "500". Se "500" (de "500 ml") valesse como identificador, ele sozinho
    // apagaria todos os outros candidatos da lista.
    const achados = searchFilterFoto_([CABO, PAPEL], '500 papel rolos').map(i => i.codigo);
    assert.ok(achados.includes('150'), 'o papel deveria continuar na lista');
    assert.notDeepEqual(achados, ['500'], 'o código curto não pode virar resposta única');
  });
});

describe('searchFilterFoto_ — mínimo de palavras casadas (corta o ruído)', () => {
  // Caso real de 2026-09-27: a foto de um mouse trouxe SACO PLASTICO P/LIXO PRETO em primeiro
  // lugar, porque "preto" casou e mais nada. Uma palavra genérica sozinha é coincidência, não
  // evidência — e o mouse nem existe no cadastro, então o certo é não devolver nada.
  const SACO_PRETO = {
    codigo: '15083023',
    descricao: 'SACO PLASTICO P/LIXO - PACOTE C/100 UNID. 30L, PRETO',
    codigoBarras: '',
    palavrasChave: 'saco de lixo, plastico, preto, 30 litros',
  };

  test('item que casa UMA palavra genérica é cortado quando a IA deu 3 ou mais', () => {
    const termos = 'mouse trackball logitech preto botoes conector';
    assert.ok(photoScore_(SACO_PRETO, norm(termos).split(' ')) > 0, 'ainda pontua...');
    assert.deepEqual(searchFilterFoto_([SACO_PRETO], termos), [], '...mas não vira candidato');
  });

  test('item que casa duas palavras continua sendo candidato', () => {
    assert.deepEqual(
      searchFilterFoto_([SACO_PRETO], 'saco preto plastico grande').map(i => i.codigo),
      ['15083023']
    );
  });

  test('com 1 ou 2 palavras, uma casada basta — senão seria a regra E de volta', () => {
    // O modo foto existe justamente para não exigir todas as palavras. Se a IA devolveu
    // pouca coisa, exigir 2 de 2 recriaria o defeito que a feature corrige.
    assert.deepEqual(searchFilterFoto_([SACO_PRETO], 'preto').map(i => i.codigo), ['15083023']);
    assert.deepEqual(searchFilterFoto_([SACO_PRETO], 'preto geladeira').map(i => i.codigo), ['15083023']);
  });

  test('a regra não afeta a busca do rodo, que já funcionava', () => {
    // Regressão do caso medido em dado real: os três casam 2 ou mais palavras.
    const RODO = { codigo: '14591011', descricao: 'RODO DE BORRACHA - RODO PARA VIDRO', codigoBarras: '',
      palavrasChave: 'rodo de borracha, rodo para vidro, limpeza de vidros, janela, espatula' };
    const VASSOURA = { codigo: '14613022', descricao: 'VASSOURA - DE PALHA CINCO FIOS COM CABO', codigoBarras: '',
      palavrasChave: 'vassoura, palha, cinco fios, cabo, limpeza, chao' };
    assert.deepEqual(
      searchFilterFoto_([VASSOURA, RODO], 'rodo limpador vidro cabo limpeza azul').map(i => i.codigo),
      ['14591011', '14613022']
    );
  });

  test('descarta quem não casa nenhuma palavra', () => {
    assert.deepEqual(
      searchFilterFoto_([BORRIFADOR, CANETA, PAPEL], 'caneta azul').map(i => i.codigo),
      ['99']
    );
  });

  test('corta no teto de 12 candidatos, porque acima disso é ruído', () => {
    const muitos = Array.from({ length: 20 }, (_, i) => (
      { codigo: String(900 + i), descricao: 'CANETA MODELO ' + i, codigoBarras: '', palavrasChave: '' }
    ));
    assert.equal(searchFilterFoto_(muitos, 'caneta').length, 12);
  });

  // Diferença deliberada: na busca digitada, consulta vazia significa "mostre tudo". Aqui
  // significa que a IA não identificou nada, e mostrar o inventário inteiro seria pior que
  // mostrar nada — quem trata esse caso é a mensagem "não consegui identificar" na tela.
  test('sem termos devolve vazio, ao contrário da busca digitada que devolve tudo', () => {
    const lista = [BORRIFADOR, CANETA, PAPEL];
    assert.deepEqual(searchFilterFoto_(lista, ''), []);
    assert.deepEqual(searchFilterFoto_(lista, '   '), []);
    assert.equal(searchFilter_(lista, '').length, 3);
  });

  test('lista vazia devolve vazia', () => {
    assert.deepEqual(searchFilterFoto_([], 'caneta'), []);
  });

  test('não altera a lista recebida (o app reusa o mesmo array)', () => {
    const lista = [BORRIFADOR, CANETA, PAPEL];
    searchFilterFoto_(lista, 'caneta azul');
    assert.deepEqual(lista.map(i => i.codigo), ['55115002', '99', '150']);
  });
});
