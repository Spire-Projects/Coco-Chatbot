-- ============================================================
-- MIGRATION 001 — Apple Land ERP
-- Ejecutar sobre el schema base ya deployado
-- ============================================================

-- ============================================================
-- PASO 1: Eliminar índices que apuntan a products
-- ============================================================

DROP INDEX IF EXISTS idx_products_category;
DROP INDEX IF EXISTS idx_products_brand;
DROP INDEX IF EXISTS idx_inventory_product;

-- ============================================================
-- PASO 2: Quitar FKs que bloquean el DROP de products
-- ============================================================

ALTER TABLE inventory_items DROP COLUMN product_id;
ALTER TABLE inventory_items DROP COLUMN quantity;
ALTER TABLE reservations    DROP COLUMN product_id;

-- ============================================================
-- PASO 3: Eliminar products
-- ============================================================

DROP TABLE products;

-- ============================================================
-- PASO 4: Tablas nuevas del catálogo
-- Orden: families → models → product_variants → accessories
-- ============================================================

CREATE TABLE families (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id    UUID NOT NULL REFERENCES brands(id),
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  created_by  UUID,
  updated_at  TIMESTAMPTZ DEFAULT now(),
  updated_by  UUID,
  is_deleted  BOOLEAN DEFAULT false,
  UNIQUE (brand_id, name)
);

-- ------------------------------------------------------------

CREATE TABLE models (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id   UUID NOT NULL REFERENCES categories(id),
  brand_id      UUID NOT NULL REFERENCES brands(id),
  family_id     UUID REFERENCES families(id),   -- nullable
  name          TEXT NOT NULL,                  -- "iPhone 13 Pro Max"
  model_number  TEXT,                           -- "A2484"
  created_at    TIMESTAMPTZ DEFAULT now(),
  created_by    UUID,
  updated_at    TIMESTAMPTZ DEFAULT now(),
  updated_by    UUID,
  is_deleted    BOOLEAN DEFAULT false,
  UNIQUE (brand_id, name, model_number)
);

CREATE INDEX idx_models_category ON models(category_id);
CREATE INDEX idx_models_brand    ON models(brand_id);
CREATE INDEX idx_models_family   ON models(family_id);

-- ------------------------------------------------------------

CREATE TABLE product_variants (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id              UUID NOT NULL REFERENCES models(id),

  -- Atributos de variante
  storage               TEXT,         -- "128GB", "256GB", "512GB", "1TB"
  color                 TEXT,         -- "Verde Alpino", "Negro", "Lavender"
  sim_type              TEXT,         -- "eSIM", "Chip físico", "eSIM japonés"

  -- Precios
  sale_price_usd        NUMERIC(10, 2) NOT NULL DEFAULT 0,
  wholesale_price_usd   NUMERIC(10, 2),

  -- Garantía de tienda (opcional)
  store_warranty_months INTEGER,      -- NULL = sin garantía de tienda

  -- Garantía de marca (opcional)
  brand_warranty        BOOLEAN NOT NULL DEFAULT false,
  brand_warranty_months INTEGER,      -- NULL si brand_warranty = false

  qr_code               TEXT,

  created_at            TIMESTAMPTZ DEFAULT now(),
  created_by            UUID,
  updated_at            TIMESTAMPTZ DEFAULT now(),
  updated_by            UUID,
  is_deleted            BOOLEAN DEFAULT false,

  UNIQUE (model_id, storage, color, sim_type),

  CONSTRAINT chk_brand_warranty CHECK (
    brand_warranty = false OR brand_warranty_months IS NOT NULL
  )
);

CREATE INDEX idx_variants_model ON product_variants(model_id);

-- ------------------------------------------------------------

CREATE TABLE accessories (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id         UUID NOT NULL REFERENCES categories(id),
  brand_id            UUID REFERENCES brands(id),
  supplier_id         UUID REFERENCES suppliers(id),
  branch_id           UUID NOT NULL REFERENCES branches(id),
  name                TEXT NOT NULL,
  variant_description TEXT,
  stock               INTEGER NOT NULL DEFAULT 0,
  stock_min_alert     INTEGER NOT NULL DEFAULT 3,
  purchase_price_usd  NUMERIC(10, 2) NOT NULL DEFAULT 1,
  sale_price_usd      NUMERIC(10, 2) NOT NULL DEFAULT 0,
  wholesale_price_usd NUMERIC(10, 2),
  verification_status verification_status DEFAULT 'pending',
  verified_by         UUID REFERENCES users(id),
  verified_at         TIMESTAMPTZ,
  qr_code             TEXT,
  created_at          TIMESTAMPTZ DEFAULT now(),
  created_by          UUID,
  updated_at          TIMESTAMPTZ DEFAULT now(),
  updated_by          UUID,
  is_deleted          BOOLEAN DEFAULT false
);

CREATE INDEX idx_accessories_category ON accessories(category_id);
CREATE INDEX idx_accessories_branch   ON accessories(branch_id);

-- ============================================================
-- PASO 5: Accesorios incluidos con el equipo
-- (Cable, Cubo, Audífonos, Caja original, etc.)
-- ============================================================

CREATE TABLE included_accessories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  created_by  UUID,
  updated_at  TIMESTAMPTZ DEFAULT now(),
  updated_by  UUID,
  is_deleted  BOOLEAN DEFAULT false
);

INSERT INTO included_accessories (name) VALUES
  ('Cable'),
  ('Cubo de carga'),
  ('Audífonos'),
  ('Caja original'),
  ('Adaptador SIM'),
  ('Funda original');

-- ------------------------------------------------------------

CREATE TABLE inventory_item_accessories (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id     UUID NOT NULL REFERENCES inventory_items(id),
  included_accessory_id UUID NOT NULL REFERENCES included_accessories(id),
  created_at            TIMESTAMPTZ DEFAULT now(),
  created_by            UUID,
  updated_at            TIMESTAMPTZ DEFAULT now(),
  updated_by            UUID,
  is_deleted            BOOLEAN DEFAULT false,
  UNIQUE (inventory_item_id, included_accessory_id)
);

CREATE INDEX idx_item_accessories_item ON inventory_item_accessories(inventory_item_id);

-- ============================================================
-- PASO 6: inventory_items — agregar variant_id
-- ============================================================

ALTER TABLE inventory_items
  ADD COLUMN variant_id UUID NOT NULL REFERENCES product_variants(id);

CREATE INDEX idx_inventory_variant ON inventory_items(variant_id);

-- ============================================================
-- PASO 7: sale_items — soportar accesorios
-- ============================================================

ALTER TABLE sale_items ALTER COLUMN item_id DROP NOT NULL;
ALTER TABLE sale_items ADD COLUMN accessory_id UUID REFERENCES accessories(id);
ALTER TABLE sale_items ADD CONSTRAINT chk_sale_item_source CHECK (
  (item_id IS NOT NULL AND accessory_id IS NULL)
  OR
  (item_id IS NULL AND accessory_id IS NOT NULL)
);

-- ============================================================
-- PASO 8: reservations — reemplazar product_id por variant_id
-- ============================================================

ALTER TABLE reservations
  ADD COLUMN variant_id UUID REFERENCES product_variants(id);

-- ============================================================
-- FIN
-- ============================================================

SELECT 'Migration 001 applied successfully!' AS message;