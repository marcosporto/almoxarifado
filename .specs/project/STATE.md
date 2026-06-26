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
