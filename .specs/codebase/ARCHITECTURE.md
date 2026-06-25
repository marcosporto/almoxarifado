# ARCHITECTURE — como as peças se encaixam

## Visão geral (o caminho dos dados)

```
   [ Celular / Navegador ]                          [ Nuvem do Google ]
 ┌──────────────────────────┐                    ┌────────────────────────┐
 │  index.html (app)        │   HTTP (fetch)     │  apps-script.gs        │
 │  ├─ UI + lógica (JS)     │ ─────────────────► │  (Web App /exec)       │
 │  ├─ IndexedDB            │   GET = ler        │  ├─ doGet  → ler       │
 │  │   ├─ kv (snapshot)    │   POST = gravar    │  └─ doPost → gravar    │
 │  │   └─ queue (fila)     │ ◄───────────────── │         │              │
 │  └─ Service Worker (sw.js)   JSON              │         ▼              │
 │      (cache do app shell)│                    │  Google Sheets         │
 └──────────────────────────┘                    │   ├─ aba "Estoque"     │
                                                  │   └─ aba "Consumo"     │
                                                  │  Google Drive (fotos)  │
                                                  └────────────────────────┘
```

## Princípio central: OFFLINE-FIRST
O app **nunca depende da rede para funcionar**. O fluxo é:

1. **1ª abertura com internet:** baixa todo o inventário e salva um *snapshot* no
   IndexedDB (store `kv`, chave `snapshot`).
2. **Uso offline:** toda alteração (conferir, foto, observação, consumo) é:
   - aplicada na hora na cópia em memória (`items`) e no snapshot;
   - **enfileirada** como uma "operação" no IndexedDB (store `queue`).
3. **Voltou a internet:** `syncNow()` percorre a fila e envia cada operação por POST.
   Só remove da fila quando o servidor confirma `ok`. Erro de rede → para e tenta depois.

## Tipos de operação na fila (`queue`)
Cada item da fila tem um campo `type`:
- `item` — gravar campos do item (físico, observações, validade…) → `pushItem`
- `images` — enviar fotos novas → `uploadImages`
- `deleteImage` — remover foto → `deleteImage`
- `consumo` — registrar saídas → `addConsumo`
- `deleteConsumo` — remover saída → `deleteConsumo`

## Merge (o segredo para não perder edição)
Ao recarregar da rede, `mergeWithPending()` reaplica por cima dos dados do servidor
tudo o que ainda está na fila. Assim, sincronizar não "apaga" o que você editou offline.

## Backend (Apps Script)
- `doGet` devolve todas as linhas da aba `Estoque` (ou o consumo, se `?action=consumo`).
- `doPost` despacha pela `action` recebida (`pushItem`, `uploadImages`, etc.).
- Usa `LockService` para evitar duas gravações simultâneas corromperem a planilha.
- Mapeia colunas **por nome** do cabeçalho (sistema de "aliases"), tolerando nomes
  antigos e ordem trocada.

## Service Worker (sw.js)
- Cacheia o "app shell" (HTML, manifest, ícone, libs CDN) para abrir offline.
- **Navegação:** rede primeiro, cache como reserva (atualizações entram sozinhas).
- **Nunca** cacheia chamadas ao `script.google.com` (dados sempre frescos da rede).
