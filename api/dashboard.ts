import db from '../src/db';

export const runtime = 'edge';

export default async function handler(req: Request) {
  try {
    if (req.method === 'GET') {
      const today = new Date().toISOString().split('T')[0];
      
      const totalTxRes = await db.execute({
        sql: 'SELECT COUNT(*) as count FROM transactions WHERE date(created_at) = ?',
        args: [today]
      });
      const totalTx = totalTxRes.rows[0];

      const omzetRes = await db.execute({
        sql: "SELECT SUM(final_amount) as total FROM transactions WHERE date(created_at) = ? AND type = 'paid'",
        args: [today]
      });
      const omzet = omzetRes.rows[0];
      
      const hppRes = await db.execute({
        sql: `
          SELECT SUM(ti.qty * ti.hpp_snapshot) as total_hpp
          FROM transaction_items ti
          JOIN transactions t ON ti.transaction_id = t.id
          WHERE date(t.created_at) = ? AND t.type = 'paid'
        `,
        args: [today]
      });
      const hpp = hppRes.rows[0];
      
      const netProfit = (Number(omzet.total) || 0) - (Number(hpp.total_hpp) || 0);
      
      const topProductsRes = await db.execute({
        sql: `
          SELECT p.name, SUM(ti.qty) as total_qty
          FROM transaction_items ti
          JOIN transactions t ON ti.transaction_id = t.id
          JOIN product_variants pv ON ti.product_variant_id = pv.id
          JOIN products p ON pv.product_id = p.id
          WHERE date(t.created_at) = ?
          GROUP BY p.id
          ORDER BY total_qty DESC
          LIMIT 5
        `,
        args: [today]
      });
      
      const lowStockRes = await db.execute('SELECT name, stock, min_stock FROM ingredients WHERE stock <= min_stock');
      
      const recentTransactionsRes = await db.execute(`
        SELECT id, created_at, type, payment_method, final_amount, status 
        FROM transactions 
        ORDER BY id DESC 
        LIMIT 10
      `);

      return new Response(JSON.stringify({
        totalTransactions: Number(totalTx.count) || 0,
        omzet: Number(omzet.total) || 0,
        netProfit: netProfit,
        topProducts: topProductsRes.rows,
        lowStock: lowStockRes.rows,
        recentTransactions: recentTransactionsRes.rows
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
