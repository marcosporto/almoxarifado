# Busca Inteligente + Palavras-chave (IA) — Especificação

## Problem Statement

A busca atual ([index.html:786](../../../index.html)) é um *substring* contíguo sobre
3 campos (descrição, código, código de barras), sem ordem livre de palavras, sem
ranqueamento e sem tolerância a descrição ruim. Resultado: itens que **existem no estoque
não são encontrados** quando a descrição oficial não usa o termo que a pessoa pensa
(ex.: buscar "spray" não acha `BORRIFADOR - AGUA PLASTICO 500ML`), e a experiência é pouco
fluida (o melhor resultado não vem no topo). Queremos uma busca que ache mais e melhor, e
atacar a raiz (descrição fraca) com uma coluna de apelidos/sinônimos preenchida por IA.

## Goals

- [ ] Busca acha o item mesmo com **palavras em qualquer ordem** e em **mais campos**.
- [ ] Resultados vêm **ranqueados por relevância** (melhor casamento no topo) — mais fluido.
- [ ] Existe a coluna **"Palavras-chave"** e a busca passa a usá-la.
- [ ] Um **menu na planilha** preenche essa coluna com a **IA de texto do Gemini**, em **lote**,
      só para os itens que ainda não têm — **uma vez**, e re-executável manualmente.
- [ ] Nada disso quebra o que já existe (filtros, offline, autoria, sync).

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Busca *fuzzy* (tolerar erro de digitação — Estágio 2) | Fica para uma feature futura; primeiro medimos se ainda dói |
| Palavras-chave a partir da **foto/OCR** (Estágio 4) | Depende de visão/IA de imagem; outra feature |
| Preenchimento **automático** de itens novos (na "Atualizar Estoque") | Decisão do usuário: gerar 1x + menu manual |
| Edição da coluna dentro do app (celular) | A coluna é editada direto na planilha (mais simples) |
| Processamento resumível além do limite de 6 min do Apps Script | 372 itens cabem folgado; só vira necessário em escala muito maior |

---

## User Stories

### P1: Busca por palavras + ranqueamento ⭐ MVP

**User Story**: Como almoxarife, quero buscar digitando palavras em qualquer ordem e ver o
resultado mais relevante no topo, para encontrar itens rápido mesmo sem lembrar a descrição exata.

**Why P1**: É o ganho de fluidez/encontrabilidade que independe da IA; sozinho já melhora muito.

**Acceptance Criteria**:

1. WHEN a busca tem várias palavras (ex.: "agua borrifador") THEN o sistema SHALL exigir que
   **todas** as palavras apareçam (em qualquer ordem), considerando todos os campos buscáveis.
2. WHEN há resultados THEN o sistema SHALL **ordenar por relevância** (ex.: casar no código ou
   no início da descrição pesa mais que casar no meio de um campo).
3. WHEN a busca está vazia THEN o sistema SHALL manter o comportamento atual (lista tudo,
   respeitando os filtros e a ordenação por alerta/localização).
4. WHEN o usuário digita THEN o sistema SHALL manter o *debounce* (sem reconstruir a lista a
   cada tecla) e os filtros existentes (Todos/Pendentes/Feitos/Alertas/localização).

**Independent Test**: Buscar "agua borrifador" e achar o item `BORRIFADOR - AGUA...`; conferir
que um item cujo **código** casa aparece acima de um casamento fraco no meio da descrição.

---

### P1: Coluna "Palavras-chave" e busca usando-a ⭐ MVP

**User Story**: Como responsável, quero uma coluna de apelidos/sinônimos por item, que a busca
também consulte, para consertar descrições fracas sem alterar a descrição oficial do sistema.

**Why P1**: É a raiz do "tenho o item e não acho"; sem a busca ler a coluna, gerá-la seria inútil.

**Acceptance Criteria**:

1. WHEN o backend prepara a planilha THEN o sistema SHALL garantir a coluna **"Palavras-chave"**
   (criada se faltar), mapeada por nome como as demais.
2. WHEN o app carrega os itens THEN o sistema SHALL receber o conteúdo de "Palavras-chave".
3. WHEN o usuário busca THEN o sistema SHALL considerar as palavras-chave do item junto com os
   demais campos.
4. WHEN um item não tem palavras-chave THEN a busca SHALL continuar funcionando pelos outros campos.

**Independent Test**: Cadastrar manualmente "spray, pulverizador" num item e achá-lo buscando "spray".

---

### P1: Menu "Gerar palavras-chave (IA)" em lote ⭐ MVP

**User Story**: Como responsável, quero um item de menu na planilha que use a IA para preencher a
coluna de palavras-chave a partir das descrições, para não digitar 372 itens à mão.

**Why P1**: É o pedido central — popular a coluna com baixo esforço.

**Acceptance Criteria**:

1. WHEN eu aciono **🔄 Almoxarifado → Gerar palavras-chave (IA)** THEN o sistema SHALL processar
   apenas os itens **sem** palavras-chave, em **lote** (várias descrições por chamada), e gravar o
   resultado na coluna.
2. WHEN um item já tem palavras-chave THEN o sistema SHALL **não sobrescrevê-lo** (re-rodar é seguro).
3. WHEN a descrição de um item está vazia THEN o sistema SHALL **pular** esse item (não inventa).
4. WHEN a IA responde THEN o conteúdo SHALL ser em **português, minúsculo, separado por vírgula**,
   contendo nome popular/sinônimos/categoria, **ancorado na descrição** (sem inventar marca,
   voltagem, etc.).
5. WHEN a IA falha (sem chave, sem cota, erro, resposta inválida) THEN o sistema SHALL **não
   corromper a planilha** — deixa o item em branco e segue, sem travar.
6. WHEN o processo termina THEN o sistema SHALL mostrar um **resumo** (gerados, pulados, falhas).

**Independent Test**: Esvaziar a coluna de alguns itens → rodar o menu → ver palavras-chave
plausíveis preenchidas só nesses; rodar de novo → nada é refeito (resumo "0 gerados").

---

### P2: Confirmar custo/cota do modelo de texto antes do lote

**User Story**: Como dono do projeto, quero confirmar que o modelo de texto é barato/gratuito
antes de rodar nos 372, para não ter surpresa de custo.

**Why P2**: Importante, mas é uma verificação pontual (não bloqueia o desenho).

**Acceptance Criteria**:

1. WHEN antes do primeiro lote THEN haverá um meio simples (função de diagnóstico) de testar o
   modelo de texto e ver o HTTP code/erro real, como feito na feature de foto.

---

## Edge Cases

- WHEN a coluna "Palavras-chave" já existe (criada à mão) THEN o sistema SHALL reaproveitá-la (não duplicar).
- WHEN a busca tem acento/maiúscula THEN SHALL casar igual (normalização já existe).
- WHEN há muitos itens sem palavra-chave e o lote se aproxima do limite de 6 min THEN o sistema
  SHALL parar com segurança (sem gravar pela metade um item) — e o usuário roda o menu de novo
  para continuar (os já feitos são pulados).
- WHEN a resposta da IA vem com itens a mais/a menos que o lote enviado THEN o sistema SHALL
  casar com segurança (por índice/identificador) e, na dúvida, pular em vez de gravar errado.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| BUSCA-01 | P1: Busca por palavras (ordem livre, todos os campos) | Design | Pending |
| BUSCA-02 | P1: Ranqueamento por relevância | Design | Pending |
| BUSCA-03 | P1: Preserva busca vazia + filtros + debounce | Design | Pending |
| BUSCA-04 | P1: Coluna "Palavras-chave" garantida no backend | Design | Pending |
| BUSCA-05 | P1: app recebe e a busca usa "Palavras-chave" | Design | Pending |
| BUSCA-06 | P1: Menu gera em lote só itens sem palavra-chave | Design | Pending |
| BUSCA-07 | P1: Não sobrescreve preenchidos (re-rodar seguro) | Design | Pending |
| BUSCA-08 | P1: IA ancorada, pt-br, minúsculo, vírgula; pula descrição vazia | Design | Pending |
| BUSCA-09 | P1: Falha da IA não corrompe a planilha; segue | Design | Pending |
| BUSCA-10 | P1: Resumo final (gerados/pulados/falhas) | Design | Pending |
| BUSCA-11 | P2: Diagnóstico de custo/cota do modelo de texto | - | Pending |

**ID format:** `BUSCA-NN`
**Status values:** Pending → In Design → In Tasks → Implementing → Verified
**Coverage:** 11 total, 0 mapeados a tarefas ainda ⚠️ (mapeamento nas fases Design/Tasks)

---

## Success Criteria

- [ ] Buscar "spray" acha `BORRIFADOR - AGUA...` (via palavras-chave); palavras em ordem trocada acham.
- [ ] O melhor casamento aparece no topo da lista.
- [ ] O menu preenche a coluna dos ~372 itens em poucos minutos, a custo baixo, sem quebrar a planilha.
- [ ] Re-rodar o menu só preenche os que faltam (idempotente).
- [ ] Filtros, offline, autoria e sincronização continuam funcionando como antes.
