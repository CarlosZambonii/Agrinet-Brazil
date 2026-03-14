# Agrinet

Sistema de inteligencia coletiva de codigo aberto para a agricultura. Conecta produtores, consumidores e prestadores de servicos em um marketplace seguro, transparente e descentralizado.

Repositorio original em ingles: [NTARI-RAND/Agrinet](https://github.com/NTARI-RAND/Agrinet)

---

## O que e o Agrinet

O Agrinet e um sistema descentralizado de inteligencia coletiva para a agricultura. O backend cobre o ciclo completo de uma negociacao: publicacao de anuncios agricolas, pagamento com escrow, chat entre comprador e vendedor, antifraude, e sincronizacao federada entre nos da rede.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Backend HTTP | Node.js + Express |
| Banco de dados | MariaDB |
| Pagamentos | Stripe PaymentIntent API |
| Autenticacao | JWT + bcryptjs |
| Tempo real | Socket.IO |
| Cache e filas | Redis + BullMQ |
| Observabilidade | Prometheus + Grafana |

---

## Como rodar localmente

**Prerequisitos:** Node.js, MariaDB, Redis

```bash
# 1. Clonar o repositorio
git clone https://github.com/NTARI-RAND/Agrinet
cd Agrinet/backend

# 2. Instalar dependencias
npm install

# 3. Configurar variaveis de ambiente
cp .env.example .env
# editar .env com suas credenciais

# 4. Criar o banco de dados
mariadb -u root -p < ../schema.sql

# 5. Iniciar o servidor
node server.js

# 6. Monitoramento (opcional)
cd ../monitoring && docker compose up -d
```

O servidor sobe em `http://localhost:5000`.  
Metricas disponiveis em `http://localhost:5000/metrics`.

---

## Documentacao

A documentacao tecnica completa esta em [`docs/`](./docs/).

| Documento | Conteudo |
|---|---|
| [docs/auth.md](./docs/auth.md) | Autenticacao JWT, registro, login, roles |
| [docs/listings.md](./docs/listings.md) | Anuncios, busca, geolocalizacao, imagens |
| [docs/transactions.md](./docs/transactions.md) | Transacoes, escrow, pagamentos, disputas |
| [docs/wallet.md](./docs/wallet.md) | Wallet interna, ledger contabil, auditoria |
| [docs/chat.md](./docs/chat.md) | Chat, mensagens, WebSocket, notificacoes |
| [docs/fraud.md](./docs/fraud.md) | Antifraude, velocity, scoring, moderacao |
| [docs/admin.md](./docs/admin.md) | Painel administrativo completo |
| [docs/federation.md](./docs/federation.md) | Federacao entre nos da rede |
| [docs/observability.md](./docs/observability.md) | Prometheus, Grafana, alertas |
| [docs/infra.md](./docs/infra.md) | Redis, BullMQ, rate limiting, variaveis |
| [docs/schema.md](./docs/schema.md) | Modelagem completa do banco de dados |
| [docs/decisions.md](./docs/decisions.md) | Decisoes arquiteturais e contexto |
| [docs/testing.md](./docs/testing.md) | Scripts de teste e cenarios validados |

---

## No Brasil

A implementacao e manutencao do no brasileiro do Agrinet e responsabilidade de:

**Carlos Zamboni**
- GitHub: [github.com/CarlosZambonii](https://github.com/CarlosZambonii?tab=repositories)
- LinkedIn: [linkedin.com/in/carloszambonii](https://www.linkedin.com/in/carloszambonii/)

---

## Licenca

[AGPL-3.0](./LICENSE) — Este projeto e codigo aberto e deve permanecer assim.
