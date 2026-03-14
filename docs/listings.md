# Listings

Anuncios de produtos do marketplace. Vendedores publicam listings; compradores buscam, filtram e iniciam negociacoes.

---

## Endpoints

| Metodo | Rota | Auth | Descricao |
|---|---|---|---|
| POST | /listings | Sim | Criar listing |
| GET | /listings | Nao | Buscar listings |
| GET | /listings/:id | Nao | Detalhar (incrementa views) |
| PUT | /listings/:id | Sim (dono) | Atualizar |
| DELETE | /listings/:id | Sim (dono) | Remover |
| PATCH | /listings/:id/pause | Sim (dono) | Pausar |
| PATCH | /listings/:id/activate | Sim (dono) | Reativar |
| POST | /listings/:id/images | Sim (dono) | Upload de imagem |
| GET | /listings/:id/images | Nao | Listar imagens |
| POST | /listings/:id/flag | Sim | Reportar listing |

**Criar listing**
```bash
curl -X POST /listings \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Soja Safra 2025",
    "category": "graos",
    "description": "Soja em grao, alta qualidade",
    "price": 145.50,
    "unit": "saca",
    "quantity_available": 500,
    "city": "Sorocaba",
    "state": "SP",
    "latitude": -23.5015,
    "longitude": -47.4526
  }'
```

---

## Busca e Filtros

```bash
GET /listings?category=graos&minPrice=100&maxPrice=200&city=Sorocaba&page=1&limit=20
```

**Busca geografica** (retorna `distance_km`):
```bash
GET /listings?lat=-23.5015&lng=-47.4526&radius=50
```

**Ordenacao com geolocalizacao:** distancia > preco > data  
**Ordenacao sem geolocalizacao:** preco > data

A busca retorna apenas listings com `status = 'active'` e `moderation_status = 'approved'`.

---

## Ciclo de Vida

```
active <--> paused
  |
  | (estoque zerado por transacao)
  v
sold

  | (admin ou dono)
  v
deleted
```

---

## Funcionalidades Adicionais

**Historico de preco** — Cada alteracao de preco gera um registro em `listing_price_history` com o valor anterior, novo valor, quem alterou e quando.

**Estatisticas** — Cada listing tem contadores em `listing_stats`:

| Evento | Campo |
|---|---|
| GET /listings/:id | `views` |
| Buyer abre conversa | `clicks` |
| Primeira mensagem enviada | `messages_started` |

**Auto-sold** — Quando `quantity_available` chega a zero por uma transacao, o status muda automaticamente para `sold`.

**Upload de imagem**
```bash
curl -X POST /listings/:id/images \
  -H "Authorization: Bearer <token>" \
  -F "image=@foto.jpg"

# Resposta
{ "imageUrl": "/uploads/listings/uuid.jpg" }
```
