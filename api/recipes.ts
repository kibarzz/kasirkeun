import db from '../src/db';

export const runtime = 'edge';

export default async function handler(req: Request) {
  try {
    if (req.method === 'POST') {
      const { product_variant_id, ingredient_id, qty, adjustment_factor } = await req.json();
      const info = await db.execute({
        sql: 'INSERT INTO recipes (product_variant_id, ingredient_id, qty, adjustment_factor) VALUES (?, ?, ?, ?)',
        args: [product_variant_id, ingredient_id, qty, adjustment_factor || 1.0]
      });
      return new Response(JSON.stringify({ id: Number(info.lastInsertRowid) }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
