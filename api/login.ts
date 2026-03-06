import db from '../src/db';

export const runtime = 'edge';

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { username, password } = await req.json();

    const result = await db.execute({
      sql: "SELECT id, username, password, role FROM users WHERE username = ?",
      args: [username]
    });

    const user = result.rows[0];

    if (!user) {
      return new Response(JSON.stringify({ success: false, message: 'User not found' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Password check (plain text as per current implementation)
    if (user.password !== password) {
      return new Response(JSON.stringify({ success: false, message: 'Invalid password' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Return success
    const { password: _, ...userWithoutPassword } = user;
    return new Response(JSON.stringify({ success: true, user: userWithoutPassword }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error("LOGIN ERROR:", error.message);
    return new Response(JSON.stringify({ 
      error: "Gagal koneksi ke database", 
      detail: error.message 
    }), { status: 500 });
  }
}
