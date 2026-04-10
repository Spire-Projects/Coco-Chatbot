# Inicio rápido con Docker Compose

## Opción recomendada

Usa Docker Compose para levantar PostgREST en segundos:

```bash
docker compose up -d
```

Comandos útiles:

```bash
docker compose ps
docker compose logs -f postgrest
docker compose restart postgrest
docker compose down
```

## Qué levanta

- Servicio: postgrest/postgrest
- Puerto local: 3000
- Base de datos: AWS RDS remota

## Notas

- No se levanta PostgreSQL local, porque la base ya está en AWS.
- Si cambias variables en .env, reinicia el servicio con:

```bash
docker compose up -d
```
