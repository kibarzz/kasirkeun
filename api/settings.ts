import db from '../src/db';

export const runtime = 'edge';

export default async function handler(req: Request) {
  const url = new URL(req.url);
  
  if (req.method === 'GET') {
    try {
      const settingsRes = await db.execute('SELECT * FROM settings');
      const settings = settingsRes.rows;
      const settingsObj = settings.reduce((acc: any, curr: any) => {
        acc[curr.key] = curr.value;
        return acc;
      }, {});
      return new Response(JSON.stringify(settingsObj), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error: any) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
  }

  if (req.method === 'POST') {
    try {
      const { key, value } = await req.json();
      await db.execute({
        sql: 'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        args: [key, value]
      });
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error: any) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
}
