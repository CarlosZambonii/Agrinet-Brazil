# Federacao entre Nos

O Agrinet suporta sincronizacao entre multiplos nos da rede, permitindo um marketplace distribuido onde cada no opera de forma independente e troca dados com os demais.

---

## Como Funciona

```
No Local (5000)                    No Remoto (5001)
      |                                   |
      |-- GET /federation/export -------->|
      |<-- { listings, users } ----------|
      |                                   |
      | Importa dados via UPSERT          |
      | Atualiza node_registry            |
```

---

## Endpoints

| Metodo | Rota | Descricao |
|---|---|---|
| GET | /federation/export | Exporta dados desde `since` |
| POST | /federation/import | Importa dados de outro no |
| POST | /federation/sync-now | Dispara sync imediato (manual) |

```bash
# Exportar desde uma data
GET /federation/export?since=2025-01-01T00:00:00Z

# Resposta
{
  "listings": [...],
  "users": [...]
}
```

A filtragem usa `updated_at >= since` para sincronizacao incremental.

---

## Sync Job Automatico

O scheduler executa `federationSyncJob` periodicamente:

```
Le node_registry (nos ativos)
      |
Para cada no (ignora o proprio):
      |
      v
GET node_url/federation/export
      |
      v
Importa via UPSERT
      |
      v
UPDATE node_registry SET last_sync_at = NOW()
```

Timestamps ISO (`T` e `Z`) sao convertidos para o formato MariaDB antes do UPSERT.

---

## Bloqueio Cross-Node

Listings com `origin_node` preenchido pertencem a outro no. Tentativas de compra local sao bloqueadas:

```json
{
  "error": "Listing belongs to a remote node",
  "origin_node": "https://node2.agrinet.io"
}
```

O cliente deve realizar a operacao diretamente no no de origem.

---

## Metricas

| Metrica | Descricao |
|---|---|
| `agrinet_federation_sync_success_total` | Sincronizacoes bem-sucedidas |
| `agrinet_federation_sync_fail_total` | Sincronizacoes com falha |
| `agrinet_federation_import_success_total` | Imports bem-sucedidos |
| `agrinet_federation_import_fail_total` | Imports com falha |
