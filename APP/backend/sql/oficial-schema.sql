-- ============================================================
-- Apple Land ERP - Esquema oficial consolidado
-- Resultado de: schema base + migration 001
-- Este archivo representa como debe quedar la DB desde cero
-- ============================================================

-- ============================================================
-- EXTENSIONES REQUERIDAS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- ENUMS (listas de valores predefinidos)
-- ============================================================

CREATE TYPE user_role AS ENUM ('superadmin', 'admin', 'seller');
CREATE TYPE product_status AS ENUM ('available', 'reserved', 'sold', 'credit', 'unavailable');
CREATE TYPE product_condition AS ENUM ('new', 'pre_owned', 'used');
CREATE TYPE payment_method AS ENUM ('cash_bob', 'cash_usd', 'qr', 'card', 'device_trade_in', 'crypto_usd');
CREATE TYPE currency AS ENUM ('BOB', 'USD');
CREATE TYPE ledger_type AS ENUM ('income', 'expense');
CREATE TYPE ledger_source AS ENUM ('sale', 'reservation_payment', 'credit_payment', 'operating_expense', 'supplier_payment', 'adjustment');
CREATE TYPE reservation_status AS ENUM ('active', 'completed', 'canceled');
CREATE TYPE reservation_type AS ENUM ('in_store_product', 'incoming_product');
CREATE TYPE credit_status AS ENUM ('active', 'paid', 'canceled');
CREATE TYPE verification_status AS ENUM ('pending', 'verified');

-- ============================================================
-- CORE (nucleo del sistema)
-- ============================================================

CREATE TABLE branches (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	name TEXT NOT NULL,
	address TEXT,
	phone TEXT,
	is_active BOOLEAN DEFAULT true,
	created_at TIMESTAMPTZ DEFAULT now(),
	created_by UUID,
	updated_at TIMESTAMPTZ DEFAULT now(),
	updated_by UUID,
	is_deleted BOOLEAN DEFAULT false
);

CREATE TABLE users (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	name TEXT NOT NULL,
	email TEXT UNIQUE NOT NULL,
	password_hash TEXT NOT NULL,
	role user_role DEFAULT 'seller',
	is_active BOOLEAN DEFAULT true,
	created_at TIMESTAMPTZ DEFAULT now(),
	created_by UUID,
	updated_at TIMESTAMPTZ DEFAULT now(),
	updated_by UUID,
	is_deleted BOOLEAN DEFAULT false
);

CREATE TABLE user_branches (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL REFERENCES users(id),
	branch_id UUID NOT NULL REFERENCES branches(id),
	is_active BOOLEAN DEFAULT true
);

-- ============================================================
-- FINANCE CORE (finanzas base)
-- ============================================================

CREATE TABLE exchange_rates (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	rate NUMERIC(10, 4) NOT NULL,          -- 1 USD = rate Bs
	valid_from TIMESTAMPTZ DEFAULT now(),
	is_current BOOLEAN DEFAULT true
);

CREATE TABLE bank_accounts (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	name TEXT NOT NULL,
	account_holder TEXT,
	account_number TEXT,
	qr_image_url TEXT,
	is_active BOOLEAN DEFAULT true
);

-- ============================================================
-- INVENTORY Y CATALOGO (version final con migration 001)
-- ============================================================

CREATE TABLE suppliers (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	name TEXT NOT NULL,
	phone TEXT,
	email TEXT,
	notes TEXT,
	is_active BOOLEAN DEFAULT true
);

CREATE TABLE clients (
	id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
	name        TEXT        NOT NULL,
	email       TEXT,
	phone       TEXT,
	address     TEXT,
	created_at  TIMESTAMPTZ DEFAULT now(),
	created_by  UUID        REFERENCES users(id),
	updated_at  TIMESTAMPTZ DEFAULT now(),
	updated_by  UUID        REFERENCES users(id),
	is_deleted  BOOLEAN     DEFAULT false
);

CREATE TABLE brands (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	name TEXT UNIQUE NOT NULL
);

CREATE TABLE categories (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	name TEXT UNIQUE NOT NULL,
	is_device BOOLEAN DEFAULT false
);

-- Familias dentro de una marca (ej: iPhone, Galaxy)
CREATE TABLE families (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	brand_id UUID NOT NULL REFERENCES brands(id),
	name TEXT NOT NULL,
	created_at TIMESTAMPTZ DEFAULT now(),
	created_by UUID,
	updated_at TIMESTAMPTZ DEFAULT now(),
	updated_by UUID,
	is_deleted BOOLEAN DEFAULT false,
	UNIQUE (brand_id, name)
);

-- Modelos comerciales
CREATE TABLE models (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	category_id UUID NOT NULL REFERENCES categories(id),
	brand_id UUID NOT NULL REFERENCES brands(id),
	family_id UUID REFERENCES families(id),
	name TEXT NOT NULL,
	model_number TEXT,
	created_at TIMESTAMPTZ DEFAULT now(),
	created_by UUID,
	updated_at TIMESTAMPTZ DEFAULT now(),
	updated_by UUID,
	is_deleted BOOLEAN DEFAULT false,
	UNIQUE (brand_id, name, model_number)
);

-- Variantes por modelo (color, almacenamiento, tipo SIM, etc)
CREATE TABLE product_variants (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	model_id UUID NOT NULL REFERENCES models(id),
	storage TEXT,
	color TEXT,
	sim_type TEXT,
	sale_price_usd NUMERIC(10, 2) NOT NULL DEFAULT 0,
	wholesale_price_usd NUMERIC(10, 2),
	store_warranty_months INTEGER,
	brand_warranty BOOLEAN NOT NULL DEFAULT false,
	brand_warranty_months INTEGER,
	qr_code TEXT,
	created_at TIMESTAMPTZ DEFAULT now(),
	created_by UUID,
	updated_at TIMESTAMPTZ DEFAULT now(),
	updated_by UUID,
	is_deleted BOOLEAN DEFAULT false,
	UNIQUE (model_id, storage, color, sim_type),
	CONSTRAINT chk_brand_warranty CHECK (
		brand_warranty = false OR brand_warranty_months IS NOT NULL
	)
);

-- ============================================================
-- VIEWS
-- ============================================================

-- Flattened read view of product_variants with all FK names resolved
-- and available stock pre-aggregated. Used by PostgREST for list/search.
-- Writes still go to the product_variants base table.
CREATE OR REPLACE VIEW public.product_variants_view AS
SELECT
  pv.id,
  pv.model_id,
  pv.storage,
  pv.color,
  pv.sim_type,
  pv.sale_price_usd,
  pv.wholesale_price_usd,
  pv.store_warranty_months,
  pv.brand_warranty,
  pv.brand_warranty_months,
  pv.qr_code,
  pv.created_at,
  pv.created_by,
  pv.updated_at,
  pv.updated_by,
  pv.is_deleted,
  m.name         AS model_name,
  m.model_number AS model_number,
  m.brand_id     AS brand_id,
  m.family_id    AS family_id,
  m.category_id  AS category_id,
  b.name         AS brand_name,
  f.name         AS family_name,
  c.name         AS category_name,
  COUNT(ii.id) FILTER (WHERE ii.status = 'available') AS stock
FROM public.product_variants pv
LEFT JOIN public.models     m  ON m.id  = pv.model_id
LEFT JOIN public.brands     b  ON b.id  = m.brand_id
LEFT JOIN public.families   f  ON f.id  = m.family_id
LEFT JOIN public.categories c  ON c.id  = m.category_id
LEFT JOIN public.inventory_items ii ON ii.variant_id = pv.id
WHERE pv.is_deleted = false
GROUP BY
  pv.id, pv.model_id, pv.storage, pv.color, pv.sim_type,
  pv.sale_price_usd, pv.wholesale_price_usd, pv.store_warranty_months,
  pv.brand_warranty, pv.brand_warranty_months, pv.qr_code,
  pv.created_at, pv.created_by, pv.updated_at, pv.updated_by, pv.is_deleted,
  m.name, m.model_number, m.brand_id, m.family_id, m.category_id,
  b.name, f.name, c.name;

-- Accesorios independientes (no son inventory_items)
CREATE TABLE accessories (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	category_id UUID NOT NULL REFERENCES categories(id),
	brand_id UUID REFERENCES brands(id),
	supplier_id UUID REFERENCES suppliers(id),
	branch_id UUID NOT NULL REFERENCES branches(id),
	name TEXT NOT NULL,
	variant_description TEXT,
	stock INTEGER NOT NULL DEFAULT 0,
	stock_min_alert INTEGER NOT NULL DEFAULT 3,
	purchase_price_usd NUMERIC(10, 2) NOT NULL DEFAULT 0,
	sale_price_usd NUMERIC(10, 2) NOT NULL DEFAULT 0,
	wholesale_price_usd NUMERIC(10, 2),
	verification_status verification_status DEFAULT 'pending',
	verified_by UUID REFERENCES users(id),
	verified_at TIMESTAMPTZ,
	qr_code TEXT,
	created_at TIMESTAMPTZ DEFAULT now(),
	created_by UUID,
	updated_at TIMESTAMPTZ DEFAULT now(),
	updated_by UUID,
	is_deleted BOOLEAN DEFAULT false
);

-- Catalogo de accesorios incluidos con un equipo
CREATE TABLE included_accessories (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	name TEXT NOT NULL UNIQUE,
	created_at TIMESTAMPTZ DEFAULT now(),
	created_by UUID,
	updated_at TIMESTAMPTZ DEFAULT now(),
	updated_by UUID,
	is_deleted BOOLEAN DEFAULT false
);

-- Inventario principal de equipos (uno por unidad fisica)
CREATE TABLE inventory_items (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	variant_id UUID NOT NULL REFERENCES product_variants(id),
	branch_id UUID NOT NULL REFERENCES branches(id),
	supplier_id UUID REFERENCES suppliers(id),
	imei TEXT,
	condition product_condition DEFAULT 'new',
	status product_status DEFAULT 'available',
	purchase_price_usd NUMERIC(10, 2),
	sale_price_usd NUMERIC(10, 2),
	verification_status verification_status DEFAULT 'pending',
	verified_by UUID REFERENCES users(id),
	battery_percentage INTEGER,
	os_version TEXT,
	battery_cycles INTEGER,
	technical_notes TEXT,
	admin_notes TEXT,
	extra_cost_usd NUMERIC(10, 2),
	qr_code TEXT,
	created_at TIMESTAMPTZ DEFAULT now(),
	updated_at TIMESTAMPTZ DEFAULT now()
);

-- Lineas de accesorios dentro de una compra
CREATE TABLE purchase_accessory_lines (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
	accessory_id UUID NOT NULL REFERENCES accessories(id),
	quantity INTEGER NOT NULL CHECK (quantity > 0),
	unit_price_usd NUMERIC(10, 2) NOT NULL CHECK (unit_price_usd >= 0),
	created_at TIMESTAMPTZ DEFAULT now()
);

-- Flattened read view for purchases with resolved supplier/branch names
-- and item count. Writes go to purchases base table.
CREATE OR REPLACE VIEW public.purchases_view AS
SELECT
	p.id,
	p.supplier_id,
	p.branch_id,
	p.total_usd,
	p.purchased_at,
	p.notes,
	p.created_at,
	p.created_by,
	p.updated_at,
	p.updated_by,
	p.is_deleted,
	s.name AS supplier_name,
	b.name AS branch_name,
	COALESCE(ii_counts.cnt, 0) + COALESCE(pal_counts.qty, 0) AS item_count
FROM public.purchases p
LEFT JOIN public.suppliers s ON s.id = p.supplier_id
LEFT JOIN public.branches  b ON b.id = p.branch_id
LEFT JOIN (
	SELECT purchase_id, COUNT(*) AS cnt
	FROM public.inventory_items
	GROUP BY purchase_id
) ii_counts ON ii_counts.purchase_id = p.id
LEFT JOIN (
	SELECT purchase_id, SUM(quantity) AS qty
	FROM public.purchase_accessory_lines
	GROUP BY purchase_id
) pal_counts ON pal_counts.purchase_id = p.id
WHERE p.is_deleted = false;

-- Relacion N:M entre item y accesorios incluidos
CREATE TABLE inventory_item_accessories (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	inventory_item_id UUID NOT NULL REFERENCES inventory_items(id),
	included_accessory_id UUID NOT NULL REFERENCES included_accessories(id),
	created_at TIMESTAMPTZ DEFAULT now(),
	created_by UUID,
	updated_at TIMESTAMPTZ DEFAULT now(),
	updated_by UUID,
	is_deleted BOOLEAN DEFAULT false,
	UNIQUE (inventory_item_id, included_accessory_id)
);

CREATE TABLE item_history (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	item_id UUID NOT NULL REFERENCES inventory_items(id),
	modified_field TEXT,
	old_value TEXT,
	new_value TEXT,
	reason TEXT,
	created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- REGISTERS & SALES (caja y ventas)
-- ============================================================

CREATE TABLE cash_registers (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	branch_id UUID NOT NULL REFERENCES branches(id),
	user_id UUID NOT NULL REFERENCES users(id),
	opened_at TIMESTAMPTZ DEFAULT now(),
	closed_at TIMESTAMPTZ,
	is_open BOOLEAN DEFAULT true,
	opening_amount_bob NUMERIC(15, 2),
	opening_amount_usd NUMERIC(15, 2),
	theoretical_amount_bob NUMERIC(15, 2),
	theoretical_amount_usd NUMERIC(15, 2),
	real_amount_bob NUMERIC(15, 2),
	real_amount_usd NUMERIC(15, 2),
	closing_notes TEXT
);

CREATE TABLE sales (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	register_id UUID NOT NULL REFERENCES cash_registers(id),
	branch_id UUID NOT NULL REFERENCES branches(id),
	user_id UUID NOT NULL REFERENCES users(id),
	total_usd NUMERIC(15, 2),
	total_bob NUMERIC(15, 2),
	exchange_rate_used NUMERIC(10, 4),
	payment_method payment_method,
	bank_account_id UUID REFERENCES bank_accounts(id),
	payment_verified BOOLEAN DEFAULT false,
	verified_by UUID REFERENCES users(id),
	notes TEXT,
	created_at TIMESTAMPTZ DEFAULT now()
);

-- En la version final, un sale_item puede venir de inventory_items o accessories
CREATE TABLE sale_items (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	sale_id UUID NOT NULL REFERENCES sales(id),
	item_id UUID REFERENCES inventory_items(id),
	accessory_id UUID REFERENCES accessories(id),
	quantity INTEGER,
	unit_price_usd NUMERIC(10, 2),
	unit_price_bob NUMERIC(10, 2),
	is_device BOOLEAN DEFAULT false,
	CONSTRAINT chk_sale_item_source CHECK (
		(item_id IS NOT NULL AND accessory_id IS NULL)
		OR
		(item_id IS NULL AND accessory_id IS NOT NULL)
	)
);

CREATE TABLE trade_in_devices (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	sale_id UUID NOT NULL REFERENCES sales(id),
	generated_item_id UUID NOT NULL REFERENCES inventory_items(id),
	agreed_value_usd NUMERIC(10, 2)
);

-- ============================================================
-- RESERVATIONS (reservas y senas)
-- ============================================================

CREATE TABLE reservations (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	type reservation_type,
	status reservation_status DEFAULT 'active',
	branch_id UUID NOT NULL REFERENCES branches(id),
	user_id UUID NOT NULL REFERENCES users(id),
	item_id UUID REFERENCES inventory_items(id),
	variant_id UUID REFERENCES product_variants(id),
	product_description TEXT,
	customer_name TEXT,
	customer_phone TEXT,
	total_amount_usd NUMERIC(15, 2),
	paid_amount_usd NUMERIC(15, 2),
	est_delivery_date DATE,
	completed_at TIMESTAMPTZ,
	sale_id UUID REFERENCES sales(id),
	created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE reservation_payments (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	reservation_id UUID NOT NULL REFERENCES reservations(id),
	register_id UUID NOT NULL REFERENCES cash_registers(id),
	amount_usd NUMERIC(15, 2),
	amount_bob NUMERIC(15, 2),
	payment_method payment_method,
	created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- CREDITS (ventas a credito / fiado)
-- ============================================================

CREATE TABLE credits (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	branch_id UUID NOT NULL REFERENCES branches(id),
	user_id UUID NOT NULL REFERENCES users(id),
	status credit_status DEFAULT 'active',
	customer_name TEXT,
	customer_phone TEXT,
	total_amount_usd NUMERIC(15, 2),
	collected_amount_usd NUMERIC(15, 2),
	paid_at TIMESTAMPTZ,
	notes TEXT,
	created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE credit_items (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	credit_id UUID NOT NULL REFERENCES credits(id),
	item_id UUID NOT NULL REFERENCES inventory_items(id),
	price_usd NUMERIC(10, 2)
);

CREATE TABLE credit_payments (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	credit_id UUID NOT NULL REFERENCES credits(id),
	register_id UUID NOT NULL REFERENCES cash_registers(id),
	amount_usd NUMERIC(15, 2),
	amount_bob NUMERIC(15, 2),
	payment_method payment_method,
	created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- OTHERS (devoluciones, contabilidad y gastos)
-- ============================================================

CREATE TABLE exchanges (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	original_sale_id UUID NOT NULL REFERENCES sales(id),
	branch_id UUID NOT NULL REFERENCES branches(id),
	user_id UUID NOT NULL REFERENCES users(id),
	returned_item_id UUID NOT NULL REFERENCES inventory_items(id),
	delivered_item_id UUID NOT NULL REFERENCES inventory_items(id),
	difference_usd NUMERIC(15, 2),
	difference_payment_method payment_method,
	reason TEXT,
	created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE general_ledger (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	branch_id UUID NOT NULL REFERENCES branches(id),
	register_id UUID REFERENCES cash_registers(id),
	user_id UUID NOT NULL REFERENCES users(id),
	type ledger_type,
	source ledger_source,
	sale_id UUID REFERENCES sales(id),
	reservation_id UUID REFERENCES reservations(id),
	credit_id UUID REFERENCES credits(id),
	description TEXT,
	amount_usd NUMERIC(15, 2),
	amount_bob NUMERIC(15, 2),
	payment_method payment_method,
	created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE expenses (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	branch_id UUID NOT NULL REFERENCES branches(id),
	register_id UUID REFERENCES cash_registers(id),
	user_id UUID NOT NULL REFERENCES users(id),
	description TEXT,
	amount_usd NUMERIC(15, 2),
	amount_bob NUMERIC(15, 2),
	payment_method payment_method,
	created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- DATOS MAESTROS INICIALES
-- ============================================================

INSERT INTO included_accessories (name) VALUES
	('Cable'),
	('Cubo de carga'),
	('Audifonos'),
	('Caja original'),
	('Adaptador SIM'),
	('Funda original');

-- ============================================================
-- INDICES
-- ============================================================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_inventory_variant ON inventory_items(variant_id);
CREATE INDEX idx_inventory_branch ON inventory_items(branch_id);
CREATE INDEX idx_inventory_status ON inventory_items(status);
CREATE INDEX idx_sales_register ON sales(register_id);
CREATE INDEX idx_sales_user ON sales(user_id);
CREATE INDEX idx_registers_branch ON cash_registers(branch_id);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_credits_status ON credits(status);
CREATE INDEX idx_models_category ON models(category_id);
CREATE INDEX idx_models_brand ON models(brand_id);
CREATE INDEX idx_models_family ON models(family_id);
CREATE INDEX idx_variants_model ON product_variants(model_id);
CREATE INDEX idx_accessories_category ON accessories(category_id);
CREATE INDEX idx_accessories_branch ON accessories(branch_id);
CREATE INDEX idx_item_accessories_item ON inventory_item_accessories(inventory_item_id);

-- ============================================================
-- CONFIRMACION
-- ============================================================

SELECT 'Esquema oficial creado correctamente (base + migration 001)' AS message;
