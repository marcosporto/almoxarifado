# PROJECT — Almoxarifado UDESC

## Em uma frase
Aplicativo de **inventário e controle de almoxarifado** da UDESC, que funciona no
celular mesmo **sem internet**, sincronizando com uma planilha do Google quando a
conexão volta.

## Problema que resolve
O conferente do almoxarifado precisa percorrer prateleiras e gavetas (muitas vezes
em locais sem sinal) para:
- conferir a quantidade física de cada item contra o estoque do sistema;
- registrar fotos, observações, validade e estoque mínimo;
- separar materiais para requisições (lista de coleta otimizada por localização);
- registrar saídas de material (consumo) e gerar uma planilha para a chefia.

Fazer isso no papel ou numa planilha aberta no navegador é inviável offline. O app
guarda tudo localmente e sincroniza sozinho.

## Quem usa
- **Conferente / almoxarife** — usa o app no celular no dia a dia.
- **Chefia geral** — recebe a planilha de consumo (.xlsx) gerada pelo app.

## Objetivos do produto
1. Funcionar **offline-first**: nada se perde sem internet.
2. Ser **instalável** como app (PWA) e abrir em tela cheia.
3. Manter a **planilha do Google** como fonte de dados central (sem servidor próprio).
4. Respeitar a **identidade visual da UDESC** (cores e tipografia do manual da marca).

## O que NÃO é (escopo)
- Não é um ERP nem sistema de compras.
- Não controla movimentação financeira.
- Não tem login de usuários (ver `codebase/CONCERNS.md` — ponto de atenção de segurança).

## Estado atual
Aplicação **funcional e em uso**, versão `v20`. Frontend publicado no GitHub Pages;
backend rodando como Web App do Google Apps Script. Detalhes técnicos em `codebase/`.
