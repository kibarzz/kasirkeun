import db from '../src/db';

export const runtime = 'edge';

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const id = pathParts.length > 2 ? pathParts[2] : null;

  try {
    if (req.method === 'GET') {
      if (id) {
        const userRes = await db.execute({
          sql: 'SELECT id, username, role FROM users WHERE id = ?',
          args: [id]
        });
        return new Response(JSON.stringify(userRes.rows[0]), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      const usersRes = await db.execute('SELECT id, username, role FROM users');
      return new Response(JSON.stringify(usersRes.rows), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (req.method === 'POST') {
      const { username, password, role } = await req.json();
      const info = await db.execute({
        sql: 'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
        args: [username, password, role]
      });
      return new Response(JSON.stringify({ id: Number(info.lastInsertRowid) }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (req.method === 'PUT' && id) {
      const { username, password, role } = await req.json();
      if (password) {
        await db.execute({
          sql: 'UPDATE users SET username = ?, password = ?, role = ? WHERE id = ?',
          args: [username, password, role, id]
        });
      } else {
        await db.execute({
          sql: 'UPDATE users SET username = ?, role = ? WHERE id = ?',
          args: [username, role, id]
        });
      }
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (req.method === 'DELETE' && id) {
      await db.execute({
        sql: 'DELETE FROM users WHERE id = ?',
        args: [id]
      });
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
