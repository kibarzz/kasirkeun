import db from '../src/db';

export const runtime = 'edge';

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const id = pathParts.length > 2 ? pathParts[2] : null;

  try {
    if (req.method === 'PUT' && id) {
      const { name, dine_in_price, online_price, dine_in_discount, online_discount } = await req.json();
      await db.execute({
        sql: 'UPDATE product_variants SET name = ?, dine_in_price = ?, online_price = ?, dine_in_discount = ?, online_discount = ? WHERE id = ?',
        args: [name, dine_in_price, online_price, dine_in_discount || 0, online_discount || 0, id]
      });
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
