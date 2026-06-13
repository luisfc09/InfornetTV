# Infornet TV — Edge Brasil (Fly.io / gru)

Serviço pequeno que roda em **São Paulo (região `gru` do Fly.io)** para resolver
conteúdo **geo-restrito ao Brasil** que o backend principal (Railway, EUA) não
consegue acessar:

1. **Resolver de live do YouTube** — `GET /yt/live?channel=UC...` → `{ videoId }`.
   Enxerga lives travadas pro Brasil (ex.: CazéTV em eventos de Copa).
2. **Proxy HLS** — `GET /api/stream/:token` — idêntico ao do backend, com o
   **mesmo `STREAM_SECRET`**. Destrava canais HLS brasileiros (geo/latência).
   Como o rewrite do manifesto usa caminhos relativos, depois que a 1ª URL
   aponta pro edge, **todos os segmentos seguem passando pelo Brasil**.

> ⚠️ **Banda:** o proxy HLS faz o vídeo dos canais ao vivo trafegar por este
> serviço. Só os canais `kind='live'` são roteados pelo edge (VOD/Xtream
> continuam no backend US). Monitore o uso no painel do Fly.

---

## Deploy (uma vez)

Pré-requisitos: conta no [Fly.io](https://fly.io) e o `flyctl` instalado
(`brew install flyctl`), autenticado (`fly auth login`).

```bash
cd br-edge

# 1) Cria o app na região São Paulo (NÃO faz deploy ainda)
fly launch --no-deploy --region gru --name infornet-br-edge

# 2) Define os segredos. STREAM_SECRET DEVE ser igual ao do backend (Railway).
#    EDGE_TOKEN é um segredo novo qualquer (protege o /yt/live de abuso).
fly secrets set \
  STREAM_SECRET="<MESMO valor do STREAM_SECRET do backend Railway>" \
  EDGE_TOKEN="$(openssl rand -hex 24)"

# 3) Deploy
fly deploy

# 4) Pegue a URL pública (algo como https://infornet-br-edge.fly.dev)
fly status
```

### Importante sobre o `STREAM_SECRET`

O backend assina os tokens de stream com `STREAM_SECRET` (e, se ele não existir,
cai em `JWT_SECRET`). O edge **precisa do mesmo valor** para validar os tokens.

- Se o backend **já tem** `STREAM_SECRET` no Railway → use esse mesmo valor aqui.
- Se **não tem** → ele está usando `JWT_SECRET`. Então: defina um
  `STREAM_SECRET` novo **no Railway e no Fly com o mesmo valor**
  (`fly secrets set STREAM_SECRET=... ` e a variável equivalente no Railway).

Guarde o `EDGE_TOKEN` gerado — você vai colá-lo no backend (passo abaixo).

---

## Ligar o edge no backend (Railway)

No backend (Railway), defina as variáveis e faça redeploy:

```
BR_EDGE_URL   = https://infornet-br-edge.fly.dev   # sem barra no final
BR_EDGE_TOKEN = <o EDGE_TOKEN gerado acima>
```

Pronto. A partir daí o backend:

- resolve a live da CazéTV via edge (`/yt/live`) — toca **inline** mesmo
  geo-restrita;
- aponta os canais ao vivo HLS para `BR_EDGE_URL/api/stream/...` — passam a
  fluir pelo Brasil.

**Sem essas variáveis, nada muda** — o backend opera como hoje (resolução e
proxy diretos do EUA). É seguro fazer deploy do código antes de subir o edge.

---

## Testes rápidos

```bash
# saúde + região (tem que dizer gru)
curl https://infornet-br-edge.fly.dev/healthz

# resolver a live atual da CazéTV (channel id da CazéTV)
curl -H "x-edge-token: $EDGE_TOKEN" \
  "https://infornet-br-edge.fly.dev/yt/live?channel=UCZiYbVptd3PVPf4f6eR6UaQ"
# → {"videoId":"<id ou null>","region":"gru"}
```

## Dev local

```bash
npm install
STREAM_SECRET=dev EDGE_TOKEN=dev npm run dev   # sobe em :8080
```
