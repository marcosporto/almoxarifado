# Feature: Tratamento de foto por IA (via OpenRouter)

**Status:** CONCLUÍDA em 2026-06-27. Revisada em 2026-07-26 (troca de provedor + prompt).
**Porte:** Médio (3 arquivos, design já decidido na aprovação).

## Objetivo
Ao adicionar a foto de um item, a foto sai **quadrada** (1:1). Ao **sincronizar**, o
backend trata a imagem com uma **IA de imagem**, deixando estilo catálogo, e salva **só a
tratada** no Drive (substitui a original). Se o tratamento falhar, salva a **foto
original** — nunca deixa de salvar a foto.

## Requisitos (rastreáveis)

| ID | Requisito | Onde |
|----|-----------|------|
| R1 | A foto capturada/comprimida é gerada **quadrada** (1:1, ~1024px), encaixando a imagem inteira ("contain") com **fundo branco** | `index.html` `compress()` |
| R2 | `APP_VERSION` (index.html) e `CACHE` (sw.js) sobem **juntos** para **v33** | `index.html`, `sw.js` |
| R3 | No upload/sync, cada imagem recebida é tratada por `tratarImagemIA_(base64, mime)` antes de salvar | `apps-script.gs` `uploadImages_` |
| R4 | O prompt de estilo: fundo branco + sombra de contato suave + nitidez + 1:1 e-commerce; **fidelidade absoluta** a forma/cores/etiquetas; não inventar objetos | `apps-script.gs` constante |
| R5 | **Fallback:** se a IA falhar (HTTP ≠ 200, sem parte de imagem, exceção), usa os **bytes originais** | `apps-script.gs` |
| R6 | O arquivo é criado no Drive **uma única vez** com os bytes finais (tratada OU original) — só uma fica | `apps-script.gs` |
| R7 | A chave fica em `ScriptProperties.OPENROUTER_API_KEY`, **nunca** no index.html | Apps Script (passo manual do usuário) |
| R8 | Fica atrás do `requireAuth_` já existente (sem mudança extra) | `apps-script.gs` |
| R9 | O modelo é trocável sem reimplantar, pela propriedade `OPENROUTER_IMAGE_MODEL` | `apps-script.gs` |

## Decisões já confirmadas pelo usuário
- **Substituir de vez** a original (sem backup) → OK.
- Rede de segurança obrigatória (R5).
- ~~A IA **pode alterar levemente** o produto/etiqueta → OK.~~ **REVERTIDO em 2026-07-26:**
  a IA passou a trocar o produto por uma versão genérica do mesmo tipo de objeto (uma caneta
  BIC azul específica virava "uma caneta BIC azul qualquer"). Como a foto existe para
  **identificar a peça**, fidelidade virou requisito duro: item alterado é pior que foto feia.

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

## Passos manuais do usuário (a IA guia)
1. Colar `OPENROUTER_API_KEY` em Apps Script → Configurações do projeto → Propriedades do script.
   (Manter também a `GEMINI_API_KEY`, usada pelas palavras-chave por texto.)
2. Autorizar permissões (UrlFetchApp/Drive) se pedir.
3. **Republicar o backend** (Implantar → Nova versão).
4. Frontend: a IA faz commit/push (GitHub Pages atualiza sozinho).
