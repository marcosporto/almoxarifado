# Pasta `.specs/` — o "cérebro documentado" do projeto

Esta pasta foi criada seguindo a metodologia **spec-driven development** (desenvolvimento
guiado por especificação) da skill `tlc-spec-driven`. A ideia é simples:

> **Pensar e escrever o que vai ser feito ANTES de codar** — com profundidade proporcional
> ao tamanho da tarefa. Coisa pequena, pouca cerimônia; coisa grande, mais planejamento.

Nada aqui é código. São documentos em Markdown (texto) que servem de **memória** do projeto:
o que ele é, como foi construído, o que falta fazer e por que cada decisão foi tomada.

## Como esta pasta está organizada

```
.specs/
├── README.md            ← você está aqui
├── project/             ← a VISÃO do projeto (o "porquê")
│   ├── PROJECT.md          visão geral, objetivo, quem usa
│   ├── ROADMAP.md          o que já existe e o que ainda falta
│   └── STATE.md            memória viva: decisões, pendências, ideias
└── codebase/            ← a RADIOGRAFIA do código atual (o "como")
    ├── STACK.md            tecnologias usadas
    ├── ARCHITECTURE.md     como as peças se encaixam
    ├── STRUCTURE.md        onde fica cada coisa nos arquivos
    ├── CONVENTIONS.md      os padrões/combinados do projeto
    ├── INTEGRATIONS.md     serviços externos (Google, CDNs)
    ├── TESTING.md          como o app é testado hoje
    └── CONCERNS.md         pontos de atenção e dívidas técnicas
```

## O fluxo de trabalho (para as PRÓXIMAS melhorias)

Quando for mexer em algo novo, o ciclo é:

1. **SPECIFY** (sempre) — escrever *o quê* precisa, com requisitos numerados (REQ-01, REQ-02…).
2. **DESIGN** (só quando há decisão técnica nova) — decidir *como* fazer.
3. **TASKS** (só quando é grande) — quebrar em passos pequenos e testáveis.
4. **EXECUTE** (sempre) — codar, verificar e fazer commit.

Cada nova funcionalidade ganha uma pasta em `.specs/features/<nome-da-feature>/`.
Tarefas rápidas (bugs, ajustes) vão em `.specs/quick/`.

> Esta pasta documenta o app como ele está em **2026-06-25** (versão `v20`).
> Mantenha-a atualizada conforme o app evoluir — é ela que mantém o histórico das decisões.
