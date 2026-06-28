# Busca Inteligente + Palavras-chave (IA) — Tasks

**Design**: `.specs/features/busca-palavras-chave/design.md`
**Status**: EXECUTE em andamento. ✅ Fase A (backend): T1 (coluna+doGet), T2 (helper IA texto+
diagnóstico), T3 (orquestrador+menu) — feitos e commitados. ⏭️ Próximo: Fase B (frontend).

---

## 📖 Como ler isto

Quebrei a feature em **7 passos pequenos**, em 3 fases. Cada passo tem um objetivo único e um
jeito de **conferir** (manual — o app não tem testes automáticos; marcado honestamente como
`Tests: none (verificação manual)`). Eu escrevo o código e te mostro; os passos manuais (rodar o
menu, republicar) eu te guio.

A **Fase A (backend)** e a **Fase B (frontend)** mexem em arquivos diferentes; faço em sequência
pra ficar fácil de acompanhar. Cada passo vira **um commit atômico**.

---

## Execution Plan

```
Fase A — Backend (apps-script.gs)
  T1 (coluna Palavras-chave + doGet)
  T2 (helper IA texto + diagnóstico)        ← depende de nada
  T3 (orquestrador + menu)                  ← depende de T1 e T2

Fase B — Frontend (index.html)
  T4 (app recebe palavrasChave)             ← depende de T1 (backend devolvendo)
  T5 (busca nova: tokeniza + pontua + DRY)  ← depende de T4

Fase C — Publicar / Verificar
  T6 (confirmar custo + rodar o menu IA)    ← depende de T1,T2,T3 publicados
  T7 (verificação fim a fim)                ← depende de tudo
```

---

## Task Breakdown

### T1: Coluna "Palavras-chave" no backend → [BUSCA-04, BUSCA-05(back)]
**What**: Criar/garantir a coluna e devolvê-la no `doGet`.
**Where**: `apps-script.gs` — `COLUMNS`, `aliases_()`, `WANT_KEYS`, `doGet`.
**Depends on**: None
**Reuses**: `buildColMap_`, `ensureColumns_`, `getSheet_`.
**Done when**:
- `COLUMNS` tem `{ key:'palavrasChave', label:'Palavras-chave' }`; `aliases_` reconhece
  "palavras-chave/palavras chave/palavra-chave/apelidos/apelido"; `WANT_KEYS` inclui `palavrasChave`.
- Ao abrir a planilha pelo app, a coluna existe (criada se faltava; não duplica se já existia).
- `doGet` retorna `palavrasChave` por item.
**Tests**: none (verificação manual: ver a coluna na planilha; conferir no retorno do app).
**Gate**: build (node --check no .gs).
**Commit**: `feat(busca): adiciona coluna "Palavras-chave" e a retorna no doGet`

### T2: Helper da IA de texto + diagnóstico → [BUSCA-08, BUSCA-11]
**What**: Função que manda descrições em lote e recebe apelidos em JSON; função de diagnóstico.
**Where**: `apps-script.gs` — `GEMINI_TEXT_MODEL`, `PROMPT_KW`, `gerarPalavrasChaveLote_`,
`diagnosticarGeminiTexto`.
**Depends on**: None
**Reuses**: padrão `UrlFetchApp`/parse da feature de foto; `GEMINI_API_KEY`.
**Done when**:
- `gerarPalavrasChaveLote_(descricoes)` chama o modelo de texto com `responseMimeType:
  'application/json'`, prompt **ancorado** (pt-br, minúsculo, vírgula, não inventa), e devolve
  mapa `id→kw`; em qualquer falha devolve mapa vazio (não lança).
- `diagnosticarGeminiTexto()` loga HTTP code + trecho da resposta (igual ao da foto).
**Tests**: none (verificação manual: rodar `diagnosticarGeminiTexto` no editor → HTTP 200 + JSON).
**Gate**: build (node --check).
**Commit**: `feat(busca): helper de palavras-chave por IA (texto) + diagnostico`

### T3: Orquestrador em lote + item de menu → [BUSCA-06, BUSCA-07, BUSCA-09, BUSCA-10]
**What**: Varrer itens sem palavra-chave, processar em lotes, gravar, com guarda de tempo e resumo.
**Where**: `apps-script.gs` — `gerarPalavrasChave_`, `gerarPalavrasChaveMenu`, `onOpen` (+item de menu).
**Depends on**: T1, T2
**Reuses**: padrão de menu da feature "Atualizar Estoque".
**Done when**:
- Menu **"🔄 Almoxarifado → 3) Gerar palavras-chave (IA)"** existe.
- Processa **só** itens com `codigo`+`descricao` e `palavrasChave` **vazio** (idempotente).
- Lotes de ~25 por chamada; grava o retorno na coluna; item sem retorno fica em branco (= falha).
- Para com segurança perto de ~5 min e avisa para re-rodar.
- Mostra resumo `{ gerados, pulados, falhas }`.
**Tests**: none (verificação manual na T6).
**Gate**: build (node --check).
**Commit**: `feat(busca): menu que gera palavras-chave em lote (idempotente, com resumo)`

### T4: App recebe "palavrasChave" → [BUSCA-05(front)]
**What**: Incluir o campo no modelo de item e no snapshot local.
**Where**: `index.html` — parsing do `doGet`/montagem do item e `saveSnapshot`/load.
**Depends on**: T1
**Reuses**: fluxo de carregamento/snapshot existente.
**Done when**: cada item passa a ter `palavrasChave` (string) carregado do servidor e persistido offline.
**Tests**: none (verificação manual: inspecionar um item; buscar por palavra-chave cadastrada à mão).
**Gate**: build (node --check no `<script>`).
**Commit**: `feat(busca): app carrega o campo palavras-chave do item`

### T5: Busca nova (tokeniza + pontua + DRY) → [BUSCA-01, BUSCA-02, BUSCA-03]
**What**: Matcher compartilhado com tokenização (E), múltiplos campos e ranqueamento; aplicar nos
3 pontos de busca; subir versão.
**Where**: `index.html` — novo `matchScore_(it, tokens)`; `render`, `renderSaidaBusca`,
`renderPickSearch`; `APP_VERSION`; `sw.js` `CACHE`.
**Depends on**: T4
**Reuses**: `norm()`; ordenação atual como critério de desempate.
**Done when**:
- "agua borrifador" acha `BORRIFADOR - AGUA...`; melhor casamento no topo.
- Busca vazia mantém lista completa + filtros + ordenação atual; *debounce* mantido.
- Os 3 campos de busca usam o mesmo matcher (sem repetir `includes`).
- `APP_VERSION` e `CACHE` sobem juntos (próxima versão).
**Tests**: none (verificação manual).
**Gate**: build (node --check) + push (frontend ao ar).
**Commit**: `feat(busca): busca por palavras com ranqueamento usando palavras-chave (vNN)`

### T6: Confirmar custo + rodar o menu IA (guiado) → [BUSCA-11, success]
**What**: Republicar backend; rodar `diagnosticarGeminiTexto` (custo/cota); rodar o menu nos ~372.
**Where**: Apps Script (passos do usuário, guiados).
**Depends on**: T1, T2, T3 publicados.
**Done when**: diagnóstico HTTP 200; menu preenche a coluna; resumo coerente; re-rodar = "0 gerados".
**Tests**: none (verificação manual).

### T7: Verificação fim a fim → [success]
**What**: Conferir que buscar "spray" acha o `BORRIFADOR`, ordem livre funciona, topo relevante,
e que filtros/offline/autoria seguem ok.
**Depends on**: tudo.
**Done when**: critérios de sucesso da spec atendidos e aprovados por você.

---

## Requirement Coverage

| Req | Task(s) |
|---|---|
| BUSCA-01 | T5 |
| BUSCA-02 | T5 |
| BUSCA-03 | T5 |
| BUSCA-04 | T1 |
| BUSCA-05 | T1 (back) + T4 (front) + T5 (usa na busca) |
| BUSCA-06 | T3 |
| BUSCA-07 | T3 |
| BUSCA-08 | T2 |
| BUSCA-09 | T2 + T3 |
| BUSCA-10 | T3 |
| BUSCA-11 | T2 + T6 |

**Coverage:** 11/11 mapeados ✅
