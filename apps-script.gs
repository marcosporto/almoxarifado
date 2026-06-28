/**
 * Almoxarifado UDESC — Backend Google Apps Script
 * ------------------------------------------------
 * Web App que serve como API JSON para o app de inventário (index.html).
 *
 * IMPLANTAÇÃO:
 *   1. Planilha > Extensões > Apps Script. Cole este arquivo.
 *   2. Implantar > Nova implantação > Tipo "App da Web".
 *        - Executar como: Eu
 *        - Quem tem acesso: Qualquer pessoa
 *   3. Copie a URL "/exec" e cole no app (botão ⚙️ Configurar).
 *
 * As colunas são mapeadas POR NOME do cabeçalho — a ordem pode mudar sem quebrar.
 * Se a planilha estiver vazia, os cabeçalhos são criados automaticamente.
 */

var SHEET_NAME = 'Estoque';
var IMAGE_FOLDER_NAME = 'Almoxarifado UDESC - Imagens';

// ====== Tratamento de foto por IA (Gemini "Nano Banana") ======
// A chave NÃO fica no código: cole em Configurações do projeto > Propriedades do script,
// na chave GEMINI_API_KEY (assim ela nunca aparece no index.html, que é público).
var GEMINI_MODEL = 'gemini-2.5-flash-image'; // modelo de imagem (image-out), nível gratuito
var PROMPT_TRATAMENTO = [
  'Re-crop and re-frame this product photo as a tight, zoomed-in close-up for an',
  'e-commerce / inventory catalog. ZOOM IN strongly so the product becomes large and',
  'DOMINANT, nearly filling the square frame and almost touching all four edges, leaving',
  'only a thin uniform white margin (the product must occupy about 90-95% of the frame).',
  'It is REQUIRED to enlarge and recompose the product — do not keep it small or centered',
  'with wide empty space.',
  'Remove the background and replace it with a pure-white background that fills the entire',
  'square frame edge to edge, with no border, frame, vignette or colored margin.',
  'Improve lighting, color balance and maximize sharpness so every detail is clearly visible.',
  'Keep the PRODUCT ITSELF faithful: do not change its shape, colors, proportions or any',
  'text/labels — only change its size and position within the frame. Do not add, remove or',
  'invent any objects.'
].join(' ');

// ====== Palavras-chave por IA (TEXTO) ======
// Modelo de TEXTO (muito mais barato que o de imagem); reusa a mesma GEMINI_API_KEY.
var GEMINI_TEXT_MODEL = 'gemini-2.5-flash-lite';
// Prompt "ancorado": só expande o que está na descrição, nunca inventa dados.
var PROMPT_KW = [
  'Você recebe uma lista numerada de descrições de itens de almoxarifado.',
  'Para CADA item, gere de 4 a 10 palavras-chave (sinônimos, nome popular e categoria) que',
  'ajudem a encontrá-lo numa busca. Use português, tudo em minúsculas, separadas por vírgula.',
  'Baseie-se SOMENTE na descrição; não invente marca, modelo, voltagem, tamanho nem qualquer',
  'dado que não esteja escrito.',
  'Responda APENAS em JSON: um array de objetos no formato',
  '{"id": <numero>, "kw": "palavra1, palavra2, ..."}, repetindo o MESMO id de cada item.',
  'Itens:'
].join(' ');

// ====== Login com Google (autenticação) ======
// Client ID criado no Google Cloud (NÃO é secreto — também fica visível no index.html).
var CLIENT_ID = '768100742493-h1v8i5u47aip75rbcv52uvuej4o7v2mr.apps.googleusercontent.com';
// Aba que guarda a lista de e-mails que podem usar o app (coluna "E-mail").
var AUTORIZADOS_SHEET = 'Autorizados';

// Aba de staging para atualizar o estoque a partir da cópia do sistema do almoxarifado.
var IMPORTAR_SHEET = 'Importar';

// Definição canônica das colunas: chave interna (usada pelo app) -> rótulo na planilha.
// Padrão dos rótulos: nome descritivo em Português, "Grupo + Qualificador"
// (ex.: Estoque Sistema / Estoque Mínimo, Código Interno / Código de Barras).
// A ordem abaixo também é a ordem sugerida das colunas.
var COLUMNS = [
  { key: 'codigo',         label: 'Código Interno' },
  { key: 'codigoBarras',   label: 'Código de Barras' },
  { key: 'descricao',      label: 'Descrição' },
  { key: 'unidade',        label: 'Unidade de Distribuição' },
  { key: 'localizacao',    label: 'Localização' },
  { key: 'estoqueSistema', label: 'Estoque Sistema' },
  { key: 'estoqueFisico',  label: 'Conferido' },
  { key: 'diferenca',      label: 'Diferença' },
  { key: 'estoqueMinimo',  label: 'Estoque Mínimo' },
  { key: 'validade',       label: 'Data de Validade' },
  { key: 'diasAviso',      label: 'Dias para Aviso de Validade' },
  { key: 'observacoes',    label: 'Observações' },
  { key: 'palavrasChave',  label: 'Palavras-chave' },
  { key: 'inventariado',   label: 'Status do Inventário' },
  { key: 'conferidoPor',   label: 'Conferido por' },
  { key: 'situacao',       label: 'Situação' },
  { key: 'imagens',        label: 'Imagens' }
];
var HEADERS = COLUMNS.map(function (c) { return c.label; });

// { chaveCanonica: 'Rótulo padrão' }
function canonicalLabelByKey_() {
  var m = {};
  COLUMNS.forEach(function (c) { m[c.key] = c.label; });
  return m;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    // Compatibilidade: usa a primeira aba que não seja "Consumo" e a renomeia para "Estoque"
    var all = ss.getSheets();
    for (var i = 0; i < all.length; i++) {
      if (all[i].getName() !== CONSUMO_SHEET) { sheet = all[i]; break; }
    }
    if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
    if (sheet.getName() !== SHEET_NAME) sheet.setName(SHEET_NAME);
  }
  // Garante cabeçalhos se a planilha estiver vazia
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
    formatValidadeColumn_(sheet);
  } else {
    ensureColumns_(sheet);
  }
  return sheet;
}

// Acrescenta ao cabeçalho qualquer coluna nova que ainda não exista
// (planilhas antigas não têm as colunas de imagens/observações/status etc.)
var WANT_KEYS = ['codigoBarras', 'localizacao', 'diferenca', 'estoqueMinimo', 'validade',
                 'diasAviso', 'observacoes', 'palavrasChave', 'inventariado', 'conferidoPor', 'situacao', 'imagens'];
function ensureColumns_(sheet) {
  var lastCol = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var col = buildColMap_(headers);
  var labels = canonicalLabelByKey_();
  var toAdd = [];
  WANT_KEYS.forEach(function (k) {
    if (col[k] === undefined) toAdd.push(labels[k]);
  });
  if (toAdd.length) sheet.getRange(1, lastCol + 1, 1, toAdd.length).setValues([toAdd]);
}

// Formata a coluna de validade para exibir dd/MM/yyyy na planilha
function formatValidadeColumn_(sheet) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var col = buildColMap_(headers);
  if (col.validade === undefined) return;
  var n = Math.max(sheet.getMaxRows() - 1, 1);
  sheet.getRange(2, col.validade + 1, n, 1).setNumberFormat('dd/MM/yyyy');
}

// normaliza um texto de cabeçalho: minúsculo, sem acento, sem espaços extras
function norm_(s) {
  return String(s == null ? '' : s)
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// alias normalizado -> chave canônica do nosso modelo.
// Aceita nomes antigos e novos para não quebrar planilhas já existentes.
function aliases_() {
  return {
    'codigo interno': 'codigo',
    'codigo': 'codigo',
    'codigo do item': 'codigo',
    'codigo de barras': 'codigoBarras',
    'descricao': 'descricao',
    'unidade': 'unidade',
    'unidade de medida': 'unidade',
    'unidade de distribuicao': 'unidade',
    'localizacao': 'localizacao',
    'estoque sistema': 'estoqueSistema',
    'estoque no sistema': 'estoqueSistema',
    'estoque fisico': 'estoqueFisico',
    'estoque fisico/encontrado': 'estoqueFisico',
    'conferido': 'estoqueFisico',
    'estoque conferido': 'estoqueFisico',
    'diferenca': 'diferenca',
    'estoque minimo': 'estoqueMinimo',
    'data validade': 'validade',
    'data de validade': 'validade',
    'dias aviso validade': 'diasAviso',
    'dias de aviso previo de validade': 'diasAviso',
    'dias para aviso de validade': 'diasAviso',
    'dias de aviso de validade': 'diasAviso',
    'observacoes': 'observacoes',
    'palavras-chave': 'palavrasChave',
    'palavras chave': 'palavrasChave',
    'palavra-chave': 'palavrasChave',
    'apelidos': 'palavrasChave',
    'apelido': 'palavrasChave',
    'status inventario': 'inventariado',
    'status de inventario': 'inventariado',
    'status do inventario': 'inventariado',
    'conferido por': 'conferidoPor',
    'situacao': 'situacao',
    'imagens': 'imagens'
  };
}

// Mapa { chaveCanonica: indiceColuna(0-based) } a partir da linha de cabeçalho real
function buildColMap_(headerRow) {
  var aliases = aliases_();
  var map = {};
  headerRow.forEach(function (h, i) {
    var key = aliases[norm_(h)];
    if (key && map[key] === undefined) map[key] = i;
  });
  return map;
}

function jsonOut_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function toBool_(v) {
  if (v === true) return true;
  var s = norm_(v);
  return s === 'true' || s === 'sim' || s === '1' || s === 'inventariado';
}

// Converte o valor da célula para ISO (yyyy-MM-dd) — formato que o app usa internamente
// no <input type="date">. A planilha continua EXIBINDO dd/MM/yyyy (formato de célula).
function isoDate_(v) {
  if (!v) return '';
  if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v)) {
    return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  var s = String(v).trim();
  var dmy = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);   // dd/MM/yyyy (texto) -> ISO
  if (dmy) return dmy[3] + '-' + dmy[2] + '-' + dmy[1];
  return s; // assume já estar em 'yyyy-MM-dd'
}

// 'yyyy-MM-dd' (vindo do app) -> objeto Date (meio-dia evita desvio de fuso horário)
function parseYmd_(s) {
  var m = String(s == null ? '' : s).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
}

/* ------------------------------------------------------------------ */
/* Autenticação — Login com Google                                    */
/* ------------------------------------------------------------------ */

// Valida o "crachá" (ID token) com o Google e confirma que foi emitido para
// ESTE app (aud) e que não expirou. Devolve { email, name } ou lança erro.
// Usa cache para não chamar o Google a cada requisição (a doc do Google não
// recomenda o tokeninfo para volume alto; o cache resolve isso aqui).
function verifyToken_(token) {
  token = String(token || '');
  if (!token) throw new Error('unauthorized');

  var cache = CacheService.getScriptCache();
  var ckey = 'tok_' + token.slice(-48);
  var hit = cache.get(ckey);
  if (hit) return JSON.parse(hit);

  var url = 'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token);
  var resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (resp.getResponseCode() !== 200) throw new Error('unauthorized');

  var info = JSON.parse(resp.getContentText());
  if (info.aud !== CLIENT_ID) throw new Error('unauthorized');           // emitido para outro app
  if (Number(info.exp) * 1000 < Date.now()) throw new Error('unauthorized'); // expirado

  var user = { email: String(info.email || '').toLowerCase(), name: String(info.name || '') };
  if (!user.email) throw new Error('unauthorized');

  cache.put(ckey, JSON.stringify(user), 300); // 5 minutos
  return user;
}

// Confere se o e-mail está na aba "Autorizados" (coluna E-mail).
function isAuthorized_(email) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(AUTORIZADOS_SHEET);
  if (!sheet) return false;
  var last = sheet.getLastRow();
  if (last < 2) return false;
  var vals = sheet.getRange(2, 1, last - 1, 1).getValues();
  var alvo = norm_(email);
  for (var i = 0; i < vals.length; i++) {
    if (norm_(vals[i][0]) === alvo) return true;
  }
  return false;
}

// Guarda: valida o crachá E confirma a autorização. Devolve { email, name }
// ou lança 'unauthorized' (crachá inválido) / 'forbidden' (fora da lista).
function requireAuth_(token) {
  var user = verifyToken_(token);
  if (!isAuthorized_(user.email)) throw new Error('forbidden');
  return user;
}

/* ------------------------------------------------------------------ */
/* doGet — devolve todas as linhas                                    */
/* ------------------------------------------------------------------ */

function doGet(e) {
  try {
    var p = (e && e.parameter) ? e.parameter : {};
    requireAuth_(p.token);                       // bloqueia leitura sem crachá válido + autorizado
    if (p.action === 'consumo') return jsonOut_(getConsumo_());
    var sheet = getSheet_();
    var values = sheet.getDataRange().getValues();
    if (values.length < 1) return jsonOut_({ ok: true, rows: [] });

    var col = buildColMap_(values[0]);
    var rows = [];

    for (var r = 1; r < values.length; r++) {
      var row = values[r];
      var codigo = col.codigo !== undefined ? row[col.codigo] : '';
      if (codigo === '' || codigo === null) continue; // pula linhas vazias

      var imagensRaw = col.imagens !== undefined ? String(row[col.imagens] || '') : '';
      rows.push({
        rowIndex: r + 1,
        codigo: String(codigo),
        codigoBarras: col.codigoBarras !== undefined ? String(row[col.codigoBarras] || '') : '',
        descricao: col.descricao !== undefined ? String(row[col.descricao] || '') : '',
        unidade: col.unidade !== undefined ? String(row[col.unidade] || '') : '',
        localizacao: col.localizacao !== undefined ? String(row[col.localizacao] || '') : '',
        estoqueSistema: col.estoqueSistema !== undefined ? Number(row[col.estoqueSistema]) || 0 : 0,
        estoqueFisico: col.estoqueFisico !== undefined && row[col.estoqueFisico] !== '' ? Number(row[col.estoqueFisico]) : null,
        estoqueMinimo: col.estoqueMinimo !== undefined && row[col.estoqueMinimo] !== '' ? Number(row[col.estoqueMinimo]) : null,
        validade: col.validade !== undefined ? isoDate_(row[col.validade]) : '',
        diasAviso: col.diasAviso !== undefined && row[col.diasAviso] !== '' ? Number(row[col.diasAviso]) : null,
        observacoes: col.observacoes !== undefined ? String(row[col.observacoes] || '') : '',
        palavrasChave: col.palavrasChave !== undefined ? String(row[col.palavrasChave] || '') : '',
        inventariado: col.inventariado !== undefined ? toBool_(row[col.inventariado]) : false,
        imagens: imagensRaw ? imagensRaw.split(',').map(function (s) { return s.trim(); }).filter(String) : []
      });
    }
    return jsonOut_({ ok: true, rows: rows, count: rows.length });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  }
}

/* ------------------------------------------------------------------ */
/* doPost — despacha ações                                            */
/* ------------------------------------------------------------------ */

/**
 * Rode esta função UMA vez pelo editor (▶ Executar) para conceder a
 * permissão do Google Drive ao script e criar a pasta de imagens.
 * Aparece no seletor de funções por NÃO terminar com "_".
 */
function autorizarDrive() {
  var folder = getImageFolder_();
  Logger.log('Pasta pronta: ' + folder.getName() + ' (' + folder.getId() + ')');
}

/**
 * Rode UMA vez pelo editor (▶ Executar) ao ativar o LOGIN. Isso concede a permissão
 * de "acessar serviços externos" (necessária para conferir o crachá do Google) e
 * confirma que a aba "Autorizados" existe. Aprove a tela de permissão que aparecer.
 */
function autorizarLogin() {
  UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=teste', { muteHttpExceptions: true });
  var temAba = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(AUTORIZADOS_SHEET) ? 'SIM' : 'NÃO (crie a aba!)';
  Logger.log('Login autorizado. Aba "Autorizados" encontrada: ' + temAba);
}

/**
 * Rode UMA vez pelo editor (▶ Executar) para aplicar o novo padrão de colunas a
 * uma planilha que JÁ tem dados. O que ela faz, sem apagar seus dados de itens:
 *   • renomeia os cabeçalhos para o padrão (casando pelo significado, não pela escrita);
 *   • remove a coluna legada "Estoque Real" (substituída pela coluna "Diferença");
 *   • cria colunas que faltarem (inclusive "Diferença") e formata a validade como dd/MM/yyyy.
 */
function padronizarPlanilha() {
  var sheet = getSheet_();

  // 1) Remove a coluna legada "Estoque Real" (a diferença agora fica na coluna "Diferença")
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  for (var i = headers.length - 1; i >= 0; i--) {
    if (norm_(headers[i]) === 'estoque real') sheet.deleteColumn(i + 1);
  }

  // 2) Renomeia os cabeçalhos para o padrão (casa pelo significado via alias)
  headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var aliases = aliases_();
  var labels = canonicalLabelByKey_();
  for (var c = 0; c < headers.length; c++) {
    var key = aliases[norm_(headers[c])];
    if (key && labels[key]) headers[c] = labels[key];
  }
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);

  // 3) Garante colunas faltantes e formata a validade
  ensureColumns_(sheet);
  formatValidadeColumn_(sheet);

  Logger.log('Planilha padronizada com sucesso.');
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    var body = JSON.parse(e.postData.contents);
    var action = body.action || 'pushItem';

    var auth = requireAuth_(body.token);   // bloqueia gravação sem crachá válido + autorizado
    body._email = auth.email;              // e-mail do autor, para registrar autoria

    if (action === 'pushItem')      return jsonOut_(pushItem_(body));
    if (action === 'uploadImages')  return jsonOut_(uploadImages_(body));
    if (action === 'deleteImage')   return jsonOut_(deleteImage_(body));
    if (action === 'addConsumo')    return jsonOut_(addConsumo_(body));
    if (action === 'deleteConsumo') return jsonOut_(deleteConsumo_(body));

    return jsonOut_({ ok: false, error: 'Ação desconhecida: ' + action });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (e2) {}
  }
}

// Localiza a linha (1-based) de um Código Interno
function findRowByCodigo_(sheet, col, codigo) {
  var alvo = norm_(codigo);
  var colVals = sheet.getRange(2, col.codigo + 1, Math.max(sheet.getLastRow() - 1, 0), 1).getValues();
  for (var i = 0; i < colVals.length; i++) {
    if (norm_(colVals[i][0]) === alvo) return i + 2;
  }
  return -1;
}

/**
 * Grava Físico / Observações / Status de inventário de um item.
 * body: { codigo, estoqueFisico, observacoes, inventariado }
 */
function pushItem_(body) {
  var sheet = getSheet_();
  var col = buildColMap_(sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]);
  if (col.codigo === undefined) return { ok: false, error: 'Coluna "Código Interno" não encontrada.' };

  var rowIndex = findRowByCodigo_(sheet, col, body.codigo);
  if (rowIndex < 0) return { ok: false, error: 'Código não encontrado: ' + body.codigo };

  // grava cada campo SÓ se ele veio no corpo (atualização parcial)
  function setIf(key, colIdx, value) {
    if (colIdx !== undefined && body[key] !== undefined) {
      sheet.getRange(rowIndex, colIdx + 1).setValue(value);
    }
  }
  function numOrBlank(v) { return v === '' || v === null ? '' : Number(v); }

  if (col.estoqueFisico !== undefined && body.estoqueFisico !== undefined && body.estoqueFisico !== null && body.estoqueFisico !== '') {
    sheet.getRange(rowIndex, col.estoqueFisico + 1).setValue(Number(body.estoqueFisico));
  }
  setIf('codigoBarras', col.codigoBarras, String(body.codigoBarras));
  setIf('localizacao',  col.localizacao,  String(body.localizacao));
  setIf('estoqueMinimo', col.estoqueMinimo, numOrBlank(body.estoqueMinimo));
  setIf('diasAviso',    col.diasAviso,    numOrBlank(body.diasAviso));
  setIf('observacoes',  col.observacoes,  String(body.observacoes));
  if (col.inventariado !== undefined && body.inventariado !== undefined) {
    sheet.getRange(rowIndex, col.inventariado + 1).setValue(body.inventariado ? 'Sim' : 'Não');
  }

  // Data de validade: grava como DATA real e exibe no padrão dd/MM/yyyy na planilha.
  if (col.validade !== undefined && body.validade !== undefined) {
    var celVal = sheet.getRange(rowIndex, col.validade + 1);
    var dataVal = parseYmd_(body.validade);
    if (dataVal) { celVal.setValue(dataVal); celVal.setNumberFormat('dd/MM/yyyy'); }
    else { celVal.setValue(''); }
  }

  // Diferença (Conferido − Estoque Sistema): gravada SOMENTE quando o item é conferido.
  // Usa o valor recém-enviado; se não veio, usa o que já está na planilha.
  if (col.diferenca !== undefined && body.inventariado === true) {
    var sistema = col.estoqueSistema !== undefined
      ? Number(sheet.getRange(rowIndex, col.estoqueSistema + 1).getValue()) || 0 : 0;
    var fisico = (body.estoqueFisico !== undefined && body.estoqueFisico !== null && body.estoqueFisico !== '')
      ? Number(body.estoqueFisico)
      : (col.estoqueFisico !== undefined ? Number(sheet.getRange(rowIndex, col.estoqueFisico + 1).getValue()) : NaN);
    if (!isNaN(fisico)) {
      sheet.getRange(rowIndex, col.diferenca + 1).setValue(fisico - sistema);
    }
  }

  // Autoria: registra quem conferiu (somente quando o item é confirmado como inventariado).
  if (col.conferidoPor !== undefined && body.inventariado === true && body._email) {
    sheet.getRange(rowIndex, col.conferidoPor + 1).setValue(body._email);
  }

  return { ok: true, codigo: String(body.codigo) };
}

/* ------------------------------------------------------------------ */
/* Upload de imagens para o Drive                                     */
/* ------------------------------------------------------------------ */

// Extrai o ID do arquivo a partir de qualquer formato de link do Drive
function driveIdFromUrl_(u) {
  if (!u) return '';
  var m = String(u).match(/[?&]id=([\w-]+)/) || String(u).match(/\/d\/([\w-]+)/);
  return m ? m[1] : '';
}

/**
 * Remove uma foto: tira a URL da célula "Imagens" e manda o arquivo
 * para a lixeira do Drive.  body: { codigo, url }
 */
function deleteImage_(body) {
  var sheet = getSheet_();
  var col = buildColMap_(sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]);
  var id = driveIdFromUrl_(body.url);

  if (col.imagens !== undefined && col.codigo !== undefined) {
    var rowIndex = findRowByCodigo_(sheet, col, body.codigo);
    if (rowIndex > 0) {
      var cell = sheet.getRange(rowIndex, col.imagens + 1);
      var kept = String(cell.getValue() || '').split(',')
        .map(function (s) { return s.trim(); })
        .filter(function (u) { return u && driveIdFromUrl_(u) !== id; });
      cell.setValue(kept.join(', '));
    }
  }
  if (id) { try { DriveApp.getFileById(id).setTrashed(true); } catch (e) {} }

  return { ok: true, codigo: String(body.codigo) };
}

function getImageFolder_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('IMG_FOLDER_ID');
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (e) { /* recria abaixo */ }
  }
  var folder = DriveApp.createFolder(IMAGE_FOLDER_NAME);
  props.setProperty('IMG_FOLDER_ID', folder.getId());
  return folder;
}

/**
 * Trata uma foto com a IA de imagem do Gemini (fundo branco, item centralizado, nítido,
 * 1:1 estilo catálogo). Recebe base64 (sem prefixo) + mime e devolve { data, mime } já
 * tratados. Devolve null em QUALQUER falha (sem chave, offline, erro da API, resposta sem
 * imagem) — quem chama deve então usar a foto original (rede de segurança).
 */
function tratarImagemGemini_(base64, mime) {
  try {
    var key = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    if (!key) return null; // chave não configurada → mantém a original

    var url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
      GEMINI_MODEL + ':generateContent?key=' + encodeURIComponent(key);
    var payload = {
      contents: [{
        parts: [
          { text: PROMPT_TRATAMENTO },
          { inline_data: { mime_type: mime || 'image/jpeg', data: base64 } }
        ]
      }]
    };
    var resp = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    if (resp.getResponseCode() !== 200) return null;

    var json = JSON.parse(resp.getContentText());
    var parts = json && json.candidates && json.candidates[0] &&
      json.candidates[0].content && json.candidates[0].content.parts;
    if (!parts || !parts.length) return null;

    for (var i = 0; i < parts.length; i++) {
      // a resposta REST usa camelCase (inlineData); aceitamos snake_case por segurança
      var inline = parts[i].inlineData || parts[i].inline_data;
      if (inline && inline.data) {
        return { data: inline.data, mime: inline.mimeType || inline.mime_type || 'image/png' };
      }
    }
    return null; // resposta veio sem parte de imagem
  } catch (e) {
    return null; // qualquer exceção → usa a original
  }
}

/**
 * Recebe imagens em Base64 e salva no Drive, anexando as URLs ao item.
 * Cada imagem é tratada pela IA do Gemini antes de salvar; se o tratamento falhar,
 * salva a foto original (nunca deixa de salvar). Só a versão final fica no Drive.
 * body: { codigo, images: [ { name, mime, data(base64 sem prefixo) } ] }
 */
function uploadImages_(body) {
  if (!body.images || !body.images.length) return { ok: false, error: 'Nenhuma imagem recebida.' };

  // Idempotência: se este mesmo envio (mesma "etiqueta") já foi processado, devolve as
  // URLs guardadas SEM tratar de novo — evita foto duplicada e gasto de crédito à toa
  // quando o app reenvia por ter perdido a resposta.
  var cache = CacheService.getScriptCache();
  var cacheKey = body.opKey ? ('img_' + body.opKey) : null;
  if (cacheKey) {
    var hit = cache.get(cacheKey);
    if (hit) return { ok: true, codigo: String(body.codigo), urls: JSON.parse(hit), cached: true };
  }

  var folder = getImageFolder_();
  var urls = [];

  body.images.forEach(function (img, i) {
    var mime = img.mime || 'image/jpeg';
    var data = img.data;

    // Tenta tratar com a IA; em qualquer falha, mantém os bytes originais.
    var tratada = tratarImagemGemini_(data, mime);
    if (tratada && tratada.data) {
      data = tratada.data;
      mime = tratada.mime || mime;
    }

    var ext = mime.indexOf('png') >= 0 ? 'png' : 'jpg';
    var name = (img.name || (body.codigo + '_' + Date.now() + '_' + i)) + '.' + ext;
    var blob = Utilities.newBlob(Utilities.base64Decode(data), mime, name);
    var file = folder.createFile(blob);
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (shareErr) {
      // Conta institucional pode bloquear link público — mantém o arquivo mesmo assim
    }
    urls.push('https://drive.google.com/file/d/' + file.getId() + '/view');
  });

  // Anexa às imagens já existentes do item
  var sheet = getSheet_();
  var col = buildColMap_(sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]);
  if (col.imagens !== undefined && col.codigo !== undefined) {
    var rowIndex = findRowByCodigo_(sheet, col, body.codigo);
    if (rowIndex > 0) {
      var cell = sheet.getRange(rowIndex, col.imagens + 1);
      var existing = String(cell.getValue() || '').split(',').map(function (s) { return s.trim(); }).filter(String);
      cell.setValue(existing.concat(urls).join(', '));
    }
  }

  // Lembra o resultado desta etiqueta por 6h (cobre qualquer retentativa do app).
  if (cacheKey) cache.put(cacheKey, JSON.stringify(urls), 21600);

  return { ok: true, codigo: String(body.codigo), urls: urls };
}

/* ------------------------------------------------------------------ */
/* Palavras-chave por IA (texto) — apelidos/sinônimos para a busca    */
/* ------------------------------------------------------------------ */

/**
 * Recebe um LOTE de itens [{ id, desc }] e devolve um mapa { id: "palavras, chave" }.
 * Manda tudo numa única chamada (eficiente) e força a resposta em JSON.
 * Em QUALQUER falha (sem chave, sem cota, erro, JSON inválido) devolve mapa vazio —
 * quem chama simplesmente não grava nada para aqueles itens (rede de segurança).
 */
function gerarPalavrasChaveLote_(itens) {
  var out = {};
  try {
    var key = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    if (!key || !itens || !itens.length) return out;

    var lista = itens.map(function (it) {
      return it.id + ') ' + String(it.desc || '').replace(/\s+/g, ' ').trim();
    }).join('\n');

    var url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
      GEMINI_TEXT_MODEL + ':generateContent?key=' + encodeURIComponent(key);
    var payload = {
      contents: [{ parts: [{ text: PROMPT_KW + '\n' + lista }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.2 }
    };
    var resp = UrlFetchApp.fetch(url, {
      method: 'post', contentType: 'application/json',
      payload: JSON.stringify(payload), muteHttpExceptions: true
    });
    if (resp.getResponseCode() !== 200) return out;

    var json = JSON.parse(resp.getContentText());
    var txt = json && json.candidates && json.candidates[0] && json.candidates[0].content &&
      json.candidates[0].content.parts && json.candidates[0].content.parts[0] &&
      json.candidates[0].content.parts[0].text;
    if (!txt) return out;

    var arr = JSON.parse(txt);                 // esperado: [{id, kw}, ...]
    if (!arr || !arr.length) return out;
    arr.forEach(function (o) {
      if (o && o.id !== undefined && o.kw) out[o.id] = String(o.kw).toLowerCase().trim();
    });
    return out;
  } catch (e) {
    return out;                                // nunca lança / nunca grava lixo
  }
}

/**
 * Diagnóstico TEMPORÁRIO: rode pelo editor (▶) para confirmar custo/cota do modelo de TEXTO
 * antes de rodar o lote. Mostra o HTTP code e o início da resposta no Registro de execução.
 */
function diagnosticarGeminiTexto() {
  var key = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  Logger.log('1) Chave configurada? ' + (key ? 'SIM (' + key.length + ' caracteres)' : 'NÃO'));
  if (!key) return;
  var url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
    GEMINI_TEXT_MODEL + ':generateContent?key=' + encodeURIComponent(key);
  var payload = {
    contents: [{ parts: [{ text: PROMPT_KW + '\n1) BORRIFADOR - AGUA PLASTICO 500ML' }] }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0.2 }
  };
  var resp = UrlFetchApp.fetch(url, {
    method: 'post', contentType: 'application/json',
    payload: JSON.stringify(payload), muteHttpExceptions: true
  });
  Logger.log('2) Modelo: ' + GEMINI_TEXT_MODEL + ' | Código HTTP: ' + resp.getResponseCode() + '  (200 = OK)');
  Logger.log('3) Resposta (início): ' + resp.getContentText().substring(0, 800));
}

/**
 * Orquestra a geração: pega só os itens SEM palavras-chave (idempotente), processa em lotes,
 * grava na coluna, para com segurança perto do limite de tempo e devolve um resumo.
 */
function gerarPalavrasChave_() {
  var inicio = Date.now();
  var LIMITE_MS = 5 * 60 * 1000;   // teto do Apps Script é ~6 min; paramos antes, por segurança
  var LOTE = 25;

  var sheet = getSheet_();          // garante a coluna "Palavras-chave"
  var col = buildColMap_(sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]);
  if (col.codigo === undefined || col.descricao === undefined || col.palavrasChave === undefined)
    return { ok: false, error: 'Faltam colunas Código/Descrição/Palavras-chave na planilha.' };

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return { ok: true, gerados: 0, pulados: 0, falhas: 0, parouNoMeio: false };

  // Lê as 3 colunas de uma vez (rápido). O "id" de cada item é o número da linha.
  var nLin = lastRow - 1;
  var codigos = sheet.getRange(2, col.codigo + 1, nLin, 1).getValues();
  var descs   = sheet.getRange(2, col.descricao + 1, nLin, 1).getValues();
  var kws     = sheet.getRange(2, col.palavrasChave + 1, nLin, 1).getValues();

  // Pendentes = tem código e descrição, e palavras-chave vazio.
  var pend = [];
  for (var i = 0; i < nLin; i++) {
    var temCod  = String(codigos[i][0] || '').trim() !== '';
    var temDesc = String(descs[i][0]   || '').trim() !== '';
    var temKw   = String(kws[i][0]     || '').trim() !== '';
    if (temCod && temDesc && !temKw) pend.push({ row: i + 2, desc: String(descs[i][0]) });
  }

  var pulados = nLin - pend.length;   // já preenchidos, ou sem código/descrição
  var gerados = 0, falhas = 0, parouNoMeio = false;

  for (var p = 0; p < pend.length; p += LOTE) {
    if (Date.now() - inicio > LIMITE_MS) { parouNoMeio = true; break; }
    var lote = pend.slice(p, p + LOTE).map(function (x) { return { id: x.row, desc: x.desc }; });
    var mapa = gerarPalavrasChaveLote_(lote);
    lote.forEach(function (x) {
      var kw = mapa[x.id];
      if (kw) { sheet.getRange(x.id, col.palavrasChave + 1).setValue(kw); gerados++; }
      else    { falhas++; }
    });
  }
  return { ok: true, gerados: gerados, pulados: pulados, falhas: falhas, parouNoMeio: parouNoMeio };
}

// Chamado pelo menu: roda a geração e mostra o resumo.
function gerarPalavrasChaveMenu() {
  var ui = SpreadsheetApp.getUi();
  var res = gerarPalavrasChave_();
  if (!res.ok) { ui.alert('Gerar palavras-chave', res.error, ui.ButtonSet.OK); return; }
  var msg = 'Gerados: ' + res.gerados +
    '\nPulados (já tinham / sem descrição): ' + res.pulados +
    '\nFalhas (a IA não retornou): ' + res.falhas;
  if (res.parouNoMeio) msg += '\n\n⏱️ Parei perto do limite de tempo. Rode de novo para continuar — os já feitos serão pulados.';
  ui.alert('Palavras-chave (IA)', msg, ui.ButtonSet.OK);
}

/* ------------------------------------------------------------------ */
/* Consumo — registro de saídas de materiais (aba "Consumo")          */
/* ------------------------------------------------------------------ */

var CONSUMO_SHEET = 'Consumo';
// Cabeçalhos no mesmo padrão da aba "Estoque" (Título descritivo em Português).
// As colunas são posicionais, então renomear é seguro.
var CONSUMO_HEADERS = ['ID', 'Data da Saída', 'Código Interno', 'Descrição', 'Quantidade', 'Solicitante', 'Observações', 'Registrado por'];

// Cria a aba "Consumo" (com formatos) se não existir e garante os cabeçalhos padronizados
function getConsumoSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONSUMO_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(CONSUMO_SHEET);
    sheet.setFrozenRows(1);
    var maxR = sheet.getMaxRows() - 1;
    sheet.getRange(2, 2, maxR, 1).setNumberFormat('dd/MM/yyyy HH:mm'); // Data da Saída
    sheet.getRange(2, 3, maxR, 1).setNumberFormat('@');                // Código como texto
  }
  // (re)aplica os cabeçalhos padronizados — atualiza também abas já existentes
  sheet.getRange(1, 1, 1, CONSUMO_HEADERS.length).setValues([CONSUMO_HEADERS]);
  return sheet;
}

// Grava um ou mais lançamentos de saída.  body: { entries: [ {id, dataHora, codigo, descricao, quantidade, solicitante, observacao} ] }
function addConsumo_(body) {
  var entries = body.entries || [];
  if (!entries.length) return { ok: false, error: 'Nenhum lançamento recebido.' };
  var sheet = getConsumoSheet_();
  var rows = entries.map(function (e) {
    var d = e.dataHora ? new Date(e.dataHora) : new Date();
    if (isNaN(d)) d = new Date();
    return [String(e.id || ''), d, String(e.codigo || ''), String(e.descricao || ''),
            Number(e.quantidade) || 0, String(e.solicitante || ''), String(e.observacao || ''),
            String(body._email || '')];
  });
  var start = sheet.getLastRow() + 1;
  // formata ANTES de gravar para preservar zeros à esquerda e a data
  sheet.getRange(start, 2, rows.length, 1).setNumberFormat('dd/MM/yyyy HH:mm');
  sheet.getRange(start, 3, rows.length, 1).setNumberFormat('@');
  sheet.getRange(start, 1, rows.length, CONSUMO_HEADERS.length).setValues(rows);
  return { ok: true, count: rows.length };
}

// Devolve todos os lançamentos de consumo (data em ISO para o app)
function getConsumo_() {
  var sheet = getConsumoSheet_();
  var values = sheet.getDataRange().getValues();
  var rows = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    if (!String(row[0] || '') && !String(row[2] || '')) continue; // linha vazia
    var dh = row[1], iso = '';
    if (Object.prototype.toString.call(dh) === '[object Date]' && !isNaN(dh)) {
      iso = Utilities.formatDate(dh, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss");
    } else {
      iso = String(dh || '');
    }
    rows.push({
      id: String(row[0] || ''),
      dataHora: iso,
      codigo: String(row[2] || ''),
      descricao: String(row[3] || ''),
      quantidade: Number(row[4]) || 0,
      solicitante: String(row[5] || ''),
      observacao: String(row[6] || '')
    });
  }
  return { ok: true, rows: rows, count: rows.length };
}

// Remove um lançamento pelo ID.  body: { id }
function deleteConsumo_(body) {
  var id = String(body.id || '');
  if (!id) return { ok: false, error: 'ID não informado.' };
  var sheet = getConsumoSheet_();
  var last = sheet.getLastRow();
  if (last < 2) return { ok: true };
  var ids = sheet.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === id) { sheet.deleteRow(i + 2); return { ok: true }; }
  }
  return { ok: true }; // já não existe — idempotente
}

/* ------------------------------------------------------------------ */
/* Atualizar Estoque — mescla a cópia do sistema sem perder o          */
/* enriquecimento (fotos, código de barras, observações, etc.)         */
/* ------------------------------------------------------------------ */

// Menu na planilha (aparece ao ABRIR a planilha).
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🔄 Almoxarifado')
    .addItem('1) Preparar aba "Importar"', 'prepararImportar')
    .addItem('2) Atualizar estoque (mesclar)', 'atualizarEstoqueMenu')
    .addItem('3) Gerar palavras-chave (IA)', 'gerarPalavrasChaveMenu')
    .addToUi();
}

// Cria/limpa a aba "Importar" e formata o Código como texto (preserva zeros à esquerda).
function prepararImportar() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(IMPORTAR_SHEET);
  if (!sh) sh = ss.insertSheet(IMPORTAR_SHEET);
  sh.clearContents();
  sh.getRange(1, 1, sh.getMaxRows(), 1).setNumberFormat('@'); // coluna A (Código) como texto
  ss.setActiveSheet(sh);
  SpreadsheetApp.getUi().alert('Aba "Importar" pronta',
    'Cole aqui a tabela copiada do sistema — COM a linha de títulos — a partir da célula A1.\n\n' +
    'Depois use o menu: 🔄 Almoxarifado → 2) Atualizar estoque.',
    SpreadsheetApp.getUi().ButtonSet.OK);
}

// Chamado pelo menu: roda a mesclagem e mostra o resumo.
function atualizarEstoqueMenu() {
  var ui = SpreadsheetApp.getUi();
  var res = atualizarEstoque_();
  if (!res.ok) { ui.alert('Atualizar estoque', res.error, ui.ButtonSet.OK); return; }
  ui.alert('Estoque atualizado',
    'Atualizados: ' + res.atualizados + '\n' +
    'Novos: ' + res.novos + '\n' +
    'Marcados "Sem estoque": ' + res.semEstoque,
    ui.ButtonSet.OK);
}

// Mapeia as colunas da aba Importar pelo cabeçalho.
function buildImportColMap_(headerRow) {
  var map = {};
  headerRow.forEach(function (h, i) {
    var k = norm_(h);
    if (k === 'codigo' || k === 'codigo interno') { if (map.codigo === undefined) map.codigo = i; }
    else if (k === 'descricao') { if (map.descricao === undefined) map.descricao = i; }
    else if (k === 'unidade de distribuicao' || k === 'unidade') { if (map.unidade === undefined) map.unidade = i; }
    else if (k === 'quantidade' || k === 'estoque sistema') { if (map.estoqueSistema === undefined) map.estoqueSistema = i; }
  });
  return map;
}

// Código sem zeros à esquerda e sem espaços (casa 018937001 com 18937001).
function normCodigo_(c) {
  return String(c == null ? '' : c).replace(/\s+/g, '').replace(/^0+/, '');
}

// "63,00" / "1.234,00" -> número.
function parseNumBR_(v) {
  if (v === '' || v == null) return 0;
  if (typeof v === 'number') return v;
  var s = String(v).trim().replace(/\./g, '').replace(',', '.');
  var n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

// Mescla a aba "Importar" na aba "Estoque" por Código Interno, preservando o enriquecimento.
function atualizarEstoque_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var imp = ss.getSheetByName(IMPORTAR_SHEET);
  if (!imp) return { ok: false, error: 'Crie a aba "' + IMPORTAR_SHEET + '" (menu 1) e cole os dados do sistema.' };
  var impVals = imp.getDataRange().getValues();
  if (impVals.length < 2) return { ok: false, error: 'A aba "' + IMPORTAR_SHEET + '" está vazia. Cole os dados COM o cabeçalho e tente de novo.' };

  var impCol = buildImportColMap_(impVals[0]);
  if (impCol.codigo === undefined || impCol.estoqueSistema === undefined)
    return { ok: false, error: 'Não achei as colunas "Código" e "Quantidade" no cabeçalho da aba "' + IMPORTAR_SHEET + '". Cole a tabela COM a linha de títulos.' };

  var sheet = getSheet_();                 // garante a coluna "Situação"
  var data = sheet.getDataRange().getValues();
  var col = buildColMap_(data[0]);
  var width = data[0].length;

  // índice: código normalizado -> linha no array (0-based, inclui o cabeçalho)
  var idx = {};
  for (var r = 1; r < data.length; r++) {
    var cod = col.codigo !== undefined ? data[r][col.codigo] : '';
    if (cod === '' || cod === null) continue;
    idx[normCodigo_(cod)] = r;
  }

  function recalcDiff(rowArr) {
    if (col.diferenca === undefined || col.estoqueFisico === undefined) return;
    var fis = rowArr[col.estoqueFisico];
    if (fis === '' || fis === null) return;            // sem conferência -> não mexe
    var sis = col.estoqueSistema !== undefined ? Number(rowArr[col.estoqueSistema]) || 0 : 0;
    rowArr[col.diferenca] = (Number(fis) || 0) - sis;
  }

  var atualizados = 0, novos = 0, semEstoque = 0, vistos = {};

  for (var i = 1; i < impVals.length; i++) {
    var codigoRaw = String(impVals[i][impCol.codigo] == null ? '' : impVals[i][impCol.codigo]).trim();
    if (!codigoRaw) continue;
    var nc = normCodigo_(codigoRaw);
    vistos[nc] = true;
    var desc = impCol.descricao !== undefined ? String(impVals[i][impCol.descricao] || '') : '';
    var uni  = impCol.unidade   !== undefined ? String(impVals[i][impCol.unidade] || '') : '';
    var qtd  = parseNumBR_(impVals[i][impCol.estoqueSistema]);

    if (idx[nc] !== undefined) {                       // já existe -> atualiza só o sistema
      var rr = data[idx[nc]];
      if (col.descricao !== undefined && desc) rr[col.descricao] = desc;
      if (col.unidade !== undefined && uni)    rr[col.unidade] = uni;
      if (col.estoqueSistema !== undefined)    rr[col.estoqueSistema] = qtd;
      if (col.situacao !== undefined)          rr[col.situacao] = '';   // voltou ao sistema
      recalcDiff(rr);
      atualizados++;
    } else {                                            // novo -> linha nova
      var nr = [];
      for (var k = 0; k < width; k++) nr.push('');
      if (col.codigo !== undefined)         nr[col.codigo] = codigoRaw;
      if (col.descricao !== undefined)      nr[col.descricao] = desc;
      if (col.unidade !== undefined)        nr[col.unidade] = uni;
      if (col.estoqueSistema !== undefined) nr[col.estoqueSistema] = qtd;
      if (col.inventariado !== undefined)   nr[col.inventariado] = 'Não';
      data.push(nr);
      novos++;
    }
  }

  // Itens que sumiram do sistema -> Estoque Sistema = 0 + "Sem estoque"
  for (var r2 = 1; r2 < data.length; r2++) {
    var c2 = col.codigo !== undefined ? data[r2][col.codigo] : '';
    if (c2 === '' || c2 === null) continue;
    if (vistos[normCodigo_(c2)]) continue;             // veio no import -> ok
    var rr2 = data[r2];
    var jaSem = col.situacao !== undefined && String(rr2[col.situacao] || '') === 'Sem estoque';
    if (col.estoqueSistema !== undefined) rr2[col.estoqueSistema] = 0;
    if (col.situacao !== undefined)       rr2[col.situacao] = 'Sem estoque';
    recalcDiff(rr2);
    if (!jaSem) semEstoque++;
  }

  var need = data.length - sheet.getMaxRows();
  if (need > 0) sheet.insertRowsAfter(sheet.getMaxRows(), need);
  sheet.getRange(1, 1, data.length, width).setValues(data);

  return { ok: true, atualizados: atualizados, novos: novos, semEstoque: semEstoque };
}
