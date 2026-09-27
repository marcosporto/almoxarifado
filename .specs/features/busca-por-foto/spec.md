# Busca de item por foto da câmera — Especificação

> **Em uma frase:** aponte a câmera para um item, o app descobre qual é e mostra o card dele.
>
> **Estratégia escolhida: a IA descreve, o app procura.** Decisão do usuário em 2026-09-26,
> mantida após reavaliação: *"vou ficar com o caminho 1, e se ele se mostrar interessante eu
> fico com ele permanentemente."* Ou seja, isto **não é um rascunho de outra coisa** — é a
> solução, e pode ser a definitiva. As alternativas ficam registradas em "Se não for
> suficiente" apenas como contingência.

## Problem Statement

Hoje, para achar um item, é preciso **ler o código de barras** (exato, mas só funciona se o
código existir, estiver cadastrado e legível) ou **digitar** na busca (exige lembrar como o
item está escrito na planilha oficial, que muitas vezes usa nome diferente do popular).
Sobra um caso comum e sem solução: **item na mão, sem código de barras utilizável e sem saber
o nome cadastrado** — parafuso solto, cabo, ferramenta, embalagem rasgada, código apagado.
A pessoa sabe exatamente o que está segurando e ainda assim não acha no sistema.

## Goals

- [ ] Apontar a câmera para um item e receber os candidatos do cadastro, o mais provável no topo.
- [ ] Funciona nos **372 itens**, não só nos 25 que têm foto cadastrada.
- [ ] Consulta é o destino: o resultado é o **card normal** do app, com todos os dados do item.
- [ ] Custo por busca desprezível (ordem de US$ 0,0001) e **nenhuma conta/chave nova**.
- [ ] Zero impacto no que já existe: busca digitada, leitura de código de barras, filtros,
      offline e sincronização continuam idênticos.

## Out of Scope

Explicitamente excluído, para evitar que a feature cresça sem controle.

| Fora do escopo | Por quê |
|---|---|
| **Semelhança visual / embeddings** (comparar a foto nova com as fotos já cadastradas) | Só **25 de 372** itens têm foto. Em ~93% das buscas não haveria com o que comparar. Contingência, não plano — ver "Se não for suficiente". |
| **IA escolhendo direto no catálogo** (mandar a foto + os 372 itens) | Avaliada e **descartada** pelo usuário nesta rodada. Custa ~10x mais por busca, responde mais devagar (manda os 372 itens em cada chamada) e exige validar os códigos que a IA devolve. Fica como contingência — ver "Se não for suficiente". |
| **Botão "dar baixa" no card** | Feature separada, útil por si só (melhora também a busca digitada). Decisão do usuário: às vezes a busca é só consulta; não empurrar para o formulário de saída. |
| **Funcionar offline** | Impossível: quem reconhece a foto está na nuvem. Requisito vira degradação explícita (BFOTO-14). |
| **Salvar a foto da busca** | Ela é descartável por decisão (BFOTO-05). Foto de cadastro continua sendo outra coisa, pelo botão que já existe no card. |
| **Testar o backend, a UI e a sincronização** | `apps-script.gs` roda nos servidores do Google e é colado inteiro no editor; a UI não tem harness de DOM. Esta feature cobre com teste automatizado **só a pontuação da busca** (função pura) e verifica o resto manualmente, exatamente como o `codebase/TESTING.md` já registra. |

---

## Pressupostos e decisões em aberto

Toda ambiguidade está resolvida aqui — nada fica implícito.

| Decisão / pressuposto | Escolha | Por quê | Confirmado? |
|---|---|---|---|
| Estratégia de casamento | **A IA descreve, o app procura** — possivelmente definitiva | Decisão do usuário, reafirmada depois de o agente recomendar a alternativa duas vezes: entregar isto, medir no uso real e ficar com ela se servir. O agente registrou que a alternativa (IA escolhe no catálogo) tende a acertar mais e que a `photoScore_()` seria descartada numa migração; o usuário optou por assumir esse custo eventual em troca de menos código agora, resposta mais rápida e correções sem programador (ver "O ciclo que conserta sozinho"). | ✅ sim |
| Comportamento quando falha | **Mostrar o que a IA viu + deixar editar** | O usuário entende *por que* falhou e continua na mão a partir dali, em vez de levar um "nada encontrado" opaco. | ✅ sim |
| Onde a chamada à IA acontece | **No backend (Apps Script)** | A `GEMINI_API_KEY` não pode aparecer no `index.html`, que é público. Mesma regra da R7 do tratamento de foto. | ✅ sim (regra do projeto) |
| Modelo | `gemini-2.5-flash-lite`, o **mesmo** das palavras-chave | Aceita imagem na entrada; é o caminho de TEXTO, que nunca sofreu o bug de cota que matou o tratamento de foto. Trocável por propriedade (BFOTO-07). | ✅ **CONFIRMADO em 2026-09-26**: HTTP 200 na conta real, 258 tokens de imagem, descrição correta de foto do almoxarifado |
| Tamanho da foto enviada | **384 px**, reusando `compress()` | Em até 384 px a cobrança é fixa em 258 tokens. Para "isso é uma caneta azul" não precisa de nitidez de catálogo. | ✅ sim |
| Interruptor liga/desliga (tipo `TRATAR_FOTO`) | **Não criar** | Aqui nada é gravado nem alterado: o pior caso é uma busca falhar. A ausência da `GEMINI_API_KEY` já desliga naturalmente, com aviso. | assumido |
| Teto de candidatos exibidos | **12** | Acima disso é ruído: o objetivo é escolher entre poucos, não filtrar uma lista. | assumido |
| Limite de uso / custo | **Sem controle** | Um único usuário a ~US$ 0,0001 por busca. Criar quota seria complexidade sem risco correspondente. | assumido |
| Como verificar automaticamente | **Extrair a pontuação para `js/search.js` e cobrir com testes**, seguindo a infraestrutura que o projeto **já tem** | Decisão do usuário. E não é novidade a inventar: entre 2026-09-26 o projeto ganhou `js/utils.js`, `tests/utils.test.js`, `package.json` e 38 testes no runner nativo do Node — esta feature só segue o caminho já aberto. A `photoScore_()` é código permanente, compartilhado com a busca digitada, e é onde um erro passa despercebido. | ✅ sim |

**Perguntas abertas:** uma, marcada ⚠️ acima (confirmar que o modelo aceita imagem na conta
real). Ela **não** bloqueia a aprovação da spec nem o `tasks.md` — é a primeira tarefa da
execução, justamente para falhar cedo se falhar.

---

## User Stories

### P1: Achar o item apontando a câmera ⭐ MVP

**User Story**: Como almoxarife, quero apontar a câmera para um item que tenho na mão e ver
os candidatos do meu cadastro, para consultar os dados dele sem saber o nome cadastrado nem
depender de código de barras.

**Why P1**: É o pedido central. Sem isto, não há feature.

**Acceptance Criteria**:

1. WHEN o usuário toca no botão de câmera da barra de busca THEN o sistema SHALL abrir a
   captura de foto da câmera traseira, com título e dica próprios (padrão `SCAN_TEXTS`).
2. WHEN a foto é capturada THEN o sistema SHALL comprimi-la a **384 px** via `compress()` e
   enviá-la ao backend na ação `buscarPorFoto`, exibindo estado de carregamento enquanto espera.
3. WHEN o backend recebe a foto THEN o sistema SHALL exigir crachá válido (`requireAuth_`),
   como em toda ação, antes de chamar a IA.
4. WHEN a IA responde com sucesso THEN o sistema SHALL preencher a barra de busca com os
   termos recebidos e redesenhar a lista em **modo foto**.
5. WHEN a lista é redesenhada em modo foto THEN o sistema SHALL exibir o **card normal** de
   cada candidato — nenhuma tela nova, nenhum dado a menos.
6. WHEN há candidatos THEN o sistema SHALL ordenar do mais provável para o menos provável e
   exibir no máximo **12**.

**Independent Test**: fotografar uma caneta azul e ver o item de caneta do cadastro no topo
da lista, com o card completo (código, localização, estoque, fotos).

---

### P1: Pontuação própria do modo foto ⭐ MVP

**User Story**: Como almoxarife, quero que a busca por foto não volte vazia só porque a IA
usou uma palavra a mais do que está escrito na planilha.

**Why P1**: **Sem isto o MVP não funciona.** A busca atual
(`searchScore_()` no `index.html`) exige que **todas** as palavras apareçam
(`if(!hay.includes(t)) return -1`). A IA devolve palavras descritivas que ela escolhe, não o
usuário: um único termo ausente do cadastro zera o resultado. AND é a regra certa para quem
digita e a regra errada para quem descreve.

**Acceptance Criteria**:

1. WHEN a pontuação roda em modo foto THEN o sistema SHALL **não exigir** que todas as
   palavras casem, e SHALL ranquear por quantas casaram e com que peso.
2. WHEN um item não casa **nenhum** termo THEN o sistema SHALL excluí-lo do resultado.
3. WHEN a IA leu um número impresso que casa **exatamente** com `codigo` ou `codigoBarras`
   de um item THEN esse item SHALL ficar em primeiro lugar (reusa o peso dominante de 10000
   que a busca já aplica a identificadores únicos).
4. WHEN o usuário **edita manualmente** a barra de busca THEN o sistema SHALL sair do modo
   foto e voltar à regra AND de sempre.
5. WHEN a busca digitada é usada normalmente THEN seu comportamento SHALL permanecer
   **idêntico** ao atual (AND, mesmos pesos, mesma ordenação).

**Independent Test**: forçar os termos "caneta esferográfica azul tampa plástico" contra um
item descrito apenas como `CANETA ESFEROGRAFICA AZUL` — hoje retorna vazio; em modo foto deve
retornar o item. Digitar os mesmos termos à mão deve continuar retornando vazio.

---

### P1: Falhar de forma útil ⭐ MVP

**User Story**: Como almoxarife, quando a foto não resolver, quero saber **o que a IA
entendeu** e poder corrigir na mão, em vez de receber um "nada encontrado" sem explicação.

**Why P1**: É a decisão do usuário sobre o comportamento de falha, e é o que evita que a
feature seja abandonada na primeira foto ruim.

**Acceptance Criteria**:

1. WHEN o aparelho está **offline** THEN o sistema SHALL desabilitar o botão de câmera da
   busca e explicar que a busca por foto precisa de internet (a busca digitada e a leitura de
   código de barras seguem funcionando normalmente).
2. WHEN a IA não consegue identificar o objeto THEN o sistema SHALL responder **vazio** em vez
   de inventar, e o app SHALL dizer que não foi possível identificar.
3. WHEN a IA identifica algo mas **nenhum item** do cadastro casa THEN o sistema SHALL mostrar
   **o que a IA viu**, em português, e deixar os termos na barra de busca para edição manual.
4. WHEN a chamada falha por qualquer motivo (sem `GEMINI_API_KEY`, HTTP ≠ 200, JSON inválido,
   tempo esgotado, exceção) THEN o sistema SHALL exibir mensagem clara, **preservar** a lista e
   a busca que já estavam na tela, e **não gravar nada** em lugar nenhum.
5. WHEN uma nova captura começa antes de a anterior responder THEN o sistema SHALL **descartar**
   a resposta antiga (a mais recente vence).
6. WHEN a resposta chega THEN o sistema SHALL incluir informação de diagnóstico
   (modelo, custo, motivo da falha) no padrão `_debugIA` já usado no upload de fotos.

**Independent Test**: com o modo avião ligado, o botão está desabilitado com aviso; apagando
temporariamente a `GEMINI_API_KEY`, a busca falha com mensagem clara e a lista da tela fica intacta.

---

### P1: A foto da busca é descartável ⭐ MVP

**User Story**: Como responsável pelo almoxarifado, quero que a foto tirada para buscar não
suje meu Drive nem se misture com as fotos de cadastro dos itens.

**Why P1**: Sem isto, cada busca cria lixo permanente no Drive e arrisca vincular foto errada
a um item.

**Acceptance Criteria**:

1. WHEN o backend processa uma foto de busca THEN o sistema SHALL **não** criar arquivo no
   Google Drive e SHALL **não** escrever em nenhuma célula da planilha.
2. WHEN a busca termina THEN a foto SHALL existir apenas em memória durante a requisição
   (nem fila de sincronização, nem IndexedDB, nem `Imagens` de item nenhum).

**Independent Test**: fazer 3 buscas por foto e confirmar que a pasta "Almoxarifado UDESC -
Imagens" não ganhou arquivos e que a coluna `Imagens` não mudou.

---

### P1: Confirmar que a visão funciona na conta antes de construir ⭐ MVP

**User Story**: Como dono do projeto, quero confirmar que a minha chave consegue mandar imagem
para o modelo de texto, **antes** de construir a feature em cima dessa suposição.

**Why P1**: É o aprendizado registrado em `project/STATE.md` (26/07): o modelo de **imagem**
ficou preso em HTTP 429 (`free_tier_requests, limit: 0`) mesmo com faturamento ativo. A
documentação diz que imagem **na entrada** de modelo de TEXTO é outro caminho — mas isso é
documentação, não teste na conta real. Descobrir isso na primeira tarefa custa minutos;
descobrir no fim custa a feature.

**Acceptance Criteria**:

1. WHEN o desenvolvedor roda `diagnosticarGeminiVisao()` pelo editor do Apps Script THEN o
   sistema SHALL registrar no Log o código HTTP, o modelo usado e o início da resposta,
   espelhando `diagnosticarGeminiTexto()` (`diagnosticarGeminiTexto()` no `apps-script.gs`).
2. WHEN o diagnóstico devolve código ≠ 200 THEN a feature SHALL parar para reavaliação
   (não seguir para as tarefas seguintes).

**Independent Test**: rodar a função no editor e ver `200` no Log, com uma descrição plausível
da imagem de teste.

---

> **Não há histórias P2 ou P3.** Numa versão anterior desta spec havia uma P2 que deixava o
> app preferir uma lista de códigos vinda do backend, para facilitar uma migração futura.
> Foi **removida** quando o usuário decidiu que esta estratégia pode ser a definitiva:
> um `if` que nunca é exercitado é código morto e não testado. Se a migração acontecer algum
> dia, ela é uma mudança normal de backend — não vale carregar andaime especulativo até lá.

---

## Edge Cases

- WHEN a foto sai completamente escura, tremida ou vazia THEN a IA SHALL responder vazio e o
  app SHALL avisar, sem inventar item.
- WHEN a IA devolve um termo genérico demais (ex.: "objeto", "plástico") THEN o teto de 12
  candidatos SHALL limitar o ruído, e os termos ficam editáveis na barra.
- WHEN a IA devolve texto que não é JSON válido THEN o backend SHALL tratar como falha
  (BFOTO-17), sem quebrar.
- WHEN o usuário fecha a câmera sem tirar foto THEN nada SHALL acontecer (lista e busca intactas).
- WHEN o usuário está com filtro de localização ou de pendentes ativo THEN o modo foto SHALL
  respeitar esses filtros, como a busca digitada já faz.
- WHEN o item fotografado **não existe** no almoxarifado THEN o app SHALL mostrar o que a IA
  viu e nenhum candidato — resposta correta, não erro.
- WHEN a conexão cai **durante** a espera THEN o app SHALL falhar por BFOTO-17 e preservar a tela.
- WHEN duas pessoas usam o app ao mesmo tempo THEN nada SHALL interferir (a busca é leitura
  pura; não há estado compartilhado nem gravação).

---

## Dimensões implícitas (varredura obrigatória)

| Dimensão | Resolução |
|---|---|
| Validação e limites de entrada | BFOTO-02: 384 px, JPEG, uma foto por busca |
| Falha e falha parcial | BFOTO-15/16/17: sempre degrada para busca manual, tela preservada |
| Idempotência / repetição | N/A — busca é leitura pura; repetir é inofensivo e nada é gravado |
| Autenticação e limites de uso | BFOTO-03 (`requireAuth_`); quota: N/A, ver Pressupostos |
| Concorrência / ordem | BFOTO-18: resposta atrasada é descartada pela captura mais recente |
| Ciclo de vida do dado | BFOTO-05: foto descartável, nada persiste |
| Observabilidade | BFOTO-19: `_debugIA` com modelo, custo e motivo |
| Falha de dependência externa | BFOTO-17: qualquer erro da IA cai na busca manual |
| Integridade de transição de estado | Só um estado novo (modo foto), que sai por BFOTO-12 |

---

## Técnico

### Fluxo

```
[câmera] --foto 384px--> index.html --POST buscarPorFoto--> apps-script.gs
                                                                 |
                                            GEMINI_API_KEY (já existe)
                                                                 v
                                        generativelanguage.googleapis.com
                                        gemini-2.5-flash-lite + inline_data
                                                                 |
         index.html <---- { visto, termos, texto, _debugIA } <----+
              |
              +-- preenche a barra de busca, modo foto ON, render()
```

- **Endpoint:** o **mesmo** de `gerarPalavrasChaveLote_()` —
  `POST .../v1beta/models/{modelo}:generateContent?key=...`, acrescentando à `parts` um
  `inline_data: { mime_type, data: <base64 sem o prefixo data:> }` ao lado do texto do prompt.
- **Modelo:** `gemini-2.5-flash-lite` (o mesmo já em uso), trocável pela propriedade
  `GEMINI_VISION_MODEL` sem reimplantar — mesma conveniência que `OPENROUTER_IMAGE_MODEL`.
- **Resposta forçada em JSON** (`responseMimeType: 'application/json'`, `temperature` baixa),
  como nas palavras-chave: `{ "visto": "...", "termos": "...", "texto": "..." }`.
- **Prompt ancorado**, no espírito do `PROMPT_KW`: descrever o que **está** na foto, em
  português minúsculo; ler texto/números impressos se houver; **responder vazio quando não
  souber**, nunca chutar marca, modelo ou voltagem.
- **Custo:** imagem é cobrada como texto no flash-lite. Até 384 px = 258 tokens fixos;
  com o prompt, ~400 tokens por busca ≈ **US$ 0,00004**. Mil buscas ≈ US$ 0,04.
- **Nada de `DriveApp`** nesta função (BFOTO-05 depende disso).

### O que muda em cada arquivo

| Arquivo | Mudança |
|---|---|
| `apps-script.gs` | Constante de prompt; `descreverFotoIA_()`; ação `buscarPorFoto` no `doPost`; `diagnosticarGeminiVisao()` |
| `js/utils.js` | Recebe `norm()` e `escapeRe_()`, hoje soltos no `index.html` (genéricas: `norm` tem 6 chamadas fora da busca) |
| `js/search.js` | **Novo.** Recebe `searchScore_()` e `searchFilter_()` movidas do `index.html`, e ganha `photoScore_()` / `searchFilterFoto_()` |
| `tests/search.test.js` | **Novo.** Prova que o AND da busca digitada não mudou e cobre a pontuação do modo foto |
| `tests/utils.test.js` | Casos de `norm()` e `escapeRe_()` |
| `index.html` | Tag `<script src="./js/search.js">`; botão de câmera; `buscarPorFoto()`; modo foto no `render()`; estados de erro; `APP_VERSION` para **v38** |
| `sw.js` | `./js/search.js` no `SHELL`; `CACHE` para **v38** (obrigatoriamente junto com o `APP_VERSION` — aprendizado do `STATE.md`) |

> **Convenção obrigatória nas extrações** (`codebase/TESTING.md`, "Método usado nas extrações"):
> antes de mover uma função, comparar a versão nova com a original sobre centenas/milhares de
> entradas, incluindo aleatórias, para **provar** que a saída é idêntica. Refatoração não pode
> mudar comportamento, e aqui o código movido é usado por toda a busca do app.

### Reaproveitamento (por que a feature é pequena)

- `scanSearch()` (`scanSearch()` no `index.html`) é o molde exato: abre câmera →
  preenche a barra → `render()`.
- `compress()` já gera a foto; só muda o tamanho pedido.
- `card()` já mostra todos os dados do item, **incluindo as miniaturas** das fotos
  cadastradas — a confirmação visual dos 25 itens fotografados sai de graça.
- `searchScore_()` já dá peso dominante a código e código de barras: o OCR se aproveita disso
  sem código novo.
- `requireAuth_`, `jsonOut_` e o padrão `_debugIA` já existem.

---

## O ciclo que conserta sozinho

Esta é a **maior vantagem prática** da estratégia escolhida, e ela merece destaque porque muda
como a feature envelhece.

A pontuação do modo foto consulta a coluna **`Palavras-chave`** (peso 12 por termo casado). Logo,
quando uma busca por foto erra ou não acha nada, o conserto **não depende de programador**:

```
foto não achou o item
        │
        ▼
o app mostra o que a IA viu  ──►  ex.: "conector de rede rj45"
        │
        ▼
você acrescenta essas palavras na coluna Palavras-chave do item
(direto na planilha, onde a coluna já é editável à mão)
        │
        ▼
aquele item passa a ser achado para sempre — por foto E por busca digitada
```

Cada erro vira uma melhoria permanente, feita por você, em segundos. Com o tempo o acerto sobe
sem release, sem implantação e sem tocar no código. É o oposto da alternativa descartada, em que
um erro da IA não tem conserto do lado do usuário.

Vale para as duas buscas ao mesmo tempo: a palavra que você adiciona para a câmera achar o item
também faz a busca digitada achar. É o mesmo mecanismo que a feature `busca-palavras-chave` já
criou — esta feature só passa a se beneficiar dele.

**Consequência para a operação:** a qualidade da coluna `Palavras-chave` é o que determina o
acerto. Se o acerto decepcionar, a primeira pergunta não é "trocar de estratégia?", é
"as palavras-chave dos itens que erraram estão boas?".

---

## Se não for suficiente

A estratégia escolhida pode ser a definitiva. Estas alternativas ficam registradas como
**contingência**, não como plano — para que a decisão de hoje não pareça improviso se algum dia
for revista, e para não repetir a análise do zero.

| Alternativa | O que muda | Quando reconsiderar |
|---|---|---|
| **IA escolhe no catálogo** (foto + os 372 itens na mesma chamada) | A IA lê as descrições oficiais e devolve os códigos candidatos. Acerta mais em item de descrição críptica (`PLUG MACHO 8 VIAS`), porque não depende de palavra coincidente. Custa ~10x (ainda ~US$ 0,001), responde mais devagar, exige validar os códigos devolvidos, e **descarta a `photoScore_()`**. | Se, depois de melhorar as `Palavras-chave` dos casos que erraram, o acerto continuar ruim. Melhorar as palavras-chave vem **primeiro** — é grátis e reversível. |
| **Semelhança visual** (comparar com as fotos já cadastradas) | Distingue itens parecidos que se diferenciam por detalhe (modelo, conector, bitola) — o que nenhuma abordagem por texto resolve. Exige embeddings de imagem (Vertex AI: conta de serviço, não basta a chave), guardar e manter um vetor por item. | Quando a cobertura de fotos crescer muito (hoje 25/372) **e** o problema que sobrar for especificamente "acha a categoria certa mas o modelo errado". |

O cadastro de fotos que o usuário está fazendo agora é o que manteria a segunda opção viável
no futuro — mas ela não é necessária para esta feature funcionar.

---

## Requirement Traceability

| ID | Requisito | Story | Fase | Situação |
|---|---|---|---|---|
| BFOTO-01 | Botão de câmera na barra de busca abre a captura | P1 câmera | Design | Pending |
| BFOTO-02 | Foto a 384 px via `compress()`, enviada em `buscarPorFoto` | P1 câmera | Design | Pending |
| BFOTO-03 | Ação protegida por `requireAuth_` | P1 câmera | Design | Pending |
| BFOTO-04 | Sucesso preenche a barra e entra em modo foto | P1 câmera | Design | Pending |
| BFOTO-05 | Foto descartável: sem Drive, sem planilha, sem fila | P1 descartável | Design | Pending |
| BFOTO-06 | Resultado usa o `card()` normal | P1 câmera | Design | Pending |
| BFOTO-07 | Modelo trocável por `GEMINI_VISION_MODEL` | P1 câmera | Design | Pending |
| BFOTO-08 | Prompt ancorado, pt-br, pode responder vazio | P1 falhar bem | Design | Pending |
| BFOTO-09 | Modo foto **não** exige todas as palavras | P1 pontuação | Design | Pending |
| BFOTO-10 | Zero termos casados exclui o item | P1 pontuação | Design | Pending |
| BFOTO-11 | OCR que casa código/cód. de barras domina o topo | P1 pontuação | Design | Pending |
| BFOTO-12 | Editar a barra sai do modo foto | P1 pontuação | Design | Pending |
| BFOTO-13 | Busca digitada permanece idêntica (AND) | P1 pontuação | Design | Pending |
| BFOTO-14 | Offline desabilita o botão com aviso | P1 falhar bem | Design | Pending |
| BFOTO-15 | Não identificou → avisa, sem inventar | P1 falhar bem | Design | Pending |
| BFOTO-16 | Identificou mas 0 candidatos → mostra o que viu, termos editáveis | P1 falhar bem | Design | Pending |
| BFOTO-17 | Qualquer falha → mensagem clara, tela preservada, nada gravado | P1 falhar bem | Design | Pending |
| BFOTO-18 | Captura nova descarta resposta antiga | P1 falhar bem | Design | Pending |
| BFOTO-19 | Diagnóstico no padrão `_debugIA` | P1 falhar bem | Design | Pending |
| BFOTO-20 | Teto de 12 candidatos, ordenados | P1 câmera | Design | Pending |
| BFOTO-21 | `diagnosticarGeminiVisao()` confirma a visão antes de construir | P1 diagnóstico | Execute | ✅ Verified |
| BFOTO-22 | `APP_VERSION` e `CACHE` sobem juntos para v38 | P1 câmera | Design | Pending |

**Formato de ID:** `BFOTO-NN`
**Situações:** Pending → In Design → In Tasks → Implementing → Verified
**Cobertura:** 22 no total, 0 mapeados a tarefas ainda ⚠️ (o mapeamento acontece em DESIGN/TASKS)
**Todos P1** — não há requisito adiável: o antigo BFOTO-23 (andaime para migração futura) foi
removido junto com a história P2.

---

## Success Criteria

- [ ] Fotografar um item comum do almoxarifado traz o item certo **entre os 3 primeiros**.
- [ ] Fotografar um item cujo nome cadastrado é diferente do popular (ex.: `BORRIFADOR`) o
      encontra — o caso que hoje falha na busca digitada.
- [ ] Nenhuma busca por foto volta vazia **por causa da regra AND** (o defeito que motivou a
      story de pontuação).
- [ ] Zero arquivos novos no Drive depois de 3 buscas.
- [ ] Offline: botão desabilitado e avisado; busca digitada e leitura de código de barras intactas.
- [ ] Busca digitada, filtros, separação, consumo e sincronização com comportamento **idêntico**
      ao de antes.
- [ ] Custo medido no `_debugIA` compatível com a estimativa (ordem de centésimos de centavo).
- [ ] **O ciclo de conserto funciona:** pegar um item que a foto não achou, acrescentar à mão as
      palavras que a IA disse ter visto na coluna `Palavras-chave`, e a mesma foto passa a achá-lo —
      sem mudar código, sem nova implantação. É isto que sustenta a estratégia a longo prazo.
