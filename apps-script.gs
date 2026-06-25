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

var SHEET_NAME = 'Página1';
var IMAGE_FOLDER_NAME = 'Almoxarifado UDESC - Imagens';

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
  { key: 'inventariado',   label: 'Status do Inventário' },
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
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
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
                 'diasAviso', 'observacoes', 'inventariado', 'imagens'];
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
    'status inventario': 'inventariado',
    'status de inventario': 'inventariado',
    'status do inventario': 'inventariado',
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
/* doGet — devolve todas as linhas                                    */
/* ------------------------------------------------------------------ */

function doGet(e) {
  try {
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

    if (action === 'pushItem')     return jsonOut_(pushItem_(body));
    if (action === 'uploadImages') return jsonOut_(uploadImages_(body));
    if (action === 'deleteImage')  return jsonOut_(deleteImage_(body));

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
 * Recebe imagens em Base64 e salva no Drive, anexando as URLs ao item.
 * body: { codigo, images: [ { name, mime, data(base64 sem prefixo) } ] }
 */
function uploadImages_(body) {
  if (!body.images || !body.images.length) return { ok: false, error: 'Nenhuma imagem recebida.' };

  var folder = getImageFolder_();
  var urls = [];

  body.images.forEach(function (img, i) {
    var mime = img.mime || 'image/jpeg';
    var ext = mime.indexOf('png') >= 0 ? 'png' : 'jpg';
    var name = (img.name || (body.codigo + '_' + Date.now() + '_' + i)) + '.' + ext;
    var blob = Utilities.newBlob(Utilities.base64Decode(img.data), mime, name);
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

  return { ok: true, codigo: String(body.codigo), urls: urls };
}
