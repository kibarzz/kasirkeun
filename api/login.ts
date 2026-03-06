import db from '../src/db';

export default async function handler(req: any, res: any) {
  const method = req.method?.toUpperCase();
  const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
  
  console.log(`API Request: ${method} ${url.pathname}`);

  if (method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
    return res.status(200).end();
  }

  if (method === 'GET') {
    return res.status(200).json({ 
      message: 'Login endpoint is reachable', 
      method, 
      pathname: url.pathname,
      query: req.query
    });
  }

  if (method !== 'POST') {
    return res.status(405).json({ 
      error: `Method ${method} not allowed`, 
      message: 'This endpoint only accepts POST requests for login.' 
    });
  }

  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password required' });
    }

    console.log('Attempting DB query...');
    const result = await db.execute({ 
      sql: "SELECT id, username, password, role FROM users WHERE username = ?", 
      args: [username] 
    }).catch(e => {
      console.error('DB Execution Error:', e);
      throw new Error(`Database Error: ${e.message}. URL: ${process.env.TURSO_DATABASE_URL ? 'Set' : 'Not Set'}`);
    });
    
    const user = result.rows[0];
    if (!user || user.password !== password) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const { password: _, ...userWithoutPassword } = user;
    return res.status(200).json({ success: true, user: userWithoutPassword });
  } catch (error: any) {
    console.error('Auth API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
