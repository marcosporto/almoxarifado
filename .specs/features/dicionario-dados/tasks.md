# Dicionário de Dados / Planilha Autoexplicativa — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its
Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is
the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review,
Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

> Nota desta sessão: a skill está instalada em `~/.claude/skills/tlc-spec-driven/`, mas pode não
> estar na lista de skills carregada no início da sessão em que este arquivo for executado. Se
> `Skill(tlc-spec-driven)` falhar com "Unknown skill", siga manualmente as instruções lendo
> `SKILL.md` e `references/implement.md` diretamente do disco — mesmo conteúdo, mesmas regras.

---

**Design**: (fase Design pulada — escopo Medium, sem decisão arquitetural: `Range.setNote()` é uso
direto da API do Google Sheets, sem padrão novo a desenhar)
**Spec**: `.specs/features/dicionario-dados/spec.md`
**Status**: Approved

---

## Test Coverage Matrix

> Guidelines found: `.specs/codebase/TESTING.md` ("projeto não tem testes automatizados";
> verificação manual) + convenção observada em todas as features anteriores
> (`features/*/tasks.md`: `Tests: none`, `Gate: build (node --check)`). Sem framework de teste
> configurado — aplicado o padrão já estabelecido no projeto, não o default genérico da skill.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------- | --------------------- | ----------------- | ----------- |
| Backend — metadata (`COLUMN_DOCS`, `CONSUMO_DOCS`, helper de notas) | none | Verificação manual: abrir a planilha e conferir nota em cada cabeçalho | `apps-script.gs` | `node --check apps-script.gs` |
| Documentação (`.md`) | none | Revisão de leitura — texto bate com as notas da planilha | `.specs/codebase/DATA-DICTIONARY.md` | — |

## Gate Check Commands

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Build | Após qualquer task que edita `apps-script.gs` | `node --check apps-script.gs` |
| Full | Após a Fase 3 (antes de considerar a feature concluída) | `node --check apps-script.gs` + abrir a planilha e conferir notas nas 2 abas + rodar o app normalmente (conferir 1 item, sincronizar) |

---

## Execution Plan

Fase única (7 tasks, cabe num único batch — sem necessidade de sub-agentes).

```
Fase 1 — Backend (fonte de texto + notas):  T1 → T2 → T3 → T4 → T5
Fase 2 — Documentação:                       T6
Fase 3 — Publicar / Verificar:               T7
```

---

## Task Breakdown

### T1: `COLUMN_DOCS` — fonte de texto das colunas de Estoque

**What**: Objeto `COLUMN_DOCS` (chave = `key` de `COLUMNS`) com `{ desc, values? }` para as 17
colunas: o que a coluna significa, o que/quem a preenche, e valores possíveis quando enum-like
(ex. `situacao`, `inventariado`).
**Where**: `apps-script.gs` (perto da definição de `COLUMNS`)
**Depends on**: None
**Reuses**: `COLUMNS`, `canonicalLabelByKey_`
**Requirement**: DICT-01, DICT-05

**Done when**:
- [ ] `COLUMN_DOCS` tem uma entrada para cada um dos 17 `key` de `COLUMNS` — nenhum faltando.
- [ ] Cada entrada tem `desc` (1-3 frases, PT-BR, tom direto — igual aos docs de `.specs/codebase/`).
- [ ] Colunas com valores possíveis conhecidos (`situacao`, `inventariado`) têm `values` listando-os.
- [ ] `node --check apps-script.gs` passa.

**Tests**: none
**Gate**: build
**Commit**: `docs(dict): define textos das colunas de Estoque (COLUMN_DOCS)`

---

### T2: `CONSUMO_DOCS` — fonte de texto das colunas de Consumo

**What**: Objeto `CONSUMO_DOCS` (chave = label de `CONSUMO_HEADERS`, já que Consumo não usa
sistema de `key`/alias) com `{ desc }` para as 8 colunas.
**Where**: `apps-script.gs` (perto de `CONSUMO_HEADERS`)
**Depends on**: None
**Reuses**: `CONSUMO_HEADERS`
**Requirement**: DICT-02, DICT-05

**Done when**:
- [ ] `CONSUMO_DOCS` tem uma entrada para cada uma das 8 labels de `CONSUMO_HEADERS`.
- [ ] Cada entrada tem `desc` (1-3 frases, PT-BR).
- [ ] `node --check apps-script.gs` passa.

**Tests**: none
**Gate**: build
**Commit**: `docs(dict): define textos das colunas de Consumo (CONSUMO_DOCS)`

---

### T3: Helper `applyHeaderNotes_` — aplica as notas, idempotente e à prova de falha

**What**: Função `applyHeaderNotes_(sheet, headerRow, docsByCanonicalIndex)` que, para cada
coluna reconhecida do cabeçalho real da planilha, chama `range.setNote(texto)` (sobrescreve
sempre — idempotente). Ignora colunas não mapeadas/duplicadas (mesma regra de primeira-ocorrência
de `buildColMap_`). Cada `setNote()` isolado em try/catch — uma falha pontual não aborta as
demais nem propaga para quem chamou.
**Where**: `apps-script.gs`
**Depends on**: T1, T2
**Reuses**: `buildColMap_`, `norm_`
**Requirement**: DICT-01, DICT-02, DICT-03, DICT-04, DICT-05

**Done when**:
- [ ] Função aceita a sheet, a linha de cabeçalho real (posições podem estar em qualquer ordem) e
      o mapa de textos, e aplica a nota certa em cada coluna reconhecida.
- [ ] Rodar duas vezes seguidas não duplica nem acumula texto — a segunda chamada sobrescreve com
      o mesmo conteúdo (idempotente).
- [ ] Coluna duplicada (mesmo nome mapeando pro mesmo `key`) só recebe nota na 1ª ocorrência.
- [ ] Um erro dentro de uma chamada `setNote()` (simulado) não impede as outras colunas de
      receberem nota, nem lança exceção para o chamador.
- [ ] `node --check apps-script.gs` passa.

**Tests**: none
**Gate**: build
**Commit**: `feat(dict): helper applyHeaderNotes_ (idempotente, à prova de falha)`

---

### T4: Conectar as notas na aba Estoque (`getSheet_` / `ensureColumns_`)

**What**: Chamar `applyHeaderNotes_` a partir de `getSheet_` (toda vez que a aba é garantida,
criada ou já existente) e de `ensureColumns_` (quando uma coluna nova é adicionada a uma planilha
antiga) — para que a nota apareça tanto numa planilha nova quanto numa planilha que ganhou
coluna nova.
**Where**: `apps-script.gs` — `getSheet_`, `ensureColumns_`
**Depends on**: T3
**Reuses**: `applyHeaderNotes_`, `buildColMap_`
**Requirement**: DICT-01, DICT-03, DICT-04

**Done when**:
- [ ] Planilha nova (cabeçalho recém-criado) já sai com as notas aplicadas.
- [ ] Planilha existente sem coluna nova (ex. `palavrasChave`) ganha a coluna E a nota juntas ao
      rodar `ensureColumns_`.
- [ ] Planilha já com todas as colunas: `getSheet_` reaplica as notas sem erro nem duplicação.
- [ ] `node --check apps-script.gs` passa.

**Tests**: none
**Gate**: build
**Commit**: `feat(dict): aplica notas de cabeçalho na aba Estoque`

---

### T5: Conectar as notas na aba Consumo (`getConsumoSheet_`)

**What**: Chamar `applyHeaderNotes_` (ou variante simples, já que `CONSUMO_HEADERS` não usa
sistema de `key`) a partir de `getConsumoSheet_`.
**Where**: `apps-script.gs` — `getConsumoSheet_`
**Depends on**: T3
**Reuses**: `applyHeaderNotes_`, `CONSUMO_DOCS`
**Requirement**: DICT-02, DICT-03, DICT-04

**Done when**:
- [ ] Toda vez que `getConsumoSheet_` roda, os 8 cabeçalhos recebem/reaplicam a nota certa.
- [ ] `node --check apps-script.gs` passa.

**Tests**: none
**Gate**: build
**Commit**: `feat(dict): aplica notas de cabeçalho na aba Consumo`

---

### T6: Criar `.specs/codebase/DATA-DICTIONARY.md`

**What**: Novo doc listando as 17 colunas de `Estoque` e as 8 de `Consumo` — rótulo, chave
interna, o que significa, o que/quem preenche, valores possíveis. Mesmo texto de `COLUMN_DOCS` /
`CONSUMO_DOCS` (T1/T2) — não reescrever a explicação com palavras diferentes. Formato/tom igual
aos demais arquivos de `.specs/codebase/` (tabelas, direto, sem enrolação).
**Where**: `.specs/codebase/DATA-DICTIONARY.md` (novo arquivo)
**Depends on**: T1, T2
**Reuses**: texto de `COLUMN_DOCS`/`CONSUMO_DOCS`; formato de `INTEGRATIONS.md`/`STRUCTURE.md`
**Requirement**: DICT-06, DICT-07, DICT-08

**Done when**:
- [ ] Doc cobre as 17 colunas de Estoque + 8 de Consumo (25 no total), nenhuma faltando.
- [ ] Texto de cada coluna bate com a nota aplicada na planilha (mesma fonte, T1/T2).
- [ ] Formato consistente com os outros arquivos de `.specs/codebase/`.

**Tests**: none
**Gate**: none (revisão de leitura)
**Commit**: `docs(dict): cria DATA-DICTIONARY.md`

---

### T7: Publicar backend + verificação fim a fim

**What**: Guiar a republicação do backend (Apps Script → Implantar → Gerenciar implantações →
Nova versão) e confirmar visualmente que as notas aparecem nas duas abas; rodar o fluxo normal do
app (abrir, conferir 1 item, sincronizar) para garantir que nada quebrou.
**Where**: Apps Script + planilha (passos guiados pelo usuário)
**Depends on**: T4, T5, T6
**Requirement**: Success Criteria da spec

**Done when**:
- [ ] `node --check apps-script.gs` passa (checagem final).
- [ ] Backend republicado.
- [ ] Nota visível ao passar o mouse em todos os cabeçalhos de `Estoque` e `Consumo`.
- [ ] App segue funcionando normalmente (abrir, conferir item, sincronizar) — DICT-04 confirmado.

**Tests**: none
**Gate**: full

---

## Phase Execution Map

```
Fase 1 → Fase 2 → Fase 3

Fase 1:  T1 ──→ T2 ──→ T3 ──→ T4 ──→ T5
Fase 2:  T6
Fase 3:  T7
```

Execução sequencial, sem paralelismo — 7 tasks cabem num único batch (≤ ~8), sem sub-agentes.

---

## Task Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1: `COLUMN_DOCS` | 1 objeto de dados | ✅ Granular |
| T2: `CONSUMO_DOCS` | 1 objeto de dados | ✅ Granular |
| T3: `applyHeaderNotes_` | 1 função | ✅ Granular |
| T4: conectar em Estoque | 1 ponto de integração (2 funções existentes) | ✅ Granular |
| T5: conectar em Consumo | 1 ponto de integração | ✅ Granular |
| T6: `DATA-DICTIONARY.md` | 1 arquivo | ✅ Granular |
| T7: publicar/verificar | 1 checklist de verificação | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (corpo) | Diagrama mostra | Status |
|---|---|---|---|
| T1 | None | (nenhuma seta) | ✅ Match |
| T2 | None | (nenhuma seta) | ✅ Match |
| T3 | T1, T2 | T1→T3, T2→T3 | ✅ Match |
| T4 | T3 | T3→T4 | ✅ Match |
| T5 | T3 | T3→T5 | ✅ Match |
| T6 | T1, T2 | Fase 1→Fase 2 | ✅ Match |
| T7 | T4, T5, T6 | Fase 1,2→Fase 3 | ✅ Match |

---

## Test Co-location Validation

| Task | Code Layer | Matriz exige | Task diz | Status |
|---|---|---|---|---|
| T1 | Backend metadata | none | none | ✅ OK |
| T2 | Backend metadata | none | none | ✅ OK |
| T3 | Backend metadata | none | none | ✅ OK |
| T4 | Backend metadata | none | none | ✅ OK |
| T5 | Backend metadata | none | none | ✅ OK |
| T6 | Documentação | none | none | ✅ OK |
| T7 | — (verificação) | none | none | ✅ OK |

---

## Requirement Coverage

| Req | Task(s) |
|---|---|
| DICT-01 | T1, T3, T4 |
| DICT-02 | T2, T3, T5 |
| DICT-03 | T3, T4, T5 |
| DICT-04 | T3, T4, T5, T7 |
| DICT-05 | T1, T2, T3 |
| DICT-06 | T6 |
| DICT-07 | T6 |
| DICT-08 | T6 |

**Coverage:** 8/8 mapeados ✅

---

## Tools

**MCP**: NONE — projeto não tem MCP configurado (`.specs/codebase/STACK.md`).
**Skill**: `tlc-spec-driven` (Execute flow) — nenhuma skill adicional necessária; tarefa é uso
direto e bem documentado da API do Google Apps Script, sem pesquisa externa exigida pela
Knowledge Verification Chain além do próprio código já lido nesta análise.
