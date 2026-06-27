# STATE — memória viva do projeto

Este é o documento mais "vivo" da pasta. Sempre que uma decisão importante for tomada,
um problema aparecer, ou uma ideia surgir, anote aqui (com data). É o que evita
"por que mesmo eu fiz isso?" daqui a três meses.

## 📌 Decisões tomadas (e o porquê)

| Data | Decisão | Por quê |
|------|---------|---------|
| — | Backend em Google Apps Script + Google Sheets | Sem custo de servidor; a planilha já é a ferramenta que a equipe conhece |
| — | Frontend num único `index.html` | Simplicidade: subir no GitHub Pages sem build nem ferramentas |
| — | Offline-first com IndexedDB + fila | O almoxarifado tem locais sem sinal; nada pode se perder |
| — | Colunas mapeadas por NOME do cabeçalho | A ordem das colunas pode mudar na planilha sem quebrar o app |
| — | Diálogos próprios no lugar de `alert/confirm/prompt` | Visual consistente e integração com o botão Voltar do Android |
| 2026-06-25 | Adotar metodologia spec-driven (esta pasta `.specs/`) | Profissionalizar a manutenção e registrar decisões |
| 2026-06-25 | Nova feature **Login com Google** (ver `../features/login-google/`) | Controlar acesso + registrar autoria sem perder o offline. Decisões: lista de e-mails autorizada, "logar uma vez e lembrar", protege o app inteiro, backend valida a identidade |

> As linhas com "—" são decisões anteriores à adoção da metodologia; a data exata
> não foi registrada. Daqui pra frente, sempre preencher a data.

## 🚧 Bloqueadores / problemas conhecidos
- Nenhum bloqueador ativo no momento. (Pontos de atenção estão em `codebase/CONCERNS.md`.)

## 🧠 Aprendizados
- O número de versão (`APP_VERSION` no `index.html` e `CACHE` no `sw.js`) precisa ser
  trocado junto, senão o Service Worker entrega a versão antiga em cache.
- Para o `.gs` editado entrar no ar, é preciso publicar **nova versão** da implantação
  do Apps Script — editar o código não basta.

## ⏸️ Onde paramos (para retomar depois)
- **2026-06-25:** pasta `.specs/` criada e codebase mapeado.
- **2026-06-25:** feature **Login com Google** — fases SPECIFY, DESIGN e TASKS concluídas.
- **2026-06-26:** EXECUTE em andamento. ✅ Fase 0: T1 (credencial Google criada, projeto
  "Almoxarifado UDESC", CLIENT_ID em `tasks.md`) e T2 (aba "Autorizados" na planilha).
  ✅ Fase 1 backend (T3–T7): `apps-script.gs` agora valida o crachá Google (`verifyToken_`),
  confere a lista (`isAuthorized_`), bloqueia `doGet`/`doPost` (`requireAuth_`) e registra
  autoria ("Conferido por" / "Registrado por").
- **2026-06-26:** ✅ Fase 2 frontend (T8–T12) + T13: `index.html` ganhou tela "Entrar com
  o Google", sessão lembrada (IndexedDB), gating no carregamento, token anexado às
  requisições e botão "Sair" (no ⚙️). `sw.js` e `APP_VERSION` subiram para **v21**.
  **Próximo:** publicar (implantar backend + push frontend) e T14 (verificação fim a fim).
  ⚠️ Implantar backend e publicar frontend JUNTOS (senão o app ao vivo quebra).
- **2026-06-26:** backend implantado pelo usuário; login no ar. Quick task (v22): URL do
  backend agora é fixa no código (`DEFAULT_SCRIPT_URL`) — ninguém mais precisa configurar
  o ⚙️; e os ícones de QR dos botões de leitura (topo + cards) viraram código de barras
  (mantido só o "Ler QR" da barra inferior). Resolve a "Deferred Idea" da URL fixa.
- **2026-06-26:** (v23) ícones de código de barras **revertidos** para QR a pedido do
  usuário (não ficaram bons). A URL fixa (v22) foi mantida.
- **2026-06-26:** ✅ **Feature Login com Google CONCLUÍDA** — T14 (verificação fim a fim)
  aprovada: entrar, autoria "Conferido por" e "Sair" funcionando. (v24) ⚙️ Configurar
  ficou mais clean: conta + Sair em destaque, URL escondida em "Configuração avançada".
- **2026-06-26:** quick task (v25) — botão de leitura (QR/cód. de barras) nos campos de
  busca de "Saída avulsa" e "Lista de separação" (`scanIntoSearch`). A busca desses campos
  já cobria descrição + código + código de barras (nenhuma mudança necessária ali).
- **2026-06-26:** feature **Atualizar Estoque (mesclar)** — `features/atualizar-estoque/`.
  Backend (apps-script.gs): menu "🔄 Almoxarifado" na planilha → prepara aba "Importar",
  usuário cola a cópia do sistema, e `atualizarEstoque_` mescla por Código Interno
  (ignora zeros à esquerda), preservando enriquecimento; sumidos viram Estoque Sistema=0 +
  coluna "Situação"='Sem estoque'; conferência mantida e Diferença recalculada. Só backend
  (app do celular não muda). ✅ **CONCLUÍDA e testada pelo usuário em 2026-06-26** —
  funcionou, enriquecimento preservado. Coluna "Situação" / valor "Sem estoque" confirmados.
- **2026-06-26:** quick task (v26) — ao adicionar foto, abre tela "Revisar fotos" com botão
  🔄 Girar (gira 90° antes de enviar).
- **2026-06-26:** fix (v27) — caractere acidental (`alerx'tDialog`) quebrava o script e
  travava o app. **Lição:** rodar checagem de sintaxe (node --check no `<script>`) antes
  de publicar `index.html`.
- **2026-06-26:** quick task UX (v28) — barra inferior fica visível por cima dos modais de
  seção, com botão ativo destacado (cor + barrinha); imagem/scanner/diálogo seguem imersivos;
  trava de scroll do fundo (`body.modal-open`); ícone de câmera virou SVG (padrão visual).
- **2026-06-26:** quick task UX (v29) — barra inferior virou **abas de verdade** (`navTo`):
  só uma seção aberta por vez, tocar em outra TROCA (não empilha mais), "Itens" volta à
  lista, e os 4 botões têm destaque do ativo (incluindo "Ler QR", que agora mantém a barra
  visível). `openModalEx(id,pushHistory)` reaproveita o slot de histórico ao trocar de aba. `pickPhotos`→revisão→`enviarFotos`/`sendPhotos`;
  `rotate90` via canvas. Escolhido girar no momento de adicionar (confiável; sem problema
  de CORS do Drive). Fotos antigas tortas: re-tirar com o novo fluxo.
- **2026-06-27:** lote de melhorias (v31), só frontend — backend e planilha não mudam:
  - **Segurança (XSS):** todos os `onclick`/`onchange` que embutiam dados (código,
    localização, URL) viraram atributos `data-*` + **delegação de eventos** (`setupDelegation`
    em `index.html`). Nenhum dado da planilha é mais interpretado como código, mesmo que
    contenha aspas. Ids dos campos do card passaram a usar `esc()`. (Resolve o ponto fino
    de segurança que eu apontei.)
  - **Segurança (CDN):** `html5-qrcode` e `xlsx` agora carregam com `integrity` (SRI) +
    `crossorigin` — protege contra o CDN servir um arquivo adulterado.
  - **Desempenho:** busca da lista de itens com *debounce* de 120ms (`onSearchInput`) —
    não reconstrói a lista a cada tecla.
  - **Estética/acessibilidade:** zoom liberado (removido `user-scalable=no`); metatags de
    PWA para iOS; **novo logo** — símbolo oficial da UDESC recriado como **SVG vetorial**
    (`icon.svg`), em "selo" branco arredondado para ficar legível no cabeçalho/login (verde
    escuro) e como ícone instalado. Vale como ícone, header e tela de login (todos apontam
    para `./icon.svg`).
  - **Lição:** `node --check` no `<script>` rodado e aprovado antes de publicar.
  - **Pendente de decisão (não feito):** mover o `token` da URL (GET) para o corpo exigiria
    redeploy do backend para ganho marginal (token expira em 1h, só aparece nos logs do
    próprio Google) — deixado como está de propósito.
- **2026-06-27:** feature **Tratamento de foto por IA (Gemini)** — `features/tratamento-foto-ia/`.
  ✅ T1 frontend (v33): `compress()` agora gera a foto **quadrada** (1:1, ~1024px, "contain"
  com fundo branco) — `index.html` + `sw.js` em **v33**, push feito. ✅ T2 backend
  (`apps-script.gs`): helper `tratarImagemGemini_` (modelo `gemini-2.5-flash-image`) trata a
  foto (fundo branco/nítida/1:1 catálogo) e `uploadImages_` salva a tratada, com **fallback
  para a original** em qualquer falha (chave ausente, offline, erro da API). Chave em
  `ScriptProperties.GEMINI_API_KEY`. **Próximo (T3, com o usuário):** colar a chave nas
  Propriedades do script, autorizar UrlFetchApp/Drive, **republicar o backend** (Implantar →
  Nova versão) e testar fim a fim (foto → sync → no Drive fica só a tratada).
- **2026-06-27:** logo (v32) — o usuário forneceu o **arquivo oficial da marca**
  (`vertical_negativo.svg`, versão branca). Substituiu a recriação da v31: `logo.svg` =
  logo oficial (transparente) usado no cabeçalho e no login; `icon.svg` = mesmo logo
  oficial em branco sobre azulejo verde-escuro (ícone instalável). **Lição/preferência:**
  para o logo, sempre usar o asset oficial da marca, não recriar a forma à mão.
