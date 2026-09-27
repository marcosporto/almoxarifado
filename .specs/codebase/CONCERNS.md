# Codebase Concerns

**Analysis Date:** 2026-06-25

> Lista de "pontos de atenção ao mexer no código" — com evidência (arquivo/linha) e
> caminho de correção. Não é lista de reclamação: é o que poupa dor de cabeça futura.

## Security Considerations

> ✅ **RESOLVIDO em 2026-06-26 (v24)** pela feature `features/login-google/`: o backend
> agora exige um crachá Google válido + e-mail numa lista de autorizados em toda
> requisição (`requireAuth_` em `apps-script.gs`). O item abaixo fica como registro histórico.

**API do backend é pública (sem autenticação):**

- Risk: a implantação do Apps Script usa "Quem tem acesso: Qualquer pessoa". Qualquer
  pessoa com a URL `/exec` pode **ler todo o inventário e gravar/apagar** dados e fotos.
- Files: `apps-script.gs` (`doGet`, `doPost`); URL guardada no app em `localStorage`.
- Current mitigation: nenhuma além da URL ser difícil de adivinhar ("segurança por
  obscuridade", que não é segurança de verdade).
- Recommendations: adicionar um **token compartilhado** simples — o app envia um
  segredo no corpo/cabeçalho e o `.gs` rejeita requisições sem ele. É a melhoria de
  maior impacto/menor esforço (já está no `../project/ROADMAP.md`).

## Tech Debt

**Frontend inteiro em um único arquivo:**

- Issue: HTML, CSS e ~800 linhas de JavaScript convivem em `index.html` (~1180 linhas).
- Files: `index.html`.
- Why: simplicidade de publicação no GitHub Pages, sem etapa de build.
- Impact: dificulta achar código, aumenta risco de quebrar algo sem perceber e impede
  testar funções isoladamente.
- Progresso: em 2026-09-26 as funções puras (`natCmp`, `normCod`, `fmtDate`, `ymd`)
  saíram para `js/utils.js` para poderem ser testadas. É um começo, não a solução.
- Fix approach: extrair CSS para `styles.css` e o restante do JS para `app.js` (ou módulos por área:
  `sync.js`, `inventory.js`, `consumo.js`). É uma decisão arquitetural → quando for
  fazer, criar um `design.md` na feature correspondente.

## Fragile Areas

**Versão duplicada em dois arquivos:**

- Files: `index.html` (`const APP_VERSION = 'v20'`) e `sw.js` (`const CACHE = 'almox-udesc-v20'`).
- Why fragile: precisam ser trocadas **juntas e à mão** a cada release. Se o `CACHE`
  do `sw.js` não mudar, o Service Worker continua servindo a versão antiga em cache e
  o usuário "não vê" a atualização.
- Common failures: publicar uma correção e o usuário continuar na versão velha.
- Safe modification: sempre trocar as duas ao mesmo tempo; idealmente automatizar
  (ver `ROADMAP.md`, item 2).

**Casamento de código por número (zeros à esquerda):**

- Files: `js/utils.js` → `normCod()` (extraída em 2026-09-26); `index.html` → `findItemByCodigo()`.
- Why fragile: `normCod` remove zeros à esquerda para casar códigos na importação.
  Itens que diferem **apenas** por zeros à esquerda poderiam casar com o item errado.
- Safe modification: ao importar, preferir o código exato; só cair no "sem zeros"
  quando não houver correspondência exata (que é o que o código já tenta — manter assim).
- Status: ✅ `normCod()` coberta por testes em `tests/utils.test.js` (2026-09-26).
  Os testes registraram um caso que **continua em aberto**: um código composto só de
  zeros ("0", "000") vira string vazia e passa a casar com código vazio. Corrigir isso
  é decisão de produto — o teste documenta o comportamento atual, não o aprova.

**Unidade com hífen no nome aparece cortada na tela:**

- Symptoms: um item com unidade `"1.0 - CAIXA C-10"` é exibido como `"Unid.: 10"`.
- Files: `js/utils.js` → `fmtUnidade()`.
- Root cause: a função corta no **último** hífen, não no primeiro.
- Impact: quem confere estoque lê a unidade errada. Silencioso — não dá erro.
- Fix approach: cortar no primeiro hífen. Antes de mudar, conferir na planilha real
  se alguma unidade cadastrada tem hífen no nome (se nenhuma tiver, o defeito é
  latente e a correção é barata).
- Descoberto em 2026-09-26 ao escrever `tests/utils.test.js`; o teste atual fixa o
  comportamento errado de propósito, para a correção aparecer como mudança consciente.

## Dependencies at Risk

**Bibliotecas via CDN (jsDelivr):**

> ✅ **Integridade verificada em 2026-06-27 (v31):** as tags `<script>` agora usam
> `integrity` (SRI) + `crossorigin`, então um arquivo adulterado pelo CDN é rejeitado
> pelo navegador. O risco de **disponibilidade** (CDN fora do ar antes da 1ª carga)
> permanece — para eliminá-lo de vez, self-host das libs (plano abaixo).

- Risk: `html5-qrcode@2.3.8` e `xlsx@0.18.5` vêm de CDN externo. Se o CDN cair **antes**
  da primeira carga (quando o Service Worker ainda não cacheou), o leitor de QR e a
  geração de Excel não funcionam.
- Files: `index.html` (tags `<script>`), `sw.js` (lista `SHELL`).
- Impact: funcionalidades de QR e Excel ficam indisponíveis até o CDN voltar.
- Migration plan: opcionalmente baixar as libs e servi-las junto do app (self-host),
  eliminando a dependência de terceiros em tempo de execução.

## Known Bugs / Limitações conhecidas

**Fotos podem não aparecer em conta institucional:**

- Symptoms: miniaturas/lightbox quebrados para algumas fotos.
- Files: `apps-script.gs` → `uploadImages_` (`setSharing(ANYONE_WITH_LINK, VIEW)` dentro
  de `try/catch`).
- Root cause: contas institucionais do Google podem **bloquear** compartilhamento por
  link público; o arquivo é mantido, mas a URL pública não funciona.
- Workaround: o app tenta `thumbnail` e depois `lh3` (`imgFallback`), mas se o
  compartilhamento foi bloqueado, nenhum resolve.

## Test Coverage Gaps

**Cobertura parcial (era zero até 2026-09-26):**

- What IS tested: `natCmp`, `normCod`, `fmtDate`, `ymd`, `esc`, `fmtDateTime`,
  `fmtUnidade` — 38 testes em `tests/utils.test.js`.
- What's not tested: todo o resto. Em especial a lógica de sincronização offline
  (`syncNow`, `mergeWithPending`) e o parser de importação (`parseImport`).
- Risk: uma mudança pode quebrar a sincronização e só ser percebida em produção, com
  risco de **perda de dados** conferidos offline.
- Priority: High (sincronização) / Medium (parsers e formatadores).
- Difficulty to test: baixa para funções puras; média para o que depende de IndexedDB.

---

_Concerns audit: 2026-06-25_
_Atualize conforme problemas forem corrigidos ou novos forem descobertos._
