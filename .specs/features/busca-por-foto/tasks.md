# Busca de item por foto da câmera — Tarefas

## Execution Protocol (OBRIGATÓRIO — não pular)

Implemente estas tarefas com a skill `tlc-spec-driven`: **ative-a pelo nome e siga o fluxo
Execute e as Critical Rules dela.** Não procure os arquivos da skill por caminho de sistema.
A skill é a fonte da verdade do fluxo completo (ciclo por tarefa, delegação a sub-agentes,
Verifier, sensor de discriminação).

**Se a skill não puder ser ativada, PARE e avise o usuário — não prossiga sem ela.**

---

**Spec**: `.specs/features/busca-por-foto/spec.md`
**Design**: não há `design.md` — as decisões técnicas estão na seção "Técnico" da spec,
seguindo a convenção das outras features deste projeto (`tratamento-foto-ia`).
**Status**: In Progress — Fases 0, 1 e 2 concluídas (T1-T6). Falta o frontend (T7-T9) e o fechamento (T10-T11).

---

## Test Coverage Matrix

> Gerada do código, das diretrizes do projeto e da spec — confirmar antes de Execute.
> **Diretrizes encontradas:** `.specs/codebase/TESTING.md` (tem matriz e gates próprios —
> é a autoridade aqui), `.specs/codebase/STACK.md` (decisão "sem build"),
> `.specs/codebase/CONCERNS.md`, `package.json`. Não há `CLAUDE.md` nem `AGENTS.md`.
> **Estado atual da suíte:** 38 testes, 7 suites, todos passando (`npm test`).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Funções puras genéricas (`norm`, `escapeRe_`) | unit | Todos os ramos + acento, maiúscula, nulo/vazio, caractere especial de regex | `tests/utils.test.js` | `npm test` |
| Funções puras de busca (`searchScore_`, `searchFilter_`, `photoScore_`, `searchFilterFoto_`) | unit | **1:1 com os ACs** da história "Pontuação própria do modo foto" + todo edge case listado na spec + regressão provando que o AND da busca digitada não mudou | `tests/search.test.js` | `npm test` |
| Backend Apps Script (`descreverFotoIA_`, ação `buscarPorFoto`, `diagnosticarGeminiVisao`) | none — **manual** | `diagnosticarGeminiVisao()` no editor (HTTP 200) + roteiro manual; `apps-script.gs` roda nos servidores do Google e é colado inteiro no editor, não há como carregá-lo no Node | — | manual |
| UI / DOM (botão de câmera, modo foto no `render()`, estados de erro) | none — **manual** | Roteiro manual no celular: sucesso, não identificado, zero candidatos, offline, falha da chave | — | manual |
| Service Worker / versão | none — **manual** | Conferir que `APP_VERSION` e `CACHE` são o mesmo número e que `js/search.js` está no `SHELL` | — | manual |

**Por que tão pouco é automatizável:** é a realidade registrada no `TESTING.md`, não uma
escolha desta feature. O que **dá** para automatizar é justamente o que mais importa aqui — a
pontuação da busca — e o desenho das tarefas empurra o máximo de lógica para essa camada pura
(ver T4: o teto de 12 e a ordenação viram função testável em vez de ficarem escondidos no
`render()`).

## Gate Check Commands

> Gerados do código — confirmar antes de Execute. Espelham `.specs/codebase/TESTING.md`.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Depois de toda tarefa com teste unitário (T2, T3, T4) | `npm test` |
| Full | Antes de publicar (depois de T10) | `npm test` + roteiro manual do `TESTING.md` |
| Build | — | não há etapa de build neste projeto |
| Manual | Tarefas de backend, UI e versão | roteiro específico no campo "Done when" da tarefa |

---

## Execution Plan

As fases são ordenadas e rodam em sequência; dentro de cada fase, as tarefas rodam em ordem.

### Fase 0: Portão da premissa

Uma tarefa só, e ela pode **cancelar a feature**. Não escrever nada depois dela antes de o
resultado ser 200.

```
T1
```

### Fase 1: Base testável

Extrai e cobre a lógica pura **antes** de mexer em qualquer coisa nova. A regressão da busca
digitada é provada aqui, enquanto o comportamento antigo ainda é o único que existe.

```
T2 → T3 → T4
```

### Fase 2: Backend

```
T5 → T6
```

### Fase 3: Frontend

```
T7 → T8 → T9
```

### Fase 4: Publicação e documentação

```
T10 → T11
```

---

## Task Breakdown

### T1: Confirmar que a conta aceita imagem no modelo de texto

**What**: Criar `diagnosticarGeminiVisao()` e rodá-la no editor do Apps Script para provar que
a `GEMINI_API_KEY` consegue enviar imagem via `inline_data` e receber 200.
**Where**: `apps-script.gs`
**Depends on**: Nada
**Reuses**: `diagnosticarGeminiTexto()` (mesma estrutura de log), `GEMINI_TEXT_MODEL`
**Requirement**: BFOTO-21

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] A função existe, espelhando o formato de log de `diagnosticarGeminiTexto()`
- [x] Rodada no editor, o Log mostra **HTTP 200**, o nome do modelo e o início da resposta
- [x] A resposta descreve plausivelmente a foto de teste
- [x] ⛔ Portão: código foi **200** — feature liberada para seguir

**Resultado medido (2026-09-26 22:54):** `gemini-2.5-flash-lite`, **HTTP 200**. Foto de teste
`14591011_1790365368015.png` (image/png, 189 KB) → *"Um limpador de janelas com cabo longo."*
Tokens: 274 de entrada (16 de texto + **258 de imagem**) + 10 de saída = **US$ 0,00003 por busca**.
O 429 que travou o tratamento de foto **não** atinge este caminho, como a spec previa.

**Desvio do planejado:** o `tasks.md` dizia "imagem de teste embutida"; usei a primeira foto da
pasta do Drive. Motivo: prova o endpoint **e** mostra o acerto em foto real do almoxarifado.
Somente leitura — não chama `getImageFolder_()`, que criaria a pasta se não existisse.

**Tests**: none (sonda de API externa; roda no editor do Apps Script)
**Gate**: manual

**Commit**: `test(ia): confirma que o modelo de texto aceita imagem na entrada`

---

### T2: Mover `norm()` e `escapeRe_()` para `js/utils.js`

**What**: Transferir as duas funções genéricas do `<script>` do `index.html` para o módulo de
funções puras que já existe, cobrindo-as com teste.
**Where**: `js/utils.js`, `tests/utils.test.js`, `index.html` (remover as definições)
**Depends on**: T1
**Reuses**: O padrão do próprio `js/utils.js` (IIFE + `Object.assign(global, api)` +
`module.exports`) e o estilo de `tests/utils.test.js` (um `describe` por função, casos em
português dizendo *por que* importam)
**Requirement**: BFOTO-13 (parcial — base da regressão)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `norm` e `escapeRe_` saíram do `index.html` e entraram no `api` de `js/utils.js`
- [x] **Equivalência provada** antes/depois sobre centenas de entradas, incluindo aleatórias
      (convenção "Método usado nas extrações" do `TESTING.md`)
- [x] Testes de `norm`: acento, maiúscula, `null`/`undefined`/vazio, espaço nas pontas
- [x] Testes de `escapeRe_`: cada metacaractere de regex escapado, texto comum intacto
- [x] As 6 chamadas de `norm` fora da busca (`locMatch`, `renderPickSearch`, `renderSaidaBusca`,
      `render`) continuam funcionando — conferir que nenhuma ficou órfã
- [x] Gate passa: `npm test`
- [x] Contagem de testes: **38 + os novos**, nenhum teste antigo removido ou enfraquecido

**Resultado:** 48 testes (38 + 10), 9 suites, 0 falhas. Equivalência: **10.084 comparações,
0 divergências** contra as originais extraídas de `git show HEAD:index.html` (curadas + 5.000
aleatórias com acento, diacrítico solto e metacaractere de regex). `index.html`: 0 definições
locais, 7 chamadas preservadas; `js/utils.js` carrega na linha 415, antes do script inline (416).

**Nota de escopo:** mantive o teste "estoura se não receber texto" para `escapeRe_`, que não
mapeia a um critério literal desta tarefa. Justificativa: fixar o comportamento atual é o
próprio objetivo da extração, e o arquivo já tem três precedentes iguais (`fmtDate` com
número, `ymd` com texto, `normCod('0')`).

**Tests**: unit
**Gate**: quick

**Commit**: `test(utils): extrai e cobre norm() e escapeRe_()`

---

### T3: Criar `js/search.js` com a busca atual, provando que nada mudou

**What**: Mover `searchScore_()` e `searchFilter_()` para um módulo novo e cobri-las com testes
de regressão que fixam o comportamento AND **antes** de existir modo foto.
**Where**: `js/search.js` (novo), `tests/search.test.js` (novo), `index.html` (remover as
definições + adicionar `<script src="./js/search.js">`), `sw.js` (`./js/search.js` no `SHELL`)
**Depends on**: T2
**Reuses**: O mesmo padrão de módulo de `js/utils.js`; `norm`/`escapeRe_` como globais (é assim
que o navegador já os vê; no Node o teste carrega `js/utils.js` primeiro)
**Requirement**: BFOTO-13

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `js/search.js` existe com as duas funções **idênticas** às atuais (movidas, não reescritas)
- [x] **Equivalência provada** antes/depois sobre centenas de itens sintéticos e consultas
      aleatórias (convenção do `TESTING.md`)
- [x] `<script src="./js/search.js">` no `index.html` **antes** do `<script>` inline que as usa
- [x] `./js/search.js` no `SHELL` do `sw.js` (senão o app quebra offline)
- [x] Testes fixando o AND: consulta com uma palavra ausente devolve `-1`; ordem livre das
      palavras casa; casamento em código/código de barras domina; `palavrasChave` pontua;
      palavra inteira pesa mais que pedaço; busca vazia devolve a lista inteira
- [x] Gate passa: `npm test`
- [x] Contagem de testes: total anterior + os novos, nenhum removido

**Resultado:** 66 testes (48 + 18), 12 suites, 0 falhas. Equivalência: **4.900 comparações,
0 divergências** contra as originais extraídas de `git show HEAD:index.html` (9 itens curados
× 30 consultas + 4.000 notas e 600 listas aleatórias). Tags: `utils.js` (415) → `search.js`
(416) → inline (417). `SHELL` do `sw.js` atualizado. Script inline do `index.html` conferido
com `node --check` depois da remoção das 26 linhas: 1.062 linhas, sintaxe OK; as 3 chamadas
(`render`, `renderPickSearch`, `renderSaidaBusca`) preservadas.

**Pesos travados pelos testes** (medidos antes de escrever as asserções, não chutados):
código/código de barras exato `10000`, começo de código `2000`, começo de descrição `200`,
palavra inteira `20`, palavra-chave `12`, pedaço de palavra `5`. O caso que motiva o modo
foto está fixado: `caneta esferografica azul tampa plastico` contra `CANETA ESFEROGRAFICA
AZUL` devolve **-1**.

**Tests**: unit
**Gate**: quick

**Commit**: `test(busca): extrai searchScore_/searchFilter_ e fixa o comportamento atual`

---

### T4: Adicionar a pontuação do modo foto

**What**: Criar `photoScore_()` e `searchFilterFoto_()` em `js/search.js`, cobrindo 1:1 os ACs
da história de pontuação.
**Where**: `js/search.js`, `tests/search.test.js`
**Depends on**: T3
**Reuses**: Os pesos e os campos de `searchScore_()` (descrição, código, código de barras,
palavras-chave) — muda só a regra de exigência
**Requirement**: BFOTO-09, BFOTO-10, BFOTO-11, BFOTO-20

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `photoScore_(it, tokens)` **não** exige todas as palavras; pontua por quantas casaram
- [x] Item com **zero** termos casados é excluído (AC 2)
- [x] Casamento exato em `codigo`/`codigoBarras` domina o topo, reusando o peso de 10000 (AC 3)
- [x] `searchFilterFoto_` devolve a lista **já filtrada, ordenada e limitada a 12**
      — o teto e a ordenação ficam nesta função pura, **não** no `render()`, para serem testáveis
- [x] `searchScore_()` continua **intocada** (a busca digitada não muda) — provado pelos testes
      de T3, que continuam passando sem alteração
- [x] Teste do caso que motivou a história: termos `caneta esferografica azul tampa plastico`
      contra item `CANETA ESFEROGRAFICA AZUL` → `searchScore_` devolve `-1`, `photoScore_`
      devolve positivo
- [x] Testes dos edge cases da spec: termo genérico demais (teto corta), lista vazia, tokens
      vazios, item sem `palavrasChave`
- [x] Gate passa: `npm test`
- [x] Contagem de testes: total anterior + os novos, nenhum removido

**Resultado:** 83 testes (66 + 17), 14 suites, 0 falhas. O caso motivador está travado nos dois
lados: `searchScore_` = **-1**, `photoScore_` = **84**. Pesos do modo foto medidos e fixados:
código/código de barras por termo `10000` (OCR), palavra inteira `20`, palavra-chave `12`,
pedaço `5`; sem bónus de começo de descrição, porque a ordem das palavras da IA é arbitrária
(diferença deliberada, com teste próprio: `caneta` dá 232 na digitada e 32 no modo foto).

**Duas simplificações em relação ao planejado:**
1. Assinatura ficou `searchFilterFoto_(list, raw)` em vez de `(list, tokens)`, espelhando
   `searchFilter_(list, raw)`: a normalização e a quebra em palavras ficam dentro da camada
   testada, e o `render()` só recebe a lista pronta.
2. Cheguei a escrever um parâmetro `teto` e a exportar a constante; removi os dois. Ninguém
   pediu teto configurável, e o corte em 12 é testável só alimentando 20 itens.

**Tests**: unit
**Gate**: quick

**Commit**: `feat(busca): pontuação do modo foto (não exige todas as palavras)`

---

### T5: Prompt e chamada de visão no backend

**What**: Criar a constante de prompt e `descreverFotoIA_(base64, mime)`, que devolve
`{ visto, termos, texto }` ou `null` em qualquer falha.
**Where**: `apps-script.gs`
**Depends on**: T1 (o 200 já confirmado)
**Reuses**: `gerarPalavrasChaveLote_()` (mesmo endpoint, mesma forçagem de JSON, mesmo
tratamento de falha silenciosa), o espírito ancorado do `PROMPT_KW`, o padrão `IA_ULTIMO_ERRO_`
**Requirement**: BFOTO-05, BFOTO-07, BFOTO-08, BFOTO-19

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Prompt ancorado: descreve só o que está na foto, pt-br minúsculo, lê texto/números
      impressos, e **responde vazio quando não souber** (nunca chuta marca/modelo/voltagem)
- [x] Modelo lido de `GEMINI_VISION_MODEL` com padrão `gemini-2.5-flash-lite` (BFOTO-07)
- [x] Resposta forçada em JSON, como nas palavras-chave
- [x] Qualquer falha (sem chave, HTTP != 200, JSON inválido, exceção) devolve `null` e registra
      o motivo — **nunca lança**
- [x] ⛔ A função **não menciona `DriveApp`** nem escreve em célula alguma (BFOTO-05) —
      conferido por busca no arquivo
- [x] Verificação manual: rodado com foto real, `visto` e `termos` plausíveis no Log

**DEFEITO ENCONTRADO E CORRIGIDO na 1a rodada:** o prompt terminava com **dois** exemplos de
JSON (o normal e o de "não reconheci"); o modelo copiou o padrão e devolveu dois objetos
colados -> `SyntaxError: Unexpected non-whitespace character after JSON at position 114`.
Duas correções, não uma: (1) o prompt deixou de conter exemplo de JSON literal — os campos
são descritos em texto; (2) a resposta passa por `primeiroObjetoJson_()`, que recorta o
primeiro objeto contando chaves de verdade (um `}` dentro de string não corta errado).
Ajustar só o prompt seria mitigar: é a mesma lição do `STATE.md` de 26/07 — quando o defeito
é "a IA não faz o combinado", o texto do prompt não é a garantia. `primeiroObjetoJson_` foi
verificado localmente (é função pura) contra a resposta que falhou e mais 8 casos: dois
objetos colados, texto conversado em volta, `}` dentro de string, objeto aninhado, truncado,
sem JSON, vazio e `null` — todos corretos.

**Resultado medido (2026-09-26 23:49):** `OK gemini-2.5-flash-lite - 564+39 tokens -
US$ 0,000072`. Foto do item 14591011 -> visto: *"rodo limpador de vidros com cabo"*,
termos: *"rodo limpador vidro cabo limpeza azul"*.

**Tests**: none (ver matriz — backend não carrega no Node)
**Gate**: manual

**Commit**: `feat(api): descreve foto de item com a IA de visão`

---

### T6: Expor a ação `buscarPorFoto`

**What**: Despachar a nova ação no `doPost`, protegida, devolvendo o resultado e o diagnóstico.
**Where**: `apps-script.gs`
**Depends on**: T5
**Reuses**: O despacho por `action` do `doPost`, `requireAuth_`, `jsonOut_`, o formato `_debugIA`
**Requirement**: BFOTO-03, BFOTO-17, BFOTO-19

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `doPost` reconhece `action === 'buscarPorFoto'` e responde JSON
- [x] Passa por `requireAuth_` como todas as outras ações (BFOTO-03)
- [x] Resposta traz `_debugIA` com modelo, tokens/custo e motivo da falha (BFOTO-19)
- [x] Falha da IA devolve resposta **bem formada** com o motivo, não erro cru (BFOTO-17)
- [x] ⛔ Nada é gravado: nenhuma escrita na planilha, nenhum arquivo no Drive (BFOTO-05)
- [x] Verificação: 3 execuções do diagnóstico (23:34, 23:40, 23:49) e a pasta de imagens
      seguiu com a mesma foto de teste; nenhuma coluna alterada

**Defeito de desempenho encontrado no `doPost` e corrigido:** ele pegava o **lock de script**
antes de tudo. Com a ação nova lá dentro, cada busca (2-4 s esperando a IA) travaria a
sincronização de **todos** os usuários. O `waitLock` passou para depois da ação
`buscarPorFoto`, que não grava nada. Efeito colateral bom: `JSON.parse` e `requireAuth_`
também saíram do lock — são leituras, e a contenção cai. Toda a gravação continua dentro.

**VALIDAÇÃO DA ESTRATÉGIA com dados reais** (o teste que mais importa nesta feature). Item
14591011 = `RODO DE BORRACHA - RODO PARA VIDRO`, palavras-chave `rodo de borracha, rodo para
vidro, limpeza de vidros, janela, espátula`. Os termos da IA casaram 3 de 6 (`rodo`, `vidro`,
`limpeza`) e, rodando `photoScore_` contra os concorrentes reais da planilha:

| # | Nota | Item |
|---|---|---|
| **1** | **76** | **14591011 RODO DE BORRACHA — o correto** |
| 2 | 44 | 14435001 LIMPA VIDRO |
| 3 | 44 | 14613022 VASSOURA COM CABO |
| 4 | 44 | 14346046 DETERGENTE LIMPADOR MULTIUSO |

1o lugar com margem folgada — critério de sucesso da spec (entre os 3 primeiros) **atendido**.
E os mesmos termos na busca digitada devolvem **NENHUM resultado**: é o defeito que a feature
corrige, agora medido em dado real e não só em teste sintético.

**Adição de escopo declarada:** o diagnóstico ganhou `linhaDoItem_()` e `semAcento_()` para
conferir os termos contra a linha real do item (o nome do arquivo começa com o código). Não
estava no plano; entrou porque era a única forma barata de responder "os termos achariam o
item?" antes de construir o frontend em cima da suposição. `linhaDoItem_` lê sem efeito
colateral — de propósito não usa `getSheet_()`, que cria e normaliza cabeçalhos.
`semAcento_` duplica a ideia do `norm()` do frontend porque o `.gs` não compartilha código
com o `index.html`; está documentado no arquivo.

**Tests**: none (ver matriz)
**Gate**: manual

**Commit**: `feat(api): acao buscarPorFoto`

---

### T7: Botão de câmera na barra de busca

**What**: Adicionar o botão, capturar a foto, comprimir a 768 px, enviar e mostrar carregando.
**Where**: `index.html`
**Depends on**: T6
**Reuses**: `scanSearch()` como molde do fluxo; `compress()` (só muda o tamanho para 768);
`SCAN_TEXTS` para título/dica; o `fetch` autenticado que as outras ações já usam
**Requirement**: BFOTO-01, BFOTO-02

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Botão de câmera na barra de busca, à esquerda do de leitura de código que já existe
- [x] Abre a câmera traseira (`capture="environment"`)
- [x] Foto comprimida com `compress(file, 768, 0.6)` (BFOTO-02)
- [x] Estado de carregando visível enquanto espera ("Analisando a foto…" + botão opaco)
- [ ] ⏳ Verificação manual no celular — só possível depois de publicar (T10)

**Desvios do planejado, declarados:**
1. `SCAN_TEXTS` **não** foi usado: ele serve ao modal do leitor de QR (`startScan`), e a foto
   usa o seletor nativo do sistema (`<input type=file capture=environment>`), que não tem
   título nem dica nossos. Mesmo mecanismo do botão de foto que já existe no card.
2. **BFOTO-18 (descartar resposta atrasada) entrou aqui**, não na T9 como planejado: é parte
   da mecânica da requisição (um contador `_fotoBuscaSeq` por captura), e deixar para depois
   significaria commitar uma corrida conhecida.
3. Entrou também o aviso de offline e o de URL não configurada — são as duas guardas que
   precisam existir **antes** do `fetch`, não depois.

**Tests**: none (ver matriz — UI sem harness de DOM)
**Gate**: manual

**Commit**: `feat(app): botao de busca por foto na barra de busca`

---

### T8: Modo foto no `render()`

**What**: Consumir `searchFilterFoto_()` quando o modo foto está ativo, e sair dele quando o
usuário digita.
**Where**: `index.html`
**Depends on**: T7
**Reuses**: `searchFilterFoto_()` de T4 (toda a lógica já testada); `card()`; os filtros
existentes de localização/pendentes/alertas; `onSearchInput()`
**Requirement**: BFOTO-04, BFOTO-06, BFOTO-12, BFOTO-20

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Sucesso preenche a barra de busca com os termos e liga o modo foto (BFOTO-04)
- [ ] Em modo foto, a lista sai de `searchFilterFoto_()` — o `render()` **não** recalcula
      pontuação nem aplica teto por conta própria
- [ ] Cada candidato é o `card()` normal, sem tela nova (BFOTO-06)
- [ ] Editar a barra à mão desliga o modo foto e volta ao AND (BFOTO-12)
- [ ] Filtros de localização/pendentes/feitos/alertas continuam respeitados (edge case da spec)
- [ ] Verificação manual: fotografar item conhecido e ver o card certo no topo; digitar na barra
      e ver o comportamento antigo voltar

**Tests**: none (lógica pura já coberta em T4; aqui só resta DOM)
**Gate**: manual

**Commit**: `feat(app): modo foto na lista de itens`

---

### T9: Falhar de forma útil

**What**: Implementar offline, não identificado, zero candidatos, falha de chamada e descarte
de resposta atrasada.
**Where**: `index.html`
**Depends on**: T8
**Reuses**: `updateNet()` para o estado de rede; `alertDialog()`/`_pendingAlert` para as
mensagens; o campo `visto` que vem do backend
**Requirement**: BFOTO-14, BFOTO-15, BFOTO-16, BFOTO-17, BFOTO-18

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Offline: botão desabilitado, com aviso de que precisa de internet; busca digitada e
      leitura de código de barras **continuam funcionando** (BFOTO-14)
- [ ] IA não identificou: avisa sem inventar item (BFOTO-15)
- [ ] Identificou mas zero candidatos: mostra **o que a IA viu** e deixa os termos editáveis na
      barra (BFOTO-16) — é a decisão do usuário sobre falha
- [ ] Qualquer falha: mensagem clara, lista e busca da tela **preservadas**, nada gravado (BFOTO-17)
- [ ] Captura nova descarta resposta anterior ainda em voo (BFOTO-18) — verificar com duas
      capturas rápidas
- [ ] Verificação manual dos 5 cenários: modo avião; foto de parede vazia; foto de objeto que
      não existe no cadastro; `GEMINI_API_KEY` apagada temporariamente; duas capturas seguidas

**Tests**: none (ver matriz)
**Gate**: manual

**Commit**: `feat(app): estados de falha da busca por foto`

---

### T10: Subir a versão para v38

**What**: `APP_VERSION` e `CACHE` para `v38`, juntos.
**Where**: `index.html`, `sw.js`
**Depends on**: T9
**Reuses**: O procedimento de release já usado (commit `17bb624` fez o mesmo para v37)
**Requirement**: BFOTO-22

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `APP_VERSION = 'v38'` no `index.html`
- [ ] `CACHE = 'almox-udesc-v38'` no `sw.js`
- [ ] ⚠️ Os dois **no mesmo commit** — trocar só um entrega a versão velha em cache
      (aprendizado registrado no `STATE.md`)
- [ ] `./js/search.js` confirmado no `SHELL` (veio de T3; reconferir aqui é a última chance
      antes de publicar)
- [ ] Gate passa: `npm test` + roteiro manual do `TESTING.md` (gate **full**)

**Tests**: none
**Gate**: full

**Commit**: `chore(release): v38 — busca de item por foto`

---

### T11: Atualizar a documentação

**What**: Registrar a feature e seus efeitos nos documentos que o projeto mantém.
**Where**: `.specs/project/STATE.md`, `.specs/codebase/TESTING.md`,
`.specs/codebase/STACK.md`, `.specs/codebase/INTEGRATIONS.md`, `.specs/project/ROADMAP.md`,
`LEIA-ME.md`
**Depends on**: T10
**Reuses**: O formato de cada documento (tabela de decisões datada no `STATE.md`, matriz no
`TESTING.md`)
**Requirement**: — (manutenção; convenção do projeto, ver commit `ceac821`)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `STATE.md`: decisão datada (estratégia escolhida + por que a alternativa foi descartada)
      e entrada em "Onde paramos"
- [ ] `TESTING.md`: `tests/search.test.js` na matriz, com a contagem nova de testes
- [ ] `STACK.md` e `INTEGRATIONS.md`: `js/search.js` e o uso de visão do Gemini
- [ ] `ROADMAP.md`: feature em "Entregue"; a "dar baixa pelo card" registrada como próximo passo
- [ ] `LEIA-ME.md`: como usar a busca por foto e o aviso de que exige internet
- [ ] `spec.md`: requisitos de `Pending` para `Verified`
- [ ] ⚠️ Registrar também a limpeza pendente: `node_modules/` tem 6 pacotes órfãos de uma
      tentativa de instalar Vitest (`cac`, `nanoid`, `picocolors`, `siginfo`, `source-map-js`);
      está no `.gitignore` e não é usado, mas o `TESTING.md` afirma que a pasta não existe

**Tests**: none
**Gate**: manual

**Commit**: `docs(specs): registra a busca de item por foto`

---

## Phase Execution Map

```
Fase 0 → Fase 1 → Fase 2 → Fase 3 → Fase 4

Fase 0:  T1
Fase 1:  T2 ──→ T3 ──→ T4
Fase 2:  T5 ──→ T6
Fase 3:  T7 ──→ T8 ──→ T9
Fase 4:  T10 ──→ T11
```

Execução estritamente sequencial — não há paralelismo dentro de fase.

**Empacotamento em Execute:** 11 tarefas. Acima do orçamento de ~7 por trabalhador, então o
Execute vai **oferecer** sub-agentes em lote (nunca despachar sem aceite). Empacotamento
natural, sempre em fronteira de fase: **lote A = Fases 0+1 (T1–T4, 4 tarefas)**,
**lote B = Fases 2+3 (T5–T9, 5 tarefas)**, **lote C = Fase 4 (T10–T11, 2 tarefas)**.
Executar inline também é válido e provavelmente preferível aqui: T1 é um portão que exige o
usuário rodar uma função no editor do Apps Script, e T5–T9 precisam de verificação manual no
celular — ou seja, o humano está no circuito de qualquer forma.

---

## Task Granularity Check

| Tarefa | Escopo | Situação |
| ------ | ------ | -------- |
| T1: diagnóstico de visão | 1 função | ✅ Granular |
| T2: mover `norm`/`escapeRe_` | 2 funções coesas + teste | ⚠️ 3 arquivos, mas **uma** extração atômica — separar deixaria função definida em dois lugares ou órfã entre commits |
| T3: criar `js/search.js` | 2 funções + módulo + teste | ⚠️ 4 arquivos, mesma justificativa: o `<script>` e o `SHELL` **têm** que entrar no mesmo commit, senão o app quebra (offline ou função indefinida) |
| T4: pontuação do modo foto | 2 funções + teste | ✅ Granular |
| T5: `descreverFotoIA_` | 1 função + 1 constante | ✅ Granular |
| T6: ação `buscarPorFoto` | 1 endpoint | ✅ Granular |
| T7: botão de câmera | 1 fluxo de UI | ✅ Granular |
| T8: modo foto no `render` | 1 função (modificar) | ✅ Granular |
| T9: estados de falha | 5 cenários, 1 fluxo | ⚠️ Coeso: é **um** comportamento (falhar bem) com cinco gatilhos; dividir geraria commits que deixam a feature meio quebrada |
| T10: versão | 2 constantes | ✅ Granular (obrigatoriamente juntas) |
| T11: documentação | 6 documentos | ⚠️ Coeso: é o commit de docs que o projeto já faz assim (ver `ceac821`) |

Nenhum ❌. Os ⚠️ são os casos em que dividir **pioraria** o resultado, com a justificativa
explícita ao lado — não são tarefas vagas.

---

## Diagram-Definition Cross-Check

| Tarefa | Depends On (corpo) | Diagrama mostra | Situação |
| ------ | ------------------ | --------------- | -------- |
| T1 | Nada | início da Fase 0 | ✅ Match |
| T2 | T1 | T1 → T2 (Fase 0 → Fase 1) | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |
| T5 | T1 | Fase 1 → Fase 2 (T1 é de fase anterior) | ✅ Match — dependência aponta para trás |
| T6 | T5 | T5 → T6 | ✅ Match |
| T7 | T6 | Fase 2 → Fase 3 | ✅ Match |
| T8 | T7 | T7 → T8 | ✅ Match |
| T9 | T8 | T8 → T9 | ✅ Match |
| T10 | T9 | Fase 3 → Fase 4 | ✅ Match |
| T11 | T10 | T10 → T11 | ✅ Match |

Nenhuma dependência aponta para fase posterior. T5 depende de T1 (e não da Fase 1) porque o
backend não usa nada do `js/search.js` — mas fica na Fase 2 para manter a ordem de risco:
primeiro provar que a busca antiga não quebrou.

---

## Test Co-location Validation

| Tarefa | Camada criada/modificada | Matriz exige | Tarefa diz | Situação |
| ------ | ----------------------- | ------------ | ---------- | -------- |
| T1 | Backend Apps Script | none — manual | none | ✅ OK |
| T2 | Funções puras genéricas | unit | unit | ✅ OK |
| T3 | Funções puras de busca | unit | unit | ✅ OK |
| T4 | Funções puras de busca | unit | unit | ✅ OK |
| T5 | Backend Apps Script | none — manual | none | ✅ OK |
| T6 | Backend Apps Script | none — manual | none | ✅ OK |
| T7 | UI / DOM | none — manual | none | ✅ OK |
| T8 | UI / DOM | none — manual | none | ✅ OK |
| T9 | UI / DOM | none — manual | none | ✅ OK |
| T10 | Service Worker / versão | none — manual | none | ✅ OK |
| T11 | Documentação | none | none | ✅ OK |

Nenhuma ❌ VIOLATION. Atenção a um ponto de honestidade: os `none` das tarefas de backend e UI
**não** são adiamento de teste (o anti-padrão que esta validação existe para pegar) — são
camadas que a matriz marca como não automatizáveis neste projeto, com o motivo registrado no
`TESTING.md`. O que **é** automatizável foi puxado para T2–T4 de propósito, incluindo o teto de
12 e a ordenação, que poderiam ter ficado escondidos no `render()`.
