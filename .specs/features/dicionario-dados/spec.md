# Dicionário de Dados / Planilha Autoexplicativa — Specification

## Problem Statement

O app usa Google Sheets como banco de dados (abas `Estoque` e `Consumo`), mas o significado de
cada coluna só existe no código-fonte (`apps-script.gs`). Depois de um tempo sem mexer no
projeto, quem abre a planilha diretamente não lembra o que cada coluna representa, quem/o que a
preenche, ou quais valores ela pode ter (ex.: "Situação", "Status do Inventário"). Isso já causou
divergência de documentação (LEIA-ME.md e ROADMAP.md desatualizados em relação às colunas reais).

## Goals

- [ ] Cada cabeçalho de coluna, nas duas abas, carrega uma explicação visível na própria planilha
      (nota do Google Sheets — aparece ao passar o mouse, sem poluir a grade).
- [ ] Existe um dicionário de dados versionado no repositório (`.specs/codebase/DATA-DICTIONARY.md`)
      com a mesma informação, consultável sem abrir o Google Sheets.
- [ ] As notas são geradas a partir de uma única fonte de texto no código (não duas listas que
      podem divergir entre si).

## Out of Scope

| Feature | Reason |
|---|---|
| Ajuda in-app (textos explicativos em botões/modais do `index.html`) | Escopo maior, decidido explicitamente para ficar de fora desta rodada — vira uma spec separada depois |
| Geração automática do `.md` a partir do `.gs` (build step) | Projeto é intencionalmente "sem build" (`STACK.md`); mantido sincronizado por convenção/disciplina, não por ferramenta |
| Editar/traduzir os valores possíveis hoje existentes (ex. "Situação") | Fora de escopo — só documentar o comportamento atual |
| Preservar notas editadas manualmente pelo usuário direto na planilha | As notas são reaplicadas a cada execução do backend (idempotente) — ver Assumptions |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|---|---|---|---|
| As notas são sobrescritas a cada vez que o backend garante a planilha (`getSheet_`/`ensureColumns_`/`getConsumoSheet_`) | Sim, sempre reaplica o texto atual do código | Mantém a nota sempre fiel ao código; não existe hoje conceito de "nota pessoal do usuário" a preservar | n |
| Onde a explicação de cada coluna é definida no código | Um objeto único `COLUMN_DOCS` (chave→descrição/valores) em `apps-script.gs`, reaproveitado tanto para `setNote()` quanto (manualmente) espelhado no `.md` | Fonte única dentro da restrição "sem build"; evita duplicar o texto em dois lugares que divergem sozinhos | n |
| Falha ao chamar `setNote()` (ex. permissão) | Envolvida em try/catch, não interrompe `doGet`/`doPost`/abertura da planilha | Mesmo padrão já usado no projeto para `setSharing` de fotos (`uploadImages_`) — funcionalidade secundária nunca derruba o fluxo principal | n |
| Colunas duplicadas/não-canônicas (ex. as 2 colunas vazias mencionadas em `STATE.md`) | Nota só é aplicada na coluna mapeada por `buildColMap_` (primeira ocorrência); duplicatas ficam sem nota | Consistente com o comportamento já existente do mapeamento por nome | n |
| Precisa subir `APP_VERSION`/`CACHE`? | Não — mudança é só em `apps-script.gs` e num arquivo `.md`; `index.html`/`sw.js` não mudam | Convenção do projeto (`CONVENTIONS.md`) só exige bump quando o frontend muda | n |

**Open questions:** nenhuma — todas resolvidas ou registradas acima.

---

## User Stories

### P1: Notas explicativas nos cabeçalhos das planilhas ⭐ MVP

**User Story**: Como conferente/almoxarife (ou eu mesmo, voltando ao projeto depois de meses),
quero ver uma explicação de cada coluna diretamente na planilha, para não precisar reler o
código toda vez que eu esquecer o que uma coluna significa.

**Why P1**: É o pedido original — resolver a dor concreta relatada ("olho pra planilha e não
entendo o que ela significa").

**Acceptance Criteria**:

1. WHEN o backend garante a aba `Estoque` (`getSheet_`/`ensureColumns_`) THEN cada cabeçalho de
   coluna mapeado SHALL ter uma nota (`Range.setNote()`) explicando: o que a coluna representa,
   o que/quem a preenche (usuário, IA, cálculo automático), e valores possíveis quando a coluna
   for enum-like (ex. "Situação", "Status do Inventário").
2. WHEN o backend garante a aba `Consumo` (`getConsumoSheet_`) THEN cada um dos 8 cabeçalhos
   SHALL ter nota equivalente.
3. WHEN a função que aplica as notas roda novamente (planilha já com notas) THEN o texto SHALL
   ser sobrescrito pelo texto atual do código (idempotente — nunca duplica, nunca acumula lixo).
4. WHEN `setNote()` falha por qualquer motivo (ex. permissão) THEN a falha SHALL ser capturada
   (try/catch) e não SHALL interromper `doGet`, `doPost` nem a criação normal da aba.
5. WHEN existe coluna duplicada/não-canônica no cabeçalho (mesmo nome mapeando pro mesmo `key`)
   THEN a nota SHALL ser aplicada apenas na primeira ocorrência (mesma regra de `buildColMap_`).

**Independent Test**: Abrir a planilha do Google Sheets, passar o mouse sobre qualquer cabeçalho
de `Estoque` ou `Consumo` e ver o texto explicativo (triângulo vermelho no canto da célula).

---

### P2: Dicionário de dados versionado no repositório

**User Story**: Como desenvolvedor (inclusive uma IA retomando o projeto), quero um arquivo de
dicionário de dados no repositório, para consultar a estrutura das planilhas sem precisar abrir
o Google Sheets.

**Why P2**: Complementa a P1 — útil para quem está no código/terminal, não só para quem está na
planilha. Depende do texto já escrito na P1 (mesma fonte).

**Acceptance Criteria**:

1. WHEN alguém abre `.specs/codebase/DATA-DICTIONARY.md` THEN o arquivo SHALL listar todas as
   colunas de `Estoque` e de `Consumo`, cada uma com: rótulo, chave interna (`key`), o que
   significa, o que/quem preenche, e valores possíveis (quando aplicável).
2. THEN o texto de cada coluna no `.md` SHALL ser o mesmo texto usado na nota da planilha (P1) —
   mesma fonte, sem reescrever a explicação duas vezes com palavras diferentes.
3. THEN o arquivo SHALL seguir o padrão visual/estrutural dos demais docs de `.specs/codebase/`
   (tom direto, tabelas, sem enrolação — ver `CONVENTIONS.md` e os arquivos existentes).

**Independent Test**: Abrir o `.md` no editor/GitHub e conferir que toda coluna real das duas
abas está listada e bate com o que aparece nas notas da planilha.

---

## Edge Cases

- WHEN a planilha é criada do zero (aba vazia, sem cabeçalho ainda) THEN as notas SHALL ser
  aplicadas já na primeira criação (mesmo fluxo que cria os cabeçalhos).
- WHEN uma coluna nova é adicionada via `ensureColumns_` (planilha antiga sem ela) THEN a nota
  dessa coluna nova SHALL ser aplicada junto, não só em uma próxima execução separada.
- WHEN o cabeçalho tem um nome antigo/alias (não o rótulo canônico) THEN a nota ainda SHALL ser
  aplicada na coluna certa (via `buildColMap_`, não por comparação de texto do rótulo).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| DICT-01 | P1: Notas nos cabeçalhos — Estoque | Execute | Pending |
| DICT-02 | P1: Notas nos cabeçalhos — Consumo | Execute | Pending |
| DICT-03 | P1: Idempotência das notas | Execute | Pending |
| DICT-04 | P1: Falha de `setNote()` não quebra o fluxo | Execute | Pending |
| DICT-05 | P1: Não aplicar em colunas duplicadas | Execute | Pending |
| DICT-06 | P2: `DATA-DICTIONARY.md` com todas as colunas | Execute | Pending |
| DICT-07 | P2: Mesma fonte de texto (nota = doc) | Execute | Pending |
| DICT-08 | P2: Formato consistente com `.specs/codebase/` | Execute | Pending |

**Coverage:** 8 total, 8 mapeados, 0 unmapeados ✅

---

## Success Criteria

- [ ] Abrir a aba `Estoque` no Google Sheets e ver nota explicativa em todos os 17 cabeçalhos.
- [ ] Abrir a aba `Consumo` no Google Sheets e ver nota explicativa em todos os 8 cabeçalhos.
- [ ] `.specs/codebase/DATA-DICTIONARY.md` existe e cobre as 25 colunas (17 + 8) sem divergir do
      texto das notas.
- [ ] Rodar o fluxo normal do app (abrir, conferir item, sincronizar) sem nenhuma quebra —
      confirma que DICT-04 (try/catch) está correto.
