import db from '../src/db';

export default async function handler(req: any, res: any) {
  const method = req.method?.toUpperCase();
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const endpoint = pathParts[1]; // 'dashboard', 'settings', 'users', 'shift'
  const id = pathParts[2];

  if (method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
    return res.status(200).end();
  }

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
    
    return res.status(405).json({ error: `Method ${method} not allowed` });
  };

  try {
    switch (endpoint) {
      case 'dashboard':
        if (method === 'GET') {
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
        break;

      case 'settings':
        if (method === 'GET') {
          const res_set = await db.execute('SELECT * FROM settings');
          const obj = res_set.rows.reduce((acc: any, curr: any) => { acc[curr.key] = curr.value; return acc; }, {});
          return res.status(200).json(obj);
        }
        if (method === 'POST') {
          const { key, value } = req.body;
          await db.execute({ sql: 'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', args: [key, value] });
          return res.status(200).json({ success: true });
        }
        break;

      case 'users': return handleCRUD('users');

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
    }

    return res.status(404).json({ error: 'Admin Endpoint Not found' });
  } catch (error: any) {
    console.error('Admin API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
