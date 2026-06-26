# Login com Google — Context (decisões do usuário)

**Gathered:** 2026-06-25
**Spec:** `.specs/features/login-google/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Adicionar **login com conta Google** ao app, de modo que **apenas pessoas de uma lista
autorizada** consigam usá-lo, o **backend valide a identidade** (não só a tela), cada
gravação **registre o autor**, e o app **continue funcionando offline** após o primeiro
login. Não inclui senhas próprias nem papéis/permissões diferentes entre usuários.

---

## Implementation Decisions

### Objetivo do login
- Serve para **dois fins ao mesmo tempo**: (1) controlar quem usa o app e
  (2) registrar quem realizou cada ação (conferência / saída de consumo).

### Quem pode entrar
- Acesso liberado **apenas para uma lista de e-mails que o responsável controla**
  (allowlist). Quem não está na lista é bloqueado, mesmo tendo conta Google.

### Comportamento offline
- **Logar uma vez (com internet) e lembrar a sessão.** Depois disso o app funciona
  offline normalmente, sem exigir novo login a cada abertura.
- Quando a sessão expirar e houver internet, pedir login de novo.

### O que o login protege
- **O app inteiro.** Sem login válido, a pessoa não vê nem altera nada.

### Agent's Discretion
O **como técnico** fica a critério do agente na fase de Design (a ser confirmado com o
usuário antes de implementar):
- qual serviço do Google usar para o botão "Entrar com o Google";
- onde guardar a lista de e-mails autorizados (planilha vs. configuração do script);
- como o backend (Apps Script) confere a identidade em cada requisição;
- como a sessão é "lembrada" no aparelho mantendo o offline-first.

---

## Specific References

- Preferência explícita do usuário: **usar os serviços do Google** para o login
  (coerente com o backend já ser Google: Planilhas, Drive e Apps Script).
- Deve **fechar o ponto de atenção** registrado em `../../codebase/CONCERNS.md`
  ("API do backend é pública").

---

## Deferred Ideas

Ideias que surgiram mas ficam **fora desta feature** (anotadas para não se perderem):
- Papéis/permissões diferentes (ex.: administrador vs. usuário comum).
- Tela dentro do app para gerenciar a lista de autorizados (por ora, gerencia-se na planilha).
- Relatório/histórico de autoria (quem fez o quê ao longo do tempo).
