import db, { initDB } from '../src/db.js';

export default async function handler(req: any, res: any) {
  const method = req.method?.toUpperCase();
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const endpoint = pathParts[1]; // 'inventory', 'ingredients', etc.
  const id = pathParts[2];

  console.log(`API Request: ${method} ${url.pathname}`);
  
  // Ensure DB is initialized
  try {
    await initDB();
  } catch (e: any) {
    console.error('DB Init Error in Inventory:', e);
    return res.status(500).json({ error: 'Database initialization failed', details: e.message });
  }
  
  // Manual body parsing fallback
  if ((method === 'POST' || method === 'PUT' || method === 'PATCH') && typeof req.body === 'string' && req.body.length > 0) {
    try {
      req.body = JSON.parse(req.body);
    } catch (e) {
      console.error('Failed to parse body:', e);
    }
  }

  if (!req.body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    req.body = {};
  }

  if (method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
    return res.status(200).end();
  }

  const handleCRUD = async (table: string) => {
    if (method === 'GET') {
      if (id) {
        const result = await db.execute({ sql: `SELECT * FROM ${table} WHERE id = ?`, args: [id] });
        const row = result.rows[0];
        if (row) {
          // Parse JSON strings back to arrays if needed
          Object.keys(row).forEach(key => {
            if (typeof row[key] === 'string' && (row[key].startsWith('[') || row[key].startsWith('{'))) {
              try {
                row[key] = JSON.parse(row[key]);
              } catch (e) {
                // Not JSON, ignore
              }
            }
          });
        }
        return res.status(200).json(row);
      }
      const result = await db.execute(`SELECT * FROM ${table}`);
      const rows = result.rows.map(row => {
        const newRow = { ...row };
        Object.keys(newRow).forEach(key => {
          if (typeof newRow[key] === 'string' && (newRow[key].startsWith('[') || newRow[key].startsWith('{'))) {
            try {
              newRow[key] = JSON.parse(newRow[key]);
            } catch (e) {
              // Not JSON, ignore
            }
          }
        });
        return newRow;
      });
      return res.status(200).json(rows);
    }
    
    if (method === 'POST') {
      const body = { ...req.body };
      const keys = Object.keys(body);
      if (keys.length === 0) return res.status(400).json({ error: 'Empty body' });
      
      // Stringify arrays/objects for SQLite
      const values = Object.values(body).map(v => 
        Array.isArray(v) || (v !== null && typeof v === 'object') ? JSON.stringify(v) : v
      );
      
      const placeholders = keys.map(() => '?').join(', ');
      const info = await db.execute({
        sql: `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`,
        args: values as any[]
      });
      return res.status(200).json({ id: Number(info.lastInsertRowid) });
    }

    if (method === 'PUT' && id) {
      const body = { ...req.body };
      const keys = Object.keys(body);
      if (keys.length === 0) return res.status(400).json({ error: 'Empty body' });
      
      // Stringify arrays/objects for SQLite
      const values = Object.values(body).map(v => 
        Array.isArray(v) || (v !== null && typeof v === 'object') ? JSON.stringify(v) : v
      );
      
      const setClause = keys.map(k => `${k} = ?`).join(', ');
      await db.execute({
        sql: `UPDATE ${table} SET ${setClause} WHERE id = ?`,
        args: [...values, id] as any[]
      });
      return res.status(200).json({ success: true });
    }

    if (method === 'DELETE' && id) {
      await db.execute({ sql: `DELETE FROM ${table} WHERE id = ?`, args: [id] as any[] });
      return res.status(200).json({ success: true });
    }
    
    return res.status(405).json({ error: `Method ${method} not allowed` });
  };

  try {
    switch (endpoint) {
      case 'ingredients': return handleCRUD('ingredients');
      case 'overhead': return handleCRUD('overhead_costs');
      case 'inventory':
        if (method === 'POST') {
          const body = req.body;
          if (id === 'waste') {
            await db.execute({ sql: 'INSERT INTO waste_logs (ingredient_id, qty, reason) VALUES (?, ?, ?)', args: [body.ingredient_id, body.qty, body.reason] });
            let remaining = body.qty;
            const batches = await db.execute({ sql: 'SELECT * FROM ingredient_batches WHERE ingredient_id = ? AND qty > 0 ORDER BY purchase_date ASC', args: [body.ingredient_id] });
            for (const b of batches.rows) {
              if (remaining <= 0) break;
              const d = Math.min(Number(b.qty), remaining);
              await db.execute({ sql: 'UPDATE ingredient_batches SET qty = qty - ? WHERE id = ?', args: [d, b.id] });
              remaining -= d;
            }
            await db.execute({ sql: 'UPDATE ingredients SET stock = stock - ? WHERE id = ?', args: [body.qty, body.ingredient_id] });
            return res.status(200).json({ success: true });
          }
          if (id === 'opname') {
            const diff = body.actual_qty - body.expected_qty;
            await db.execute({ sql: 'INSERT INTO stock_opname (ingredient_id, expected_qty, actual_qty, difference) VALUES (?, ?, ?, ?)', args: [body.ingredient_id, body.expected_qty, body.actual_qty, diff] });
            if (diff < 0) {
              let rem = Math.abs(diff);
              const batches = await db.execute({ sql: 'SELECT * FROM ingredient_batches WHERE ingredient_id = ? AND qty > 0 ORDER BY purchase_date ASC', args: [body.ingredient_id] });
              for (const b of batches.rows) {
                if (rem <= 0) break;
                const d = Math.min(Number(b.qty), rem);
                await db.execute({ sql: 'UPDATE ingredient_batches SET qty = qty - ? WHERE id = ?', args: [d, b.id] });
                rem -= d;
              }
            } else if (diff > 0) {
              const ing = await db.execute({ sql: 'SELECT unit_cost FROM ingredients WHERE id = ?', args: [body.ingredient_id] });
              await db.execute({ sql: 'INSERT INTO ingredient_batches (ingredient_id, qty, unit_cost) VALUES (?, ?, ?)', args: [body.ingredient_id, diff, Number(ing.rows[0]?.unit_cost) || 0] });
            }
            await db.execute({ sql: 'UPDATE ingredients SET stock = ? WHERE id = ?', args: [body.actual_qty, body.ingredient_id] });
            return res.status(200).json({ success: true });
          }
          if (id === 'stock-adjustments') {
            await db.execute({ sql: 'INSERT INTO stock_adjustments (ingredient_id, type, qty, reason) VALUES (?, ?, ?, ?)', args: [body.ingredient_id, body.type, body.qty, body.reason] });
            if (body.type === 'add') {
              await db.execute({ sql: 'UPDATE ingredients SET stock = stock + ?, unit_cost = ? WHERE id = ?', args: [body.qty, body.unit_cost, body.ingredient_id] });
              await db.execute({ sql: 'INSERT INTO ingredient_batches (ingredient_id, qty, unit_cost) VALUES (?, ?, ?)', args: [body.ingredient_id, body.qty, body.unit_cost] });
            } else {
              let rem = body.qty;
              const batches = await db.execute({ sql: 'SELECT * FROM ingredient_batches WHERE ingredient_id = ? AND qty > 0 ORDER BY purchase_date ASC', args: [body.ingredient_id] });
              for (const b of batches.rows) {
                if (rem <= 0) break;
                const d = Math.min(Number(b.qty), rem);
                await db.execute({ sql: 'UPDATE ingredient_batches SET qty = qty - ? WHERE id = ?', args: [d, b.id] });
                rem -= d;
              }
              await db.execute({ sql: 'UPDATE ingredients SET stock = stock - ? WHERE id = ?', args: [body.qty, body.ingredient_id] });
            }
            return res.status(200).json({ success: true });
          }
        }
        break;
    }

    return res.status(404).json({ error: 'Inventory Endpoint Not found' });
  } catch (error: any) {
    console.error('Inventory API Error:', error);
    let message = error.message;
    if (error.message?.includes('write operations are forbidden')) {
      message = 'Database is in Read-Only mode. Please check your TURSO_AUTH_TOKEN in Vercel settings.';
    }
    return res.status(500).json({ error: message });
  }
}
