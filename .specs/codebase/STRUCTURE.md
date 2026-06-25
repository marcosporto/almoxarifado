# STRUCTURE — onde fica cada coisa

## Arquivos do projeto

| Arquivo | Linhas (aprox.) | O que é |
|---------|------|---------|
| `index.html` | ~1180 | **O app inteiro**: HTML + CSS (`<style>`) + JavaScript (`<script>`) |
| `apps-script.gs` | ~535 | Backend (API) que roda no Google Apps Script |
| `sw.js` | ~63 | Service Worker (cache offline do app shell) |
| `manifest.json` | ~14 | Configuração do PWA (nome, ícone, cores, tela cheia) |
| `icon.svg` | — | Ícone do app (logo UDESC) |
| `LEIA-ME.md` | — | Guia de publicação (backend + GitHub Pages + uso) |
| `.specs/` | — | Documentação da metodologia (esta pasta) |

## Mapa interno do `index.html`
Como tudo está num arquivo só, vale saber por blocos (as linhas mudam ao editar):

- **`<style>`** — CSS organizado por seção com comentários `/* ===== ... ===== */`:
  identidade visual, app bar, status/sync, filtros, cards, modais, bottom nav.
- **`<body>`** — cabeçalho, barra de status, filtros, lista de itens e **modais**
  (config, scanner, separação, imagem, importar, consumo, saída, relatório, confirmação).
- **`<script>`** — agrupado por comentários de seção:
  - IndexedDB (helpers `db`, `idbGet`, `idbPut`…)
  - Modais (com histórico p/ botão Voltar) e diálogos próprios (`confirmDialog`, etc.)
  - Carregamento (`loadData`, `mergeWithPending`)
  - Render (`render`, `card`)
  - Ações de inventário (`confirmInv`, `salvarCampos`, `gatherFields`)
  - Fotos (`addPhotos`, `compress`, `delImage`)
  - Fila + sincronização (`enqueue`, `syncNow`)
  - Scanner QR (`startScan`, `scanInto`, `scanSearch`)
  - Separação (`renderPick`, `addToPick`, `parseImport`, `doImport`)
  - Consumo (`loadConsumo`, `novaSaida`, `gerarPlanilha`)
  - Utils (`driveId`, `natCmp`, `esc`, `fmtDate`…) e Init (`window.onload`)

## Mapa interno do `apps-script.gs`
- Configuração: `SHEET_NAME`, `COLUMNS`, `CONSUMO_HEADERS`.
- Helpers de coluna: `buildColMap_`, `aliases_`, `norm_`, `ensureColumns_`.
- API: `doGet`, `doPost` e os handlers (`pushItem_`, `uploadImages_`, `addConsumo_`…).
- Funções utilitárias rodadas à mão no editor: `autorizarDrive`, `padronizarPlanilha`.

> Convenção observada: funções com `_` no fim são **internas** (não aparecem no
> seletor de funções do editor do Apps Script).
