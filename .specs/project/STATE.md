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
- **2026-06-25:** pasta `.specs/` criada e codebase mapeado. Próximo passo natural:
  escolher 1 item do `ROADMAP.md` e fazer o ciclo SPECIFY → … → EXECUTE como primeiro
  exercício prático da metodologia.
