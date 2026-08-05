# Feature: Tratamento de foto por IA — ❌ REMOVIDA

> **STATUS: REMOVIDA em 2026-07-26.** O backend não trata mais foto nenhuma: a imagem vai
> para o Drive **exatamente** como o app enviou. Este documento fica como registro do que
> foi tentado e **por que não funcionou** — leia a seção "Por que foi removida" antes de
> cogitar reimplementar.
>
> **O que sobrou em produção:** a foto sai **quadrada** (1:1, ~1024px) pelo `compress()` do
> `index.html` (R1/R2, frontend) — isso continua valendo e é bom. Todo o resto foi removido.

**Histórico:** implementada em 2026-06-27 (API do Google direto) → migrada em 2026-07-26
para o OpenRouter (bug de cota do Google) → removida no mesmo dia (problema de fidelidade).
**Porte:** Médio (3 arquivos, design já decidido na aprovação).

## Objetivo (original, não mais válido)
Ao adicionar a foto de um item, a foto sai **quadrada** (1:1). Ao **sincronizar**, o
backend trata a imagem com uma **IA de imagem**, deixando estilo catálogo, e salva **só a
tratada** no Drive (substitui a original). Se o tratamento falhar, salva a **foto
original** — nunca deixa de salvar a foto.

## Por que foi removida (leia antes de tentar de novo)

O tratamento entregava fotos bonitas, mas **trocava o produto**. Uma caneta BIC Cristal
específica (corpo transparente liso, sem borracha) voltou como outro modelo de caneta, com
empunhadura de borracha e clipe diferente. Como a foto existe para **identificar a peça no
almoxarifado**, isso é defeito grave: item errado é pior que foto feia.

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

### Se um dia isso voltar: o caminho certo é SEGMENTAÇÃO, não geração
A ferramenta adequada é **remoção de fundo por segmentação**, que recorta o contorno do
objeto e descarta o resto, **preservando os pixels originais do produto** — matematicamente
incapaz de trocar o item, porque não desenha nada. Candidatos: Photoroom (feito para foto de
produto: fundo branco + sombra), remove.bg, ou modelos open-source tipo BiRefNet. Nenhum está
no OpenRouter; exigiria mais uma conta e chave. **Nada disso foi testado** — a decisão foi
não investir mais nisso agora.

## Requisitos (rastreáveis)

| ID | Requisito | Onde | Situação |
|----|-----------|------|----------|
| R1 | A foto capturada/comprimida é gerada **quadrada** (1:1, ~1024px), encaixando a imagem inteira ("contain") com **fundo branco** | `index.html` `compress()` | ✅ **ativo** |
| R2 | `APP_VERSION` (index.html) e `CACHE` (sw.js) sobem **juntos** para **v33** | `index.html`, `sw.js` | ✅ ativo |
| R3 | No upload/sync, cada imagem recebida é tratada por `tratarImagemIA_(base64, mime)` antes de salvar | `apps-script.gs` `uploadImages_` | ❌ removido |
| R4 | O prompt de estilo: fundo branco + sombra de contato suave + nitidez + 1:1 e-commerce; **fidelidade absoluta** a forma/cores/etiquetas; não inventar objetos | `apps-script.gs` constante | ❌ removido |
| R5 | **Fallback:** se a IA falhar (HTTP ≠ 200, sem parte de imagem, exceção), usa os **bytes originais** | `apps-script.gs` | ❌ removido (não há mais o que falhar) |
| R6 | O arquivo é criado no Drive **uma única vez** com os bytes finais (tratada OU original) — só uma fica | `apps-script.gs` | ✅ ativo (agora sempre a original) |
| R7 | A chave fica em `ScriptProperties.OPENROUTER_API_KEY`, **nunca** no index.html | Apps Script (passo manual do usuário) | ❌ removido — a propriedade pode ser apagada |
| R8 | Fica atrás do `requireAuth_` já existente (sem mudança extra) | `apps-script.gs` | ✅ ativo (upload segue protegido) |
| R9 | O modelo é trocável sem reimplantar, pela propriedade `OPENROUTER_IMAGE_MODEL` | `apps-script.gs` | ❌ removido |

⚠️ A `GEMINI_API_KEY` **continua necessária** — é usada pelas palavras-chave por IA
(`features/busca-palavras-chave/`), que são de TEXTO e nunca tiveram esse problema.

## Decisões já confirmadas pelo usuário
- **Substituir de vez** a original (sem backup) → OK.
- Rede de segurança obrigatória (R5).
- ~~A IA **pode alterar levemente** o produto/etiqueta → OK.~~ **REVERTIDO em 2026-07-26:**
  a IA passou a trocar o produto por uma versão genérica do mesmo tipo de objeto (uma caneta
  BIC azul específica virava "uma caneta BIC azul qualquer"). Como a foto existe para
  **identificar a peça**, fidelidade virou requisito duro: item alterado é pior que foto feia.
- **2026-07-26 — remover o tratamento por completo.** Depois de duas rodadas de prompt sem
  sucesso, o usuário decidiu abrir mão da estética e ficar só com a foto original: "vou
  retirar essa parte do tratamento da imagem, e permitir só foto original". Custo/benefício
  não fechava — uma tarde inteira, crédito gasto em duas plataformas e produto errado.

## Técnico (do estado removido — só para referência histórica)
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

## Passos manuais do usuário — na REMOÇÃO (2026-07-26)
1. **Republicar o backend** (Implantar → Gerenciar implantações → Nova versão). Obrigatório:
   sem isso o tratamento antigo continua rodando no ar.
2. Opcional, sem pressa e sem risco: apagar a propriedade `OPENROUTER_API_KEY` no Apps Script
   e a chave na conta do OpenRouter — ficaram sem uso. **Não apagar a `GEMINI_API_KEY`.**
3. Frontend: nada a fazer. `compress()` (foto quadrada) não mudou e continua valendo.
