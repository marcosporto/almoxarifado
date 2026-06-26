# Login com Google — Tasks

**Design**: `.specs/features/login-google/design.md`
**Status**: In Progress — ✅ Fase 0, ✅ Fase 1 (backend T3–T7), ✅ Fase 2 (frontend T8–T12), ✅ T13 (v21). Falta: **publicar** (implantar backend + push frontend) e **T14** (verificação fim a fim).

**SPEC_DEVIATION (T13):** a lib do Google NÃO foi adicionada ao `SHELL` do Service Worker.
Motivo: `cache.addAll()` falharia com o recurso do `accounts.google.com`, quebrando a
instalação do SW; e o login exige internet de qualquer forma. Offline pós-login segue
funcionando pela sessão no IndexedDB.

---

## 📖 Como ler isto (em português simples)

Quebrei o login em **14 passos pequenos**, agrupados em 4 fases. Cada passo tem um
objetivo único e um jeito de **conferir se deu certo**. Como o app ainda não tem testes
automáticos, a conferência é **manual** (testar no app/planilha) — isso está honestamente
marcado em cada passo como `Tests: none (verificação manual)`.

Os passos da **Fase 0** são **cliques** (configuração no Google e na planilha) — eu te
guio. Os demais são código, que eu escrevo e te mostro.

---

## Execution Plan

```
Fase 0 — Preparação (cliques, guiados)
  T1 (credencial Google)   T2 (aba Autorizados)     ← independentes entre si

Fase 1 — Backend (apps-script.gs, em ordem)
  T3 → T4 → T5 → T6 → T7
        (T3 depende de T1 e T2)

Fase 2 — Frontend (index.html, em ordem)
  T8 → T9 → T10
        T8 depende de T1
        T10 depende de T6, T8, T9
  T11 (depende de T6, T9)
  T12 (depende de T9)

Fase 3 — Offline / Publicar / Verificar
  T13 (depende de T8) → T14 (verificação final, depende de tudo)
```

> Observação: o backend (apps-script.gs) e o frontend (index.html) são **arquivos
> diferentes**, então a Fase 1 e a Fase 2 poderiam ser feitas em paralelo. Para ficar
> claro de acompanhar, vamos fazer **em sequência**. Não marquei nenhuma tarefa como
> paralela `[P]` porque cada arquivo é editado por vários passos (evita conflito).

---

## Task Breakdown

### T1: Criar credencial OAuth no Google Cloud ✅ CONCLUÍDA (2026-06-26)
**What**: Criar um "ID do cliente OAuth 2.0" (Web) e registrar a origem do GitHub Pages.
**Where**: Google Cloud Console (sem código).
**Depends on**: None
**Reuses**: —
**Requirement**: AUTH-01 (habilitador)
**Tools**: MCP: NONE · Skill: NONE
**Tests**: none (verificação manual)
**Done when**:
- [x] Tela de consentimento configurada (projeto "Almoxarifado UDESC", tipo Externo).
- [x] Client ID (Web) criado.
- [x] Origem `https://marcosporto.github.io` adicionada em "Origens JavaScript autorizadas".
- [x] Client ID copiado e anotado.
**Verify**: o Client ID existe no painel e a origem aparece listada.

**CLIENT_ID** (não é secreto — usado no frontend e backend):
`768100742493-h1v8i5u47aip75rbcv52uvuej4o7v2mr.apps.googleusercontent.com`

---

### T2: Criar a aba "Autorizados" na planilha ✅ CONCLUÍDA (2026-06-26)
**What**: Criar a aba `Autorizados` (coluna "E-mail") e cadastrar os e-mails iniciais.
**Where**: Planilha do Google (sem código).
**Depends on**: None
**Reuses**: —
**Requirement**: AUTH-02, AUTH-03, AUTH-05, AUTH-10
**Tools**: MCP: NONE · Skill: NONE
**Tests**: none (verificação manual)
**Done when**:
- [x] Aba `Autorizados` existe com cabeçalho "E-mail".
- [x] E-mail do usuário cadastrado na A2.
**Verify**: abrir a planilha e ver a aba com os e-mails.

---

### T3: Constantes de autenticação no backend
**What**: Adicionar `CLIENT_ID`, nome da aba `Autorizados` e rótulos das colunas de autoria.
**Where**: `apps-script.gs` (topo do arquivo).
**Depends on**: T1, T2
**Reuses**: padrão de constantes existente (`SHEET_NAME`, `COLUMNS`).
**Requirement**: AUTH-04, AUTH-05, AUTH-08
**Tools**: MCP: NONE · Skill: NONE
**Tests**: none (verificação manual)
**Done when**:
- [ ] `CLIENT_ID` preenchido com o valor de T1.
- [ ] Constantes da aba/colunas adicionadas.
**Verify**: editor do Apps Script salva sem erro de sintaxe.

---

### T4: Função `verifyToken_(token)`
**What**: Validar o crachá pelo endpoint `tokeninfo` e conferir `aud`/`iss`/`exp`; cachear o resultado.
**Where**: `apps-script.gs` (nova função).
**Depends on**: T3
**Reuses**: `UrlFetchApp`, `CacheService`, `jsonOut_` (padrão de erro).
**Requirement**: AUTH-04
**Tools**: MCP: NONE · Skill: NONE
**Tests**: none (verificação manual)
**Done when**:
- [ ] Crachá válido → devolve `{ email, name }`.
- [ ] Crachá inválido/expirado/`aud` errado → lança erro.
- [ ] Resultado válido fica em cache por alguns minutos.
**Verify**: rodar a função no editor com um crachá real (válido) e um falso.

---

### T5: Função `isAuthorized_(email)`
**What**: Conferir se um e-mail está na aba `Autorizados`.
**Where**: `apps-script.gs` (nova função).
**Depends on**: T3
**Reuses**: `SpreadsheetApp`, `norm_`.
**Requirement**: AUTH-05
**Tools**: MCP: NONE · Skill: NONE
**Tests**: none (verificação manual)
**Done when**:
- [ ] E-mail na lista → `true`.
- [ ] E-mail fora da lista → `false`.
- [ ] Ignora maiúsculas/minúsculas e espaços.
**Verify**: rodar no editor com um e-mail da lista e um de fora.

---

### T6: Guarda `requireAuth_` aplicada em `doGet` e `doPost`
**What**: Criar `requireAuth_` (extrai token, valida com T4, autoriza com T5) e exigi-la no início de `doGet` e `doPost`.
**Where**: `apps-script.gs` (nova função + edição de `doGet`/`doPost`).
**Depends on**: T4, T5
**Reuses**: `jsonOut_`, fluxo de `doGet`/`doPost` existente.
**Requirement**: AUTH-04, AUTH-05
**Tools**: MCP: NONE · Skill: NONE
**Tests**: none (verificação manual)
**Done when**:
- [ ] Requisição sem token → resposta `{ ok:false, error:'unauthorized' }`.
- [ ] Token válido + e-mail autorizado → fluxo normal.
- [ ] Token válido + e-mail não autorizado → recusa.
**Verify**: chamar a URL `/exec` sem token (recusa) e com token válido (responde).

---

### T7: Registrar autoria nas gravações
**What**: Gravar o e-mail do autor nas colunas "Conferido por" (Estoque) e "Registrado por" (Consumo).
**Where**: `apps-script.gs` (`pushItem_`, `addConsumo_`, `ensureColumns_`/headers).
**Depends on**: T6
**Reuses**: `buildColMap_`, `ensureColumns_`, `CONSUMO_HEADERS`.
**Requirement**: AUTH-08
**Tools**: MCP: NONE · Skill: NONE
**Tests**: none (verificação manual)
**Done when**:
- [ ] Coluna "Conferido por" preenchida ao confirmar inventário.
- [ ] Coluna "Registrado por" preenchida ao lançar saída.
**Verify**: conferir um item e olhar a planilha; lançar uma saída e olhar a aba Consumo.

---

### T8: Tela de login + biblioteca do Google (frontend)
**What**: Incluir a lib `https://accounts.google.com/gsi/client`, a sobreposição de login com o botão e o `CLIENT_ID`.
**Where**: `index.html` (novo bloco HTML/CSS + `<script src>` + constante).
**Depends on**: T1
**Reuses**: estilos/modais existentes.
**Requirement**: AUTH-01
**Tools**: MCP: NONE · Skill: NONE
**Tests**: none (verificação manual)
**Done when**:
- [ ] Ao abrir deslogado, aparece a tela com o botão "Entrar com o Google".
- [ ] O inventário não aparece enquanto deslogado.
**Verify**: abrir o app sem sessão e ver a tela de login.

---

### T9: Gerenciador de sessão (frontend)
**What**: Funções `saveSession`/`getSession`/`clearSession`/`authToken` no IndexedDB.
**Where**: `index.html` (novas funções, store `kv` chave `session`).
**Depends on**: T8
**Reuses**: `idbGet`/`idbPut`/`idbDel`.
**Requirement**: AUTH-06
**Tools**: MCP: NONE · Skill: NONE
**Tests**: none (verificação manual)
**Done when**:
- [ ] Sessão é salva e relida após recarregar a página.
- [ ] `clearSession` apaga a sessão.
**Verify**: logar, recarregar a página e continuar logado.

---

### T10: Liberar/bloquear o app no carregamento (gating)
**What**: `handleCredentialResponse` + `requireAuth()` no `onload`: com sessão → abre o app; sem sessão → tela de login; e-mail negado → mensagem + logout.
**Where**: `index.html` (`window.onload`, novas funções).
**Depends on**: T6, T8, T9
**Reuses**: `loadData`, `openModal`, `alertDialog`.
**Requirement**: AUTH-01, AUTH-02, AUTH-03, AUTH-07
**Tools**: MCP: NONE · Skill: NONE
**Tests**: none (verificação manual)
**Done when**:
- [ ] E-mail autorizado entra e o inventário carrega.
- [ ] E-mail não autorizado vê "sem permissão" e não entra.
- [ ] Crachá expirado (online) pede login de novo.
**Verify**: testar com e-mail da lista e com e-mail de fora.

---

### T11: Anexar o crachá nas requisições
**What**: Enviar o token em `loadData` (GET `?token=`), `syncNow` (token no corpo) e `loadConsumo`; tratar resposta "unauthorized".
**Where**: `index.html` (`loadData`, `syncNow`, `loadConsumo`).
**Depends on**: T6, T9
**Reuses**: pipeline de fetch/sync existente.
**Requirement**: AUTH-04, AUTH-05, AUTH-07
**Tools**: MCP: NONE · Skill: NONE
**Tests**: none (verificação manual)
**Done when**:
- [ ] Ler e gravar funcionam com o token.
- [ ] Resposta "unauthorized" leva de volta ao login.
**Verify**: usar o app logado (lê/grava) e simular token inválido (volta ao login).

---

### T12: Botão "Sair" (logout)
**What**: Botão que encerra a sessão e volta à tela de login.
**Where**: `index.html` (botão na interface + `logout()`).
**Depends on**: T9
**Reuses**: `clearSession`, `google.accounts.id.disableAutoSelect()`.
**Requirement**: AUTH-09
**Tools**: MCP: NONE · Skill: NONE
**Tests**: none (verificação manual)
**Done when**:
- [ ] Tocar em "Sair" volta para a tela de login.
**Verify**: logar, tocar em Sair, ver a tela de login.

---

### T13: Offline + publicação (Service Worker e versão)
**What**: Adicionar a lib do Google ao `SHELL` do `sw.js` e subir `APP_VERSION` e `CACHE` para `v21`.
**Where**: `sw.js` e `index.html`.
**Depends on**: T8
**Reuses**: lista `SHELL` existente.
**Requirement**: AUTH-06 (offline)
**Tools**: MCP: NONE · Skill: NONE
**Tests**: none (verificação manual)
**Done when**:
- [ ] `APP_VERSION` e `CACHE` atualizados juntos para `v21`.
- [ ] Lib do Google na lista `SHELL`.
**Verify**: app continua abrindo logado após ficar offline.

---

### T14: Verificação fim a fim (UAT manual)
**What**: Testar o fluxo completo no app real.
**Where**: app publicado (GitHub Pages) + planilha.
**Depends on**: T7, T10, T11, T12, T13
**Reuses**: —
**Requirement**: todos (AUTH-01..AUTH-10)
**Tools**: MCP: NONE · Skill: `verify` (opcional, ajuda a validar)
**Tests**: none (verificação manual)
**Done when**:
- [ ] Autorizado entra e usa; não autorizado é bloqueado.
- [ ] Depois de logar, funciona offline.
- [ ] Autoria aparece na planilha.
- [ ] Chamar a URL do backend sem token é recusado.
**Verify**: roteiro acima, item a item.

---

## Plano de commits (estilo do projeto: PT-BR + versão)

- Após Fase 1: `Login: backend valida identidade Google e autorizacao (parte 1)`
- Após Fase 2: `Login: tela Entrar com o Google, sessao e gating no app (parte 2)`
- Após Fase 3: `Login: offline + publica (v21)` ← aqui sobe a versão para v21

---

## ✅ Validação obrigatória (antes de aprovar)

### Check 1 — Granularidade

| Task | Escopo | Status |
| ---- | ------ | ------ |
| T1 | 1 config (Google) | ✅ |
| T2 | 1 config (planilha) | ✅ |
| T3 | 1 bloco de constantes | ✅ |
| T4 | 1 função | ✅ |
| T5 | 1 função | ✅ |
| T6 | 1 função + aplicar em 2 entradas (coeso) | ✅ |
| T7 | autoria em 2 gravações (coeso) | ✅ |
| T8 | 1 bloco (tela + lib) | ✅ |
| T9 | 1 conjunto de funções de sessão (coeso) | ✅ |
| T10 | 1 fluxo de gating | ✅ |
| T11 | anexar token (coeso, mesmo assunto) | ✅ |
| T12 | 1 botão/função | ✅ |
| T13 | 1 ajuste de publicação | ✅ |
| T14 | verificação | ✅ |

### Check 2 — Diagrama × Dependências

| Task | Depends on (texto) | Diagrama mostra | Status |
| ---- | ------------------ | --------------- | ------ |
| T1 | None | None | ✅ |
| T2 | None | None | ✅ |
| T3 | T1, T2 | T1, T2 | ✅ |
| T4 | T3 | T3 | ✅ |
| T5 | T3 | T3 | ✅ |
| T6 | T4, T5 | T4, T5 | ✅ |
| T7 | T6 | T6 | ✅ |
| T8 | T1 | T1 | ✅ |
| T9 | T8 | T8 | ✅ |
| T10 | T6, T8, T9 | T6, T8, T9 | ✅ |
| T11 | T6, T9 | T6, T9 | ✅ |
| T12 | T9 | T9 | ✅ |
| T13 | T8 | T8 | ✅ |
| T14 | T7, T10, T11, T12, T13 | tudo | ✅ |

### Check 3 — Co-locação de testes

| Task | Camada criada/modificada | Matriz exige | Task diz | Status |
| ---- | ------------------------ | ------------ | -------- | ------ |
| T1–T14 | frontend/backend | nenhum runner definido hoje (TESTING.md) | none (manual) | ✅ |

> **Nota honesta:** o projeto não tem runner de testes hoje (ver `../../codebase/TESTING.md`),
> por isso a verificação é manual. Quando o item "criar testes" do `ROADMAP.md` for feito,
> as funções `verifyToken_`, `isAuthorized_` e o gating são **ótimas candidatas** a testes
> automatizados.

---

## Sobre ferramentas (MCPs/Skills)

Nenhum MCP especial é necessário. Para o passo final (T14), a skill `verify` pode ajudar a
validar no app real. Os demais passos são edições diretas nos arquivos do projeto.
