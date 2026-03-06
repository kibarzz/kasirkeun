import db from '../src/db';

export const runtime = 'edge';

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const id = pathParts[2]; // :id
  const action = pathParts[3]; // 'void'

  try {
    if (req.method === 'POST') {
      if (id && action === 'void') {
        const txRes = await db.execute({
          sql: 'SELECT * FROM transactions WHERE id = ?',
          args: [id]
        });
        const tx = txRes.rows[0];
        
        if (!tx || tx.status === 'voided') {
          return new Response(JSON.stringify({ message: 'Transaction not found or already voided' }), { status: 400 });
        }

        const itemsRes = await db.execute({
          sql: 'SELECT * FROM transaction_items WHERE transaction_id = ?',
          args: [id]
        });
        const items = itemsRes.rows;
        
        // Mark as voided
        await db.execute({
          sql: "UPDATE transactions SET status = 'voided' WHERE id = ?",
          args: [id]
        });
        
        // Return stock using transaction_item_batches
        for (const item of items) {
          const itemBatchesRes = await db.execute({
            sql: 'SELECT * FROM transaction_item_batches WHERE transaction_item_id = ?',
            args: [item.id]
          });
          const itemBatches = itemBatchesRes.rows;
          for (const ib of itemBatches) {
            await db.execute({
              sql: 'UPDATE ingredient_batches SET qty = qty + ? WHERE id = ?',
              args: [ib.qty, ib.batch_id]
            });
          }
          
          const recipeItemsRes = await db.execute({
            sql: 'SELECT r.ingredient_id, r.qty, r.adjustment_factor FROM recipes r WHERE r.product_variant_id = ?',
            args: [item.product_variant_id]
          });
          const recipeItems = recipeItemsRes.rows;
          for (const rItem of recipeItems) {
            const totalAddition = Number(rItem.qty) * Number(item.qty) * Number(rItem.adjustment_factor);
            await db.execute({
              sql: 'UPDATE ingredients SET stock = stock + ? WHERE id = ?',
              args: [totalAddition, rItem.ingredient_id]
            });
          }
        }
        
        // Revert loyalty if applicable
        if (tx.customer_id && tx.type === 'paid') {
          await db.execute({
            sql: 'UPDATE customers SET loyalty_visits = loyalty_visits - 1, total_visits = total_visits - 1 WHERE id = ?',
            args: [tx.customer_id]
          });
        }
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      // Regular transaction creation
      const { customer_id, user_id, total_amount, tax_amount, discount_amount, final_amount, payment_method, channel, type, items, redeem_loyalty, payment_proof_url, applied_promotion_ids } = await req.json();
      
      const info = await db.execute({
        sql: 'INSERT INTO transactions (customer_id, user_id, total_amount, tax_amount, discount_amount, final_amount, payment_method, channel, type, status, payment_proof_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: [customer_id, user_id, total_amount, tax_amount, discount_amount, final_amount, payment_method, channel, type, 'completed', payment_proof_url || null]
      });
      const txId = Number(info.lastInsertRowid);
      
      for (const item of items) {
        let hppSnapshot = 0;
        const recipeItemsRes = await db.execute({
          sql: 'SELECT r.ingredient_id, r.qty, r.adjustment_factor FROM recipes r WHERE r.product_variant_id = ?',
          args: [item.product_variant_id]
        });
        const recipeItems = recipeItemsRes.rows;
        
        const itemInfo = await db.execute({
          sql: 'INSERT INTO transaction_items (transaction_id, product_variant_id, qty, unit_price, hpp_snapshot) VALUES (?, ?, ?, ?, ?)',
          args: [txId, item.product_variant_id, item.qty, item.unit_price, 0]
        });
        const transactionItemId = Number(itemInfo.lastInsertRowid);

        for (const rItem of recipeItems) {
          const totalDeduction = Number(rItem.qty) * item.qty * Number(rItem.adjustment_factor);
          
          let remainingToDeduct = totalDeduction;
          let ingredientCost = 0;
          const batchesRes = await db.execute({
            sql: 'SELECT * FROM ingredient_batches WHERE ingredient_id = ? AND qty > 0 ORDER BY purchase_date ASC',
            args: [rItem.ingredient_id]
          });
          const batches = batchesRes.rows;
          
          for (const batch of batches) {
            if (remainingToDeduct <= 0) break;
            const deduct = Math.min(Number(batch.qty), remainingToDeduct);
            await db.execute({
              sql: 'UPDATE ingredient_batches SET qty = qty - ? WHERE id = ?',
              args: [deduct, batch.id]
            });
            await db.execute({
              sql: 'INSERT INTO transaction_item_batches (transaction_item_id, batch_id, qty, unit_cost) VALUES (?, ?, ?, ?)',
              args: [transactionItemId, batch.id, deduct, batch.unit_cost]
            });
            ingredientCost += deduct * Number(batch.unit_cost);
            remainingToDeduct -= deduct;
          }
          
          if (remainingToDeduct > 0) {
            const ingRes = await db.execute({
              sql: 'SELECT unit_cost FROM ingredients WHERE id = ?',
              args: [rItem.ingredient_id]
            });
            const ing = ingRes.rows[0];
            ingredientCost += remainingToDeduct * (Number(ing?.unit_cost) || 0);
          }
          
          hppSnapshot += ingredientCost;
          await db.execute({
            sql: 'UPDATE ingredients SET stock = stock - ? WHERE id = ?',
            args: [totalDeduction, rItem.ingredient_id]
          });
        }

        await db.execute({
          sql: 'UPDATE transaction_items SET hpp_snapshot = ? WHERE id = ?',
          args: [hppSnapshot / item.qty, transactionItemId]
        });
      }
      
      if (customer_id && type === 'paid') {
        if (redeem_loyalty) {
          await db.execute({
            sql: 'UPDATE customers SET loyalty_visits = loyalty_visits - 10 + 1, total_visits = total_visits + 1 WHERE id = ?',
            args: [customer_id]
          });
        } else {
          await db.execute({
            sql: 'UPDATE customers SET loyalty_visits = loyalty_visits + 1, total_visits = total_visits + 1 WHERE id = ?',
            args: [customer_id]
          });
        }
      }

      if (applied_promotion_ids && applied_promotion_ids.length > 0) {
        for (const promoId of applied_promotion_ids) {
          await db.execute({
            sql: 'UPDATE promotions SET redemption_count = redemption_count + 1 WHERE id = ?',
            args: [promoId]
          });
        }
      }
      
      return new Response(JSON.stringify({ id: txId }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  } catch (error: any) {
    console.error('Error processing transaction:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
