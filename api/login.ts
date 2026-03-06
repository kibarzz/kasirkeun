import db from '../src/db';

export default async function handler(req: any, res: any) {
  const method = req.method?.toUpperCase();
  const host = req.headers.host || 'localhost';
  
  console.log(`[DEBUG] Login API called: ${method} on ${host}`);
  console.log(`[DEBUG] TURSO_DATABASE_URL is ${process.env.TURSO_DATABASE_URL ? 'DEFINED' : 'UNDEFINED'}`);
  
  if (method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
    return res.status(200).end();
  }

  if (method === 'GET') {
    return res.status(200).json({ 
      status: 'online',
      db_url_set: !!process.env.TURSO_DATABASE_URL,
      db_token_set: !!process.env.TURSO_AUTH_TOKEN,
      env: process.env.NODE_ENV
    });
  }

  if (method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Manual body parsing if Vercel fails to parse it
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        console.error('[DEBUG] Body parse error:', e);
      }
    }

    const { username, password } = body || {};
    console.log(`[DEBUG] Login attempt for user: ${username}`);

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password required' });
    }

    if (!db) {
      throw new Error('Database client not initialized');
    }

    console.log('[DEBUG] Executing SQL query...');
    const result = await db.execute({ 
      sql: "SELECT id, username, password, role FROM users WHERE username = ?", 
      args: [username] 
    });
    
    console.log(`[DEBUG] Query result rows: ${result.rows?.length || 0}`);
    const user = result.rows[0];
    
    if (!user || user.password !== password) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const { password: _, ...userWithoutPassword } = user;
    return res.status(200).json({ success: true, user: userWithoutPassword });
  } catch (error: any) {
    console.error('[DEBUG] Auth API Error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal Server Error',
      debug_error: error.message,
      db_url_set: !!process.env.TURSO_DATABASE_URL
    });
  }
}
