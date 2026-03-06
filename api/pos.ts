import db from '../src/db.js';

export default async function handler(req: any, res: any) {
  const method = req.method?.toUpperCase();
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const endpoint = pathParts[1]; // 'products', 'transactions', etc.
  const id = pathParts[2];
  const action = pathParts[3];

  console.log(`API Request: ${method} ${url.pathname}`);
  
  // Manual body parsing fallback
  if (method === 'POST' && typeof req.body === 'string' && req.body.length > 0) {
    try {
      req.body = JSON.parse(req.body);
    } catch (e) {
      console.error('Failed to parse body:', e);
    }
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
        return res.status(200).json(result.rows[0]);
      }
      const result = await db.execute(`SELECT * FROM ${table}`);
      return res.status(200).json(result.rows);
    }
    
    if (method === 'POST') {
      const body = req.body;
      const keys = Object.keys(body);
      const values = Object.values(body);
      const placeholders = keys.map(() => '?').join(', ');
      const info = await db.execute({
        sql: `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`,
        args: values
      });
      return res.status(200).json({ id: Number(info.lastInsertRowid) });
    }

    if (method === 'PUT' && id) {
      const body = req.body;
      const keys = Object.keys(body);
      const values = Object.values(body);
      const setClause = keys.map(k => `${k} = ?`).join(', ');
      await db.execute({
        sql: `UPDATE ${table} SET ${setClause} WHERE id = ?`,
        args: [...values, id]
      });
      return res.status(200).json({ success: true });
    }

    if (method === 'DELETE' && id) {
      await db.execute({ sql: `DELETE FROM ${table} WHERE id = ?`, args: [id] });
      return res.status(200).json({ success: true });
    }
    
    return res.status(405).json({ error: `Method ${method} not allowed for ${table}` });
  };

  try {
    switch (endpoint) {
      case 'products':
        if (method === 'GET' && !id) {
          const productsRes = await db.execute('SELECT * FROM products');
          const variantsRes = await db.execute('SELECT * FROM product_variants');
          const recipesRes = await db.execute('SELECT * FROM recipes');
          return res.status(200).json({ products: productsRes.rows, variants: variantsRes.rows, recipes: recipesRes.rows });
        }
        if (method === 'POST' && !id) {
          const { name, category, image_url, variants } = req.body;
          const info = await db.execute({ sql: 'INSERT INTO products (name, category, image_url) VALUES (?, ?, ?)', args: [name, category, image_url] });
          const productId = Number(info.lastInsertRowid);
          for (const v of variants) {
            await db.execute({
              sql: 'INSERT INTO product_variants (product_id, name, dine_in_price, online_price, dine_in_discount, online_discount) VALUES (?, ?, ?, ?, ?, ?)',
              args: [productId, v.name, v.dine_in_price, v.online_price, v.dine_in_discount, v.online_discount]
            });
          }
          return res.status(200).json({ id: productId });
        }
        return handleCRUD('products');

      case 'transactions':
        if (method === 'POST') {
          if (id && action === 'void') {
            const txRes = await db.execute({ sql: 'SELECT * FROM transactions WHERE id = ?', args: [id] });
            const tx = txRes.rows[0];
            if (!tx || tx.status === 'voided') return res.status(400).json({ message: 'Invalid transaction' });
            
            const itemsRes = await db.execute({ sql: 'SELECT * FROM transaction_items WHERE transaction_id = ?', args: [id] });
            await db.execute({ sql: "UPDATE transactions SET status = 'voided' WHERE id = ?", args: [id] });
            
            for (const item of itemsRes.rows) {
              const itemBatchesRes = await db.execute({ sql: 'SELECT * FROM transaction_item_batches WHERE transaction_item_id = ?', args: [item.id] });
              for (const ib of itemBatchesRes.rows) {
                await db.execute({ sql: 'UPDATE ingredient_batches SET qty = qty + ? WHERE id = ?', args: [ib.qty, ib.batch_id] });
              }
              const recipeItemsRes = await db.execute({ sql: 'SELECT ingredient_id, qty, adjustment_factor FROM recipes WHERE product_variant_id = ?', args: [item.product_variant_id] });
              for (const rItem of recipeItemsRes.rows) {
                await db.execute({ sql: 'UPDATE ingredients SET stock = stock + ? WHERE id = ?', args: [Number(rItem.qty) * Number(item.qty) * Number(rItem.adjustment_factor), rItem.ingredient_id] });
              }
            }
            if (tx.customer_id && tx.type === 'paid') {
              await db.execute({ sql: 'UPDATE customers SET loyalty_visits = loyalty_visits - 1, total_visits = total_visits - 1 WHERE id = ?', args: [tx.customer_id] });
            }
            return res.status(200).json({ success: true });
          }

          const body = req.body;
          const info = await db.execute({
            sql: 'INSERT INTO transactions (customer_id, user_id, total_amount, tax_amount, discount_amount, final_amount, payment_method, channel, type, status, payment_proof_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            args: [body.customer_id, body.user_id, body.total_amount, body.tax_amount, body.discount_amount, body.final_amount, body.payment_method, body.channel, body.type, 'completed', body.payment_proof_url || null]
          });
          const txId = Number(info.lastInsertRowid);
          
          for (const item of body.items) {
            let hppSnapshot = 0;
            const recipeItemsRes = await db.execute({ sql: 'SELECT ingredient_id, qty, adjustment_factor FROM recipes WHERE product_variant_id = ?', args: [item.product_variant_id] });
            const itemInfo = await db.execute({ sql: 'INSERT INTO transaction_items (transaction_id, product_variant_id, qty, unit_price, hpp_snapshot) VALUES (?, ?, ?, ?, ?)', args: [txId, item.product_variant_id, item.qty, item.unit_price, 0] });
            const transactionItemId = Number(itemInfo.lastInsertRowid);

            for (const rItem of recipeItemsRes.rows) {
              const totalDeduction = Number(rItem.qty) * item.qty * Number(rItem.adjustment_factor);
              let remainingToDeduct = totalDeduction;
              let ingredientCost = 0;
              const batchesRes = await db.execute({ sql: 'SELECT * FROM ingredient_batches WHERE ingredient_id = ? AND qty > 0 ORDER BY purchase_date ASC', args: [rItem.ingredient_id] });
              
              for (const batch of batchesRes.rows) {
                if (remainingToDeduct <= 0) break;
                const deduct = Math.min(Number(batch.qty), remainingToDeduct);
                await db.execute({ sql: 'UPDATE ingredient_batches SET qty = qty - ? WHERE id = ?', args: [deduct, batch.id] });
                await db.execute({ sql: 'INSERT INTO transaction_item_batches (transaction_item_id, batch_id, qty, unit_cost) VALUES (?, ?, ?, ?)', args: [transactionItemId, batch.id, deduct, batch.unit_cost] });
                ingredientCost += deduct * Number(batch.unit_cost);
                remainingToDeduct -= deduct;
              }
              if (remainingToDeduct > 0) {
                const ingRes = await db.execute({ sql: 'SELECT unit_cost FROM ingredients WHERE id = ?', args: [rItem.ingredient_id] });
                ingredientCost += remainingToDeduct * (Number(ingRes.rows[0]?.unit_cost) || 0);
              }
              hppSnapshot += ingredientCost;
              await db.execute({ sql: 'UPDATE ingredients SET stock = stock - ? WHERE id = ?', args: [totalDeduction, rItem.ingredient_id] });
            }
            await db.execute({ sql: 'UPDATE transaction_items SET hpp_snapshot = ? WHERE id = ?', args: [hppSnapshot / item.qty, transactionItemId] });
          }
          if (body.customer_id && body.type === 'paid') {
            const loyaltyChange = body.redeem_loyalty ? -9 : 1;
            await db.execute({ sql: 'UPDATE customers SET loyalty_visits = loyalty_visits + ?, total_visits = total_visits + 1 WHERE id = ?', args: [loyaltyChange, body.customer_id] });
          }
          if (body.applied_promotion_ids) {
            for (const pId of body.applied_promotion_ids) await db.execute({ sql: 'UPDATE promotions SET redemption_count = redemption_count + 1 WHERE id = ?', args: [pId] });
          }
          return res.status(200).json({ id: txId });
        }
        return handleCRUD('transactions');

      case 'customers':
        if (id === 'search') {
          const q = url.searchParams.get('q') || '';
          const res_cust = await db.execute({ sql: "SELECT * FROM customers WHERE name LIKE ? OR phone LIKE ?", args: [`%${q}%`, `%${q}%`] });
          return res.status(200).json(res_cust.rows);
        }
        return handleCRUD('customers');

      case 'variants': return handleCRUD('product_variants');
      case 'recipes': return handleCRUD('recipes');
      case 'promotions': return handleCRUD('promotions');
    }

    return res.status(404).json({ error: 'POS Endpoint Not found' });
  } catch (error: any) {
    console.error('POS API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
