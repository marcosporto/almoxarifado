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
  autoria ("Conferido por" / "Registrado por"). **Próximo:** Fase 2 frontend (T8–T12).
  ⚠️ NÃO reimplantar o Apps Script ainda — esperar o frontend, senão o app ao vivo quebra.
