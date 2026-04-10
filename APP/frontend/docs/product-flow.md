# Product Registration Flow

## Hierarchy
```
brands → families → models → product_variants → inventory_items
```

## Device (Smartphone, Tablet, Smartwatch, etc.)

**Step 1 — Brand** `POST /brands`
Select existing or create. `{ name }`

**Step 2 — Family** `POST /families`
Select existing or create. `{ brand_id, name }` — e.g. "iPhone 13"

**Step 3 — Model** `POST /models`
Select existing or create. `{ category_id, brand_id, family_id, name, model_number? }` — e.g. "iPhone 13 Pro Max"

**Step 4 — Variant** `POST /product_variants`
Select existing or create. One row per unique combination:
```json
{
  "model_id": "uuid",
  "storage": "256GB",
  "color": "Verde Alpino",
  "sim_type": "eSIM",
  "sale_price_usd": 1100,
  "wholesale_price_usd": 1050,
  "store_warranty_months": 3,
  "brand_warranty": true,
  "brand_warranty_months": 12
}
```

**Step 5 — Inventory item** `POST /inventory_items`
One row = one physical unit with its own IMEI:
```json
{
  "variant_id": "uuid",
  "branch_id": "uuid",
  "supplier_id": "uuid",
  "imei": "353085104364773",
  "condition": "new | pre_owned | used",
  "purchase_price_usd": 950
}
```
For `pre_owned` or `used`, also include:
```json
{
  "battery_percentage": 87,
  "battery_cycles": 234,
  "os_version": "iOS 17.4",
  "technical_notes": "Small scratch on corner"
}
```

**Step 5b — Batch** `POST /rpc/register_items_batch`
Same variant, multiple units at once:
```json
{
  "variant_id": "uuid",
  "branch_id": "uuid",
  "supplier_id": "uuid",
  "condition": "new",
  "items": [
    { "imei": "353085104364773", "purchase_price_usd": 950 },
    { "imei": "353085104364774", "purchase_price_usd": 948 }
  ]
}
```

**Step 6 — Included accessories** `POST /inventory_item_accessories`
Only for `pre_owned` / `used`. One row per included item:
```json
{ "inventory_item_id": "uuid", "included_accessory_id": "uuid" }
```
Available options come from `GET /included_accessories`.

---

## Accessory (Cable, Tempered glass, Case, etc.)

Single step — `POST /accessories`. No IMEI, stock is a number:
```json
{
  "category_id": "uuid",
  "brand_id": "uuid",
  "supplier_id": "uuid",
  "branch_id": "uuid",
  "name": "Tempered glass iPhone 11",
  "variant_description": "Transparent",
  "stock": 10,
  "purchase_price_usd": 2.50,
  "sale_price_usd": 8.00
}
```

---

## Key rules

- `inventory_items` is **only for devices**. Accessories never go there.
- Stock for devices = `COUNT(inventory_items WHERE variant_id = X AND status = 'available')`. Never a stored number.
- Stock for accessories = `accessories.stock` field. Decreases on each sale.
- `purchase_price_usd` defaults to `1` when entered by `admin` role. `superadmin` corrects it later (`verification_status: pending → verified`).
- `imei` is required when `categories.is_device = true`. Enforced by DB trigger.
- A variant must exist before creating an inventory item.