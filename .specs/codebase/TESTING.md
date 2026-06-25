# Testing Infrastructure

**Analyzed:** 2026-06-25

## Test Frameworks
- **Unit/Integration:** nenhum configurado.
- **E2E:** nenhum.
- **Coverage:** não medido.

> Hoje o projeto **não tem testes automatizados**. A verificação é **manual**: abrir o
> app no navegador/celular e conferir o comportamento. Isso é comum em projetos que
> nasceram pequenos — e é o primeiro ponto que a metodologia recomenda evoluir
> (ver `../project/ROADMAP.md`, item 1, e `CONCERNS.md`).

## Test Organization
- **Location:** não há pasta de testes.
- **Naming / Structure:** não aplicável ainda.

## Test Execution
- **Commands:** não há (sem `package.json`, sem runner).
- Verificação manual sugerida hoje:
  1. Servir os arquivos por HTTPS (GitHub Pages ou um servidor local).
  2. Configurar a URL do Apps Script no ⚙️.
  3. Conferir item, tirar foto, ler QR, importar requisição, gerar Excel.
  4. Testar **offline** (desligar a rede) e depois sincronizar.

## Test Coverage Matrix
Quais camadas deveriam ter quais testes quando começarmos a testar:

| Code Layer | Required Test Type | Location Pattern | Run Command |
| ---------- | ------------------ | ---------------- | ----------- |
| Funções puras (`natCmp`, `normCod`, `parseImport`, `fmtDate`, `ymd`) | unit | (a definir) | (a definir) |
| Helpers do backend (`isoDate_`, `parseYmd_`, `buildColMap_`, `aliases_`) | unit | (a definir) | (a definir) |
| Sincronização / IndexedDB (`mergeWithPending`, `syncNow`) | integration | (a definir) | (a definir) |
| Fluxos de UI (conferir, separação, consumo) | e2e (opcional) | (a definir) | (a definir) |

> As funções "puras" (que só recebem entrada e devolvem saída, sem tocar tela nem
> rede) são as **mais fáceis e valiosas** para começar a testar.

## Gate Check Commands
| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | — | (não há — verificação manual) |
| Full | — | (não há — verificação manual) |
| Build | — | (não há etapa de build) |

## Recomendação
Sugestão de menor atrito para começar (a ser especificado antes): extrair as funções
puras para um arquivo testável e usar um runner leve (ex.: Vitest ou até testes em
HTML puro), sem introduzir um processo de build pesado — coerente com a escolha
"sem build" registrada em `STACK.md`.
