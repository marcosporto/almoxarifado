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
   *A aba principal do estoque se chama "Estoque". Uma aba "Consumo" é criada sozinha para registrar as saídas de materiais (ID · Data da Saída · Código Interno · Descrição · Quantidade · Solicitante · Observações).*
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

---

## 4. (Opcional) Tratamento de foto por IA

Deixa a foto com fundo branco e sombra suave, estilo catálogo. **Vem desligado de fábrica** e
o app funciona perfeitamente sem isso — a foto é salva como saiu do celular.

> ### ⚠️ Leia antes de ligar
> Modelos de IA de imagem **geram** uma imagem nova em vez de editar a sua. Por isso eles
> **podem trocar o produto** por um parecido: numa foto de teste, uma caneta BIC Cristal
> (corpo liso, sem borracha) voltou como outro modelo de caneta, com empunhadura de borracha.
> Como a foto serve para **identificar a peça**, confira o resultado antes de confiar —
> principalmente em itens que se distinguem por detalhe pequeno (modelo, rótulo, conector,
> bitola). Em itens de forma simples e sem texto importante, costuma funcionar bem.
> Custo aproximado: **R$ 0,20 por foto** no modelo padrão.

### Passo a passo

**1. Publique o backend** (só na primeira vez)
Planilha → **Extensões → Apps Script** → cole o `apps-script.gs` atualizado →
**Implantar → Gerenciar implantações → ✏️ (lápis) → Nova versão → Implantar**.

**2. Crie a chave no OpenRouter**
- Acesse [openrouter.ai](https://openrouter.ai) e entre na sua conta.
- **Credits** → confirme que há saldo (US$ 5 já dá para ~150 fotos).
- **API Keys → Create Key** → **copie a chave na hora**: ela só aparece uma vez. Se fechar
  sem copiar, não dá para recuperar — crie outra.

**3. Ligue no Apps Script**
No editor: **⚙️ Configurações do projeto → Propriedades do script → Adicionar propriedade**.
Crie as duas e clique em **Salvar propriedades do script**:

| Propriedade | Valor |
|---|---|
| `TRATAR_FOTO` | `sim` |
| `OPENROUTER_API_KEY` | a chave copiada no passo 2 |

Não precisa implantar de novo — Propriedades do script valem na hora.
⚠️ **Não apague a `GEMINI_API_KEY`**, se existir: ela é das palavras-chave por IA, outra coisa.

**4. Teste**
Tire uma foto de um item pelo app e sincronize. O tratamento leva ~10-20s por foto.
Depois abra a foto no Drive e confira se **o produto continua sendo o mesmo** — é isso que
importa, mais que o fundo branco.

### Para desligar
Apague a propriedade `TRATAR_FOTO` (o **X** ao lado dela) e salve. Volta na hora para a foto
original, sem reimplantar nada. Faça isso assim que aparecer qualquer foto com item trocado.

### Para trocar de modelo
Crie a propriedade `OPENROUTER_IMAGE_MODEL` com o nome do modelo, ex.:

| Modelo | Custo relativo |
|---|---|
| `google/gemini-2.5-flash-image` | padrão (usado se você não criar a propriedade) |
| `google/gemini-3-pro-image` | ~4× mais caro, tende a ser mais fiel |
| `bytedance-seed/seedream-4.5` | ~3× mais barato |

Lista completa: `https://openrouter.ai/api/v1/models?output_modalities=image`
(o parâmetro é obrigatório; sem ele a API mostra só uma parte dos modelos).

### Conferir custo e diagnosticar
A resposta do envio traz um campo `_debugIA` com, para cada foto,
`OK <modelo> — US$ <custo>` ou o motivo de ter usado a original (`desligado`,
`sem OPENROUTER_API_KEY configurada`, erro HTTP…). Para ver: abra o app no navegador com
**F12 → aba Rede**, envie a foto e procure a resposta da requisição
`script.googleusercontent.com/echo?...` — a linha `302` logo acima é só o redirecionamento.

> **Se falhar, nada quebra:** em qualquer erro — desligado, sem chave, sem crédito, sem
> internet, erro da API — o backend salva a **foto original**. Você nunca perde a foto.
