-- ============================================
-- Apple Land ERP - Database Schema
-- Generated from: schema-docs.md
-- ============================================

-- ============================================
-- ENUMS (Listas de valores predefinidos)
-- ============================================

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

-- ============================================
-- CORE (Núcleo del sistema)
-- ============================================

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

-- ============================================
-- FINANCE CORE (Finanzas Base)
-- ============================================

CREATE TABLE exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buy_rate NUMERIC(10, 4) NOT NULL,
  sell_rate NUMERIC(10, 4) NOT NULL,
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

-- ============================================
-- INVENTORY (Inventario y Catálogo)
-- ============================================

CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true
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

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id),
  brand_id UUID REFERENCES brands(id),
  name TEXT NOT NULL,
  model TEXT,
  storage TEXT,
  color TEXT,
  sim_type TEXT,
  sale_price_usd NUMERIC(10, 2),
  wholesale_price_usd NUMERIC(10, 2),
  qr_code TEXT
);

CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  supplier_id UUID REFERENCES suppliers(id),
  imei TEXT,
  condition product_condition DEFAULT 'new',
  status product_status DEFAULT 'available',
  quantity INTEGER DEFAULT 1,
  purchase_price_usd NUMERIC(10, 2),
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

CREATE TABLE item_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES inventory_items(id),
  modified_field TEXT,
  old_value TEXT,
  new_value TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- REGISTERS & SALES (Caja y Ventas)
-- ============================================

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

CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id),
  item_id UUID NOT NULL REFERENCES inventory_items(id),
  quantity INTEGER,
  unit_price_usd NUMERIC(10, 2),
  unit_price_bob NUMERIC(10, 2),
  is_device BOOLEAN DEFAULT false
);

CREATE TABLE trade_in_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id),
  generated_item_id UUID NOT NULL REFERENCES inventory_items(id),
  agreed_value_usd NUMERIC(10, 2)
);

-- ============================================
-- RESERVATIONS (Reservas y Señas)
-- ============================================

CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type reservation_type,
  status reservation_status DEFAULT 'active',
  branch_id UUID NOT NULL REFERENCES branches(id),
  user_id UUID NOT NULL REFERENCES users(id),
  item_id UUID REFERENCES inventory_items(id),
  product_id UUID REFERENCES products(id),
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

-- ============================================
-- CREDITS (Ventas a Crédito / Fiado)
-- ============================================

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

-- ============================================
-- OTHERS (Devoluciones, Contabilidad y Gastos)
-- ============================================

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

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_brand ON products(brand_id);
CREATE INDEX idx_inventory_product ON inventory_items(product_id);
CREATE INDEX idx_inventory_branch ON inventory_items(branch_id);
CREATE INDEX idx_inventory_status ON inventory_items(status);
CREATE INDEX idx_sales_register ON sales(register_id);
CREATE INDEX idx_sales_user ON sales(user_id);
CREATE INDEX idx_registers_branch ON cash_registers(branch_id);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_credits_status ON credits(status);

-- ============================================
-- CONFIRMACIÓN
-- ============================================

SELECT 'Schema created successfully!' as message;
