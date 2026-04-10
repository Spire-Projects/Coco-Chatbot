# Falcon ERP — Migration Guide: RxDB/Firestore → PostgREST

> **Purpose**: Reference for all agents and developers migrating the Falcon ERP frontend from RxDB (offline-first IndexedDB + Firestore replication) to a cloud-only architecture backed by PostgreSQL + PostgREST.

---

## 0. Context Summary

The original app was an offline-first PWA using:
- **RxDB** (IndexedDB via Dexie) as local document store
- **Firestore** as cloud backend with live replication
- **RxDB Observables** (`collection.find().$`) for real-time UI reactivity

The new architecture is cloud-only:
- **PostgreSQL** as canonical database
- **PostgREST** as auto-generated REST API layer (JWT-authenticated)
- **React Query (TanStack Query)** replacing reactive observables

---

## 1. What to Keep vs What to Delete

### ✅ KEEP — Reuse with minor changes

| Path | Status | Notes |
|------|--------|-------|
| `src/features/*/components/` | Keep ~90% | Only update props where data shape changes |
| `src/features/*/views/` | Keep ~80% | Update hook calls, field names |
| `src/features/*/hooks/` | Keep ~70% | Replace RxDB-specific useEntityData calls |
| `src/shared/components/` | Keep 100% | UI components, fully agnostic |
| `src/shared/services/BaseService.ts` | Keep interface, simplify body | Remove Observable methods |
| `src/shared/services/*.ts` | Keep `toView()` transforms | Update field names to new schema |
| `src/shared/store/` | Keep | Only auth/currency slices, minimal changes |
| `src/routes/`, `src/App.tsx` | Keep | No changes |
| `src/shared/hooks/useEntityData.ts` | Rewrite adapter | Replace RxDB Observable with React Query |

### ❌ DELETE — Remove entirely

| Path | Reason |
|------|--------|
| `src/shared/db/database.ts` | RxDB init, Dexie storage — not needed |
| `src/shared/db/models/` | RxJsonSchema definitions — not needed |
| `src/shared/db/replication/` | Firestore replication logic — not needed |
| `src/shared/db/repositories/BaseRepository.ts` | RxDB `RxCollection` base — replace |
| `src/shared/db/repositories/Local*.ts` | All Local* implementations — replace |

### 🔄 REPLACE — New implementations

| Old | New |
|-----|-----|
| `src/shared/db/repositories/Local*.ts` | `src/shared/api/repositories/PostgREST*.ts` |
| `BaseRepository<T>` (RxDB) | `PostgRESTRepository<T>` (fetch-based) |
| `listen$()` → RxDB Observable | `useQuery()` → React Query |
| `lisntenById$()` → RxDB Observable | `useQuery({ queryKey: [id] })` |
| `src/shared/db/` entire folder | `src/shared/api/` folder |

---

## 2. New Folder Structure

```
src/shared/api/
  client.ts              # PostgREST fetch wrapper (base URL, JWT headers)
  repositories/
    BasePostgRESTRepository.ts   # Implements ICrudBaseRepository via fetch
    product.repository.ts        # Implements IProductRepository
    sales.repository.ts
    ... (one per table)
  types/
    postgrest.types.ts   # PostgREST error shapes, RangeHeader, etc.
```

The `ICrudBaseRepository` interface in `src/shared/db/repositories/interfaces/IRepository.ts` **does not change** — only implementations change.

---

## 3. PostgREST HTTP Patterns

### Base client

```typescript
// src/shared/api/client.ts
const BASE_URL = import.meta.env.VITE_API_URL; // e.g. https://api.example.com

export async function pgFetch<T>(
  path: string,
  options?: RequestInit & { headers?: Record<string, string> }
): Promise<T> {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Prefer': 'return=representation',
      ...options?.headers,
    },
  });
  if (!res.ok) throw await res.json();
  return res.json();
}
```

### CRUD operations (PostgREST syntax)

| Operation | HTTP | PostgREST Example |
|-----------|------|-------------------|
| List all | `GET /productos` | `?is_deleted=eq.false` |
| Filter text | `GET /productos` | `?nombre=ilike.*iphone*` |
| Filter exact | `GET /productos` | `?categoria_id=eq.{uuid}` |
| Pagination | `GET /productos` | Header: `Range: 0-19` → returns `Content-Range: 0-19/150` |
| Join (embed) | `GET /ventas` | `?select=*,venta_items(*,items_inventario(*))` |
| Insert | `POST /productos` | Body: JSON object |
| Update | `PATCH /productos` | `?id=eq.{uuid}` + Body: partial JSON |
| Soft delete | `PATCH /productos` | `?id=eq.{uuid}` Body: `{ is_deleted: true }` |
| Order | `GET /productos` | `?order=created_at.desc` |

### Pagination implementation

```typescript
// PostgREST Range header → ItemsResponse<T>
async getAll(page: number, size: number, searchQuery?: string): Promise<ItemsResponse<T>> {
  const from = (page - 1) * size;
  const to = from + size - 1;
  
  const res = await fetch(`${BASE_URL}/${this.tableName}?${params}`, {
    headers: {
      'Range-Unit': 'items',
      'Range': `${from}-${to}`,
      // ...auth headers
    }
  });
  
  // Content-Range: 0-19/150  →  totalItems = 150
  const contentRange = res.headers.get('Content-Range'); // "0-19/150"
  const totalItems = parseInt(contentRange?.split('/')[1] ?? '0');
  
  return {
    items: await res.json(),
    page,
    size,
    totalItems,
    totalPages: Math.ceil(totalItems / size),
  };
}
```

---

## 4. Replacing `listen$` with React Query

RxDB's reactive observable pattern (`collection.find().$`) is replaced with React Query invalidation.

### Old pattern (RxDB)

```typescript
// In useEntityData.ts - subscribes to live observable
useEffect(() => {
  const sub = service.listen$(page, size, search).subscribe(data => setItems(data));
  return () => sub.unsubscribe();
}, [page, size, search]);
```

### New pattern (React Query)

```typescript
// useEntityData.ts - replaces enableRealtime with standard query
const { data, isLoading, refetch } = useQuery({
  queryKey: [entityName, page, size, search, filter],
  queryFn: () => service.getAllView(page, size, search, undefined, undefined, filter),
  staleTime: 30_000,
});

// On create/update/delete:
const mutation = useMutation({
  mutationFn: (data) => service.create(data),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: [entityName] }),
});
```

### BaseService changes

Remove `listen$()` and `listenById$()` from `BaseService` — these methods become deprecated. Features use React Query hooks instead.

---

## 5. Type Mapping: Old Schema → New Schema

### Naming convention
Old types use **camelCase** (RxDB documents).
New types use **snake_case** matching PostgreSQL columns, then mapped in `toView()`.

### Key entity mappings

#### Product (split into 2 tables)

| Old `Product` field | New `productos` | New `items_inventario` |
|--------------------|-----------------|----------------------|
| `id` | `id` | `id` |
| `name` | `nombre` | — |
| `category` (id) | `categoria_id` | — |
| `model` (id) | — | — (stored as `modelo` text on product) |
| `imeis: string[]` | — | one row per IMEI |
| `stock: number` | — | COUNT of items where `estado = 'disponible'` |
| `price` | `precio_venta_usd` | `precio_compra_usd` |
| `createdBy` | `created_by` | — |
| `isDeleted` | `is_deleted` | — |

#### Sale (split into 2 tables)

| Old `Sale` field | New `ventas` | New `venta_items` |
|-----------------|-------------|------------------|
| `id` | `id` | — |
| `items: SaleItem[]` | — | one row per item |
| `total` | `total_usd` + `total_bob` | — |
| `paymentMethod` | `metodo_pago` | — |
| `isDraft` | **REMOVED** — no drafts in cloud | — |
| `invoiceNumber` | **REMOVED** — handled by DB sequence | — |
| — | `caja_id` (required) | — |
| — | `sucursal_id` (required) | — |

#### DailyCashClosure → cajas

| Old `DailyCashClosure` | New `cajas` |
|-----------------------|------------|
| `userId` | `usuario_id` |
| `openingAmount` | `monto_apertura_bob` / `monto_apertura_usd` |
| `closingAmount` | `monto_real_bob` / `monto_real_usd` |
| — | `monto_teorico_*` (auto-calculated from libro_diario) |
| — | `esta_abierta` (replaces manual open/close management) |

#### User

| Old `User` field | New `usuarios` |
|-----------------|----------------|
| `id` | `id` |
| `name` | `nombre` |
| `email` | `email` |
| `password` | **NOT in frontend** — PostgREST JWT auth |
| `role` | `role` (enum: superadmin, admin, vendedor) |
| `branchId` | `usuario_sucursales` join table |
| `isDeleted` | `is_deleted` |

---

## 6. Feature Migration Priority & Complexity

Migrate in this order (simpler → complex):

| # | Feature | Schema delta | Est. effort | Key changes |
|---|---------|-------------|-------------|-------------|
| 1 | `login` / auth | Low | Small | JWT from PostgREST, no local user DB |
| 2 | `users` | Low | Small | CRUD against `usuarios` table |
| 3 | `dashboard` | None | Tiny | Static aggregates via views/rpc |
| 4 | `clients` | Low | Small | Direct table, no major changes |
| 5 | `reparation` | Low | Small | Map field names |
| 6 | `inventory` | **HIGH** | Large | `productos` + `items_inventario` split, IMEI per row |
| 7 | `purchases` | **HIGH** | Large | Items go to `items_inventario`, proveedor FK |
| 8 | `dailyCashClosure` | **HIGH** | Large | `cajas` model, `libro_diario`, `gastos` |
| 9 | `sales` | **HIGH** | Large | `ventas` + `venta_items`, requires open `caja` |
| 10 | `reports` | Medium | Medium | Query against new tables |
| 11 | reservations | **NEW** | Large | New feature — `reservas` + `reserva_abonos` |
| 12 | credits | **NEW** | Large | New feature — `creditos` + `credito_abonos` |

---

## 7. Authentication: JWT with PostgREST

PostgREST uses JWT for auth. No local user database.

```typescript
// Login: call a PostgREST RPC function
POST /rpc/login
Body: { email: string, password: string }
Response: { token: string, role: string }

// All subsequent requests:
Authorization: Bearer {token}

// Token contains: user_id, role, sucursal_id(s) — used by Row Level Security
```

The `authSlice` in Redux changes:
- Remove `validateUserFromDB` (no local DB lookup)
- Store JWT in `localStorage` + Redux state
- Add token expiry check

---

## 8. Hard Constraints (Never Violate)

1. **Do NOT import from `rxdb` anywhere** — if you see `from 'rxdb'`, it's old code to replace
2. **Do NOT change UI component props/interfaces** unless the data shape absolutely requires it — adapt in `toView()` instead
3. **Do NOT change `ICrudBaseRepository`** interface signature — only replace implementations
4. **Do NOT use `_deleted`, `_rev`, `_meta`, `sincronized`, `_forceLocalPriority`** fields — these are RxDB internal fields
5. **Do NOT store passwords client-side** — auth is JWT-only
6. **Do NOT add `listen$` implementations** that do polling — either use Supabase Realtime or React Query invalidation
7. `toView()` is the correct place to map snake_case DB fields to camelCase view types

---

## 9. PostgREST Repository Base Template

```typescript
// src/shared/api/repositories/BasePostgRESTRepository.ts
import type { ItemsResponse } from '../../types/UtilTypes';
import type { ICrudBaseRepository } from '../../db/repositories/interfaces/IRepository';
import { pgFetch } from '../client';

export abstract class BasePostgRESTRepository<T, TCreate, TUpdate, TFilter>
  implements ICrudBaseRepository<T, TCreate, TUpdate, TFilter>
{
  constructor(protected readonly tableName: string) {}

  async create(data: TCreate): Promise<T> {
    return pgFetch<T>(`/${this.tableName}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async update(id: string, updateData: TUpdate): Promise<T | null> {
    const results = await pgFetch<T[]>(`/${this.tableName}?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    });
    return results[0] ?? null;
  }

  async softDelete(id: string): Promise<boolean> {
    await pgFetch(`/${this.tableName}?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_deleted: true, updated_at: new Date().toISOString() }),
    });
    return true;
  }

  async findById(id: string): Promise<T | null> {
    const results = await pgFetch<T[]>(`/${this.tableName}?id=eq.${id}`);
    return results[0] ?? null;
  }

  // listen$ and lisntenById$ are deprecated — return empty observables
  // Use React Query in the view layer instead
  listen$(): Observable<T[]> {
    return EMPTY;
  }
  lisntenById$(): Observable<T | null> {
    return EMPTY;
  }
}
```

---

## 10. Environment Variables

Add to `.env`:
```
VITE_API_URL=https://your-postgrest-instance.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key  # if using Supabase
```
