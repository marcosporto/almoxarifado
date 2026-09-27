# Testing Infrastructure

**Analyzed:** 2026-06-25
**Atualizado:** 2026-09-26 — o projeto passou a ter testes automatizados.

## Test Frameworks
- **Unit:** runner nativo do Node (`node:test` + `node:assert`). **Sem dependências**
  — não há `node_modules`.
- **E2E:** nenhum.
- **Coverage:** não medido (o Node tem `--experimental-test-coverage`, ainda não ligado).

> **Por que o runner nativo e não Vitest?** O Vitest exigiria `node_modules`, e a pasta
> do projeto fica dentro do Google Drive: a instalação não completa (o Drive trava os
> arquivos durante a sincronização) e deixaria milhares de arquivos sincronizando para
> sempre. O runner embutido no Node resolve o mesmo problema com zero instalação, o que
> também combina com a decisão "sem build" registrada em `STACK.md`.

## Test Organization
- **Location:** `tests/`
- **Naming:** `<assunto>.test.js` (o Node descobre `**/*.test.js` sozinho).
- **Structure:** um `describe` por função, com os casos em português dizendo *por que*
  aquele caso importa, não só o que ele faz.
- **Módulo testado:** `js/utils.js` — funções puras extraídas do `index.html`. Esse
  arquivo é carregado pelo navegador como script comum (define globais, como antes) e
  pelo Node como módulo CommonJS. O bloco no fim do arquivo faz as duas coisas.

## Test Execution
| Comando | O que faz |
| ------- | --------- |
| `npm test` | roda todos os testes uma vez |
| `npm run test:watch` | re-roda a cada alteração de arquivo |
| `node --test` | equivalente ao `npm test`, sem passar pelo npm |

Verificação **manual** continua necessária para o que os testes não cobrem:
1. Servir os arquivos por HTTPS (GitHub Pages ou servidor local).
2. Configurar a URL do Apps Script no ⚙️.
3. Conferir item, tirar foto, ler QR, importar requisição, gerar Excel.
4. Testar **offline** (desligar a rede) e depois sincronizar.

## Test Coverage Matrix
| Code Layer | Required Test Type | Location Pattern | Status |
| ---------- | ------------------ | ---------------- | ------ |
| `natCmp`, `normCod`, `fmtDate`, `ymd` | unit | `tests/utils.test.js` | ✅ 20 testes |
| `parseImport` | unit | `tests/` | ❌ **não é pura** — lê o DOM (`linhas()`) e a variável global `items`. Precisa receber os dados por parâmetro antes de poder ser testada. |
| `esc`, `fmtDateTime`, `fmtUnidade`, `driveId` | unit | `tests/` | ❌ são puras e fáceis; ainda no `index.html`. `esc()` é a defesa contra XSS — vale prioridade. |
| Helpers do backend (`isoDate_`, `parseYmd_`, `buildColMap_`, `aliases_`) | unit | `tests/` | ❌ vivem no `apps-script.gs`, que é colado inteiro no editor do Apps Script. Testá-los exige decidir antes como dividir esse arquivo (ver ROADMAP). |
| Sincronização / IndexedDB (`mergeWithPending`, `syncNow`) | integration | `tests/` | ❌ maior risco do projeto (perda de dados conferidos offline) e o mais caro de testar. |
| Fluxos de UI (conferir, separação, consumo) | e2e (opcional) | — | ❌ |

## Gate Check Commands
| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | antes de cada commit | `npm test` |
| Full | antes de publicar | `npm test` + roteiro manual acima |
| Build | — | (não há etapa de build) |

## Próximo passo sugerido
As funções puras que sobraram no `index.html` (`esc`, `fmtDateTime`, `fmtUnidade`,
`driveId`) são o caminho de menor atrito: mesma extração já feita, mesmo arquivo de
teste. Depois delas, `parseImport` — que exige uma refatoração pequena (receber as
duas listas por parâmetro em vez de ler o DOM) e é onde mora risco real de importar
requisição errada.
