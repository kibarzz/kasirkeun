import db from '../src/db';

export const runtime = 'edge';

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const id = pathParts.length > 2 ? pathParts[2] : null;

  try {
    if (req.method === 'GET') {
      const promotionsRes = await db.execute('SELECT * FROM promotions ORDER BY id DESC');
      const promoProductsRes = await db.execute('SELECT * FROM promotion_products');
      return new Response(JSON.stringify({ promotions: promotionsRes.rows, promoProducts: promoProductsRes.rows }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (req.method === 'POST') {
      const { name, type, description, is_active, buy_qty, get_qty, fixed_price, days_of_week, start_time, end_time, discount_percent, discount_amount, start_date, end_date, product_ids } = await req.json();
      const info = await db.execute({
        sql: 'INSERT INTO promotions (name, type, description, is_active, buy_qty, get_qty, fixed_price, days_of_week, start_time, end_time, discount_percent, discount_amount, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: [name, type, description, is_active, buy_qty, get_qty, fixed_price, days_of_week, start_time, end_time, discount_percent, discount_amount, start_date, end_date]
      });
      const promoId = Number(info.lastInsertRowid);
      
      if (product_ids && product_ids.length > 0) {
        for (const pid of product_ids) {
          await db.execute({
            sql: 'INSERT INTO promotion_products (promotion_id, product_id) VALUES (?, ?)',
            args: [promoId, pid]
          });
        }
      }
      return new Response(JSON.stringify({ id: promoId }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (req.method === 'PUT' && id) {
      const { name, type, description, is_active, buy_qty, get_qty, fixed_price, days_of_week, start_time, end_time, discount_percent, discount_amount, start_date, end_date, product_ids } = await req.json();
      await db.execute({
        sql: 'UPDATE promotions SET name = ?, type = ?, description = ?, is_active = ?, buy_qty = ?, get_qty = ?, fixed_price = ?, days_of_week = ?, start_time = ?, end_time = ?, discount_percent = ?, discount_amount = ?, start_date = ?, end_date = ? WHERE id = ?',
        args: [name, type, description, is_active, buy_qty, get_qty, fixed_price, days_of_week, start_time, end_time, discount_percent, discount_amount, start_date, end_date, id]
      });
      
      await db.execute({
        sql: 'DELETE FROM promotion_products WHERE promotion_id = ?',
        args: [id]
      });
      
      if (product_ids && product_ids.length > 0) {
        for (const pid of product_ids) {
          await db.execute({
            sql: 'INSERT INTO promotion_products (promotion_id, product_id) VALUES (?, ?)',
            args: [id, pid]
          });
        }
      }
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (req.method === 'DELETE' && id) {
      await db.execute({
        sql: 'DELETE FROM promotion_products WHERE promotion_id = ?',
        args: [id]
      });
      await db.execute({
        sql: 'DELETE FROM promotions WHERE id = ?',
        args: [id]
      });
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
