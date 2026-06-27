# Feature: Tratamento de foto por IA (Gemini)

**Status:** plano APROVADO pelo usuário em 2026-06-27. Em implementação.
**Porte:** Médio (3 arquivos, design já decidido na aprovação).

## Objetivo
Ao adicionar a foto de um item, a foto sai **quadrada** (1:1). Ao **sincronizar**, o
backend trata a imagem com a **IA de imagem do Gemini** (família "Nano Banana"), deixando
estilo catálogo, e salva **só a tratada** no Drive (substitui a original). Se o tratamento
falhar, salva a **foto original** — nunca deixa de salvar a foto.

## Requisitos (rastreáveis)

| ID | Requisito | Onde |
|----|-----------|------|
| R1 | A foto capturada/comprimida é gerada **quadrada** (1:1, ~1024px), encaixando a imagem inteira ("contain") com **fundo branco** | `index.html` `compress()` |
| R2 | `APP_VERSION` (index.html) e `CACHE` (sw.js) sobem **juntos** para **v33** | `index.html`, `sw.js` |
| R3 | No upload/sync, cada imagem recebida é tratada por `tratarImagemGemini_(base64, mime)` antes de salvar | `apps-script.gs` `uploadImages_` |
| R4 | O prompt de estilo: fundo branco neutro + remoção de fundo + item centralizado + nitidez máxima + 1:1 e-commerce; **fiel** a forma/cores/etiquetas; não inventar objetos | `apps-script.gs` constante |
| R5 | **Fallback:** se a IA falhar (HTTP ≠ 200, sem parte de imagem, exceção), usa os **bytes originais** | `apps-script.gs` |
| R6 | O arquivo é criado no Drive **uma única vez** com os bytes finais (tratada OU original) — só uma fica | `apps-script.gs` |
| R7 | A chave fica em `ScriptProperties.GEMINI_API_KEY`, **nunca** no index.html | Apps Script (passo manual do usuário) |
| R8 | Fica atrás do `requireAuth_` já existente (sem mudança extra) | `apps-script.gs` |

## Decisões já confirmadas pelo usuário
- A IA **pode alterar levemente** o produto/etiqueta → OK.
- **Substituir de vez** a original (sem backup) → OK.
- Rede de segurança obrigatória (R5).

## Técnico
- Endpoint: `POST https://generativelanguage.googleapis.com/v1beta/models/{MODELO}:generateContent?key={KEY}`
- Request: `contents:[{parts:[{text: PROMPT},{inline_data:{mime_type, data}}]}]`
- Response: imagem em `candidates[0].content.parts[].inlineData.data` (parse defensivo p/ camelCase e snake_case).
- Modelo: `gemini-2.5-flash-image` (Nano Banana), elegível ao nível gratuito.

## Passos manuais do usuário (a IA guia)
1. Colar `GEMINI_API_KEY` em Apps Script → Configurações do projeto → Propriedades do script.
2. Autorizar permissões (UrlFetchApp/Drive) se pedir.
3. **Republicar o backend** (Implantar → Nova versão).
4. Frontend: a IA faz commit/push (GitHub Pages atualiza sozinho).
