import Database from 'better-sqlite3';

const db = new Database('cafe.db');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT
  );

  CREATE TABLE IF NOT EXISTS ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    unit TEXT,
    stock REAL DEFAULT 0,
    min_stock REAL DEFAULT 0,
    unit_cost REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    category TEXT,
    base_price REAL DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    image_url TEXT
  );

  CREATE TABLE IF NOT EXISTS product_variants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    name TEXT,
    price_modifier REAL DEFAULT 0,
    dine_in_price REAL DEFAULT 0,
    online_price REAL DEFAULT 0,
    FOREIGN KEY(product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_variant_id INTEGER,
    ingredient_id INTEGER,
    qty REAL,
    adjustment_factor REAL DEFAULT 1.0,
    FOREIGN KEY(product_variant_id) REFERENCES product_variants(id),
    FOREIGN KEY(ingredient_id) REFERENCES ingredients(id)
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    phone TEXT,
    preferences TEXT,
    loyalty_visits INTEGER DEFAULT 0,
    total_visits INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    user_id INTEGER,
    total_amount REAL,
    tax_amount REAL,
    discount_amount REAL,
    final_amount REAL,
    payment_method TEXT,
    channel TEXT,
    type TEXT,
    status TEXT,
    payment_proof_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(customer_id) REFERENCES customers(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS transaction_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id INTEGER,
    product_variant_id INTEGER,
    qty INTEGER,
    unit_price REAL,
    hpp_snapshot REAL,
    FOREIGN KEY(transaction_id) REFERENCES transactions(id),
    FOREIGN KEY(product_variant_id) REFERENCES product_variants(id)
  );

  CREATE TABLE IF NOT EXISTS waste_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ingredient_id INTEGER,
    qty REAL,
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(ingredient_id) REFERENCES ingredients(id)
  );

  CREATE TABLE IF NOT EXISTS stock_opname (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ingredient_id INTEGER,
    expected_qty REAL,
    actual_qty REAL,
    difference REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(ingredient_id) REFERENCES ingredients(id)
  );

  CREATE TABLE IF NOT EXISTS stock_adjustments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ingredient_id INTEGER,
    type TEXT, -- 'add' or 'remove'
    qty REAL,
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(ingredient_id) REFERENCES ingredients(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS overhead_costs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    type TEXT,
    amount REAL,
    period TEXT
  );

  CREATE TABLE IF NOT EXISTS promotions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    type TEXT,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    buy_qty INTEGER,
    get_qty INTEGER,
    fixed_price REAL,
    days_of_week TEXT,
    start_time TEXT,
    end_time TEXT,
    discount_percent REAL,
    discount_amount REAL,
    start_date DATE,
    end_date DATE,
    redemption_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS promotion_products (
    promotion_id INTEGER,
    product_id INTEGER,
    FOREIGN KEY(promotion_id) REFERENCES promotions(id),
    FOREIGN KEY(product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS ingredient_batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ingredient_id INTEGER,
    qty REAL,
    unit_cost REAL,
    purchase_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(ingredient_id) REFERENCES ingredients(id)
  );

  CREATE TABLE IF NOT EXISTS transaction_item_batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_item_id INTEGER,
    batch_id INTEGER,
    qty REAL,
    unit_cost REAL,
    FOREIGN KEY(transaction_item_id) REFERENCES transaction_items(id),
    FOREIGN KEY(batch_id) REFERENCES ingredient_batches(id)
  );
`);

// Add image_url and online_base_price to products if they don't exist
try {
  db.exec('ALTER TABLE products ADD COLUMN image_url TEXT');
} catch (e) {
  // Column already exists
}
try {
  db.exec('ALTER TABLE products ADD COLUMN online_base_price REAL DEFAULT 0');
} catch (e) {
  // Column already exists
}

try {
  db.exec('ALTER TABLE promotions ADD COLUMN start_date DATE');
} catch (e) {}
try {
  db.exec('ALTER TABLE promotions ADD COLUMN end_date DATE');
} catch (e) {}
try {
  db.exec('ALTER TABLE promotions ADD COLUMN redemption_count INTEGER DEFAULT 0');
} catch (e) {}

try {
  db.exec('ALTER TABLE product_variants ADD COLUMN dine_in_price REAL DEFAULT 0');
} catch (e) {}
try {
  db.exec('ALTER TABLE product_variants ADD COLUMN online_price REAL DEFAULT 0');
} catch (e) {}

// Insert default settings
const storeNameCount = db.prepare("SELECT COUNT(*) as count FROM settings WHERE key = 'store_name'").get() as { count: number };
if (storeNameCount.count === 0) {
  db.prepare("INSERT INTO settings (key, value) VALUES ('store_name', 'KasirKu')").run();
}

// Insert default user if none exists
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
if (userCount.count === 0) {
  db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('admin', 'admin', 'owner');
  db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('kasir', 'kasir', 'cashier');
}

export default db;
