import db from '../src/db';

export const runtime = 'edge';

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  
  // pathParts: ['api', 'customers', ...]
  const subPath = pathParts[2]; // 'search' or :id
  const historyPath = pathParts[3]; // 'history'

  try {
    if (req.method === 'GET') {
      if (subPath === 'search') {
        const q = url.searchParams.get('q');
        if (!q) return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
        const customersRes = await db.execute({
          sql: 'SELECT * FROM customers WHERE name LIKE ? OR phone LIKE ? LIMIT 10',
          args: [`%${q}%`, `%${q}%`]
        });
        return new Response(JSON.stringify(customersRes.rows), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      if (subPath && historyPath === 'history') {
        const customerId = subPath;
        const transactionsRes = await db.execute({
          sql: `
            SELECT t.id, t.total_amount, t.created_at, u.username as cashier
            FROM transactions t
            LEFT JOIN users u ON t.user_id = u.id
            WHERE t.customer_id = ?
            ORDER BY t.created_at DESC
          `,
          args: [customerId]
        });
        const transactions = transactionsRes.rows;

        const itemsRes = await db.execute({
          sql: `
            SELECT ti.transaction_id, pv.name as product_name, ti.qty, ti.unit_price
            FROM transaction_items ti
            JOIN product_variants pv ON ti.product_variant_id = pv.id
            WHERE ti.transaction_id IN (SELECT id FROM transactions WHERE customer_id = ?)
          `,
          args: [customerId]
        });
        const items = itemsRes.rows;

        const history = transactions.map(t => ({
          ...t,
          items: items.filter(i => i.transaction_id === t.id)
        }));

        return new Response(JSON.stringify(history), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      if (subPath) {
        const customerRes = await db.execute({
          sql: 'SELECT * FROM customers WHERE id = ?',
          args: [subPath]
        });
        return new Response(JSON.stringify(customerRes.rows[0]), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      const customersRes = await db.execute('SELECT * FROM customers');
      return new Response(JSON.stringify(customersRes.rows), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (req.method === 'POST') {
      const { name, phone, preferences } = await req.json();
      const info = await db.execute({
        sql: 'INSERT INTO customers (name, phone, preferences) VALUES (?, ?, ?)',
        args: [name, phone, preferences]
      });
      return new Response(JSON.stringify({ id: Number(info.lastInsertRowid) }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (req.method === 'PUT' && subPath) {
      const { name, phone, preferences } = await req.json();
      await db.execute({
        sql: 'UPDATE customers SET name = ?, phone = ?, preferences = ? WHERE id = ?',
        args: [name, phone, preferences, subPath]
      });
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
