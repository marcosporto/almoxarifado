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

const { natCmp, normCod, norm, escapeRe_, fmtDate, ymd, esc, fmtDateTime, fmtUnidade } = require('../js/utils.js');

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

describe('ymd — Date para "aaaa-mm-dd" (formato do <input type="date">)', () => {
  test('converte uma data comum', () => {
    // Atenção: em JavaScript o mês começa em 0, então 8 = setembro.
    assert.equal(ymd(new Date(2026, 8, 26)), '2026-09-26');
  });

  test('completa mês e dia com zero à esquerda', () => {
    assert.equal(ymd(new Date(2026, 0, 5)), '2026-01-05');
    assert.equal(ymd(new Date(2026, 11, 31)), '2026-12-31');
  });

  // Este é o motivo de a função existir em vez de um simples toISOString():
  // toISOString() converte para UTC e, no fuso do Brasil, uma data depois das
  // 21h viraria o dia seguinte. ymd() lê os componentes locais, então não pula.
  test('usa a data local, não UTC — não pula o dia perto da meia-noite', () => {
    assert.equal(ymd(new Date(2026, 8, 26, 23, 59)), '2026-09-26');
    assert.equal(ymd(new Date(2026, 8, 26, 0, 1)), '2026-09-26');
  });

  test('sobrevive à virada de ano', () => {
    assert.equal(ymd(new Date(2026, 11, 31, 23, 59)), '2026-12-31');
    assert.equal(ymd(new Date(2027, 0, 1, 0, 0)), '2027-01-01');
  });

  // ATENÇÃO: a função não valida a entrada; espera receber um Date de verdade.
  test('estoura se não receber um Date (comportamento atual)', () => {
    assert.throws(() => ymd('2026-09-26'), TypeError);
    assert.throws(() => ymd(null), TypeError);
  });
});

describe('esc — escapa texto para entrar no HTML', () => {
  test('neutraliza os cinco caracteres que quebram marcação', () => {
    assert.equal(esc('&'), '&amp;');
    assert.equal(esc('<'), '&lt;');
    assert.equal(esc('>'), '&gt;');
    assert.equal(esc('"'), '&quot;');
    assert.equal(esc("'"), '&#39;');
  });

  test('desarma uma tentativa de injetar script', () => {
    assert.equal(
      esc('<script>alert(1)</script>'),
      '&lt;script&gt;alert(1)&lt;/script&gt;'
    );
  });

  // É assim que esc() é usada no index.html: data-codigo="${esc(...)}".
  // O escape das aspas duplas é o que impede fechar o atributo e injetar outro.
  test('impede fugir de um atributo entre aspas duplas', () => {
    assert.equal(esc('" onerror="alert(1)'), '&quot; onerror=&quot;alert(1)');
  });

  test('não escapa duas vezes — cada caractere é tratado uma vez só', () => {
    assert.equal(esc('&lt;'), '&amp;lt;');
  });

  test('deixa passar texto normal, inclusive acentos', () => {
    assert.equal(esc('Parafuso 3/8" galvanizado'), 'Parafuso 3/8&quot; galvanizado');
    assert.equal(esc('Válvula esférica'), 'Válvula esférica');
  });

  test('trata nulo, indefinido e número', () => {
    assert.equal(esc(null), '');
    assert.equal(esc(undefined), '');
    assert.equal(esc(0), '0');
    assert.equal(esc(42), '42');
  });

  // ATENÇÃO — limite conhecido, não é defeito: esc() NÃO escapa crase nem "=",
  // então não protege atributo SEM aspas (id=${esc(x)}), nem conteúdo dentro de
  // <script>/<style>, nem montagem de URL. Hoje os 45 usos no index.html são só
  // texto e atributos entre aspas duplas, que são os casos cobertos acima.
  test('não escapa crase nem "=" (por isso exige atributo entre aspas)', () => {
    assert.equal(esc('`'), '`');
    assert.equal(esc('='), '=');
  });
});

describe('fmtDateTime — data/hora ISO para "dd/mm/aaaa hh:mm"', () => {
  test('formata uma data/hora sem fuso como horário de parede', () => {
    // Sem "Z" e sem offset, o JavaScript lê como horário local — o que chega
    // na tela é exatamente o que está escrito.
    assert.equal(fmtDateTime('2026-09-26T14:30:00'), '26/09/2026 14:30');
  });

  test('completa dia, mês, hora e minuto com zero à esquerda', () => {
    assert.equal(fmtDateTime('2026-01-05T00:05:00'), '05/01/2026 00:05');
  });

  test('sobrevive à virada de ano', () => {
    assert.equal(fmtDateTime('2026-12-31T23:59:00'), '31/12/2026 23:59');
  });

  // O fuso é fixado aqui de propósito: sem isso o teste passaria ou falharia
  // conforme o relógio da máquina de quem roda.
  test('converte horário com "Z" (UTC) para o fuso local', () => {
    const fusoOriginal = process.env.TZ;
    try {
      process.env.TZ = 'America/Sao_Paulo';   // UTC-3
      assert.equal(fmtDateTime('2026-09-26T14:30:00Z'), '26/09/2026 11:30');
      process.env.TZ = 'UTC';
      assert.equal(fmtDateTime('2026-09-26T14:30:00Z'), '26/09/2026 14:30');
    } finally {
      process.env.TZ = fusoOriginal;
    }
  });

  test('devolve vazio para nulo, indefinido e vazio', () => {
    assert.equal(fmtDateTime(''), '');
    assert.equal(fmtDateTime(null), '');
    assert.equal(fmtDateTime(undefined), '');
  });

  // Diferente de fmtDate(), esta não estoura com entrada estranha: devolve como veio.
  test('devolve o valor original quando não é data reconhecível', () => {
    assert.equal(fmtDateTime('nao e data'), 'nao e data');
    assert.equal(fmtDateTime('2026-13-45T99:99:99'), '2026-13-45T99:99:99');
  });
});

describe('fmtUnidade — "1.0 - PECA" para "Unid.: PECA"', () => {
  test('mostra só o nome da unidade, sem o código numérico', () => {
    assert.equal(fmtUnidade('1.0 - PECA'), 'Unid.: PECA');
    assert.equal(fmtUnidade('2.5 - KG'), 'Unid.: KG');
  });

  test('funciona quando vem só o nome, sem hífen', () => {
    assert.equal(fmtUnidade('PECA'), 'Unid.: PECA');
  });

  test('aceita sem espaço em volta do hífen', () => {
    assert.equal(fmtUnidade('1.0-KG'), 'Unid.: KG');
  });

  test('devolve vazio quando não sobra nome', () => {
    assert.equal(fmtUnidade(''), '');
    assert.equal(fmtUnidade(null), '');
    assert.equal(fmtUnidade(undefined), '');
    assert.equal(fmtUnidade('1.0 - '), '');   // só o código, sem unidade
    assert.equal(fmtUnidade('-'), '');
  });

  // ⚠️ DEFEITO CONHECIDO — ver .specs/codebase/CONCERNS.md.
  // A função pega tudo depois do ÚLTIMO hífen. Se o nome da unidade tiver hífen,
  // só o pedaço final aparece: "1.0 - CAIXA C-10" vira "Unid.: 10", que engana
  // quem está conferindo estoque. Corrigir = cortar no PRIMEIRO hífen. Não mudei
  // junto com a extração de propósito: refatoração não deve alterar comportamento.
  test('DEFEITO: perde parte do nome quando a unidade contém hífen', () => {
    assert.equal(fmtUnidade('1.0 - CAIXA C-10'), 'Unid.: 10');   // deveria ser "CAIXA C-10"
  });
});

describe('norm — normaliza texto para comparar e buscar', () => {
  test('ignora acento, que é o motivo da função existir: buscar "armario" tem de achar "ARMÁRIO"', () => {
    assert.equal(norm('ARMÁRIO'), 'armario');
    assert.equal(norm('Ação'), 'acao');
    assert.equal(norm('ÇÃOÕÜÊÍ'), 'caoouei');
  });

  test('ignora maiúscula/minúscula', () => {
    assert.equal(norm('BORRIFADOR'), norm('borrifador'));
    assert.equal(norm('Caneta AZUL'), 'caneta azul');
  });

  test('trata nulo, indefinido e vazio como string vazia (a planilha devolve célula em branco)', () => {
    assert.equal(norm(null), '');
    assert.equal(norm(undefined), '');
    assert.equal(norm(''), '');
  });

  test('remove espaço das pontas, mas preserva o do meio (que separa as palavras da busca)', () => {
    assert.equal(norm('  Prateleira 1  '), 'prateleira 1');
    // Tab e nova linha montados por código, para o teste não depender de escape no arquivo.
    const tab = String.fromCharCode(9), nl = String.fromCharCode(10);
    assert.equal(norm(tab + ' caneta azul ' + nl), 'caneta azul');
  });

  test('acento já decomposto vira o mesmo do composto (as duas formas aparecem em dado colado)', () => {
    // "é" pode chegar como um caractere só ou como "e" + sinal de acento separado.
    const composto = 'é', decomposto = 'é';
    assert.notEqual(composto, decomposto);      // são strings diferentes na entrada
    assert.equal(norm(composto), norm(decomposto));
    assert.equal(norm(decomposto), 'e');
  });
});

describe('escapeRe_ — escapa termo de busca para uso literal em regex', () => {
  test('escapa cada metacaractere que o motor de regex trataria como comando', () => {
    const metas = ['.', '*', '+', '?', '^', '$', '{', '}', '(', ')', '|', '[', ']', '\\'];
    for (const c of metas) {
      assert.equal(escapeRe_(c), '\\' + c, 'nao escapou: ' + c);
    }
  });

  test('deixa texto comum intacto, que é o caso da maioria das buscas', () => {
    assert.equal(escapeRe_('caneta azul'), 'caneta azul');
    assert.equal(escapeRe_('BORRIFADOR 500ML'), 'BORRIFADOR 500ML');
    assert.equal(escapeRe_(''), '');
  });

  test('o resultado casa o termo LITERALMENTE — é isto que a função existe para garantir', () => {
    // Sem escapar, "1.5" casaria "165", porque o ponto vale "qualquer caractere".
    assert.ok(new RegExp(escapeRe_('1.5')).test('1.5'));
    assert.ok(!new RegExp(escapeRe_('1.5')).test('165'));
  });

  test('termo com parênteses não quebra a expressão (sem escapar, isto lançaria erro)', () => {
    assert.doesNotThrow(() => new RegExp(escapeRe_('item (novo)')));
    assert.ok(new RegExp(escapeRe_('item (novo)')).test('item (novo) 1'));
  });

  // ATENÇÃO: a função chama s.replace direto, sem converter para texto. Quem chama sempre
  // passa um token já normalizado por norm(), então na prática é string. Registrado para a
  // falha aparecer aqui, e não na tela, se algum dia alguém passar outra coisa.
  test('estoura se não receber texto (comportamento atual)', () => {
    assert.throws(() => escapeRe_(null), TypeError);
    assert.throws(() => escapeRe_(undefined), TypeError);
  });
});
