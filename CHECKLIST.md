# Agrinet — O que você precisa fazer

## 1. GitHub Secrets (para CI/CD funcionar)

Acesse: `github.com/SEU_REPO → Settings → Secrets and variables → Actions`

Adicione os dois secrets:

| Secret | Valor |
|--------|-------|
| `DOCKERHUB_USERNAME` | `caza6367` |
| `DOCKERHUB_TOKEN` | Gerar em: hub.docker.com → Account Settings → Security → New Access Token |

Sem isso, o workflow `build-and-push.yml` vai falhar em todo push na main.

---

## 2. Cloudflare R2 (para uploads de imagem funcionarem)

### Criar o bucket
1. Entre em cloudflare.com → R2
2. Crie um bucket chamado `agrinet-uploads`
3. Em "Settings" do bucket → ative "Public Access"
4. Copie a **Public URL** (ex: `https://pub-xxxx.r2.dev`)

### Criar as credenciais
1. R2 → Manage R2 API Tokens → Create API Token
2. Permissão: **Object Read & Write** no bucket `agrinet-uploads`
3. Copie: Access Key ID e Secret Access Key

### Adicionar no `.env` da raiz do projeto
```
R2_ACCOUNT_ID=<seu account id — canto direito do painel Cloudflare>
R2_ACCESS_KEY_ID=<access key gerada>
R2_SECRET_ACCESS_KEY=<secret key gerada>
R2_BUCKET=agrinet-uploads
R2_PUBLIC_URL=https://pub-xxxx.r2.dev
```

---

## 3. Primeiro deploy (ordem importa)

### 3.1 — Buildar as imagens localmente
```bash
./scripts/build.sh v1.0.0
```

### 3.2 — Login no Docker Hub
```bash
docker login -u caza6367
```

### 3.3 — Push para o Docker Hub
```bash
./scripts/push.sh v1.0.0
```

### 3.4 — Subir o stack
```bash
cd infra/docker
docker compose up -d
```

> **Importante:** se o banco já existia de antes (volume antigo), derrube tudo antes:
> ```bash
> docker compose down -v
> docker compose up -d
> ```
> Isso garante que as migrations rodem do zero sem conflito com o schema.sql antigo.

### 3.5 — Subir com monitoring (opcional)
```bash
docker compose --profile monitoring up -d
```
Grafana em: `http://localhost:3001` (admin/admin no primeiro acesso)
Prometheus em: `http://localhost:9090`

---

## 4. Variáveis de ambiente que precisam estar no `.env` da raiz

Verifique se todas essas estão preenchidas:

```env
# Banco
DB_HOST=mariadb           # já definido no compose
DB_USER=agrinet           # já definido no compose
DB_PASSWORD=agrinet       # já definido no compose
DB_NAME=agrinet           # já definido no compose

# Redis
REDIS_HOST=redis          # já definido no compose

# JWT e API
JWT_SECRET=               # preencher
API_KEY=                  # preencher

# Stripe
STRIPE_KEY=               # preencher
STRIPE_SECRET_KEY=        # preencher
STRIPE_WEBHOOK_SECRET=    # preencher

# R2 Storage
R2_ACCOUNT_ID=            # preencher (seção 2)
R2_ACCESS_KEY_ID=         # preencher (seção 2)
R2_SECRET_ACCESS_KEY=     # preencher (seção 2)
R2_BUCKET=agrinet-uploads
R2_PUBLIC_URL=            # preencher (seção 2)

# Federation
FEDERATION_SECRET=        # preencher
NODE_ID=backend-node-01
NODE_TYPE=backend
NODE_URL=                 # URL pública do servidor
```

---

## 5. Problemas pré-existentes (não introduzidos pelas fases)

Esses existiam antes e não foram tocados. Resolva quando tiver tempo:

- **Socket.IO com CORS aberto** (`server.js` linha ~117): `cors: { origin: "*" }` — deveria ser `'https://www.ntari.org'`
- **Agrotourism routes quebradas** (`routes/agrotourismRoutes.js`): usa modelo Mongoose (`Agrotourism.find()`) mas o projeto é SQL/knex — essa rota vai crashar se chamada
- **Socket.IO sem autenticação**: qualquer cliente pode conectar no WebSocket sem token

---

## 6. Fluxo de deploy futuro (após CI/CD configurado)

Após configurar os secrets do GitHub, qualquer push na `main`:
1. CI roda lint + testes automaticamente
2. Build das imagens Docker
3. Push para Docker Hub com tags `latest` + `sha`

Para uma release versionada:
```bash
# Atualiza version no package.json e commita
# O workflow version-and-tag.yml cria a tag automaticamente
# O build-and-push.yml detecta a tag e faz push com v1.x.x
```

---

## 7. Seeds (apenas para desenvolvimento)

Para popular o banco com dados iniciais:
```bash
cd backend
npx knex seed:run
```
Cria: 1 usuário admin (`admin@agrinet.local`) e 1 usuário comum (`user@agrinet.local`).

**Não rodar em produção** — o seed limpa as tabelas antes de inserir.
