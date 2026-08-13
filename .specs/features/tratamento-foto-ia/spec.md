# Feature: Tratamento de foto por IA — ⚙️ OPCIONAL (desligado por padrão)

> **STATUS: opcional desde 2026-07-26.** Por padrão o backend **não trata** foto nenhuma: a
> imagem vai para o Drive exatamente como o app enviou. O tratamento só acontece com a
> propriedade `TRATAR_FOTO = sim` no Apps Script.
>
> **Leia "Por que fica desligado por padrão" antes de ativar** — o risco não é estético.

**Histórico:** implementada em 2026-06-27 (API do Google direto) → migrada em 2026-07-26
para o OpenRouter (bug de cota do Google) → removida no mesmo dia (problema de fidelidade)
→ restaurada no mesmo dia como **opcional, desligada por padrão**, a pedido do usuário, que
quis manter a possibilidade de usar e avaliar caso a caso.
**Porte:** Médio (3 arquivos, design já decidido na aprovação).

## Como ligar e desligar

Apps Script → ⚙️ Configurações do projeto → **Propriedades do script**:

| Propriedade | Valor | Efeito |
|---|---|---|
| `TRATAR_FOTO` | `sim` | **Liga** o tratamento. Sem ela (ou com qualquer outro valor), nada é tratado. |
| `OPENROUTER_API_KEY` | sua chave | Obrigatória quando ligado. |
| `OPENROUTER_IMAGE_MODEL` | ex. `google/gemini-3-pro-image` | Opcional: troca o modelo **sem reimplantar**. Vazia = `google/gemini-2.5-flash-image`. |

Para desligar: apague `TRATAR_FOTO`. Efeito imediato — Propriedades do script não exigem
nova implantação.

A resposta do upload traz `_debugIA` com, por foto, `OK <modelo> — US$ <custo>` ou o motivo
de ter caído para a original (inclusive `desligado`). Serve para comparar modelos por custo
real e para diagnosticar falhas.

## Objetivo (original, não mais válido)
Ao adicionar a foto de um item, a foto sai **quadrada** (1:1). Ao **sincronizar**, o
backend trata a imagem com uma **IA de imagem**, deixando estilo catálogo, e salva **só a
tratada** no Drive (substitui a original). Se o tratamento falhar, salva a **foto
original** — nunca deixa de salvar a foto.

## Por que fica desligado por padrão (leia antes de ativar)

O tratamento entrega fotos bonitas, mas **pode trocar o produto**. Uma caneta BIC Cristal
específica (corpo transparente liso, sem borracha) voltou como outro modelo de caneta, com
empunhadura de borracha e clipe diferente. Como a foto existe para **identificar a peça no
almoxarifado**, isso é defeito grave: item errado é pior que foto feia.

**Ligado, o risco é assumido conscientemente:** confira a foto tratada antes de confiar nela,
principalmente em itens que se distinguem por detalhe pequeno (modelo, rótulo, conector,
bitola). Para itens de forma simples e sem texto crítico, o resultado costuma ser bom.

**A causa é estrutural, não de prompt.** `gemini-2.5-flash-image` e os outros 37 modelos de
imagem do catálogo do OpenRouter são **geradores**: eles não editam a foto recebida, eles
sintetizam uma imagem nova inspirada nela. Pedir "não altere o produto" a um gerador é lutar
contra o funcionamento da ferramenta.

**Duas rodadas de prompt não resolveram** (ver T5 em `tasks.md`), incluindo reenquadrar a
tarefa como "PHOTO RETOUCHING task, NOT an image generation task", pôr fidelidade como
primeira regra absoluta, proibir explicitamente a substituição por versão genérica, e trocar
o zoom agressivo por "crop and scale the ORIGINAL pixels".

**Também não adianta trocar de modelo dentro do OpenRouter:** os 38 são generativos. Os
"Utility" da Recraft, que pareciam promissores pelo nome, são descritos pelo próprio catálogo
como *"general-purpose image generation model"*.

### Para resolver de verdade: SEGMENTAÇÃO, não geração
A ferramenta adequada é **remoção de fundo por segmentação**, que recorta o contorno do
objeto e descarta o resto, **preservando os pixels originais do produto** — matematicamente
incapaz de trocar o item, porque não desenha nada. Candidatos: Photoroom (feito para foto de
produto: fundo branco + sombra), remove.bg, ou modelos open-source tipo BiRefNet. Nenhum está
no OpenRouter; exigiria mais uma conta e chave. **Nada disso foi testado** — continua sendo
o caminho a seguir se o tratamento generativo se mostrar insuficiente no uso real.

## Requisitos (rastreáveis)

| ID | Requisito | Onde | Situação |
|----|-----------|------|----------|
| R1 | A foto capturada/comprimida é gerada **quadrada** (1:1, ~1024px), encaixando a imagem inteira ("contain") com **fundo branco** | `index.html` `compress()` | ✅ ativo (sempre) |
| R2 | `APP_VERSION` (index.html) e `CACHE` (sw.js) sobem **juntos** para **v33** | `index.html`, `sw.js` | ✅ ativo |
| R3 | No upload/sync, cada imagem recebida é tratada por `tratarImagemIA_(base64, mime)` antes de salvar | `apps-script.gs` `uploadImages_` | ⚙️ só com `TRATAR_FOTO=sim` |
| R4 | O prompt de estilo: fundo branco + sombra de contato suave + nitidez + 1:1 e-commerce; **fidelidade absoluta** a forma/cores/etiquetas; não inventar objetos | `apps-script.gs` constante | ⚙️ ativo quando ligado |
| R5 | **Fallback:** se a IA falhar (desligada, sem chave, HTTP ≠ 200, sem imagem, exceção), usa os **bytes originais** | `apps-script.gs` | ✅ ativo (sempre) |
| R6 | O arquivo é criado no Drive **uma única vez** com os bytes finais (tratada OU original) — só uma fica | `apps-script.gs` | ✅ ativo |
| R7 | A chave fica em `ScriptProperties.OPENROUTER_API_KEY`, **nunca** no index.html | Apps Script (passo manual do usuário) | ⚙️ necessária quando ligado |
| R8 | Fica atrás do `requireAuth_` já existente (sem mudança extra) | `apps-script.gs` | ✅ ativo |
| R9 | O modelo é trocável sem reimplantar, pela propriedade `OPENROUTER_IMAGE_MODEL` | `apps-script.gs` | ⚙️ ativo quando ligado |
| R10 | O tratamento é **opcional e desligado por padrão**, controlado por `TRATAR_FOTO` | `apps-script.gs` `tratarImagemIA_` | ✅ ativo |

⚠️ A `GEMINI_API_KEY` **continua necessária** — é usada pelas palavras-chave por IA
(`features/busca-palavras-chave/`), que são de TEXTO e nunca tiveram esse problema.

## Decisões já confirmadas pelo usuário
- **Substituir de vez** a original (sem backup) → OK.
- Rede de segurança obrigatória (R5).
- ~~A IA **pode alterar levemente** o produto/etiqueta → OK.~~ **REVERTIDO em 2026-07-26:**
  a IA passou a trocar o produto por uma versão genérica do mesmo tipo de objeto (uma caneta
  BIC azul específica virava "uma caneta BIC azul qualquer"). Como a foto existe para
  **identificar a peça**, fidelidade virou requisito duro: item alterado é pior que foto feia.
- ~~**2026-07-26 — remover o tratamento por completo.**~~ **REVISTO no mesmo dia:** em vez de
  remover, o tratamento voltou como **opcional e desligado por padrão** (`TRATAR_FOTO`), a
  pedido do usuário — "gostaria de voltar com a opção de trabalhar com o tratamento de imagem
  usando o OpenRouter". O padrão seguro (foto original) continua valendo para quem não
  configurar nada; quem ligar assume o risco de fidelidade descrito acima, conscientemente.

## Técnico
- Endpoint: `POST https://openrouter.ai/api/v1/images`, header `Authorization: Bearer {KEY}`.
- Request: `{ model, prompt, n:1, aspect_ratio:'1:1', output_format:'jpeg', input_references:[{type:'image_url', image_url:{url:'data:<mime>;base64,<b64>'}}] }`
- Response: imagem em `data[0].b64_json` (+ `data[0].media_type`); custo real em `usage.cost`.
- Modelo padrão: `google/gemini-2.5-flash-image` (Nano Banana).

### Por que OpenRouter e não a API do Google direto (2026-07-26)
A chamada direta a `generativelanguage.googleapis.com` passou a devolver **HTTP 429**
(`generate_content_free_tier_requests, limit: 0`) mesmo com conta de faturamento ativa,
vinculada ao projeto certo e com crédito. É **bug conhecido do Google**, que atinge só os
modelos de **imagem** — os de **texto** seguem funcionando com a mesma chave e projeto (por
isso as palavras-chave por IA continuam na API do Google direto, com `GEMINI_API_KEY`).
Sem prazo de correção; a própria documentação do erro sugere proxy de terceiros como contorno.
Diagnóstico completo e descarte de hipóteses (chave errada, cartão vencido, projeto sem
faturamento, chave criada antes do billing): ver `../../project/STATE.md`.

## Passos manuais do usuário
1. **Republicar o backend** (Implantar → Gerenciar implantações → Nova versão). Obrigatório
   uma vez, para o código novo entrar no ar.
2. Para **usar** o tratamento: criar as propriedades `TRATAR_FOTO = sim` e
   `OPENROUTER_API_KEY = <chave>`. Não exige nova implantação — Propriedades do script valem
   na hora. Para **não** usar: não criar nada; o padrão já é a foto original.
3. Frontend: nada a fazer. `compress()` (foto quadrada) não mudou e continua valendo.

> ⚠️ Ao ligar, confira as primeiras fotos antes de confiar no resultado — ver "Por que fica
> desligado por padrão".
