import db from '../src/db';

export const runtime = 'edge';

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const id = pathParts.length > 2 ? pathParts[2] : null;

  try {
    if (req.method === 'GET') {
      const ingredientsRes = await db.execute('SELECT * FROM ingredients');
      return new Response(JSON.stringify(ingredientsRes.rows), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (req.method === 'POST') {
      const { name, unit, stock, min_stock, unit_cost } = await req.json();
      const info = await db.execute({
        sql: 'INSERT INTO ingredients (name, unit, stock, min_stock, unit_cost) VALUES (?, ?, ?, ?, ?)',
        args: [name, unit, stock, min_stock, unit_cost]
      });
      const ingredientId = Number(info.lastInsertRowid);
      
      if (stock > 0) {
        await db.execute({
          sql: 'INSERT INTO ingredient_batches (ingredient_id, qty, unit_cost) VALUES (?, ?, ?)',
          args: [ingredientId, stock, unit_cost]
        });
      }
      return new Response(JSON.stringify({ id: ingredientId }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (req.method === 'PUT' && id) {
      const { name, unit, stock, min_stock, unit_cost } = await req.json();
      await db.execute({
        sql: 'UPDATE ingredients SET name = ?, unit = ?, stock = ?, min_stock = ?, unit_cost = ? WHERE id = ?',
        args: [name, unit, stock, min_stock, unit_cost, id]
      });
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
