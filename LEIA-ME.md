# Almoxarifado UDESC — guia de publicação

App de inventário **offline-first** (PWA) com identidade visual UDESC.
Arquivos: `index.html`, `sw.js`, `manifest.json`, `icon.svg`, `apps-script.gs`.

---

## 1. Backend — Google Apps Script

1. Abra sua planilha do Google Sheets.
2. **Extensões → Apps Script**. Apague o conteúdo e cole o `apps-script.gs`.
3. Se a planilha estiver vazia, os cabeçalhos serão criados sozinhos. Colunas usadas:
   `Código Interno · Código de Barras · Descrição · Unidade de Distribuição · Localização · Estoque Sistema · Conferido · Diferença · Estoque Mínimo · Data de Validade · Dias para Aviso de Validade · Observações · Status do Inventário · Imagens`
   *(A ordem pode mudar — o código mapeia por nome de cabeçalho.)*
   *A coluna "Diferença" (Conferido − Estoque Sistema) é preenchida automaticamente quando o item é conferido.*
   *Já tem uma planilha antiga? No editor do Apps Script, rode a função `padronizarPlanilha` uma vez para renomear os cabeçalhos, remover a coluna legada "Estoque Real" e formatar a validade como dd/MM/aaaa.*
4. **Implantar → Nova implantação → "App da Web"**
   - Executar como: **Eu**
   - Quem tem acesso: **Qualquer pessoa**
5. Copie a URL terminada em **`/exec`**.
6. Na primeira sincronização de fotos, o script pedirá permissão do Drive e criará a pasta **"Almoxarifado UDESC - Imagens"** automaticamente.

> Se editar o `.gs` depois, use **Implantar → Gerenciar implantações → editar (lápis) → Nova versão**, senão a URL antiga continua rodando o código velho.

---

## 2. Frontend — GitHub Pages (grátis, HTTPS)

1. Crie um repositório no GitHub (ex.: `almoxarifado`).
2. Suba `index.html`, `sw.js`, `manifest.json`, `icon.svg` (o `.gs` e este LEIA-ME não precisam ir).
3. **Settings → Pages → Branch: `main` / `/root` → Save**.
4. Em ~1 min sai o link: `https://SEU-USUARIO.github.io/almoxarifado/`.
5. Abra no celular, toque em **⚙️** e cole a URL `/exec` do passo 1.
6. **Menu do navegador → "Adicionar à tela inicial"** → vira app, abre em tela cheia e funciona offline.

> HTTPS é o que libera **câmera (QR)**, **Service Worker** e **persistência offline**. Por isso o GitHub Pages e não o arquivo solto.

---

## 3. Como funciona no dia a dia

- **1ª abertura com internet:** baixa todo o inventário e guarda no aparelho (IndexedDB).
- **Andando pelo almoxarifado (sem sinal):** conferir físico, observações, fotos e marcar "Confirmar" — tudo salvo localmente.
- **Voltou o sinal:** sincroniza sozinho (ou toque em **Sincronizar**). O contador mostra quantas alterações faltam subir.
- **Diferença = Físico − Sistema** → vermelho = falta, verde = sobra.
- **Alertas:** card com borda vermelha = abaixo do mínimo; etiqueta laranja = validade dentro do aviso prévio.
- **Ler QR:** filtra os itens de uma prateleira/gaveta.
- **Separação:** monta a lista de requisição e ordena a rota por localização; vá "dando check" ao coletar.

### Observação sobre a rota de separação
A ordenação é alfanumérica natural: `Gaveta 1, Gaveta 2 … Prateleira 1, Prateleira 2, Prateleira 10`.
Se quiser uma ordem física específica (ex.: prateleiras antes das gavetas), nomeie a localização com um prefixo de ordem, ex.: `01 - Prateleira 1`, `02 - Gaveta 1`. Me avise se preferir uma ordem fixa configurável.
