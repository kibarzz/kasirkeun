import db from '../src/db';

export const runtime = 'edge';

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const id = pathParts.length > 2 ? pathParts[2] : null;

  try {
    if (req.method === 'GET') {
      const productsRes = await db.execute('SELECT * FROM products');
      const variantsRes = await db.execute('SELECT * FROM product_variants');
      const recipesRes = await db.execute('SELECT * FROM recipes');
      return new Response(JSON.stringify({ products: productsRes.rows, variants: variantsRes.rows, recipes: recipesRes.rows }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (req.method === 'POST') {
      const { name, category, image_url, variants } = await req.json();
      const info = await db.execute({
        sql: 'INSERT INTO products (name, category, image_url) VALUES (?, ?, ?)',
        args: [name, category, image_url || null]
      });
      const productId = Number(info.lastInsertRowid);
      
      if (variants && variants.length > 0) {
        for (const variant of variants) {
          const vInfo = await db.execute({
            sql: 'INSERT INTO product_variants (product_id, name, dine_in_price, online_price, dine_in_discount, online_discount) VALUES (?, ?, ?, ?, ?, ?)',
            args: [productId, variant.name, variant.dine_in_price || 0, variant.online_price || 0, variant.dine_in_discount || 0, variant.online_discount || 0]
          });
          const variantId = Number(vInfo.lastInsertRowid);
          
          if (variant.recipe) {
            for (const item of variant.recipe) {
              await db.execute({
                sql: 'INSERT INTO recipes (product_variant_id, ingredient_id, qty, adjustment_factor) VALUES (?, ?, ?, ?)',
                args: [variantId, item.ingredient_id, item.qty, item.adjustment_factor || 1.0]
              });
            }
          }
        }
      }
      return new Response(JSON.stringify({ id: productId }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (req.method === 'PUT' && id) {
      const { name, category, image_url } = await req.json();
      await db.execute({
        sql: 'UPDATE products SET name = ?, category = ?, image_url = ? WHERE id = ?',
        args: [name, category, image_url || null, id]
      });
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (req.method === 'DELETE' && id) {
      const variantsRes = await db.execute({
        sql: 'SELECT id FROM product_variants WHERE product_id = ?',
        args: [id]
      });
      const variants = variantsRes.rows;
      
      const batch = [];
      for (const v of variants) {
        batch.push({
          sql: 'DELETE FROM recipes WHERE product_variant_id = ?',
          args: [v.id]
        });
      }
      batch.push({
        sql: 'DELETE FROM product_variants WHERE product_id = ?',
        args: [id]
      });
      batch.push({
        sql: 'DELETE FROM products WHERE id = ?',
        args: [id]
      });
      
      await db.batch(batch, 'write');
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
