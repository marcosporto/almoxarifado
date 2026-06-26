# Login com Google — Especificação

## Problem Statement

Hoje o app não tem controle de acesso: a API do Apps Script é **pública** (qualquer
pessoa com a URL pode ler e gravar — ver `../../codebase/CONCERNS.md`) e **não há
registro de quem** fez cada ação. Precisamos garantir que só pessoas autorizadas usem
o app e saber quem realizou cada conferência/saída, **sem perder o funcionamento offline**.

## Goals

- [ ] Apenas contas Google de uma **lista autorizada** conseguem usar o app.
- [ ] O **backend valida a identidade** em toda gravação (fecha a API pública).
- [ ] Cada gravação **registra o e-mail** de quem fez.
- [ ] Mantém o **offline-first**: login uma vez (com internet), depois funciona offline.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Senha própria / cadastro de usuário | Usamos a conta Google; não criamos sistema de senha |
| Papéis/permissões (admin vs. comum) | Nesta versão, todo autorizado tem o mesmo acesso |
| Recuperação de senha | Responsabilidade do Google |
| Tela de administração da lista dentro do app | A lista é gerenciada direto na planilha (mais simples) |

---

## User Stories

### P1: Entrar com o Google ⭐ MVP

**User Story**: Como almoxarife autorizado, quero entrar com minha conta Google para
usar o app com segurança.

**Why P1**: É a base de tudo — sem isso não existe login.

**Acceptance Criteria**:

1. WHEN o app abre e ninguém está logado THEN o app SHALL mostrar a tela "Entrar com o
   Google" e NÃO exibir o inventário.
2. WHEN o usuário entra com uma conta Google que ESTÁ na lista autorizada THEN o app
   SHALL liberar o acesso e carregar o inventário.
3. WHEN o usuário entra com uma conta que NÃO está na lista THEN o app SHALL negar o
   acesso e mostrar mensagem clara (ex.: "Sua conta não tem permissão. Fale com o responsável.").

**Independent Test**: Abrir o app deslogado → tocar em "Entrar com o Google" → entrar
com e-mail da lista → ver o inventário. Repetir com e-mail fora da lista → ver o bloqueio.

---

### P1: Backend exige identidade válida ⭐ MVP

**User Story**: Como responsável pelos dados, quero que o backend só aceite requisições
de usuários autenticados e autorizados, para que ninguém acesse a planilha pela URL.

**Why P1**: Sem isso, o login só "esconde a tela" e os dados continuam expostos pela URL.

**Acceptance Criteria**:

1. WHEN o backend recebe uma requisição SEM credencial válida THEN SHALL recusar
   (erro de "não autorizado") e não ler/gravar nada.
2. WHEN a credencial é válida MAS o e-mail não está na lista THEN SHALL recusar.
3. WHEN a credencial é válida E o e-mail está autorizado THEN SHALL processar normalmente.

**Independent Test**: Chamar a URL do backend sem credencial e confirmar que é recusada;
chamar com credencial autorizada e confirmar que responde.

---

### P1: Lembrar sessão para uso offline ⭐ MVP

**User Story**: Como almoxarife em local sem sinal, quero que o app lembre que já entrei,
para continuar usando offline.

**Why P1**: O app é offline-first; sem "lembrar", login quebraria o uso sem internet.

**Acceptance Criteria**:

1. WHEN o usuário já entrou uma vez com internet THEN o app SHALL lembrar a sessão e
   permitir uso offline sem novo login.
2. WHEN a sessão/credencial expira E há internet THEN o app SHALL pedir login novamente.
3. WHEN está offline e a credencial expirou THEN o app SHALL permitir continuar vendo e
   editando localmente, avisando que a sincronização ocorrerá após novo login online.

**Independent Test**: Logar com internet, desligar a rede, fechar e reabrir o app →
deve abrir já logado e funcionando.

---

### P2: Registrar quem fez cada ação

**User Story**: Como gestor, quero saber quem conferiu cada item e quem registrou cada
saída de consumo.

**Why P2**: Importante para histórico/responsabilidade, mas o app já funciona sem isso.

**Acceptance Criteria**:

1. WHEN um usuário confirma uma conferência THEN o sistema SHALL registrar o e-mail do
   autor associado àquela ação.
2. WHEN um usuário registra uma saída de consumo THEN o sistema SHALL registrar o e-mail
   do autor no lançamento.

**Independent Test**: Conferir um item logado como e-mail X → verificar o e-mail X
gravado na planilha.

---

### P3: Sair (logout)

**User Story**: Como usuário, quero poder sair da minha conta no app.

**Why P3**: Conveniência; não é essencial para o MVP.

**Acceptance Criteria**:

1. WHEN o usuário toca em "Sair" THEN o app SHALL encerrar a sessão e voltar à tela de login.

---

### P3: Gerenciar a lista de autorizados

**User Story**: Como responsável, quero adicionar/remover e-mails autorizados facilmente.

**Why P3**: Necessário ao longo do tempo, mas a lista inicial pode ser cadastrada manualmente.

**Acceptance Criteria**:

1. WHEN eu adiciono/removo um e-mail na lista THEN o backend SHALL passar a aceitar/recusar
   aquele e-mail no acesso seguinte.

---

## Edge Cases

- WHEN o usuário nunca logou E está offline THEN o app SHALL avisar que é preciso internet
  no primeiro acesso.
- WHEN um e-mail é removido da lista THEN no próximo acesso/sincronização online o sistema
  SHALL bloquear aquele usuário.
- WHEN o login do Google é cancelado ou falha THEN o app SHALL voltar à tela de login sem
  travar, com mensagem amigável.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| AUTH-01 | P1: Entrar com o Google (tela bloqueia deslogado) | Design | Pending |
| AUTH-02 | P1: Entrar com o Google (conta autorizada libera) | Design | Pending |
| AUTH-03 | P1: Entrar com o Google (conta não autorizada bloqueada) | Design | Pending |
| AUTH-04 | P1: Backend exige identidade (recusa sem credencial) | Design | Pending |
| AUTH-05 | P1: Backend exige identidade (recusa não autorizado) | Design | Pending |
| AUTH-06 | P1: Lembrar sessão (uso offline) | Design | Pending |
| AUTH-07 | P1: Lembrar sessão (reautenticar ao expirar online) | Design | Pending |
| AUTH-08 | P2: Registrar autor nas gravações | Design | Pending |
| AUTH-09 | P3: Sair (logout) | - | Pending |
| AUTH-10 | P3: Gerenciar a lista de autorizados | - | Pending |

**ID format:** `AUTH-NN`
**Status values:** Pending → In Design → In Tasks → Implementing → Verified
**Coverage:** 10 total, 0 mapeados a tarefas ainda ⚠️ (mapeamento ocorre nas fases Design/Tasks)

---

## Success Criteria

- [ ] Pessoa fora da lista não consegue ver nem gravar dados — nem abrindo a URL do backend direto.
- [ ] Pessoa da lista entra rapidamente e o app a mantém logada nas próximas aberturas.
- [ ] App continua funcionando offline depois do primeiro login.
- [ ] Cada conferência/saída fica com o e-mail do autor registrado na planilha.
