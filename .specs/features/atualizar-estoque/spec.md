# Atualizar Estoque (mesclar) — Especificação

## Problem Statement
Os dados da aba **Estoque** vêm de um sistema externo do almoxarifado, copiados
direto da tela (não há exportação de planilha). Periodicamente é preciso re-importar
para refletir o estoque atual, mas **colar por cima apagaria** o enriquecimento feito
no app (fotos, código de barras, observações, localização, validade, mínimo, conferido).
Precisamos atualizar os dados do sistema **preservando** o enriquecimento.

## Goals
- [ ] Atualizar Descrição, Unidade e Estoque Sistema casando por **Código Interno**,
      sem perder o enriquecimento.
- [ ] Itens novos entram; itens que sumiram do sistema ficam com Estoque Sistema = 0
      e sinal "Sem estoque".
- [ ] Conferência preservada; Diferença recalculada.

## Out of Scope
| Item | Motivo |
| ---- | ------ |
| Mudanças no app do celular | Ele continua lendo a aba Estoque; nada muda lá |
| Exclusão automática de itens | Nunca apaga — só sinaliza (decisão do usuário) |

## Decisões (confirmadas com o usuário em 2026-06-26)
1. Coluna copiada **"Quantidade" = Estoque Sistema**.
2. Item que some do sistema → **Estoque Sistema = 0** + coluna **"Situação" = "Sem estoque"**
   (o sistema só lista itens com saldo; sumir = acabou o estoque).
3. Conferência **mantida**; Diferença **recalculada**.
4. Casamento por **Código Interno ignorando zeros à esquerda** (018937001 = 18937001).

## Fluxo de uso (na planilha)
1. Menu **🔄 Almoxarifado → 1) Preparar aba "Importar"** (cria/limpa a aba; Código como texto).
2. Usuário **cola a tabela copiada do sistema (com o cabeçalho)** na aba "Importar".
3. Menu **🔄 Almoxarifado → 2) Atualizar estoque (mesclar)** → resumo:
   *Atualizados / Novos / Marcados "Sem estoque"*.

Colunas reconhecidas no import: `Código`, `Descrição`, `Unidade de Distribuição`,
`Quantidade` (→ Estoque Sistema). `Orgãos`/`Ações` são ignoradas.

## Requirements (AE)
| ID | Requisito |
| -- | --------- |
| AE-01 | Casar por Código Interno, ignorando zeros à esquerda |
| AE-02 | Item existente → atualizar só Descrição/Unidade/Estoque Sistema; preservar enriquecimento |
| AE-03 | Item novo → adicionar (não inventariado, enriquecimento vazio) |
| AE-04 | Item ausente no import → Estoque Sistema=0 + "Sem estoque"; recalcular Diferença |
| AE-05 | Item que volta a aparecer → limpar o sinal "Sem estoque" |
| AE-06 | Parsear número no formato BR ("63,00" → 63) |
| AE-07 | Menu na planilha + resumo ao final |

## Success Criteria
- [ ] Após atualizar, fotos/observações/código de barras/localização continuam intactos.
- [ ] Estoque Sistema reflete a nova cópia; novos itens aparecem; sumidos viram "Sem estoque".
- [ ] O app no celular continua funcionando sem nenhuma alteração.
