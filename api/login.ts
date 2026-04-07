import db, { initDB } from '../src/db.js';

export default async function handler(req: any, res: any) {
  const method = req.method?.toUpperCase();
  
  if (method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
    return res.status(200).end();
  }

  // Manual body parsing fallback
  if ((method === 'POST' || method === 'PUT' || method === 'PATCH') && typeof req.body === 'string' && req.body.length > 0) {
    try {
      req.body = JSON.parse(req.body);
    } catch (e) {
      console.error('Failed to parse body:', e);
    }
  }

  if (method === 'GET') {
    try {
      const dbUrl = process.env.TURSO_DATABASE_URL || '';
      const isRemote = dbUrl.startsWith('libsql://') || dbUrl.startsWith('https://');
      await db.execute('SELECT 1');
      return res.status(200).json({ 
        status: 'online', 
        db: 'connected', 
        turso: !!process.env.TURSO_DATABASE_URL,
        turso_token: !!process.env.TURSO_AUTH_TOKEN,
        db_type: isRemote ? 'remote' : 'local',
        db_url_prefix: dbUrl.substring(0, 10) + '...',
        cloudinary: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET),
        env: process.env.NODE_ENV
      });
    } catch (e: any) {
      return res.status(200).json({ 
        status: 'online', 
        db: 'error', 
        error: e.message,
        turso_set: !!process.env.TURSO_DATABASE_URL
      });
    }
  }

  if (method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Ensure DB is initialized on login
    await initDB();

    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password required' });
    }

    const result = await db.execute({ 
      sql: "SELECT id, username, password, role FROM users WHERE username = ?", 
      args: [username] 
    });
    
    const user = result.rows[0];
    
    if (!user || user.password !== password) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const { password: _, ...userWithoutPassword } = user;
    return res.status(200).json({ success: true, user: userWithoutPassword });
  } catch (error: any) {
    console.error('Auth API Error:', error);
    let message = 'Internal Server Error';
    if (error.message?.includes('write operations are forbidden')) {
      message = 'Database is in Read-Only mode. Please check your TURSO_AUTH_TOKEN in Vercel settings.';
    }
    return res.status(500).json({ 
      success: false, 
      message,
      error: error.message,
      stack: error.stack
    });
  }
}
