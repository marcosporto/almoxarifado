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

---

> **T1–T3 concluídas em 2026-06-27.** As tarefas acima descrevem a implementação original,
> que chamava a API do Google direto (`tratarImagemGemini_`, `GEMINI_MODEL`). Esse caminho
> foi substituído na T4 — o histórico fica aqui como registro do que foi feito na época.

## T4 — Migrar o tratamento para o OpenRouter  → [R3, R7, R9]  (2026-07-26)
- **Motivo:** a API do Google passou a recusar o modelo de imagem com HTTP 429
  (`free_tier_requests, limit: 0`) mesmo com faturamento ativo — bug do Google, sem prazo.
  Ver a seção "Por que OpenRouter" na `spec.md`.
- **Onde:** `apps-script.gs` (`tratarImagemGemini_` → `tratarImagemIA_`, constantes
  `OPENROUTER_IMAGE_URL` / `OPENROUTER_IMAGE_MODEL`, chamada em `uploadImages_`).
- **Done when:**
  - `tratarImagemIA_` chama `POST /api/v1/images` e devolve `{data, mime, model, custoUSD}`,
    ou `null` em qualquer falha (fallback preservado).
  - Modelo trocável pela propriedade `OPENROUTER_IMAGE_MODEL`, **sem reimplantar**.
  - `uploadImages_` devolve `_debugIA` com o motivo real da falha e o custo por foto.
- **Verify:** `node --check apps-script.gs`; foto real tratada com sucesso após republicar.
- **Commit:** `feat(api): troca a API direta do Gemini pelo OpenRouter no tratamento de foto`

## T5 — Ajuste fino do prompt  → [R4]  (2026-07-26)
- **Sombra de contato:** o fundo branco puro dava aparência de recorte colado. Descrever a
  **iluminação** que produz a sombra funcionou; pedir "desenhe uma sombra" gerou uma mancha
  cinza deslocada.
- **Fidelidade ao item:** a IA trocava o produto por uma versão genérica do mesmo tipo
  (caneta BIC específica → caneta BIC qualquer). O prompt abria com verbos de criação
  ("ZOOM IN strongly", "REQUIRED to enlarge and recompose") e só citava fidelidade na última
  linha. Reenquadrado como **retoque fotográfico**, com fidelidade como primeira regra, e o
  preenchimento do quadro baixado de 90-95% para ~85%.
- **Verify:** `node --check apps-script.gs` + inspeção visual de foto real. **Pendente de
  confirmação do usuário** (o teste da caneta BIC ainda não foi refeito após esta mudança).
- **Commits:** `feat(prompt): sombra de contato suave nas fotos tratadas`,
  `fix(prompt): prioriza fidelidade ao item fotografado`

## T6 — REMOVER o tratamento por IA  (2026-07-26)  ↩️ revertida pela T7
- **Motivo:** a T5 não resolveu. O modelo continuou trocando o produto — uma BIC Cristal
  voltou como outro modelo de caneta, com empunhadura de borracha. A causa é estrutural:
  modelos de imagem são **geradores**, não editores. Ver "Por que foi removida" na `spec.md`.
- **Decisão do usuário:** abrir mão da estética e salvar só a foto original.
- **Onde:** `apps-script.gs` — removidos `tratarImagemIA_`, `PROMPT_TRATAMENTO`,
  `OPENROUTER_IMAGE_URL`, `OPENROUTER_IMAGE_MODEL`, `IA_DEBUG_LAST_ERROR_`, `_debugIA` e a
  chamada em `uploadImages_` (−129 linhas, +19).
- **Mantido de propósito:**
  - **Idempotência** (`opKey` + cache 6h). Nasceu por causa da lentidão da IA, mas segue útil:
    em rede móvel instável a resposta pode se perder e o app reenviar → foto duplicada.
  - **Palavras-chave por IA** e a `GEMINI_API_KEY` (modelo de TEXTO, sem esse problema).
  - **`compress()` no frontend** — a foto continua saindo quadrada (R1/R2).
  - Um comentário no lugar do código removido explicando o porquê e apontando a segmentação
    como caminho certo, para ninguém reintroduzir o mesmo erro.
- **Verify:** `node --check apps-script.gs`; grep confirmando zero referências órfãs.
- **Commit:** `revert(api): remove o tratamento de foto por IA`

## T7 — Restaurar como OPCIONAL, desligado por padrão  (2026-07-26)
- **Motivo:** o usuário quis manter a possibilidade de usar — "gostaria de voltar com a opção
  de trabalhar com o tratamento de imagem usando o OpenRouter". O defeito de fidelidade é
  conhecido por ele (viveu o caso da BIC), então a decisão é informada.
- **Desenho:** em vez de reativar direto, o tratamento virou **opt-in explícito**. Sem a
  propriedade `TRATAR_FOTO = sim`, `tratarImagemIA_` nem tenta a chamada e a foto original é
  salva — o comportamento seguro continua sendo o padrão para quem não configurar nada.
  Ligar/desligar não exige nova implantação (Propriedades do script valem na hora).
- **Onde:** `apps-script.gs` — restaurados `tratarImagemIA_`, `PROMPT_TRATAMENTO` e as
  constantes do OpenRouter; novo gate `TRATAR_FOTO` no início da função; `_debugIA` de volta
  na resposta (agora permanente, não mais "temporário": é o que mostra o custo por foto e o
  motivo de cada queda para a original, inclusive `desligado`).
- **Renomeado:** `IA_DEBUG_LAST_ERROR_` → `IA_ULTIMO_ERRO_` — deixou de ser andaime de
  depuração e virou parte do desenho.
- **Verify:** `node --check apps-script.gs`; diff conferido contra a versão pré-remoção
  (215aca4) para garantir que só o gate e o rename mudaram.
- **Commit:** `feat(api): tratamento de foto por IA volta como opcional (TRATAR_FOTO)`

## Ideias descartadas (com o motivo)
- **Escolher outro modelo no OpenRouter:** não resolve. Os 38 modelos de imagem do catálogo
  (`GET /api/v1/models?output_modalities=image` — sem esse parâmetro a API mostra só 11) são
  todos generativos, inclusive os "Utility" da Recraft, que o próprio catálogo descreve como
  *"general-purpose image generation model"*. Havia opções ~9× mais baratas e outras ~4× mais
  caras e provavelmente mais fiéis (`google/gemini-3-pro-image`), mas a classe do problema é
  a mesma — mais fiel não é o mesmo que fiel.
- **Continuar iterando o prompt:** duas rodadas (T5) atacaram a causa certa e ainda assim
  falhou. Não é problema de redação.
- **API de segmentação** (Photoroom, remove.bg, BiRefNet): tecnicamente é a solução correta —
  preserva os pixels do produto porque não desenha nada. **Não testada**; exigiria mais uma
  conta e chave, e o usuário decidiu não investir mais nisso agora. É por onde começar se um
  dia a feature voltar.
