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

  // Quantas palavras da IA um item precisa casar para virar candidato.
  // Nasceu de um caso real (2026-09-27): a foto de um mouse trouxe SACO PLASTICO P/LIXO
  // PRETO em primeiro, porque "preto" casou e mais nada. Uma palavra genérica sozinha não é
  // evidência de que é o item — é coincidência. Com o mínimo em 2, aquela busca passa a não
  // devolver nada, que é a resposta honesta: o mouse não está cadastrado.
  const MIN_TERMOS_FOTO = 2;

  // Um termo só conta como IDENTIFICADOR (código ou código de barras) se for numérico e
  // suficientemente longo. Os códigos internos têm 7 a 9 dígitos e os de barras 12 a 13;
  // sem este piso, um termo curto como "500" (de "500ml") casaria com o código de um item
  // qualquer e sequestraria o resultado inteiro.
  const MIN_DIGITOS_IDENTIFICADOR = 6;
  function pareceIdentificador_(t) {
    return t.length >= MIN_DIGITOS_IDENTIFICADOR && /^[0-9]+$/.test(t);
  }

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
  // Avalia um item contra os termos e devolve, além da nota, o que a filtragem precisa saber:
  // quantos termos casaram e se algum deles casou um identificador (código ou código de barras).
  function photoDetalhe_(it, tokens) {
    const desc = norm(it.descricao), cod = norm(it.codigo), bar = norm(it.codigoBarras), kw = norm(it.palavrasChave);
    let s = 0, casaram = 0, identificador = false;
    for (const t of tokens) {
      let ganho = 0;
      if (cod === t || bar === t) {                                                          // OCR leu o identificador
        ganho += 10000;
        if (pareceIdentificador_(t)) identificador = true;
      }
      if (new RegExp('(^|[^a-z0-9])' + escapeRe_(t) + '([^a-z0-9]|$)').test(desc)) ganho += 20; // palavra inteira
      else if (desc.includes(t)) ganho += 5;                                                  // pedaço
      if (kw.includes(t)) ganho += 12;                                                        // palavra-chave
      if (ganho > 0) { s += ganho; casaram++; }
    }
    return { s: casaram === 0 ? -1 : s, casaram: casaram, identificador: identificador };
  }

  function photoScore_(it, tokens) {
    return photoDetalhe_(it, tokens).s;
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

    const avaliados = list.map(it => ({ it, d: photoDetalhe_(it, tokens) })).filter(x => x.d.s >= 0);

    // Se a IA leu um identificador na etiqueta, isso é resposta, não palpite: código e código
    // de barras são únicos. Mostrar "outros candidatos" ao lado só polui — foi a reclamação
    // real de quem fotografou um código de barras e recebeu 12 itens (2026-09-27). Aqui a foto
    // da etiqueta passa a se comportar como o leitor de código de barras.
    const porIdentificador = avaliados.filter(x => x.d.identificador);
    if (porIdentificador.length) {
      return porIdentificador.sort((a, b) => b.d.s - a.d.s).map(x => x.it);
    }

    // Sem identificador, exige um mínimo de palavras casadas (ver MIN_TERMOS_FOTO) — mas só
    // quando a IA deu palavras o bastante para isso significar alguma coisa. Com 1 ou 2
    // palavras, exigir 2 seria a regra E de volta, que é justamente o que o modo foto existe
    // para não ter. Na prática o prompt pede de 3 a 8 palavras, então o caminho comum é 2.
    const minimo = tokens.length >= 3 ? MIN_TERMOS_FOTO : 1;
    return avaliados.filter(x => x.d.casaram >= minimo)
      .sort((a, b) => b.d.s - a.d.s).slice(0, TETO_CANDIDATOS_FOTO).map(x => x.it);
  }

  const api = { searchScore_, searchFilter_, photoScore_, searchFilterFoto_ };

  // No navegador: vira global, como era antes. No Node: vira export.
  Object.assign(global, api);
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
