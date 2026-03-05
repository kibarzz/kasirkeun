import express from 'express';
import { createServer as createViteServer } from 'vite';
import db from './src/db.js';
import path from 'path';
import fs from 'fs';
import multer from 'multer';

const upload = multer({ dest: 'uploads/' });

async function startServer() {
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

  // Insert default user if none exists
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count === 0) {
    db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('admin', 'admin', 'owner');
    db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('kasir', 'kasir', 'cashier');
  }

  // Seed dummy data if ingredients are empty
  const ingredientCount = db.prepare('SELECT COUNT(*) as count FROM ingredients').get() as { count: number };
  if (ingredientCount.count === 0) {
    const insertIng = db.prepare('INSERT INTO ingredients (name, unit, stock, min_stock, unit_cost) VALUES (?, ?, ?, ?, ?)');
    const insertBatch = db.prepare('INSERT INTO ingredient_batches (ingredient_id, qty, unit_cost) VALUES (?, ?, ?)');
    
    const coffeeId = insertIng.run('Biji Kopi Arabica', 'g', 5000, 1000, 150).lastInsertRowid;
    insertBatch.run(coffeeId, 5000, 150);
    
    const milkId = insertIng.run('Susu UHT', 'ml', 10000, 2000, 20).lastInsertRowid;
    insertBatch.run(milkId, 10000, 20);
    
    const syrupId = insertIng.run('Butterscotch Syrup', 'ml', 2000, 500, 50).lastInsertRowid;
    insertBatch.run(syrupId, 2000, 50);
    
    const cupId = insertIng.run('Cup Plastik 16oz', 'pcs', 500, 100, 1500).lastInsertRowid;
    insertBatch.run(cupId, 500, 1500);

    const insertProd = db.prepare('INSERT INTO products (name, category, base_price) VALUES (?, ?, ?)');
    const insertVar = db.prepare('INSERT INTO product_variants (product_id, name, price_modifier) VALUES (?, ?, ?)');
    const insertRec = db.prepare('INSERT INTO recipes (product_variant_id, ingredient_id, qty, adjustment_factor) VALUES (?, ?, ?, ?)');

    // Product 1: Butterscotch Latte
    const p1Id = insertProd.run('Butterscotch Latte', 'Coffee', 25000).lastInsertRowid;
    
    const p1v1Id = insertVar.run(p1Id, 'Regular', 0).lastInsertRowid;
    insertRec.run(p1v1Id, coffeeId, 18, 1.05); // 5% waste
    insertRec.run(p1v1Id, milkId, 150, 1.02);
    insertRec.run(p1v1Id, syrupId, 20, 1.05);
    insertRec.run(p1v1Id, cupId, 1, 1.0);

    const p1v2Id = insertVar.run(p1Id, 'Large', 5000).lastInsertRowid;
    insertRec.run(p1v2Id, coffeeId, 22, 1.05);
    insertRec.run(p1v2Id, milkId, 200, 1.02);
    insertRec.run(p1v2Id, syrupId, 30, 1.05);
    insertRec.run(p1v2Id, cupId, 1, 1.0);

    // Product 2: Americano
    const p2Id = insertProd.run('Americano', 'Coffee', 18000).lastInsertRowid;
    const p2v1Id = insertVar.run(p2Id, 'Hot', 0).lastInsertRowid;
    insertRec.run(p2v1Id, coffeeId, 18, 1.05);
    insertRec.run(p2v1Id, cupId, 1, 1.0);

    const p2v2Id = insertVar.run(p2Id, 'Iced', 2000).lastInsertRowid;
    insertRec.run(p2v2Id, coffeeId, 18, 1.05);
    insertRec.run(p2v2Id, cupId, 1, 1.0);
  }

  // API Routes
  app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare('SELECT id, username, role FROM users WHERE username = ? AND password = ?').get(username, password);
    
    if (user) {
      res.json({ success: true, user });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  });

  // Settings
  app.get('/api/settings', (req, res) => {
    const settings = db.prepare('SELECT * FROM settings').all();
    const settingsObj = settings.reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    res.json(settingsObj);
  });

  app.post('/api/settings', (req, res) => {
    const { key, value } = req.body;
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value);
    res.json({ success: true });
  });

  // Users
  app.get('/api/users', (req, res) => {
    const users = db.prepare('SELECT id, username, role FROM users').all();
    res.json(users);
  });

  app.post('/api/users', (req, res) => {
    const { username, password, role } = req.body;
    try {
      const info = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(username, password, role);
      res.json({ id: info.lastInsertRowid });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.put('/api/users/:id', (req, res) => {
    const { username, password, role } = req.body;
    if (password) {
      db.prepare('UPDATE users SET username = ?, password = ?, role = ? WHERE id = ?').run(username, password, role, req.params.id);
    } else {
      db.prepare('UPDATE users SET username = ?, role = ? WHERE id = ?').run(username, role, req.params.id);
    }
    res.json({ success: true });
  });

  app.delete('/api/users/:id', (req, res) => {
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  app.get('/api/ingredients', (req, res) => {
    const ingredients = db.prepare('SELECT * FROM ingredients').all();
    res.json(ingredients);
  });

  app.post('/api/ingredients', (req, res) => {
    const { name, unit, stock, min_stock, unit_cost } = req.body;
    const transaction = db.transaction(() => {
      const stmt = db.prepare('INSERT INTO ingredients (name, unit, stock, min_stock, unit_cost) VALUES (?, ?, ?, ?, ?)');
      const info = stmt.run(name, unit, stock, min_stock, unit_cost);
      const ingredientId = info.lastInsertRowid;
      
      if (stock > 0) {
        db.prepare('INSERT INTO ingredient_batches (ingredient_id, qty, unit_cost) VALUES (?, ?, ?)').run(ingredientId, stock, unit_cost);
      }
      return ingredientId;
    });
    const id = transaction();
    res.json({ id });
  });

  app.put('/api/ingredients/:id', (req, res) => {
    const { name, unit, stock, min_stock, unit_cost } = req.body;
    const stmt = db.prepare('UPDATE ingredients SET name = ?, unit = ?, stock = ?, min_stock = ?, unit_cost = ? WHERE id = ?');
    stmt.run(name, unit, stock, min_stock, unit_cost, req.params.id);
    res.json({ success: true });
  });

  app.get('/api/products', (req, res) => {
    const products = db.prepare('SELECT * FROM products').all();
    const variants = db.prepare('SELECT * FROM product_variants').all();
    const recipes = db.prepare('SELECT * FROM recipes').all();
    
    res.json({ products, variants, recipes });
  });

  app.post('/api/products', (req, res) => {
    const { name, category, image_url, variants } = req.body;
    const insertProduct = db.prepare('INSERT INTO products (name, category, image_url) VALUES (?, ?, ?)');
    
    const transaction = db.transaction(() => {
      const info = insertProduct.run(name, category, image_url || null);
      const productId = info.lastInsertRowid;
      
      if (variants && variants.length > 0) {
        const insertVariant = db.prepare('INSERT INTO product_variants (product_id, name, dine_in_price, online_price) VALUES (?, ?, ?, ?)');
        const insertRecipe = db.prepare('INSERT INTO recipes (product_variant_id, ingredient_id, qty, adjustment_factor) VALUES (?, ?, ?, ?)');
        
        for (const variant of variants) {
          const vInfo = insertVariant.run(productId, variant.name, variant.dine_in_price || 0, variant.online_price || 0);
          const variantId = vInfo.lastInsertRowid;
          
          if (variant.recipe) {
            for (const item of variant.recipe) {
              insertRecipe.run(variantId, item.ingredient_id, item.qty, item.adjustment_factor || 1.0);
            }
          }
        }
      }
      return productId;
    });
    
    const id = transaction();
    res.json({ id });
  });

  app.put('/api/products/:id', (req, res) => {
    const { id } = req.params;
    const { name, category, image_url } = req.body;
    const updateProduct = db.prepare('UPDATE products SET name = ?, category = ?, image_url = ? WHERE id = ?');
    updateProduct.run(name, category, image_url || null, id);
    res.json({ success: true });
  });

  app.delete('/api/products/:id', (req, res) => {
    const { id } = req.params;
    try {
      const transaction = db.transaction(() => {
        const variants = db.prepare('SELECT id FROM product_variants WHERE product_id = ?').all(id) as any[];
        for (const v of variants) {
          db.prepare('DELETE FROM recipes WHERE product_variant_id = ?').run(v.id);
        }
        db.prepare('DELETE FROM product_variants WHERE product_id = ?').run(id);
        db.prepare('DELETE FROM products WHERE id = ?').run(id);
      });
      transaction();
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting product:', error);
      res.status(500).json({ error: 'Failed to delete product' });
    }
  });

  app.put('/api/variants/:id', (req, res) => {
    const { id } = req.params;
    const { name, dine_in_price, online_price } = req.body;
    try {
      db.prepare('UPDATE product_variants SET name = ?, dine_in_price = ?, online_price = ? WHERE id = ?').run(name, dine_in_price, online_price, id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating variant:', error);
      res.status(500).json({ error: 'Failed to update variant' });
    }
  });

  app.post('/api/recipes', (req, res) => {
    const { product_variant_id, ingredient_id, qty, adjustment_factor } = req.body;
    const insertRecipe = db.prepare('INSERT INTO recipes (product_variant_id, ingredient_id, qty, adjustment_factor) VALUES (?, ?, ?, ?)');
    const info = insertRecipe.run(product_variant_id, ingredient_id, qty, adjustment_factor || 1.0);
    res.json({ id: info.lastInsertRowid });
  });

  app.get('/api/customers', (req, res) => {
    const customers = db.prepare('SELECT * FROM customers').all();
    res.json(customers);
  });

  app.post('/api/customers', (req, res) => {
    const { name, phone, preferences } = req.body;
    const stmt = db.prepare('INSERT INTO customers (name, phone, preferences) VALUES (?, ?, ?)');
    const info = stmt.run(name, phone, preferences);
    res.json({ id: info.lastInsertRowid });
  });

  app.put('/api/customers/:id', (req, res) => {
    const { name, phone, preferences } = req.body;
    const stmt = db.prepare('UPDATE customers SET name = ?, phone = ?, preferences = ? WHERE id = ?');
    stmt.run(name, phone, preferences, req.params.id);
    res.json({ success: true });
  });

  app.get('/api/customers/search', (req, res) => {
    const q = req.query.q as string;
    if (!q) return res.json([]);
    const customers = db.prepare('SELECT * FROM customers WHERE name LIKE ? OR phone LIKE ? LIMIT 10').all(`%${q}%`, `%${q}%`);
    res.json(customers);
  });

  app.get('/api/customers/:id/history', (req, res) => {
    const customerId = req.params.id;
    try {
      const transactions = db.prepare(`
        SELECT t.id, t.total_amount, t.created_at, u.username as cashier
        FROM transactions t
        LEFT JOIN users u ON t.user_id = u.id
        WHERE t.customer_id = ?
        ORDER BY t.created_at DESC
      `).all(customerId);

      const items = db.prepare(`
        SELECT ti.transaction_id, pv.name as product_name, ti.qty, ti.unit_price
        FROM transaction_items ti
        JOIN product_variants pv ON ti.product_variant_id = pv.id
        WHERE ti.transaction_id IN (SELECT id FROM transactions WHERE customer_id = ?)
      `).all(customerId);

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

  app.get('/api/overhead', (req, res) => {
    try {
      const costs = db.prepare('SELECT * FROM overhead_costs ORDER BY id DESC').all();
      res.json(costs);
    } catch (error) {
      console.error('Error fetching overhead costs:', error);
      res.status(500).json({ error: 'Failed to fetch overhead costs' });
    }
  });

  app.post('/api/overhead', (req, res) => {
    try {
      const { name, type, amount, period } = req.body;
      const stmt = db.prepare('INSERT INTO overhead_costs (name, type, amount, period) VALUES (?, ?, ?, ?)');
      const info = stmt.run(name, type, amount, period);
      res.json({ id: info.lastInsertRowid });
    } catch (error) {
      console.error('Error adding overhead cost:', error);
      res.status(500).json({ error: 'Failed to add overhead cost' });
    }
  });

  app.delete('/api/overhead/:id', (req, res) => {
    try {
      const stmt = db.prepare('DELETE FROM overhead_costs WHERE id = ?');
      stmt.run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting overhead cost:', error);
      res.status(500).json({ error: 'Failed to delete overhead cost' });
    }
  });

  app.get('/api/shift/summary', (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const summary = db.prepare(`
        SELECT 
          COUNT(*) as total_transactions,
          SUM(final_amount) as total_revenue,
          SUM(CASE WHEN payment_method LIKE '%Cash%' THEN final_amount ELSE 0 END) as cash_revenue,
          SUM(CASE WHEN payment_method LIKE '%QRIS%' THEN final_amount ELSE 0 END) as qris_revenue
        FROM transactions 
        WHERE date(created_at) = ? AND type = 'paid'
      `).get(today);
      res.json(summary);
    } catch (error) {
      console.error('Error fetching shift summary:', error);
      res.status(500).json({ error: 'Failed to fetch shift summary' });
    }
  });

  app.post('/api/transactions', (req, res) => {
    const { customer_id, user_id, total_amount, tax_amount, discount_amount, final_amount, payment_method, channel, type, items, redeem_loyalty, payment_proof_url, applied_promotion_ids } = req.body;
    
    const insertTx = db.prepare('INSERT INTO transactions (customer_id, user_id, total_amount, tax_amount, discount_amount, final_amount, payment_method, channel, type, status, payment_proof_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const insertItem = db.prepare('INSERT INTO transaction_items (transaction_id, product_variant_id, qty, unit_price, hpp_snapshot) VALUES (?, ?, ?, ?, ?)');
    const insertItemBatch = db.prepare('INSERT INTO transaction_item_batches (transaction_item_id, batch_id, qty, unit_cost) VALUES (?, ?, ?, ?)');
    const updateStock = db.prepare('UPDATE ingredients SET stock = stock - ? WHERE id = ?');
    
    const transaction = db.transaction(() => {
      const info = insertTx.run(customer_id, user_id, total_amount, tax_amount, discount_amount, final_amount, payment_method, channel, type, 'completed', payment_proof_url || null);
      const txId = info.lastInsertRowid;
      
      for (const item of items) {
        // Calculate HPP snapshot for this item using FIFO
        let hppSnapshot = 0;
        const recipeItems = db.prepare('SELECT r.ingredient_id, r.qty, r.adjustment_factor FROM recipes r WHERE r.product_variant_id = ?').all(item.product_variant_id) as any[];
        
        const itemInfo = insertItem.run(txId, item.product_variant_id, item.qty, item.unit_price, 0);
        const transactionItemId = itemInfo.lastInsertRowid;

        for (const rItem of recipeItems) {
          const totalDeduction = rItem.qty * item.qty * rItem.adjustment_factor;
          
          // FIFO Deduction Logic
          let remainingToDeduct = totalDeduction;
          let ingredientCost = 0;
          const batches = db.prepare('SELECT * FROM ingredient_batches WHERE ingredient_id = ? AND qty > 0 ORDER BY purchase_date ASC').all(rItem.ingredient_id) as any[];
          
          for (const batch of batches) {
            if (remainingToDeduct <= 0) break;
            const deduct = Math.min(batch.qty, remainingToDeduct);
            db.prepare('UPDATE ingredient_batches SET qty = qty - ? WHERE id = ?').run(deduct, batch.id);
            insertItemBatch.run(transactionItemId, batch.id, deduct, batch.unit_cost);
            ingredientCost += deduct * batch.unit_cost;
            remainingToDeduct -= deduct;
          }
          
          if (remainingToDeduct > 0) {
            const ing = db.prepare('SELECT unit_cost FROM ingredients WHERE id = ?').get(rItem.ingredient_id) as any;
            ingredientCost += remainingToDeduct * (ing?.unit_cost || 0);
          }
          
          hppSnapshot += ingredientCost;
          updateStock.run(totalDeduction, rItem.ingredient_id);
        }

        // Update the HPP snapshot with the calculated value
        db.prepare('UPDATE transaction_items SET hpp_snapshot = ? WHERE id = ?').run(hppSnapshot / item.qty, transactionItemId);
      }
      
      if (customer_id && type === 'paid') {
        if (redeem_loyalty) {
          db.prepare('UPDATE customers SET loyalty_visits = loyalty_visits - 10 + 1, total_visits = total_visits + 1 WHERE id = ?').run(customer_id);
        } else {
          db.prepare('UPDATE customers SET loyalty_visits = loyalty_visits + 1, total_visits = total_visits + 1 WHERE id = ?').run(customer_id);
        }
      }

      // Increment redemption count for applied promotions
      if (applied_promotion_ids && applied_promotion_ids.length > 0) {
        const incrementRedemption = db.prepare('UPDATE promotions SET redemption_count = redemption_count + 1 WHERE id = ?');
        for (const promoId of applied_promotion_ids) {
          incrementRedemption.run(promoId);
        }
      }
      
      return txId;
    });
    
    const id = transaction();
    res.json({ id });
  });

  app.post('/api/transactions/:id/void', (req, res) => {
    const txId = req.params.id;
    const tx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(txId) as any;
    
    if (!tx || tx.status === 'voided') {
      return res.status(400).json({ message: 'Transaction not found or already voided' });
    }

    const items = db.prepare('SELECT * FROM transaction_items WHERE transaction_id = ?').all(txId) as any[];
    const updateStock = db.prepare('UPDATE ingredients SET stock = stock + ? WHERE id = ?');
    
    const transaction = db.transaction(() => {
      // Mark as voided
      db.prepare("UPDATE transactions SET status = 'voided' WHERE id = ?").run(txId);
      
      // Return stock using transaction_item_batches
      for (const item of items) {
        const itemBatches = db.prepare('SELECT * FROM transaction_item_batches WHERE transaction_item_id = ?').all(item.id) as any[];
        for (const ib of itemBatches) {
          db.prepare('UPDATE ingredient_batches SET qty = qty + ? WHERE id = ?').run(ib.qty, ib.batch_id);
        }
        
        const recipeItems = db.prepare('SELECT r.ingredient_id, r.qty, r.adjustment_factor FROM recipes r WHERE r.product_variant_id = ?').all(item.product_variant_id) as any[];
        for (const rItem of recipeItems) {
          const totalAddition = rItem.qty * item.qty * rItem.adjustment_factor;
          updateStock.run(totalAddition, rItem.ingredient_id);
        }
      }
      
      // Revert loyalty if applicable
      if (tx.customer_id && tx.type === 'paid') {
        db.prepare('UPDATE customers SET loyalty_visits = loyalty_visits - 1, total_visits = total_visits - 1 WHERE id = ?').run(tx.customer_id);
      }
    });
    
    transaction();
    res.json({ success: true });
  });

  app.get('/api/dashboard', (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const totalTx = db.prepare('SELECT COUNT(*) as count FROM transactions WHERE date(created_at) = ?').get(today) as any;
      const omzet = db.prepare("SELECT SUM(final_amount) as total FROM transactions WHERE date(created_at) = ? AND type = 'paid'").get(today) as any;
      
      // Calculate HPP for today's transactions
      const hpp = db.prepare(`
        SELECT SUM(ti.qty * ti.hpp_snapshot) as total_hpp
        FROM transaction_items ti
        JOIN transactions t ON ti.transaction_id = t.id
        WHERE date(t.created_at) = ? AND t.type = 'paid'
      `).get(today) as any;
      
      const netProfit = (omzet.total || 0) - (hpp.total_hpp || 0);
      
      const topProducts = db.prepare(`
        SELECT p.name, SUM(ti.qty) as total_qty
        FROM transaction_items ti
        JOIN transactions t ON ti.transaction_id = t.id
        JOIN product_variants pv ON ti.product_variant_id = pv.id
        JOIN products p ON pv.product_id = p.id
        WHERE date(t.created_at) = ?
        GROUP BY p.id
        ORDER BY total_qty DESC
        LIMIT 5
      `).all(today);
      
      const lowStock = db.prepare('SELECT name, stock, min_stock FROM ingredients WHERE stock <= min_stock').all();
      
      const recentTransactions = db.prepare(`
        SELECT id, created_at, type, payment_method, final_amount, status 
        FROM transactions 
        ORDER BY id DESC 
        LIMIT 10
      `).all();

      res.json({
        totalTransactions: totalTx.count || 0,
        omzet: omzet.total || 0,
        netProfit: netProfit,
        topProducts,
        lowStock,
        recentTransactions
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
  });

  app.post('/api/waste', (req, res) => {
    const { ingredient_id, qty, reason } = req.body;
    const insertWaste = db.prepare('INSERT INTO waste_logs (ingredient_id, qty, reason) VALUES (?, ?, ?)');
    const updateStock = db.prepare('UPDATE ingredients SET stock = stock - ? WHERE id = ?');
    
    const transaction = db.transaction(() => {
      insertWaste.run(ingredient_id, qty, reason);
      
      // FIFO Deduction for waste
      let remainingToDeduct = qty;
      const batches = db.prepare('SELECT * FROM ingredient_batches WHERE ingredient_id = ? AND qty > 0 ORDER BY purchase_date ASC').all(ingredient_id) as any[];
      for (const batch of batches) {
        if (remainingToDeduct <= 0) break;
        const deduct = Math.min(batch.qty, remainingToDeduct);
        db.prepare('UPDATE ingredient_batches SET qty = qty - ? WHERE id = ?').run(deduct, batch.id);
        remainingToDeduct -= deduct;
      }
      
      updateStock.run(qty, ingredient_id);
    });
    
    transaction();
    res.json({ success: true });
  });

  app.post('/api/opname', (req, res) => {
    const { ingredient_id, expected_qty, actual_qty } = req.body;
    const diff = actual_qty - expected_qty;
    
    const insertOpname = db.prepare('INSERT INTO stock_opname (ingredient_id, expected_qty, actual_qty, difference) VALUES (?, ?, ?, ?)');
    const updateStock = db.prepare('UPDATE ingredients SET stock = ? WHERE id = ?');
    
    const transaction = db.transaction(() => {
      insertOpname.run(ingredient_id, expected_qty, actual_qty, diff);
      
      if (diff < 0) {
        // FIFO Deduction for negative difference
        let remainingToDeduct = Math.abs(diff);
        const batches = db.prepare('SELECT * FROM ingredient_batches WHERE ingredient_id = ? AND qty > 0 ORDER BY purchase_date ASC').all(ingredient_id) as any[];
        for (const batch of batches) {
          if (remainingToDeduct <= 0) break;
          const deduct = Math.min(batch.qty, remainingToDeduct);
          db.prepare('UPDATE ingredient_batches SET qty = qty - ? WHERE id = ?').run(deduct, batch.id);
          remainingToDeduct -= deduct;
        }
      } else if (diff > 0) {
        // Add to latest batch or create new batch for positive difference
        const lastBatch = db.prepare('SELECT * FROM ingredient_batches WHERE ingredient_id = ? ORDER BY purchase_date DESC LIMIT 1').get(ingredient_id) as any;
        if (lastBatch) {
          db.prepare('UPDATE ingredient_batches SET qty = qty + ? WHERE id = ?').run(diff, lastBatch.id);
        } else {
          const ing = db.prepare('SELECT unit_cost FROM ingredients WHERE id = ?').get(ingredient_id) as any;
          db.prepare('INSERT INTO ingredient_batches (ingredient_id, qty, unit_cost) VALUES (?, ?, ?)').run(ingredient_id, diff, ing?.unit_cost || 0);
        }
      }
      
      updateStock.run(actual_qty, ingredient_id);
    });
    
    transaction();
    res.json({ success: true });
  });

  app.post('/api/adjust-stock', (req, res) => {
    const { ingredient_id, type, qty, reason, unit_cost } = req.body;
    
    if (!['add', 'remove'].includes(type) || qty <= 0) {
      return res.status(400).json({ message: 'Invalid adjustment parameters' });
    }

    const insertAdjustment = db.prepare('INSERT INTO stock_adjustments (ingredient_id, type, qty, reason) VALUES (?, ?, ?, ?)');
    const updateStock = db.prepare(`UPDATE ingredients SET stock = stock ${type === 'add' ? '+' : '-'} ? WHERE id = ?`);
    
    const transaction = db.transaction(() => {
      insertAdjustment.run(ingredient_id, type, qty, reason);
      
      if (type === 'add') {
        db.prepare('INSERT INTO ingredient_batches (ingredient_id, qty, unit_cost) VALUES (?, ?, ?)').run(ingredient_id, qty, unit_cost || 0);
        // Also update the master unit_cost to the latest purchase price
        if (unit_cost) {
          db.prepare('UPDATE ingredients SET unit_cost = ? WHERE id = ?').run(unit_cost, ingredient_id);
        }
      } else {
        // FIFO Deduction
        let remainingToDeduct = qty;
        const batches = db.prepare('SELECT * FROM ingredient_batches WHERE ingredient_id = ? AND qty > 0 ORDER BY purchase_date ASC').all(ingredient_id) as any[];
        for (const batch of batches) {
          if (remainingToDeduct <= 0) break;
          const deduct = Math.min(batch.qty, remainingToDeduct);
          db.prepare('UPDATE ingredient_batches SET qty = qty - ? WHERE id = ?').run(deduct, batch.id);
          remainingToDeduct -= deduct;
        }
      }
      
      updateStock.run(qty, ingredient_id);
    });
    
    transaction();
    res.json({ success: true });
  });

  app.get('/api/sales-report', (req, res) => {
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
      const report = db.prepare(query).all(...params);
      res.json(report);
    } catch (error) {
      console.error('Error fetching sales report:', error);
      res.status(500).json({ error: 'Failed to fetch sales report' });
    }
  });

  // Promotions Endpoints
  app.get('/api/promotions', (req, res) => {
    try {
      const promotions = db.prepare('SELECT * FROM promotions ORDER BY created_at DESC').all();
      const promosWithProducts = promotions.map((p: any) => {
        const products = db.prepare('SELECT product_id FROM promotion_products WHERE promotion_id = ?').all(p.id);
        return {
          ...p,
          product_ids: products.map((pr: any) => pr.product_id)
        };
      });
      res.json(promosWithProducts);
    } catch (error) {
      console.error('Error fetching promotions:', error);
      res.status(500).json({ error: 'Failed to fetch promotions' });
    }
  });

  app.post('/api/promotions', (req, res) => {
    const { name, type, description, is_active, buy_qty, get_qty, fixed_price, days_of_week, start_time, end_time, discount_percent, discount_amount, start_date, end_date, product_ids } = req.body;
    try {
      const insert = db.prepare(`
        INSERT INTO promotions (name, type, description, is_active, buy_qty, get_qty, fixed_price, days_of_week, start_time, end_time, discount_percent, discount_amount, start_date, end_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const result = insert.run(name, type, description, is_active ? 1 : 0, buy_qty, get_qty, fixed_price, days_of_week ? JSON.stringify(days_of_week) : null, start_time, end_time, discount_percent, discount_amount, start_date, end_date);
      
      if (product_ids && product_ids.length > 0) {
        const insertProduct = db.prepare('INSERT INTO promotion_products (promotion_id, product_id) VALUES (?, ?)');
        const insertMany = db.transaction((ids) => {
          for (const id of ids) {
            insertProduct.run(result.lastInsertRowid, id);
          }
        });
        insertMany(product_ids);
      }
      res.json({ id: result.lastInsertRowid });
    } catch (error) {
      console.error('Error creating promotion:', error);
      res.status(500).json({ error: 'Failed to create promotion' });
    }
  });

  app.put('/api/promotions/:id', (req, res) => {
    const { id } = req.params;
    const { name, type, description, is_active, buy_qty, get_qty, fixed_price, days_of_week, start_time, end_time, discount_percent, discount_amount, start_date, end_date, product_ids } = req.body;
    try {
      const update = db.prepare(`
        UPDATE promotions 
        SET name = ?, type = ?, description = ?, is_active = ?, buy_qty = ?, get_qty = ?, fixed_price = ?, days_of_week = ?, start_time = ?, end_time = ?, discount_percent = ?, discount_amount = ?, start_date = ?, end_date = ?
        WHERE id = ?
      `);
      update.run(name, type, description, is_active ? 1 : 0, buy_qty, get_qty, fixed_price, days_of_week ? JSON.stringify(days_of_week) : null, start_time, end_time, discount_percent, discount_amount, start_date, end_date, id);
      
      db.prepare('DELETE FROM promotion_products WHERE promotion_id = ?').run(id);
      if (product_ids && product_ids.length > 0) {
        const insertProduct = db.prepare('INSERT INTO promotion_products (promotion_id, product_id) VALUES (?, ?)');
        const insertMany = db.transaction((ids) => {
          for (const pid of ids) {
            insertProduct.run(id, pid);
          }
        });
        insertMany(product_ids);
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating promotion:', error);
      res.status(500).json({ error: 'Failed to update promotion' });
    }
  });

  app.delete('/api/promotions/:id', (req, res) => {
    const { id } = req.params;
    try {
      db.prepare('DELETE FROM promotion_products WHERE promotion_id = ?').run(id);
      db.prepare('DELETE FROM promotions WHERE id = ?').run(id);
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
