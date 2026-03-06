import db from '../src/db';

export const runtime = 'edge';

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const id = pathParts.length > 2 ? pathParts[2] : null;

  try {
    if (req.method === 'GET') {
      const costsRes = await db.execute('SELECT * FROM overhead_costs ORDER BY id DESC');
      return new Response(JSON.stringify(costsRes.rows), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (req.method === 'POST') {
      const { name, type, amount, period } = await req.json();
      const info = await db.execute({
        sql: 'INSERT INTO overhead_costs (name, type, amount, period) VALUES (?, ?, ?, ?)',
        args: [name, type, amount, period]
      });
      return new Response(JSON.stringify({ id: Number(info.lastInsertRowid) }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (req.method === 'DELETE' && id) {
      await db.execute({
        sql: 'DELETE FROM overhead_costs WHERE id = ?',
        args: [id]
      });
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
