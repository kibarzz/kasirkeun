import { createClient } from '@libsql/client';

if (process.env.NODE_ENV !== 'production') {
  try {
    const dotenv = await import('dotenv');
    dotenv.config();
  } catch (e) {
    // dotenv not available or not needed
  }
}

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:cafe.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const initDB = async () => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      unit TEXT,
      stock REAL DEFAULT 0,
      min_stock REAL DEFAULT 0,
      unit_cost REAL DEFAULT 0
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      category TEXT,
      base_price REAL DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      image_url TEXT
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS product_variants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER,
      name TEXT,
      price_modifier REAL DEFAULT 0,
      dine_in_price REAL DEFAULT 0,
      online_price REAL DEFAULT 0,
      dine_in_discount REAL DEFAULT 0,
      online_discount REAL DEFAULT 0,
      FOREIGN KEY(product_id) REFERENCES products(id)
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_variant_id INTEGER,
      ingredient_id INTEGER,
      qty REAL,
      adjustment_factor REAL DEFAULT 1.0,
      FOREIGN KEY(product_variant_id) REFERENCES product_variants(id),
      FOREIGN KEY(ingredient_id) REFERENCES ingredients(id)
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      phone TEXT,
      preferences TEXT,
      loyalty_visits INTEGER DEFAULT 0,
      total_visits INTEGER DEFAULT 0
    );
  `);

  await db.execute(`
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
  `);

  await db.execute(`
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
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS waste_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ingredient_id INTEGER,
      qty REAL,
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(ingredient_id) REFERENCES ingredients(id)
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS stock_opname (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ingredient_id INTEGER,
      expected_qty REAL,
      actual_qty REAL,
      difference REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(ingredient_id) REFERENCES ingredients(id)
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS stock_adjustments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ingredient_id INTEGER,
      type TEXT, -- 'add' or 'remove'
      qty REAL,
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(ingredient_id) REFERENCES ingredients(id)
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS overhead_costs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      type TEXT,
      amount REAL,
      period TEXT
    );
  `);

  await db.execute(`
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
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS promotion_products (
      promotion_id INTEGER,
      product_id INTEGER,
      FOREIGN KEY(promotion_id) REFERENCES promotions(id),
      FOREIGN KEY(product_id) REFERENCES products(id)
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS ingredient_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ingredient_id INTEGER,
      qty REAL,
      unit_cost REAL,
      purchase_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(ingredient_id) REFERENCES ingredients(id)
    );
  `);

  await db.execute(`
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

  // Add columns if they don't exist
  try { await db.execute('ALTER TABLE users ADD COLUMN role TEXT'); } catch (e) {}
  try { await db.execute('ALTER TABLE settings ADD COLUMN loyalty_enabled INTEGER DEFAULT 0'); } catch (e) {}
  try { await db.execute('ALTER TABLE settings ADD COLUMN tax_enabled INTEGER DEFAULT 0'); } catch (e) {}
  try { await db.execute('ALTER TABLE settings ADD COLUMN service_charge_rate REAL DEFAULT 0'); } catch (e) {}
  try { await db.execute('ALTER TABLE settings ADD COLUMN service_charge_enabled INTEGER DEFAULT 0'); } catch (e) {}
  try { await db.execute('ALTER TABLE products ADD COLUMN image_url TEXT'); } catch (e) {}
  try { await db.execute('ALTER TABLE products ADD COLUMN online_base_price REAL DEFAULT 0'); } catch (e) {}
  try { await db.execute('ALTER TABLE promotions ADD COLUMN start_date DATE'); } catch (e) {}
  try { await db.execute('ALTER TABLE promotions ADD COLUMN end_date DATE'); } catch (e) {}
  try { await db.execute('ALTER TABLE promotions ADD COLUMN redemption_count INTEGER DEFAULT 0'); } catch (e) {}
  try { await db.execute('ALTER TABLE transactions ADD COLUMN payment_proof_url TEXT'); } catch (e) {}
  try { await db.execute('ALTER TABLE product_variants ADD COLUMN dine_in_price REAL DEFAULT 0'); } catch (e) {}
  try { await db.execute('ALTER TABLE product_variants ADD COLUMN online_price REAL DEFAULT 0'); } catch (e) {}
  try { await db.execute('ALTER TABLE product_variants ADD COLUMN dine_in_discount REAL DEFAULT 0'); } catch (e) {}
  try { await db.execute('ALTER TABLE product_variants ADD COLUMN online_discount REAL DEFAULT 0'); } catch (e) {}

  // Insert default settings
  const storeNameCount = await db.execute("SELECT COUNT(*) as count FROM settings WHERE key = 'store_name'");
  if (Number(storeNameCount.rows[0].count) === 0) {
    await db.execute("INSERT INTO settings (key, value) VALUES ('store_name', 'KasirKu')");
  }

  // Insert default user if none exists
  const userCount = await db.execute('SELECT COUNT(*) as count FROM users');
  if (Number(userCount.rows[0].count) === 0) {
    await db.execute({
      sql: 'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      args: ['admin', 'admin', 'owner']
    });
    await db.execute({
      sql: 'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      args: ['kasir', 'kasir', 'cashier']
    });
  }
};

// Auto-init for serverless environments
if (process.env.NODE_ENV === 'production') {
  initDB().catch(console.error);
}

export default db;
