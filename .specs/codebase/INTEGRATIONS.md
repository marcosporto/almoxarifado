# INTEGRATIONS — serviços externos de que o app depende

## 1. Google Apps Script (backend / API)
- **O que é:** o "servidor" do app, publicado como Web App.
- **Como o app fala com ele:** `fetch()` para a URL `/exec`.
  - `GET /exec` → lê o inventário.
  - `GET /exec?action=consumo` → lê os lançamentos de consumo.
  - `POST /exec` (corpo JSON com `action`) → grava (item, fotos, consumo…).
- **Configuração:** a URL é colada pelo usuário no ⚙️ e salva em `localStorage`
  (chave `almox_script_url`).
- **Implantação:** "Executar como: Eu" / "Quem tem acesso: Qualquer pessoa".
  ⚠️ Ver `CONCERNS.md` — isso torna a API pública.

## 2. Google Sheets (banco de dados)
- Aba **`Estoque`**: um item por linha. Colunas mapeadas por nome (ver ARCHITECTURE).
- Aba **`Consumo`**: um lançamento de saída por linha
  (`ID · Data da Saída · Código Interno · Descrição · Quantidade · Solicitante · Observações`).
- Criadas/padronizadas automaticamente pelo `.gs` (`getSheet_`, `getConsumoSheet_`).

## 3. Google Drive (fotos)
- Pasta **"Almoxarifado UDESC - Imagens"**, criada automaticamente na 1ª foto.
- Seu ID é guardado nas *Script Properties* (`IMG_FOLDER_ID`).
- Fotos compartilhadas como "qualquer um com o link pode ver" (quando a conta permite).
- O app exibe miniaturas via `drive.google.com/thumbnail` e `lh3.googleusercontent.com`.

## 4. CDNs (bibliotecas externas)
- `cdn.jsdelivr.net` → `html5-qrcode@2.3.8` e `xlsx@0.18.5`.
- Cacheadas pelo Service Worker, então funcionam offline depois da 1ª carga.
- ⚠️ Dependência de terceiro: se o CDN sair do ar ou a versão for removida, o leitor
  de QR e a geração de Excel param (ver `CONCERNS.md`).

## 5. GitHub Pages (hospedagem do frontend)
- Serve os arquivos estáticos sob HTTPS — requisito para câmera, SW e PWA.
