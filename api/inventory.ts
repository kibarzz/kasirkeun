import db from '../src/db';

export const runtime = 'edge';

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const action = pathParts[2]; // 'waste', 'opname', 'stock-adjustments'

  try {
    if (req.method === 'POST') {
      if (action === 'waste') {
        const { ingredient_id, qty, reason } = await req.json();
        await db.execute({
          sql: 'INSERT INTO waste_logs (ingredient_id, qty, reason) VALUES (?, ?, ?)',
          args: [ingredient_id, qty, reason]
        });
        
        let remainingToDeduct = qty;
        const batchesRes = await db.execute({
          sql: 'SELECT * FROM ingredient_batches WHERE ingredient_id = ? AND qty > 0 ORDER BY purchase_date ASC',
          args: [ingredient_id]
        });
        const batches = batchesRes.rows;
        for (const batch of batches) {
          if (remainingToDeduct <= 0) break;
          const deduct = Math.min(Number(batch.qty), remainingToDeduct);
          await db.execute({
            sql: 'UPDATE ingredient_batches SET qty = qty - ? WHERE id = ?',
            args: [deduct, batch.id]
          });
          remainingToDeduct -= deduct;
        }
        
        await db.execute({
          sql: 'UPDATE ingredients SET stock = stock - ? WHERE id = ?',
          args: [qty, ingredient_id]
        });
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      if (action === 'opname') {
        const { ingredient_id, expected_qty, actual_qty } = await req.json();
        const diff = actual_qty - expected_qty;
        
        await db.execute({
          sql: 'INSERT INTO stock_opname (ingredient_id, expected_qty, actual_qty, difference) VALUES (?, ?, ?, ?)',
          args: [ingredient_id, expected_qty, actual_qty, diff]
        });
        
        if (diff < 0) {
          let remainingToDeduct = Math.abs(diff);
          const batchesRes = await db.execute({
            sql: 'SELECT * FROM ingredient_batches WHERE ingredient_id = ? AND qty > 0 ORDER BY purchase_date ASC',
            args: [ingredient_id]
          });
          const batches = batchesRes.rows;
          for (const batch of batches) {
            if (remainingToDeduct <= 0) break;
            const deduct = Math.min(Number(batch.qty), remainingToDeduct);
            await db.execute({
              sql: 'UPDATE ingredient_batches SET qty = qty - ? WHERE id = ?',
              args: [deduct, batch.id]
            });
            remainingToDeduct -= deduct;
          }
        } else if (diff > 0) {
          const ingRes = await db.execute({
            sql: 'SELECT unit_cost FROM ingredients WHERE id = ?',
            args: [ingredient_id]
          });
          const ing = ingRes.rows[0];
          await db.execute({
            sql: 'INSERT INTO ingredient_batches (ingredient_id, qty, unit_cost) VALUES (?, ?, ?)',
            args: [ingredient_id, diff, Number(ing?.unit_cost) || 0]
          });
        }
        
        await db.execute({
          sql: 'UPDATE ingredients SET stock = ? WHERE id = ?',
          args: [actual_qty, ingredient_id]
        });
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      if (action === 'stock-adjustments') {
        const { ingredient_id, type, qty, reason, unit_cost } = await req.json();
        await db.execute({
          sql: 'INSERT INTO stock_adjustments (ingredient_id, type, qty, reason) VALUES (?, ?, ?, ?)',
          args: [ingredient_id, type, qty, reason]
        });
        
        if (type === 'add') {
          await db.execute({
            sql: 'UPDATE ingredients SET stock = stock + ?, unit_cost = ? WHERE id = ?',
            args: [qty, unit_cost, ingredient_id]
          });
          await db.execute({
            sql: 'INSERT INTO ingredient_batches (ingredient_id, qty, unit_cost) VALUES (?, ?, ?)',
            args: [ingredient_id, qty, unit_cost]
          });
        } else {
          let remainingToDeduct = qty;
          const batchesRes = await db.execute({
            sql: 'SELECT * FROM ingredient_batches WHERE ingredient_id = ? AND qty > 0 ORDER BY purchase_date ASC',
            args: [ingredient_id]
          });
          const batches = batchesRes.rows;
          for (const batch of batches) {
            if (remainingToDeduct <= 0) break;
            const deduct = Math.min(Number(batch.qty), remainingToDeduct);
            await db.execute({
              sql: 'UPDATE ingredient_batches SET qty = qty - ? WHERE id = ?',
              args: [deduct, batch.id]
            });
            remainingToDeduct -= deduct;
          }
          await db.execute({
            sql: 'UPDATE ingredients SET stock = stock - ? WHERE id = ?',
            args: [qty, ingredient_id]
          });
        }
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
