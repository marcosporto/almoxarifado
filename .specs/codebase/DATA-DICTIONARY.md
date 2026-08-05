# DATA-DICTIONARY — o que cada coluna das planilhas significa

> As planilhas são o banco de dados do app. Este arquivo explica cada coluna das abas
> `Estoque` e `Consumo`. **Fonte da verdade:** os objetos `COLUMN_DOCS` e `CONSUMO_DOCS`
> em `apps-script.gs` — o backend aplica esses mesmos textos como **notas nos cabeçalhos**
> da planilha (passe o mouse sobre um cabeçalho para ver). Ao mudar um texto lá, atualize
> aqui também (projeto sem build: sincronização manual, por convenção).

## Aba `Estoque` (um item por linha)

As colunas são reconhecidas **por nome** (com apelidos antigos aceitos — ver `aliases_` no
`.gs`), então a ordem pode variar. Chave interna = nome usado pelo app/backend no código.

| Coluna | Chave interna | O que é / quem preenche |
|---|---|---|
| Código Interno | `codigo` | Identificador único do item no almoxarifado (mesmo código do sistema oficial). O app usa esta coluna para casar as linhas na sincronização e na importação (zeros à esquerda são ignorados no casamento). Vem da carga/atualização de estoque; o app não a altera. |
| Código de Barras | `codigoBarras` | Código de barras impresso no produto. Preenchido pelo conferente no app (lendo com a câmera ou digitando). Usado na busca e na leitura por câmera. |
| Descrição | `descricao` | Nome do item, igual ao sistema oficial. Vem da carga/atualização de estoque. Usado na busca do app e nos lançamentos de consumo. |
| Unidade de Distribuição | `unidade` | Unidade de distribuição do item (ex.: unidade, caixa, pacote). Vem do sistema oficial. |
| Localização | `localizacao` | Onde o item fica fisicamente (ex.: prateleira, gaveta). Preenchido pelo conferente no app. Usado no filtro por QR Code e para ordenar a rota da lista de separação (ordem alfanumérica natural). |
| Estoque Sistema | `estoqueSistema` | Quantidade segundo o sistema oficial. Vem da carga inicial ou do menu "🔄 Almoxarifado → Atualizar estoque". Vira 0 quando o item some da cópia do sistema (e a coluna Situação recebe "Sem estoque"). |
| Conferido | `estoqueFisico` | Quantidade contada fisicamente pelo conferente no app (botão Confirmar do item). |
| Diferença | `diferenca` | Conferido − Estoque Sistema. Calculada automaticamente pelo backend quando o item é confirmado como inventariado (negativo = falta, positivo = sobra). Não editar à mão. |
| Estoque Mínimo | `estoqueMinimo` | Quantidade mínima desejada. Abaixo disso o app destaca o item com borda vermelha. Preenchido pelo conferente no app. |
| Data de Validade | `validade` | Data de validade do item (exibida como dd/MM/aaaa). Preenchida pelo conferente no app. Gera o alerta laranja junto com "Dias para Aviso de Validade". |
| Dias para Aviso de Validade | `diasAviso` | Quantos dias antes da validade o app começa a avisar (etiqueta laranja no card). Preenchido pelo conferente no app. |
| Observações | `observacoes` | Texto livre do conferente sobre o item. Preenchido no app. |
| Palavras-chave | `palavrasChave` | Sinônimos/apelidos do item usados pela busca do app (minúsculas, separados por vírgula). Gerados em lote pela IA (menu "🔄 Almoxarifado → Gerar palavras-chave (IA)") e também editáveis à mão. |
| Status do Inventário | `inventariado` | Indica se o conferente já confirmou a contagem deste item no app. Preenchido pelo app ao Confirmar; a atualização de estoque marca "Não" em itens novos. **Valores possíveis:** Sim / Não (valores antigos aceitos: true, sim, 1, inventariado). |
| Conferido por | `conferidoPor` | E-mail de quem confirmou o inventário do item (login com Google). Gravado automaticamente pelo backend ao Confirmar. |
| Situação | `situacao` | Situação do item em relação à última atualização de estoque. Preenchida automaticamente pelo menu "🔄 Almoxarifado → Atualizar estoque". **Valores possíveis:** "Sem estoque" (item sumiu da cópia do sistema) ou vazio (normal). |
| Imagens | `imagens` | Links das fotos do item no Google Drive, separados por vírgula. Gravados automaticamente pelo app ao enviar fotos. Não editar à mão. |

## Aba `Consumo` (um lançamento de saída por linha)

Colunas **posicionais** (sem sistema de aliases) — a ordem é fixa, definida em
`CONSUMO_HEADERS` no `.gs`.

| Coluna | O que é / quem preenche |
|---|---|
| ID | Identificador único do lançamento, gerado pelo app. Usado para localizar e remover o lançamento. Não editar à mão. |
| Data da Saída | Data e hora em que o material saiu (dd/MM/aaaa HH:mm). Definida no app no momento do lançamento. |
| Código Interno | Código do item retirado (mesmo da aba Estoque). Formatado como texto para preservar zeros à esquerda. |
| Descrição | Descrição do item no momento da saída (copiada da aba Estoque). |
| Quantidade | Quantidade retirada neste lançamento. |
| Solicitante | Quem pediu o material. Preenchido no app ao registrar a saída. |
| Observações | Texto livre sobre o lançamento. Preenchido no app. |
| Registrado por | E-mail de quem registrou a saída (login com Google). Gravado automaticamente pelo backend. |

## Outras abas (não são dados do app)

| Aba | Para quê |
|---|---|
| `Autorizados` | Lista de e-mails com permissão de usar o app (feature Login com Google). |
| `Importar` | Área de trabalho do menu "Atualizar estoque" — ver a seção abaixo. Conteúdo descartável. |

---

# Aba `Importar` — o que acontece ao colar dados

**Colar dados na aba não faz nada sozinho.** A `Importar` é só uma área de estacionamento; o
app no celular nem a lê (ele lê a `Estoque`). Nada muda até você acionar o menu
**🔄 Almoxarifado → 2) Atualizar estoque (mesclar)**.

## Colunas lidas

Reconhecidas pelo **nome no cabeçalho**, em qualquer ordem. Qualquer outra coluna colada é
**ignorada** — não vai para lugar nenhum.

| Cabeçalho aceito | Obrigatória? | O que faz |
|---|---|---|
| `Código` ou `Código Interno` | **sim** | Chave do casamento com a aba Estoque |
| `Quantidade` ou `Estoque Sistema` | **sim** | Vira a coluna `Estoque Sistema` |
| `Descrição` | não | Atualiza a `Descrição`; se vazia, preserva a existente |
| `Unidade de Distribuição` ou `Unidade` | não | Atualiza a `Unidade`; se vazia, preserva a existente |

Faltando uma das obrigatórias, a mesclagem **se recusa a rodar** e avisa — não faz nada pela metade.

## O que a mesclagem faz

O casamento é por Código Interno e **ignora zeros à esquerda** (`018937001` casa com `18937001`).

| Situação | O que acontece |
|---|---|
| Código **já existe** na Estoque | Atualiza Descrição, Unidade e Estoque Sistema; limpa a `Situação`; recalcula a `Diferença` (só se o item já tinha `Estoque Físico` conferido). Todo o enriquecimento — fotos, localização, palavras-chave, validade, estoque físico — fica **intacto**. |
| Código **novo** | Cria linha nova com esses 4 campos e `Inventariado = "Não"`. |
| Item da Estoque que **não veio** na Importar | `Estoque Sistema = 0` e `Situação = "Sem estoque"`. |

Ao final, um resumo mostra quantos itens foram atualizados, criados e marcados "Sem estoque".

## ⚠️ Cole sempre a lista COMPLETA

A última linha da tabela acima é a que mais causa susto: **todo item do Estoque que não estiver
na Importar é zerado e marcado "Sem estoque"**. É proposital — é assim que o sistema detecta
itens que saíram do catálogo oficial.

Consequência prática: se você colar uma lista **parcial** (um filtro, só um setor, só uma
página do sistema), todo o resto do almoxarifado é marcado como sem estoque. Nada é apagado —
fotos, localização e o resto do enriquecimento continuam lá — mas `Situação` e `Estoque
Sistema` de tudo que ficou de fora mudam, e o app passa a mostrar isso.

No app, o efeito só aparece na próxima sincronização.

> Estas mesmas explicações estão como **notas nos cabeçalhos** da aba `Importar` (passe o mouse).
> Elas são aplicadas quando a mesclagem roda; colar dados por cima apaga as notas, e a mesclagem
> seguinte as reaplica. As instruções completas também aparecem no aviso do menu
> **1) Preparar aba "Importar"**.
