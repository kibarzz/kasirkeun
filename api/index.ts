import db from '../src/db';

export default async function handler(req: any, res: any) {
  const method = req.method?.toUpperCase();
  const originalPath = req.headers['x-forwarded-uri'] || req.url || '';
  const url = new URL(originalPath, `http://${req.headers.host || 'localhost'}`);
  
  // Vercel rewrites might put the path in req.query.path
  let pathParts = url.pathname.split('/').filter(Boolean);
  if (req.query && req.query.path) {
    const qPath = Array.isArray(req.query.path) ? req.query.path : [req.query.path];
    pathParts = ['api', ...qPath];
  }

  const endpoint = pathParts[1]; // 'products', 'transactions', etc.
  const id = pathParts[2];
  const action = pathParts[3];

  // Helper for common CRUD
  const handleCRUD = async (table: string) => {
    if (method === 'GET') {
      if (id) {
        const result = await db.execute({ sql: `SELECT * FROM ${table} WHERE id = ?`, args: [id] });
        return res.status(200).json(result.rows[0]);
      }
      const result = await db.execute(`SELECT * FROM ${table}`);
      return res.status(200).json(result.rows);
    }
    
    if (method === 'POST') {
      const body = req.body;
      const keys = Object.keys(body);
      const values = Object.values(body);
      const placeholders = keys.map(() => '?').join(', ');
      const info = await db.execute({
        sql: `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`,
        args: values
      });
      return res.status(200).json({ id: Number(info.lastInsertRowid) });
    }

    if (method === 'PUT' && id) {
      const body = req.body;
      const keys = Object.keys(body);
      const values = Object.values(body);
      const setClause = keys.map(k => `${k} = ?`).join(', ');
      await db.execute({
        sql: `UPDATE ${table} SET ${setClause} WHERE id = ?`,
        args: [...values, id]
      });
      return res.status(200).json({ success: true });
    }

    if (method === 'DELETE' && id) {
      await db.execute({ sql: `DELETE FROM ${table} WHERE id = ?`, args: [id] });
      return res.status(200).json({ success: true });
    }
    
    return res.status(405).json({ error: `Method ${method} not allowed for ${table}` });
  };

  console.log(`API Request: ${method} ${url.pathname} (Endpoint: ${endpoint})`);
  
  // Manual body parsing fallback
  if (method === 'POST' && typeof req.body === 'string' && req.body.length > 0) {
    try {
      req.body = JSON.parse(req.body);
    } catch (e) {
      console.error('Failed to parse body:', e);
    }
  }

  // Handle CORS Preflight
  if (method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
    return res.status(200).end();
  }

  // Check Database Config
  if (!process.env.TURSO_DATABASE_URL) {
    return res.status(500).json({ 
      error: 'Database not configured', 
      message: 'Please set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in Vercel Dashboard.' 
    });
  }

  try {
    if (endpoint === 'debug') {
      return res.status(200).json({
        method,
        url: req.url,
        pathname: url.pathname,
        pathParts,
        endpoint,
        query: req.query,
        env_status: !!process.env.TURSO_DATABASE_URL
      });
    }

    switch (endpoint) {
      case 'ping':
        return res.status(200).json({ message: 'pong', method, endpoint });
      case 'login':
        if (method === 'POST') {
          const { username, password } = req.body || {};
          if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Username and password required' });
          }
          const result = await db.execute({ sql: "SELECT id, username, password, role FROM users WHERE username = ?", args: [username] });
          const user = result.rows[0];
          if (!user || user.password !== password) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
          }
          const { password: _, ...userWithoutPassword } = user;
          return res.status(200).json({ success: true, user: userWithoutPassword });
        }
        return res.status(405).json({ error: 'Method not allowed for login' });

      case 'dashboard':
        if (req.method === 'GET') {
          const today = new Date().toISOString().split('T')[0];
          const totalTxRes = await db.execute({ sql: 'SELECT COUNT(*) as count FROM transactions WHERE date(created_at) = ?', args: [today] });
          const omzetRes = await db.execute({ sql: "SELECT SUM(final_amount) as total FROM transactions WHERE date(created_at) = ? AND type = 'paid'", args: [today] });
          const hppRes = await db.execute({
            sql: 'SELECT SUM(ti.qty * ti.hpp_snapshot) as total_hpp FROM transaction_items ti JOIN transactions t ON ti.transaction_id = t.id WHERE date(t.created_at) = ? AND t.type = "paid"',
            args: [today]
          });
          const topProductsRes = await db.execute({
            sql: 'SELECT p.name, SUM(ti.qty) as total_qty FROM transaction_items ti JOIN transactions t ON ti.transaction_id = t.id JOIN product_variants pv ON ti.product_variant_id = pv.id JOIN products p ON pv.product_id = p.id WHERE date(t.created_at) = ? GROUP BY p.id ORDER BY total_qty DESC LIMIT 5',
            args: [today]
          });
          const lowStockRes = await db.execute('SELECT name, stock, min_stock FROM ingredients WHERE stock <= min_stock');
          const recentTransactionsRes = await db.execute('SELECT id, created_at, type, payment_method, final_amount, status FROM transactions ORDER BY id DESC LIMIT 10');
          
          return res.status(200).json({
            totalTransactions: Number(totalTxRes.rows[0].count) || 0,
            omzet: Number(omzetRes.rows[0].total) || 0,
            netProfit: (Number(omzetRes.rows[0].total) || 0) - (Number(hppRes.rows[0].total_hpp) || 0),
            topProducts: topProductsRes.rows,
            lowStock: lowStockRes.rows,
            recentTransactions: recentTransactionsRes.rows
          });
        }
        return res.status(405).json({ error: 'Method not allowed' });

      case 'products':
        if (req.method === 'GET' && !id) {
          const productsRes = await db.execute('SELECT * FROM products');
          const variantsRes = await db.execute('SELECT * FROM product_variants');
          const recipesRes = await db.execute('SELECT * FROM recipes');
          return res.status(200).json({ products: productsRes.rows, variants: variantsRes.rows, recipes: recipesRes.rows });
        }
        if (req.method === 'POST' && !id) {
          const { name, category, image_url, variants } = req.body;
          const info = await db.execute({ sql: 'INSERT INTO products (name, category, image_url) VALUES (?, ?, ?)', args: [name, category, image_url] });
          const productId = Number(info.lastInsertRowid);
          for (const v of variants) {
            await db.execute({
              sql: 'INSERT INTO product_variants (product_id, name, dine_in_price, online_price, dine_in_discount, online_discount) VALUES (?, ?, ?, ?, ?, ?)',
              args: [productId, v.name, v.dine_in_price, v.online_price, v.dine_in_discount, v.online_discount]
            });
          }
          return res.status(200).json({ id: productId });
        }
        return handleCRUD('products');

      case 'transactions':
        if (req.method === 'POST') {
          if (id && action === 'void') {
            const txRes = await db.execute({ sql: 'SELECT * FROM transactions WHERE id = ?', args: [id] });
            const tx = txRes.rows[0];
            if (!tx || tx.status === 'voided') return res.status(400).json({ message: 'Invalid transaction' });
            
            const itemsRes = await db.execute({ sql: 'SELECT * FROM transaction_items WHERE transaction_id = ?', args: [id] });
            await db.execute({ sql: "UPDATE transactions SET status = 'voided' WHERE id = ?", args: [id] });
            
            for (const item of itemsRes.rows) {
              const itemBatchesRes = await db.execute({ sql: 'SELECT * FROM transaction_item_batches WHERE transaction_item_id = ?', args: [item.id] });
              for (const ib of itemBatchesRes.rows) {
                await db.execute({ sql: 'UPDATE ingredient_batches SET qty = qty + ? WHERE id = ?', args: [ib.qty, ib.batch_id] });
              }
              const recipeItemsRes = await db.execute({ sql: 'SELECT ingredient_id, qty, adjustment_factor FROM recipes WHERE product_variant_id = ?', args: [item.product_variant_id] });
              for (const rItem of recipeItemsRes.rows) {
                await db.execute({ sql: 'UPDATE ingredients SET stock = stock + ? WHERE id = ?', args: [Number(rItem.qty) * Number(item.qty) * Number(rItem.adjustment_factor), rItem.ingredient_id] });
              }
            }
            if (tx.customer_id && tx.type === 'paid') {
              await db.execute({ sql: 'UPDATE customers SET loyalty_visits = loyalty_visits - 1, total_visits = total_visits - 1 WHERE id = ?', args: [tx.customer_id] });
            }
            return res.status(200).json({ success: true });
          }

          const body = req.body;
          const info = await db.execute({
            sql: 'INSERT INTO transactions (customer_id, user_id, total_amount, tax_amount, discount_amount, final_amount, payment_method, channel, type, status, payment_proof_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            args: [body.customer_id, body.user_id, body.total_amount, body.tax_amount, body.discount_amount, body.final_amount, body.payment_method, body.channel, body.type, 'completed', body.payment_proof_url || null]
          });
          const txId = Number(info.lastInsertRowid);
          
          for (const item of body.items) {
            let hppSnapshot = 0;
            const recipeItemsRes = await db.execute({ sql: 'SELECT ingredient_id, qty, adjustment_factor FROM recipes WHERE product_variant_id = ?', args: [item.product_variant_id] });
            const itemInfo = await db.execute({ sql: 'INSERT INTO transaction_items (transaction_id, product_variant_id, qty, unit_price, hpp_snapshot) VALUES (?, ?, ?, ?, ?)', args: [txId, item.product_variant_id, item.qty, item.unit_price, 0] });
            const transactionItemId = Number(itemInfo.lastInsertRowid);

            for (const rItem of recipeItemsRes.rows) {
              const totalDeduction = Number(rItem.qty) * item.qty * Number(rItem.adjustment_factor);
              let remainingToDeduct = totalDeduction;
              let ingredientCost = 0;
              const batchesRes = await db.execute({ sql: 'SELECT * FROM ingredient_batches WHERE ingredient_id = ? AND qty > 0 ORDER BY purchase_date ASC', args: [rItem.ingredient_id] });
              
              for (const batch of batchesRes.rows) {
                if (remainingToDeduct <= 0) break;
                const deduct = Math.min(Number(batch.qty), remainingToDeduct);
                await db.execute({ sql: 'UPDATE ingredient_batches SET qty = qty - ? WHERE id = ?', args: [deduct, batch.id] });
                await db.execute({ sql: 'INSERT INTO transaction_item_batches (transaction_item_id, batch_id, qty, unit_cost) VALUES (?, ?, ?, ?)', args: [transactionItemId, batch.id, deduct, batch.unit_cost] });
                ingredientCost += deduct * Number(batch.unit_cost);
                remainingToDeduct -= deduct;
              }
              if (remainingToDeduct > 0) {
                const ingRes = await db.execute({ sql: 'SELECT unit_cost FROM ingredients WHERE id = ?', args: [rItem.ingredient_id] });
                ingredientCost += remainingToDeduct * (Number(ingRes.rows[0]?.unit_cost) || 0);
              }
              hppSnapshot += ingredientCost;
              await db.execute({ sql: 'UPDATE ingredients SET stock = stock - ? WHERE id = ?', args: [totalDeduction, rItem.ingredient_id] });
            }
            await db.execute({ sql: 'UPDATE transaction_items SET hpp_snapshot = ? WHERE id = ?', args: [hppSnapshot / item.qty, transactionItemId] });
          }
          if (body.customer_id && body.type === 'paid') {
            const loyaltyChange = body.redeem_loyalty ? -9 : 1;
            await db.execute({ sql: 'UPDATE customers SET loyalty_visits = loyalty_visits + ?, total_visits = total_visits + 1 WHERE id = ?', args: [loyaltyChange, body.customer_id] });
          }
          if (body.applied_promotion_ids) {
            for (const pId of body.applied_promotion_ids) await db.execute({ sql: 'UPDATE promotions SET redemption_count = redemption_count + 1 WHERE id = ?', args: [pId] });
          }
          return res.status(200).json({ id: txId });
        }
        return handleCRUD('transactions');

      case 'inventory':
        if (req.method === 'POST') {
          const body = req.body;
          if (id === 'waste') {
            await db.execute({ sql: 'INSERT INTO waste_logs (ingredient_id, qty, reason) VALUES (?, ?, ?)', args: [body.ingredient_id, body.qty, body.reason] });
            let remaining = body.qty;
            const batches = await db.execute({ sql: 'SELECT * FROM ingredient_batches WHERE ingredient_id = ? AND qty > 0 ORDER BY purchase_date ASC', args: [body.ingredient_id] });
            for (const b of batches.rows) {
              if (remaining <= 0) break;
              const d = Math.min(Number(b.qty), remaining);
              await db.execute({ sql: 'UPDATE ingredient_batches SET qty = qty - ? WHERE id = ?', args: [d, b.id] });
              remaining -= d;
            }
            await db.execute({ sql: 'UPDATE ingredients SET stock = stock - ? WHERE id = ?', args: [body.qty, body.ingredient_id] });
            return res.status(200).json({ success: true });
          }
          if (id === 'opname') {
            const diff = body.actual_qty - body.expected_qty;
            await db.execute({ sql: 'INSERT INTO stock_opname (ingredient_id, expected_qty, actual_qty, difference) VALUES (?, ?, ?, ?)', args: [body.ingredient_id, body.expected_qty, body.actual_qty, diff] });
            if (diff < 0) {
              let rem = Math.abs(diff);
              const batches = await db.execute({ sql: 'SELECT * FROM ingredient_batches WHERE ingredient_id = ? AND qty > 0 ORDER BY purchase_date ASC', args: [body.ingredient_id] });
              for (const b of batches.rows) {
                if (rem <= 0) break;
                const d = Math.min(Number(b.qty), rem);
                await db.execute({ sql: 'UPDATE ingredient_batches SET qty = qty - ? WHERE id = ?', args: [d, b.id] });
                rem -= d;
              }
            } else if (diff > 0) {
              const ing = await db.execute({ sql: 'SELECT unit_cost FROM ingredients WHERE id = ?', args: [body.ingredient_id] });
              await db.execute({ sql: 'INSERT INTO ingredient_batches (ingredient_id, qty, unit_cost) VALUES (?, ?, ?)', args: [body.ingredient_id, diff, Number(ing.rows[0]?.unit_cost) || 0] });
            }
            await db.execute({ sql: 'UPDATE ingredients SET stock = ? WHERE id = ?', args: [body.actual_qty, body.ingredient_id] });
            return res.status(200).json({ success: true });
          }
          if (id === 'stock-adjustments') {
            await db.execute({ sql: 'INSERT INTO stock_adjustments (ingredient_id, type, qty, reason) VALUES (?, ?, ?, ?)', args: [body.ingredient_id, body.type, body.qty, body.reason] });
            if (body.type === 'add') {
              await db.execute({ sql: 'UPDATE ingredients SET stock = stock + ?, unit_cost = ? WHERE id = ?', args: [body.qty, body.unit_cost, body.ingredient_id] });
              await db.execute({ sql: 'INSERT INTO ingredient_batches (ingredient_id, qty, unit_cost) VALUES (?, ?, ?)', args: [body.ingredient_id, body.qty, body.unit_cost] });
            } else {
              let rem = body.qty;
              const batches = await db.execute({ sql: 'SELECT * FROM ingredient_batches WHERE ingredient_id = ? AND qty > 0 ORDER BY purchase_date ASC', args: [body.ingredient_id] });
              for (const b of batches.rows) {
                if (rem <= 0) break;
                const d = Math.min(Number(b.qty), rem);
                await db.execute({ sql: 'UPDATE ingredient_batches SET qty = qty - ? WHERE id = ?', args: [d, b.id] });
                rem -= d;
              }
              await db.execute({ sql: 'UPDATE ingredients SET stock = stock - ? WHERE id = ?', args: [body.qty, body.ingredient_id] });
            }
            return res.status(200).json({ success: true });
          }
        }
        break;

      case 'customers':
        if (id === 'search') {
          const q = url.searchParams.get('q') || '';
          const res_cust = await db.execute({ sql: "SELECT * FROM customers WHERE name LIKE ? OR phone LIKE ?", args: [`%${q}%`, `%${q}%`] });
          return res.status(200).json(res_cust.rows);
        }
        return handleCRUD('customers');

      case 'settings':
        if (req.method === 'GET') {
          const res_set = await db.execute('SELECT * FROM settings');
          const obj = res_set.rows.reduce((acc: any, curr: any) => { acc[curr.key] = curr.value; return acc; }, {});
          return res.status(200).json(obj);
        }
        if (req.method === 'POST') {
          const { key, value } = req.body;
          await db.execute({ sql: 'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', args: [key, value] });
          return res.status(200).json({ success: true });
        }
        break;

      case 'shift':
        if (id === 'summary') {
          const today = new Date().toISOString().split('T')[0];
          const res_shift = await db.execute({
            sql: 'SELECT COUNT(*) as total_transactions, SUM(final_amount) as total_revenue, SUM(CASE WHEN payment_method LIKE "%Cash%" THEN final_amount ELSE 0 END) as cash_revenue, SUM(CASE WHEN payment_method LIKE "%QRIS%" THEN final_amount ELSE 0 END) as qris_revenue FROM transactions WHERE date(created_at) = ? AND type = "paid"',
            args: [today]
          });
          return res.status(200).json(res_shift.rows[0]);
        }
        break;

      case 'backup':
        return res.status(200).json({ message: 'Backups are handled by Turso.', url: 'https://turso.tech/dashboard' });

      case 'ingredients': return handleCRUD('ingredients');
      case 'users': return handleCRUD('users');
      case 'overhead': return handleCRUD('overhead_costs');
      case 'promotions': return handleCRUD('promotions');
      case 'variants': return handleCRUD('product_variants');
      case 'recipes': return handleCRUD('recipes');
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
