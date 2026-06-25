# CONVENTIONS — os "combinados" do projeto

Padrões que o código já segue. Manter a consistência é o que faz o projeto parecer
profissional, então vale seguir estes combinados nas próximas mudanças.

## Idioma
- **Tudo em português**: nomes de função, variáveis de domínio, comentários, textos
  de tela e rótulos da planilha. (Termos técnicos universais ficam em inglês: `render`,
  `queue`, `snapshot`.)

## JavaScript (frontend)
- `const`/`let` (nunca `var`). Funções pequenas e nomeadas por verbo: `salvarSaida`,
  `renderPick`, `gerarPlanilha`.
- HTML gerado por template strings; **todo valor dinâmico passa por `esc()`** para
  evitar quebra de layout e XSS. Manter essa regra ao criar novos cards.
- Comentários de seção no formato `/* ----- Título ----- */`.
- Estado global concentrado em poucas variáveis no topo (`items`, `pick`, `consumo`…).

## Apps Script (backend)
- Funções internas terminam com `_` (ex.: `getSheet_`, `pushItem_`).
- Colunas acessadas **por nome** via `buildColMap_` + `aliases_` — nunca por índice fixo.
- Respostas sempre no formato `{ ok: true/false, ... }` via `jsonOut_`.

## Versão do app (IMPORTANTE)
- A versão fica em **dois lugares que devem mudar juntos**:
  - `index.html` → `const APP_VERSION = 'vNN'`
  - `sw.js` → `const CACHE = 'almox-udesc-vNN'`
- Trocar a versão do `CACHE` é o que força o Service Worker a baixar a versão nova.

## Git / commits
- Mensagens em português, descritivas, terminando com a versão entre parênteses.
  Exemplos reais: `Modulo Consumo: saidas de materiais + planilha Excel (Fase 1) (v19)`,
  `Renomeia aba para Estoque, padroniza colunas do Consumo... (v20)`.
- A versão do commit casa com `APP_VERSION`.

## Identidade visual (Manual da Marca UDESC)
- Cores em variáveis CSS `:root` (`--verde #149954`, `--verde-escuro #054B28`,
  `--vermelho #C1282A`…). Usar sempre as variáveis, não cores soltas.
- Fonte base Verdana (substituta oficial da Myriad Pro); títulos em fonte condensada
  caixa-alta (classe `.titulo`).
