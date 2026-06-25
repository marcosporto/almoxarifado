# STACK — tecnologias usadas

> "Stack" = a pilha de tecnologias do projeto. Aqui vale destacar uma escolha forte:
> **não há framework e não há etapa de build.** É HTML/CSS/JavaScript "puro". Isso é
> intencional e mantém o projeto simples de publicar.

## Frontend (o que roda no celular/navegador)
- **HTML5 + CSS3 + JavaScript (ES2017+) puro** — tudo dentro de `index.html`.
- **PWA** (Progressive Web App): `manifest.json` + Service Worker (`sw.js`).
- **IndexedDB** — banco de dados local do navegador (snapshot + fila de sincronização).
- **localStorage** — guarda só a URL do backend.
- Sem framework (sem React/Vue/Angular), sem bundler, sem `npm install`.

## Bibliotecas externas (via CDN, carregadas pela rede/cache)
| Biblioteca | Versão | Para quê |
|-----------|--------|----------|
| `html5-qrcode` | 2.3.8 | Ler QR Code e código de barras pela câmera |
| `xlsx` (SheetJS) | 0.18.5 | Gerar o arquivo Excel (.xlsx) do consumo |

## Backend (o que roda no servidor do Google)
- **Google Apps Script** (`apps-script.gs`) — JavaScript do Google, publicado como
  "Web App". Expõe uma API JSON via `doGet` (ler) e `doPost` (gravar).
- **Google Sheets** — banco de dados (abas `Estoque` e `Consumo`).
- **Google Drive** — armazenamento das fotos dos itens.

## Hospedagem
- **Frontend:** GitHub Pages (HTTPS grátis). HTTPS é obrigatório para câmera,
  Service Worker e persistência offline.
- **Backend:** implantação Web App do Apps Script (URL terminada em `/exec`).

## Ferramentas de desenvolvimento
- **Git/GitHub** para versionamento.
- Não há linter, formatador, compilador nem gerenciador de pacotes configurado.
