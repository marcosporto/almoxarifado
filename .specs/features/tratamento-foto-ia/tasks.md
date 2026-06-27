# Tasks: Tratamento de foto por IA

## T1 — Frontend: foto quadrada + versão v33  → [R1, R2]
- **Onde:** `index.html` (`compress()`, `APP_VERSION`), `sw.js` (`CACHE`)
- **Reusa:** fluxo existente `pickPhotos`→revisão→`enviarFotos`→`sendPhotos`→fila→`syncNow`.
- **Done when:**
  - `compress()` devolve sempre uma imagem **quadrada** ~1024px, imagem inteira visível,
    sobra preenchida de branco.
  - `APP_VERSION = 'v33'` e `CACHE = 'almox-udesc-v33'`.
- **Verify:** `node --check` no `<script>` do index.html; abrir, adicionar foto, conferir
  preview quadrado.
- **Commit:** `feat(ux): foto de item sai quadrada (1:1, fundo branco) (v33)`

## T2 — Backend: tratar imagem com Gemini + fallback  → [R3, R4, R5, R6, R8]
- **Onde:** `apps-script.gs` (novo `tratarImagemGemini_`, alterar `uploadImages_`, constantes
  `GEMINI_MODEL` / `PROMPT_TRATAMENTO`).
- **Depends on:** —
- **Done when:**
  - `tratarImagemGemini_(base64, mime)` chama a API e devolve `{data, mime}` tratados, ou
    `null` em qualquer falha.
  - `uploadImages_` usa os bytes tratados quando houver; senão os originais; cria o arquivo
    **uma vez**.
- **Verify:** revisão de código (Apps Script não roda local); teste real após o usuário
  publicar e colar a chave.
- **Commit:** `feat(api): trata foto com IA do Gemini ao sincronizar, com fallback p/ original`

## T3 — Publicar + verificar fim a fim  → [R7]
- Guiar o usuário: colar chave, autorizar, republicar backend, push frontend.
- Verificar: adicionar foto → sincronizar → no Drive fica só a versão tratada (fundo branco).
