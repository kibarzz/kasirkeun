export const runtime = 'edge'; // Tambahkan baris ini di paling atas!
import express from 'express';
import { createServer as createViteServer } from 'vite';
import db, { initDB } from './src/db.js';
import path from 'path';
import fs from 'fs';
import multer from 'multer';

const upload = multer({ dest: 'uploads/' });

async function startServer() {
  await initDB();
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use('/uploads', express.static('uploads'));

  // Backup Database Endpoint
  app.get('/api/backup', (req, res) => {
    const dbPath = path.resolve('cafe.db');
    if (fs.existsSync(dbPath)) {
      res.download(dbPath, `cafe_backup_${new Date().toISOString().split('T')[0]}.db`);
    } else {
      res.status(404).json({ message: 'Database file not found' });
    }
  });

  // Upload Payment Proof Endpoint
  app.post('/api/upload-payment', upload.single('proof'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    res.json({ url: `/uploads/${req.file.filename}` });
  });

  // Upload Product Image Endpoint
  app.post('/api/upload-product-image', upload.single('image'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    res.json({ url: `/uploads/${req.file.filename}` });
  });

  // Insert default user if none exists (Moved to initDB)

  // Seed dummy data if ingredients are empty
  const ingredientCountRes = await db.execute('SELECT COUNT(*) as count FROM ingredients');
  const ingredientCount = Number(ingredientCountRes.rows[0].count);
  if (ingredientCount === 0) {
    const coffeeIdRes = await db.execute({
      sql: 'INSERT INTO ingredients (name, unit, stock, min_stock, unit_cost) VALUES (?, ?, ?, ?, ?)',
      args: ['Biji Kopi Arabica', 'g', 5000, 1000, 150]
    });
    const coffeeId = Number(coffeeIdRes.lastInsertRowid);
    await db.execute({
      sql: 'INSERT INTO ingredient_batches (ingredient_id, qty, unit_cost) VALUES (?, ?, ?)',
      args: [coffeeId, 5000, 150]
    });
    
    const milkIdRes = await db.execute({
      sql: 'INSERT INTO ingredients (name, unit, stock, min_stock, unit_cost) VALUES (?, ?, ?, ?, ?)',
      args: ['Susu UHT', 'ml', 10000, 2000, 20]
    });
    const milkId = Number(milkIdRes.lastInsertRowid);
    await db.execute({
      sql: 'INSERT INTO ingredient_batches (ingredient_id, qty, unit_cost) VALUES (?, ?, ?)',
      args: [milkId, 10000, 20]
    });
    
    const syrupIdRes = await db.execute({
      sql: 'INSERT INTO ingredients (name, unit, stock, min_stock, unit_cost) VALUES (?, ?, ?, ?, ?)',
      args: ['Butterscotch Syrup', 'ml', 2000, 500, 50]
    });
    const syrupId = Number(syrupIdRes.lastInsertRowid);
    await db.execute({
      sql: 'INSERT INTO ingredient_batches (ingredient_id, qty, unit_cost) VALUES (?, ?, ?)',
      args: [syrupId, 2000, 50]
    });
    
    const cupIdRes = await db.execute({
      sql: 'INSERT INTO ingredients (name, unit, stock, min_stock, unit_cost) VALUES (?, ?, ?, ?, ?)',
      args: ['Cup Plastik 16oz', 'pcs', 500, 100, 1500]
    });
    const cupId = Number(cupIdRes.lastInsertRowid);
    await db.execute({
      sql: 'INSERT INTO ingredient_batches (ingredient_id, qty, unit_cost) VALUES (?, ?, ?)',
      args: [cupId, 500, 1500]
    });

    // Product 1: Butterscotch Latte
    const p1IdRes = await db.execute({
      sql: 'INSERT INTO products (name, category, base_price) VALUES (?, ?, ?)',
      args: ['Butterscotch Latte', 'Coffee', 25000]
    });
    const p1Id = Number(p1IdRes.lastInsertRowid);
    
    const p1v1IdRes = await db.execute({
      sql: 'INSERT INTO product_variants (product_id, name, price_modifier) VALUES (?, ?, ?)',
      args: [p1Id, 'Regular', 0]
    });
    const p1v1Id = Number(p1v1IdRes.lastInsertRowid);
    await db.execute({ sql: 'INSERT INTO recipes (product_variant_id, ingredient_id, qty, adjustment_factor) VALUES (?, ?, ?, ?)', args: [p1v1Id, coffeeId, 18, 1.05] });
    await db.execute({ sql: 'INSERT INTO recipes (product_variant_id, ingredient_id, qty, adjustment_factor) VALUES (?, ?, ?, ?)', args: [p1v1Id, milkId, 150, 1.02] });
    await db.execute({ sql: 'INSERT INTO recipes (product_variant_id, ingredient_id, qty, adjustment_factor) VALUES (?, ?, ?, ?)', args: [p1v1Id, syrupId, 20, 1.05] });
    await db.execute({ sql: 'INSERT INTO recipes (product_variant_id, ingredient_id, qty, adjustment_factor) VALUES (?, ?, ?, ?)', args: [p1v1Id, cupId, 1, 1.0] });

    const p1v2IdRes = await db.execute({
      sql: 'INSERT INTO product_variants (product_id, name, price_modifier) VALUES (?, ?, ?)',
      args: [p1Id, 'Large', 5000]
    });
    const p1v2Id = Number(p1v2IdRes.lastInsertRowid);
    await db.execute({ sql: 'INSERT INTO recipes (product_variant_id, ingredient_id, qty, adjustment_factor) VALUES (?, ?, ?, ?)', args: [p1v2Id, coffeeId, 22, 1.05] });
    await db.execute({ sql: 'INSERT INTO recipes (product_variant_id, ingredient_id, qty, adjustment_factor) VALUES (?, ?, ?, ?)', args: [p1v2Id, milkId, 200, 1.02] });
    await db.execute({ sql: 'INSERT INTO recipes (product_variant_id, ingredient_id, qty, adjustment_factor) VALUES (?, ?, ?, ?)', args: [p1v2Id, syrupId, 30, 1.05] });
    await db.execute({ sql: 'INSERT INTO recipes (product_variant_id, ingredient_id, qty, adjustment_factor) VALUES (?, ?, ?, ?)', args: [p1v2Id, cupId, 1, 1.0] });

    // Product 2: Americano
    const p2IdRes = await db.execute({
      sql: 'INSERT INTO products (name, category, base_price) VALUES (?, ?, ?)',
      args: ['Americano', 'Coffee', 18000]
    });
    const p2Id = Number(p2IdRes.lastInsertRowid);
    const p2v1IdRes = await db.execute({
      sql: 'INSERT INTO product_variants (product_id, name, price_modifier) VALUES (?, ?, ?)',
      args: [p2Id, 'Hot', 0]
    });
    const p2v1Id = Number(p2v1IdRes.lastInsertRowid);
    await db.execute({ sql: 'INSERT INTO recipes (product_variant_id, ingredient_id, qty, adjustment_factor) VALUES (?, ?, ?, ?)', args: [p2v1Id, coffeeId, 18, 1.05] });
    await db.execute({ sql: 'INSERT INTO recipes (product_variant_id, ingredient_id, qty, adjustment_factor) VALUES (?, ?, ?, ?)', args: [p2v1Id, cupId, 1, 1.0] });

    const p2v2IdRes = await db.execute({
      sql: 'INSERT INTO product_variants (product_id, name, price_modifier) VALUES (?, ?, ?)',
      args: [p2Id, 'Iced', 2000]
    });
    const p2v2Id = Number(p2v2IdRes.lastInsertRowid);
    await db.execute({ sql: 'INSERT INTO recipes (product_variant_id, ingredient_id, qty, adjustment_factor) VALUES (?, ?, ?, ?)', args: [p2v2Id, coffeeId, 18, 1.05] });
    await db.execute({ sql: 'INSERT INTO recipes (product_variant_id, ingredient_id, qty, adjustment_factor) VALUES (?, ?, ?, ?)', args: [p2v2Id, cupId, 1, 1.0] });
  }


  // API Routes
  app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const userRes = await db.execute({
      sql: 'SELECT id, username, role FROM users WHERE username = ? AND password = ?',
      args: [username, password]
    });
    const user = userRes.rows[0];
    
    if (user) {
      res.json({ success: true, user });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  });

  // Settings
  app.get('/api/settings', async (req, res) => {
    const settingsRes = await db.execute('SELECT * FROM settings');
    const settings = settingsRes.rows;
    const settingsObj = settings.reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    res.json(settingsObj);
  });

  app.post('/api/settings', async (req, res) => {
    const { key, value } = req.body;
    await db.execute({
      sql: 'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      args: [key, value]
    });
    res.json({ success: true });
  });

  // Users
  app.get('/api/users', async (req, res) => {
    const usersRes = await db.execute('SELECT id, username, role FROM users');
    res.json(usersRes.rows);
  });

  app.post('/api/users', async (req, res) => {
    const { username, password, role } = req.body;
    try {
      const info = await db.execute({
        sql: 'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
        args: [username, password, role]
      });
      res.json({ id: Number(info.lastInsertRowid) });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.put('/api/users/:id', async (req, res) => {
    const { username, password, role } = req.body;
    if (password) {
      await db.execute({
        sql: 'UPDATE users SET username = ?, password = ?, role = ? WHERE id = ?',
        args: [username, password, role, req.params.id]
      });
    } else {
      await db.execute({
        sql: 'UPDATE users SET username = ?, role = ? WHERE id = ?',
        args: [username, role, req.params.id]
      });
    }
    res.json({ success: true });
  });

  app.delete('/api/users/:id', async (req, res) => {
    await db.execute({
      sql: 'DELETE FROM users WHERE id = ?',
      args: [req.params.id]
    });
    res.json({ success: true });
  });

  app.get('/api/ingredients', async (req, res) => {
    const ingredientsRes = await db.execute('SELECT * FROM ingredients');
    res.json(ingredientsRes.rows);
  });

  app.post('/api/ingredients', async (req, res) => {
    const { name, unit, stock, min_stock, unit_cost } = req.body;
    try {
      const info = await db.execute({
        sql: 'INSERT INTO ingredients (name, unit, stock, min_stock, unit_cost) VALUES (?, ?, ?, ?, ?)',
        args: [name, unit, stock, min_stock, unit_cost]
      });
      const ingredientId = Number(info.lastInsertRowid);
      
      if (stock > 0) {
        await db.execute({
          sql: 'INSERT INTO ingredient_batches (ingredient_id, qty, unit_cost) VALUES (?, ?, ?)',
          args: [ingredientId, stock, unit_cost]
        });
      }
      res.json({ id: ingredientId });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/ingredients/:id', async (req, res) => {
    const { name, unit, stock, min_stock, unit_cost } = req.body;
    await db.execute({
      sql: 'UPDATE ingredients SET name = ?, unit = ?, stock = ?, min_stock = ?, unit_cost = ? WHERE id = ?',
      args: [name, unit, stock, min_stock, unit_cost, req.params.id]
    });
    res.json({ success: true });
  });

  app.get('/api/products', async (req, res) => {
    const productsRes = await db.execute('SELECT * FROM products');
    const variantsRes = await db.execute('SELECT * FROM product_variants');
    const recipesRes = await db.execute('SELECT * FROM recipes');
    
    res.json({ products: productsRes.rows, variants: variantsRes.rows, recipes: recipesRes.rows });
  });

  app.post('/api/products', async (req, res) => {
    const { name, category, image_url, variants } = req.body;
    
    try {
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
      res.json({ id: productId });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    const { name, category, image_url } = req.body;
    await db.execute({
      sql: 'UPDATE products SET name = ?, category = ?, image_url = ? WHERE id = ?',
      args: [name, category, image_url || null, id]
    });
    res.json({ success: true });
  });

  app.delete('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    try {
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
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting product:', error);
      res.status(500).json({ error: 'Failed to delete product' });
    }
  });

  app.put('/api/variants/:id', async (req, res) => {
    const { id } = req.params;
    const { name, dine_in_price, online_price, dine_in_discount, online_discount } = req.body;
    try {
      await db.execute({
        sql: 'UPDATE product_variants SET name = ?, dine_in_price = ?, online_price = ?, dine_in_discount = ?, online_discount = ? WHERE id = ?',
        args: [name, dine_in_price, online_price, dine_in_discount || 0, online_discount || 0, id]
      });
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating variant:', error);
      res.status(500).json({ error: 'Failed to update variant' });
    }
  });

  app.post('/api/recipes', async (req, res) => {
    const { product_variant_id, ingredient_id, qty, adjustment_factor } = req.body;
    const info = await db.execute({
      sql: 'INSERT INTO recipes (product_variant_id, ingredient_id, qty, adjustment_factor) VALUES (?, ?, ?, ?)',
      args: [product_variant_id, ingredient_id, qty, adjustment_factor || 1.0]
    });
    res.json({ id: Number(info.lastInsertRowid) });
  });

  app.get('/api/customers', async (req, res) => {
    const customersRes = await db.execute('SELECT * FROM customers');
    res.json(customersRes.rows);
  });

  app.post('/api/customers', async (req, res) => {
    const { name, phone, preferences } = req.body;
    const info = await db.execute({
      sql: 'INSERT INTO customers (name, phone, preferences) VALUES (?, ?, ?)',
      args: [name, phone, preferences]
    });
    res.json({ id: Number(info.lastInsertRowid) });
  });

  app.put('/api/customers/:id', async (req, res) => {
    const { name, phone, preferences } = req.body;
    await db.execute({
      sql: 'UPDATE customers SET name = ?, phone = ?, preferences = ? WHERE id = ?',
      args: [name, phone, preferences, req.params.id]
    });
    res.json({ success: true });
  });

  app.get('/api/customers/search', async (req, res) => {
    const q = req.query.q as string;
    if (!q) return res.json([]);
    const customersRes = await db.execute({
      sql: 'SELECT * FROM customers WHERE name LIKE ? OR phone LIKE ? LIMIT 10',
      args: [`%${q}%`, `%${q}%`]
    });
    res.json(customersRes.rows);
  });

  app.get('/api/customers/:id/history', async (req, res) => {
    const customerId = req.params.id;
    try {
      const transactionsRes = await db.execute({
        sql: `
          SELECT t.id, t.total_amount, t.created_at, u.username as cashier
          FROM transactions t
          LEFT JOIN users u ON t.user_id = u.id
          WHERE t.customer_id = ?
          ORDER BY t.created_at DESC
        `,
        args: [customerId]
      });
      const transactions = transactionsRes.rows;

      const itemsRes = await db.execute({
        sql: `
          SELECT ti.transaction_id, pv.name as product_name, ti.qty, ti.unit_price
          FROM transaction_items ti
          JOIN product_variants pv ON ti.product_variant_id = pv.id
          WHERE ti.transaction_id IN (SELECT id FROM transactions WHERE customer_id = ?)
        `,
        args: [customerId]
      });
      const items = itemsRes.rows;

      const history = transactions.map(t => ({
        ...t,
        items: items.filter(i => i.transaction_id === t.id)
      }));

      res.json(history);
    } catch (error) {
      console.error('Error fetching customer history:', error);
      res.status(500).json({ error: 'Failed to fetch customer history' });
    }
  });

  app.get('/api/overhead', async (req, res) => {
    try {
      const costsRes = await db.execute('SELECT * FROM overhead_costs ORDER BY id DESC');
      res.json(costsRes.rows);
    } catch (error) {
      console.error('Error fetching overhead costs:', error);
      res.status(500).json({ error: 'Failed to fetch overhead costs' });
    }
  });

  app.post('/api/overhead', async (req, res) => {
    try {
      const { name, type, amount, period } = req.body;
      const info = await db.execute({
        sql: 'INSERT INTO overhead_costs (name, type, amount, period) VALUES (?, ?, ?, ?)',
        args: [name, type, amount, period]
      });
      res.json({ id: Number(info.lastInsertRowid) });
    } catch (error) {
      console.error('Error adding overhead cost:', error);
      res.status(500).json({ error: 'Failed to add overhead cost' });
    }
  });

  app.delete('/api/overhead/:id', async (req, res) => {
    try {
      await db.execute({
        sql: 'DELETE FROM overhead_costs WHERE id = ?',
        args: [req.params.id]
      });
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting overhead cost:', error);
      res.status(500).json({ error: 'Failed to delete overhead cost' });
    }
  });

  app.get('/api/shift/summary', async (req, res) => {
    try {
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
      res.json(summaryRes.rows[0]);
    } catch (error) {
      console.error('Error fetching shift summary:', error);
      res.status(500).json({ error: 'Failed to fetch shift summary' });
    }
  });

  app.post('/api/transactions', async (req, res) => {
    const { customer_id, user_id, total_amount, tax_amount, discount_amount, final_amount, payment_method, channel, type, items, redeem_loyalty, payment_proof_url, applied_promotion_ids } = req.body;
    
    try {
      const info = await db.execute({
        sql: 'INSERT INTO transactions (customer_id, user_id, total_amount, tax_amount, discount_amount, final_amount, payment_method, channel, type, status, payment_proof_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: [customer_id, user_id, total_amount, tax_amount, discount_amount, final_amount, payment_method, channel, type, 'completed', payment_proof_url || null]
      });
      const txId = Number(info.lastInsertRowid);
      
      for (const item of items) {
        // Calculate HPP snapshot for this item using FIFO
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
          
          // FIFO Deduction Logic
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

        // Update the HPP snapshot with the calculated value
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

      // Increment redemption count for applied promotions
      if (applied_promotion_ids && applied_promotion_ids.length > 0) {
        for (const promoId of applied_promotion_ids) {
          await db.execute({
            sql: 'UPDATE promotions SET redemption_count = redemption_count + 1 WHERE id = ?',
            args: [promoId]
          });
        }
      }
      
      res.json({ id: txId });
    } catch (e: any) {
      console.error('Error processing transaction:', e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/transactions/:id/void', async (req, res) => {
    const txId = req.params.id;
    const txRes = await db.execute({
      sql: 'SELECT * FROM transactions WHERE id = ?',
      args: [txId]
    });
    const tx = txRes.rows[0];
    
    if (!tx || tx.status === 'voided') {
      return res.status(400).json({ message: 'Transaction not found or already voided' });
    }

    const itemsRes = await db.execute({
      sql: 'SELECT * FROM transaction_items WHERE transaction_id = ?',
      args: [txId]
    });
    const items = itemsRes.rows;
    
    try {
      // Mark as voided
      await db.execute({
        sql: "UPDATE transactions SET status = 'voided' WHERE id = ?",
        args: [txId]
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
      res.json({ success: true });
    } catch (e: any) {
      console.error('Error voiding transaction:', e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/dashboard', async (req, res) => {
    try {
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
      
      // Calculate HPP for today's transactions
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

      res.json({
        totalTransactions: Number(totalTx.count) || 0,
        omzet: Number(omzet.total) || 0,
        netProfit: netProfit,
        topProducts: topProductsRes.rows,
        lowStock: lowStockRes.rows,
        recentTransactions: recentTransactionsRes.rows
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
  });

  app.post('/api/waste', async (req, res) => {
    const { ingredient_id, qty, reason } = req.body;
    
    try {
      await db.execute({
        sql: 'INSERT INTO waste_logs (ingredient_id, qty, reason) VALUES (?, ?, ?)',
        args: [ingredient_id, qty, reason]
      });
      
      // FIFO Deduction for waste
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
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/opname', async (req, res) => {
    const { ingredient_id, expected_qty, actual_qty } = req.body;
    const diff = actual_qty - expected_qty;
    
    try {
      await db.execute({
        sql: 'INSERT INTO stock_opname (ingredient_id, expected_qty, actual_qty, difference) VALUES (?, ?, ?, ?)',
        args: [ingredient_id, expected_qty, actual_qty, diff]
      });
      
      if (diff < 0) {
        // FIFO Deduction for negative difference
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
        // Add to latest batch or create new batch for positive difference
        const lastBatchRes = await db.execute({
          sql: 'SELECT * FROM ingredient_batches WHERE ingredient_id = ? ORDER BY purchase_date DESC LIMIT 1',
          args: [ingredient_id]
        });
        const lastBatch = lastBatchRes.rows[0];
        if (lastBatch) {
          await db.execute({
            sql: 'UPDATE ingredient_batches SET qty = qty + ? WHERE id = ?',
            args: [diff, lastBatch.id]
          });
        } else {
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
      }
      
      await db.execute({
        sql: 'UPDATE ingredients SET stock = ? WHERE id = ?',
        args: [actual_qty, ingredient_id]
      });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/adjust-stock', async (req, res) => {
    const { ingredient_id, type, qty, reason, unit_cost } = req.body;
    
    if (!['add', 'remove'].includes(type) || qty <= 0) {
      return res.status(400).json({ message: 'Invalid adjustment parameters' });
    }

    try {
      await db.execute({
        sql: 'INSERT INTO stock_adjustments (ingredient_id, type, qty, reason) VALUES (?, ?, ?, ?)',
        args: [ingredient_id, type, qty, reason]
      });
      
      if (type === 'add') {
        await db.execute({
          sql: 'INSERT INTO ingredient_batches (ingredient_id, qty, unit_cost) VALUES (?, ?, ?)',
          args: [ingredient_id, qty, unit_cost || 0]
        });
        // Also update the master unit_cost to the latest purchase price
        if (unit_cost) {
          await db.execute({
            sql: 'UPDATE ingredients SET unit_cost = ? WHERE id = ?',
            args: [unit_cost, ingredient_id]
          });
        }
      } else {
        // FIFO Deduction
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
      }
      
      await db.execute({
        sql: `UPDATE ingredients SET stock = stock ${type === 'add' ? '+' : '-'} ? WHERE id = ?`,
        args: [qty, ingredient_id]
      });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/sales-report', async (req, res) => {
    const { startDate, endDate } = req.query;
    let query = `
      SELECT 
        DATE(t.created_at) as date,
        COUNT(t.id) as transactions,
        SUM(t.final_amount) as revenue,
        SUM((
          SELECT COALESCE(SUM(ti.qty * ti.hpp_snapshot), 0)
          FROM transaction_items ti
          WHERE ti.transaction_id = t.id
        )) as total_hpp,
        SUM(t.final_amount) - SUM((
          SELECT COALESCE(SUM(ti.qty * ti.hpp_snapshot), 0)
          FROM transaction_items ti
          WHERE ti.transaction_id = t.id
        )) as profit
      FROM transactions t
      WHERE t.type = 'paid'
    `;
    const params: any[] = [];

    if (startDate) {
      query += ` AND DATE(t.created_at) >= ?`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND DATE(t.created_at) <= ?`;
      params.push(endDate);
    }

    query += ` GROUP BY DATE(t.created_at) ORDER BY date DESC`;

    try {
      const reportRes = await db.execute({
        sql: query,
        args: params
      });
      res.json(reportRes.rows);
    } catch (error) {
      console.error('Error fetching sales report:', error);
      res.status(500).json({ error: 'Failed to fetch sales report' });
    }
  });

  // Promotions Endpoints
  app.get('/api/promotions', async (req, res) => {
    try {
      const promotionsRes = await db.execute('SELECT * FROM promotions ORDER BY created_at DESC');
      const promotions = promotionsRes.rows;
      const promosWithProducts = [];
      for (const p of promotions) {
        const productsRes = await db.execute({
          sql: 'SELECT product_id FROM promotion_products WHERE promotion_id = ?',
          args: [p.id]
        });
        promosWithProducts.push({
          ...p,
          product_ids: productsRes.rows.map((pr: any) => pr.product_id)
        });
      }
      res.json(promosWithProducts);
    } catch (error) {
      console.error('Error fetching promotions:', error);
      res.status(500).json({ error: 'Failed to fetch promotions' });
    }
  });

  app.post('/api/promotions', async (req, res) => {
    const { name, type, description, is_active, buy_qty, get_qty, fixed_price, days_of_week, start_time, end_time, discount_percent, discount_amount, start_date, end_date, product_ids } = req.body;
    try {
      const result = await db.execute({
        sql: `
          INSERT INTO promotions (name, type, description, is_active, buy_qty, get_qty, fixed_price, days_of_week, start_time, end_time, discount_percent, discount_amount, start_date, end_date)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [name, type, description, is_active ? 1 : 0, buy_qty, get_qty, fixed_price, days_of_week ? JSON.stringify(days_of_week) : null, start_time, end_time, discount_percent, discount_amount, start_date, end_date]
      });
      
      const promoId = Number(result.lastInsertRowid);
      if (product_ids && product_ids.length > 0) {
        for (const id of product_ids) {
          await db.execute({
            sql: 'INSERT INTO promotion_products (promotion_id, product_id) VALUES (?, ?)',
            args: [promoId, id]
          });
        }
      }
      res.json({ id: promoId });
    } catch (error) {
      console.error('Error creating promotion:', error);
      res.status(500).json({ error: 'Failed to create promotion' });
    }
  });

  app.put('/api/promotions/:id', async (req, res) => {
    const { id } = req.params;
    const { name, type, description, is_active, buy_qty, get_qty, fixed_price, days_of_week, start_time, end_time, discount_percent, discount_amount, start_date, end_date, product_ids } = req.body;
    try {
      await db.execute({
        sql: `
          UPDATE promotions 
          SET name = ?, type = ?, description = ?, is_active = ?, buy_qty = ?, get_qty = ?, fixed_price = ?, days_of_week = ?, start_time = ?, end_time = ?, discount_percent = ?, discount_amount = ?, start_date = ?, end_date = ?
          WHERE id = ?
        `,
        args: [name, type, description, is_active ? 1 : 0, buy_qty, get_qty, fixed_price, days_of_week ? JSON.stringify(days_of_week) : null, start_time, end_time, discount_percent, discount_amount, start_date, end_date, id]
      });
      
      await db.execute({
        sql: 'DELETE FROM promotion_products WHERE promotion_id = ?',
        args: [id]
      });
      if (product_ids && product_ids.length > 0) {
        for (const pid of product_ids) {
          await db.execute({
            sql: 'INSERT INTO promotion_products (promotion_id, product_id) VALUES (?, ?)',
            args: [id, pid]
          });
        }
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating promotion:', error);
      res.status(500).json({ error: 'Failed to update promotion' });
    }
  });

  app.delete('/api/promotions/:id', async (req, res) => {
    const { id } = req.params;
    try {
      await db.execute({
        sql: 'DELETE FROM promotion_products WHERE promotion_id = ?',
        args: [id]
      });
      await db.execute({
        sql: 'DELETE FROM promotions WHERE id = ?',
        args: [id]
      });
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting promotion:', error);
      res.status(500).json({ error: 'Failed to delete promotion' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
