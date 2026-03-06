import db from '../src/db';

export const runtime = 'edge';

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const subPath = pathParts[2]; // 'summary'

  try {
    if (req.method === 'GET' && subPath === 'summary') {
      const today = new Date().toISOString().split('T')[0];
      const summaryRes = await db.execute({
        sql: `
          SELECT 
            COUNT(*) as total_transactions,
            SUM(final_amount) as total_revenue,
            SUM(CASE WHEN payment_method LIKE '%Cash%' THEN final_amount ELSE 0 END) as cash_revenue,
            SUM(CASE WHEN payment_method LIKE '%QRIS%' THEN final_amount ELSE 0 END) as qris_revenue
          FROM transactions 
          WHERE date(created_at) = ? AND type = 'paid'
        `,
        args: [today]
      });
      return new Response(JSON.stringify(summaryRes.rows[0]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
