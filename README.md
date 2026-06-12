# InfornetTV

Plataforma de streaming (IPTV / VOD) da Infornet. Agrega catálogo de múltiplos
provedores (CDN TV, HBO, Paramount, Netflix) sob uma API unificada, com auth,
histórico de exibição, watchlist e recomendações.

## Estrutura (monorepo)

```
InfornetTV/
├── backend/      # API REST (Express + TypeScript + Postgres/Supabase)
└── frontend/     # App de streaming (a definir)
```

## Backend

API que normaliza o catálogo de diferentes provedores em um schema único
(`Content`) e expõe endpoints REST.

### Setup

```bash
cd backend
npm install
cp .env.example .env   # preencha as credenciais
npm run dev            # http://localhost:3001
```

### Endpoints

| Método | Rota                     | Auth | Descrição                          |
|--------|--------------------------|------|------------------------------------|
| GET    | `/health`                | —    | Health check (+ estado do DB)      |
| POST   | `/api/auth/register`     | —    | Cadastro (`email`, `password` ≥8, `cpf?`) → JWT |
| POST   | `/api/auth/login`        | —    | Login (`email`, `password`) → JWT  |
| GET    | `/api/auth/me`           | JWT  | Dados do token autenticado         |
| GET    | `/api/content`           | —    | Catálogo (filtro `?genre=`, `?limit=`) |
| GET    | `/api/content/search`    | —    | Busca (`?q=`, mín. 2 caracteres)   |
| GET    | `/api/content/trending`  | —    | Em alta (`?limit=`)                |
| GET    | `/api/content/:id`       | —    | Detalhe de um título               |

**Admin Panel** (JWT próprio, assinado com `ADMIN_JWT_SECRET` — token de
usuário NÃO vale aqui; toda ação cai em `admin_logs`):

| Método | Rota                              | Permissão          | Descrição |
|--------|-----------------------------------|--------------------|-----------|
| POST   | `/api/admin/auth/login`           | —                  | Login do admin → JWT admin |
| POST   | `/api/admin/auth/change-password` | autenticado        | Troca a própria senha |
| POST   | `/api/admin/auth/create-admin`    | `manage_admin_users`* | Cria admin/operator |
| GET    | `/api/admin/providers`            | `manage_providers` | Lista provedores |
| GET/PUT/DELETE | `/api/admin/providers/:id` | `manage_providers` | Detalhe / atualiza / desativa |
| GET    | `/api/admin/users`                | `manage_users`     | Lista usuários (paginado) |
| PUT    | `/api/admin/users/:id/subscription` | `manage_billing` | Ajusta tier/assinatura |
| DELETE | `/api/admin/users/:id`            | `manage_users`     | Desativa usuário (soft) |
| POST   | `/api/admin/sync`                 | `manage_providers` | Sincroniza catálogo → DB |

> \* `super_admin` passa por qualquer permissão. Auth via
> `Authorization: Bearer <token>`; senhas com bcrypt.

> **Status atual:** o provedor `CDN_TV` retorna dados *mock*. HBO e Paramount
> estão marcados como `pending` até as credenciais serem liberadas. O schema do
> banco está em `backend/src/database/schema.sql`.

## Frontend

App de streaming em **Vite + React + TypeScript**, com player **HLS (hls.js)**,
roteamento (react-router) e autenticação via JWT (token no `localStorage`).
Consome a API do `backend`.

### Setup

```bash
cd frontend
npm install
cp .env.example .env    # VITE_API_URL=http://localhost:3001
npm run dev             # http://localhost:5173
```

### Telas

- **Home** — hero + fileiras por gênero / "Em alta" (estilo streaming)
- **Detalhe** (`/title/:id`) — sinopse, elenco, direção, metadados
- **Player** (`/watch/:id`) — reprodução HLS imersiva (rota protegida por login)
- **Busca** (`/search?q=`) — grade de resultados
- **Login / Criar conta** — integra `/api/auth`

> O player usa um stream público de teste quando o catálogo traz URLs mock
> (`cdn.example.com`), para funcionar em dev. Thumbnails do mock apontam para
> `via.placeholder.com` — troque por imagens reais (ou provider real) em produção.
