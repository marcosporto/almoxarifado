# ROADMAP — Almoxarifado UDESC

Mapa do que **já foi entregue** e do que **ainda pode ser feito**. Não é um compromisso
rígido — é um guia. Itens em "Ideias" só viram trabalho depois de passarem por um
`spec.md` (etapa SPECIFY).

## ✅ Entregue (até v20)

| Área | Funcionalidade |
|------|----------------|
| Inventário | Conferir estoque físico, marcar como inventariado, calcular diferença |
| Inventário | Campos extras: código de barras, localização, estoque mínimo, validade, dias de aviso, observações |
| Fotos | Tirar/anexar fotos (comprimidas no aparelho), enviar ao Google Drive, excluir |
| Offline | Snapshot local (IndexedDB) + fila de sincronização + merge com edições pendentes |
| QR/código | Ler QR da localização (filtra itens), ler código de barras, buscar por leitura |
| Alertas | Item abaixo do mínimo (borda vermelha) e validade próxima (etiqueta laranja) |
| Separação | Lista de coleta com rota ordenada por localização; importar requisição (2 colunas) |
| Consumo | Registrar saída avulsa, lançar requisição, listar saídas, remover lançamento |
| Consumo | Gerar planilha Excel (.xlsx) do consumo por período |
| PWA | Instalável, ícone, tela cheia, Service Worker (funciona offline) |
| UX | Diálogos próprios (confirm/alert/prompt) e suporte ao botão Voltar do Android |

## 🟡 Próximos passos sugeridos (a especificar antes de fazer)

Prioridade do mais valioso/menos arriscado para o mais ambicioso:

1. **Testes automatizados básicos** — hoje não existem (ver `codebase/TESTING.md`).
   Começar pelas funções "puras" (`natCmp`, `normCod`, `parseImport`, `isoDate_`).
2. **Automatizar o número da versão** — hoje a versão fica em 3 lugares e é trocada
   à mão (ver `codebase/CONCERNS.md`). Risco de esquecer e quebrar o cache offline.
3. **Proteção de acesso ao backend** — a API hoje é pública (qualquer um com a URL
   pode ler/gravar). Avaliar um "token" simples (ver `codebase/CONCERNS.md`).
4. **Organizar o `index.html`** — separar CSS e JS em arquivos próprios para facilitar
   manutenção (decisão técnica → vai precisar de um `design.md`).

## 💡 Ideias (sem prioridade definida)
- Exportar o inventário conferido (não só o consumo) em Excel/PDF.
- Histórico de quem conferiu cada item.
- Ordem de rota de separação configurável (hoje é alfanumérica natural).
- Modo escuro.

> Convertido de datas relativas para absolutas: documento criado em **2026-06-25**.
