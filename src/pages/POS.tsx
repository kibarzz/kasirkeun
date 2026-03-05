import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, User, CreditCard, Banknote, Search, Plus, Minus, Trash2, Coffee, X, Gift, LogOut } from 'lucide-react';
import { clsx } from 'clsx';
import { useLanguage } from '../i18n';

export default function POS() {
  const [products, setProducts] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [channel, setChannel] = useState('Dine-in');
  const [paymentMethods, setPaymentMethods] = useState<string[]>(['Cash']);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isTaxApplied, setIsTaxApplied] = useState(true);

  // Customer Loyalty State
  const [customer, setCustomer] = useState<any>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerResults, setCustomerResults] = useState<any[]>([]);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [paymentProof, setPaymentProof] = useState<File | null>(null);

  // Shift Closing State
  const [showClosingModal, setShowClosingModal] = useState(false);
  const [shiftSummary, setShiftSummary] = useState<any>(null);
  const { t } = useLanguage();

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        setProducts(data.products || []);
        setVariants(data.variants || []);
      });
    
    fetch('/api/promotions')
      .then(res => res.json())
      .then(data => {
        setPromotions(data.filter((p: any) => p.is_active === 1));
      });
  }, []);

  useEffect(() => {
    if (customerSearch.length > 2) {
      fetch(`/api/customers/search?q=${customerSearch}`)
        .then(res => res.json())
        .then(data => setCustomerResults(data));
    } else if (customerPhone.length > 2) {
      fetch(`/api/customers/search?q=${customerPhone}`)
        .then(res => res.json())
        .then(data => setCustomerResults(data));
    } else {
      setCustomerResults([]);
    }
  }, [customerSearch, customerPhone]);

  // Update cart prices when channel changes
  useEffect(() => {
    setCart(prevCart => prevCart.map(item => {
      const variant = variants.find(v => v.id === item.variant.id);
      if (variant) {
        const newPrice = channel === 'Online' ? variant.online_price : variant.dine_in_price;
        return { ...item, price: newPrice };
      }
      return item;
    }));
  }, [channel, variants]);

  const fetchShiftSummary = async () => {
    try {
      const res = await fetch('/api/shift/summary');
      const data = await res.json();
      setShiftSummary(data);
      setShowClosingModal(true);
    } catch (error) {
      console.error('Failed to fetch shift summary', error);
    }
  };

  const handleCloseShift = () => {
    alert(t.shiftClosedSuccess);
    setShowClosingModal(false);
    // In a real app, this would call an API to mark the shift as closed and print a receipt.
  };

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];

  const filteredProducts = products
    .filter(p => 
      (selectedCategory === 'All' || p.category === selectedCategory) &&
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const aHasPromo = promotions.some(promo => promo.product_ids.includes(a.id));
      const bHasPromo = promotions.some(promo => promo.product_ids.includes(b.id));
      if (aHasPromo && !bHasPromo) return -1;
      if (!aHasPromo && bHasPromo) return 1;
      return 0;
    });

  const togglePaymentMethod = (method: string) => {
    if (method === 'Complementary') {
      setPaymentMethods(['Complementary']);
      return;
    }
    
    let newMethods = paymentMethods.filter(m => m !== 'Complementary');
    
    if (newMethods.includes(method)) {
      if (newMethods.length > 1) {
        setPaymentMethods(newMethods.filter(m => m !== method));
      }
    } else {
      setPaymentMethods([...newMethods, method]);
    }
  };

  const selectCustomer = (c: any) => {
    setCustomer(c);
    setCustomerSearch('');
    setCustomerPhone('');
    setCustomerResults([]);
    setIsRedeeming(false);
  };

  const createCustomer = async () => {
    const res = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: customerSearch, phone: customerPhone, preferences: '' })
    });
    const data = await res.json();
    selectCustomer({ id: data.id, name: customerSearch, phone: customerPhone, loyalty_visits: 0 });
  };

  const addToCart = (product: any, variant: any) => {
    const finalPrice = channel === 'Online' ? variant.online_price : variant.dine_in_price;

    const existingItem = cart.find(item => item.variant.id === variant.id);
    if (existingItem) {
      setCart(cart.map(item => 
        item.variant.id === variant.id 
          ? { ...item, qty: item.qty + 1 } 
          : item
      ));
    } else {
      setCart([...cart, { product, variant, qty: 1, price: finalPrice }]);
    }
  };

  const updateQty = (variantId: number, delta: number) => {
    setCart(prevCart => prevCart.map(item => {
      if (item.variant.id === variantId) {
        return { ...item, qty: item.qty + delta };
      }
      return item;
    }).filter(item => item.qty > 0));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  
  let discount = 0;
  // If redeeming, discount the cheapest item in the cart
  if (isRedeeming && cart.length > 0) {
    const cheapestItem = [...cart].sort((a, b) => a.price - b.price)[0];
    discount += cheapestItem.price;
  }

  // Calculate promotional discounts
  const now = new Date();
  const currentDay = now.getDay();
  const currentTime = now.toTimeString().substring(0, 5);
  const currentDate = now.toISOString().split('T')[0];

  const appliedPromotionIds: number[] = [];

  promotions.forEach(promo => {
    // Check scheduling
    if (promo.start_date && currentDate < promo.start_date) return;
    if (promo.end_date && currentDate > promo.end_date) return;

    // Check time-based / days
    const days = promo.days_of_week ? JSON.parse(promo.days_of_week) : [];
    if (days.length > 0 && !days.includes(currentDay)) return;
    if (promo.start_time && currentTime < promo.start_time) return;
    if (promo.end_time && currentTime > promo.end_time) return;

    let promoApplied = false;

    // Check percentage / time_based
    if (promo.type === 'time_based' || promo.type === 'percentage') {
      const applicableItems = cart.filter(item => promo.product_ids.includes(item.product.id));
      applicableItems.forEach(item => {
        if (promo.discount_percent) {
          discount += (item.price * item.qty) * (promo.discount_percent / 100);
          promoApplied = true;
        } else if (promo.discount_amount) {
          discount += promo.discount_amount * item.qty;
          promoApplied = true;
        }
      });
    }

    // Check bundle / buy_x_get_y / bogo
    if (promo.type === 'bundle' || promo.type === 'buy_x_get_y' || promo.type === 'fixed_price' || promo.type === 'bogo') {
      const applicableItems = cart.filter(item => promo.product_ids.includes(item.product.id));
      const totalQty = applicableItems.reduce((sum, item) => sum + item.qty, 0);
      
      const buyQty = promo.type === 'bogo' ? 1 : promo.buy_qty;
      const getQty = promo.type === 'bogo' ? 1 : promo.get_qty;

      if (buyQty && totalQty >= buyQty) {
        if (promo.type === 'fixed_price' && promo.fixed_price) {
          const bundlesCount = Math.floor(totalQty / buyQty);
          let itemsToDiscount: number[] = [];
          applicableItems.sort((a, b) => b.price - a.price).forEach(item => {
             for(let i=0; i<item.qty; i++) itemsToDiscount.push(item.price);
          });
          
          for(let i=0; i<bundlesCount; i++) {
             const bundleItems = itemsToDiscount.splice(0, buyQty);
             const bundleOriginalPrice = bundleItems.reduce((a,b)=>a+b, 0);
             discount += Math.max(0, bundleOriginalPrice - promo.fixed_price);
             promoApplied = true;
          }
        } else if (getQty) {
          const setCount = Math.floor(totalQty / (buyQty + getQty));
          if (setCount > 0) {
            let allPrices: number[] = [];
            applicableItems.forEach(item => {
              for(let i=0; i<item.qty; i++) allPrices.push(item.price);
            });
            allPrices.sort((a, b) => a - b);
            for(let i=0; i < Math.min(setCount * getQty, allPrices.length); i++) {
              discount += allPrices[i];
              promoApplied = true;
            }
          }
        }
      }
    }

    if (promoApplied) {
      appliedPromotionIds.push(promo.id);
    }
  });

  // Ensure discount doesn't exceed subtotal
  discount = Math.min(discount, subtotal);

  const taxableAmount = Math.max(0, subtotal - discount);
  const tax = isTaxApplied ? taxableAmount * 0.1 : 0; // 10% PB1
  const total = taxableAmount + tax;

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const isComplementary = paymentMethods.includes('Complementary');

    let paymentProofUrl = null;
    if (paymentProof && paymentMethods.includes('QRIS')) {
      const formData = new FormData();
      formData.append('proof', paymentProof);
      try {
        const uploadRes = await fetch('/api/upload-payment', {
          method: 'POST',
          body: formData
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          paymentProofUrl = uploadData.url;
        }
      } catch (e) {
        console.error('Failed to upload payment proof', e);
      }
    }

    const payload = {
      customer_id: customer?.id || null,
      user_id: user.id || 1, // Use logged in user
      total_amount: isComplementary ? 0 : subtotal,
      tax_amount: isComplementary ? 0 : tax,
      discount_amount: isComplementary ? subtotal : discount,
      final_amount: isComplementary ? 0 : total,
      payment_method: paymentMethods.join(', '),
      channel: channel,
      type: isComplementary ? 'complementary' : 'paid',
      redeem_loyalty: isRedeeming,
      payment_proof_url: paymentProofUrl,
      applied_promotion_ids: appliedPromotionIds,
      items: cart.map(item => ({
        product_variant_id: item.variant.id,
        qty: item.qty,
        unit_price: item.price,
        hpp_snapshot: 0 // Server will calculate this
      }))
    };

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        alert(t.transactionSuccessful);
        setCart([]);
        setCustomer(null);
        setCustomerSearch('');
        setIsRedeeming(false);
        setPaymentProof(null);
        setIsTaxApplied(true);
      }
    } catch (error) {
      console.error('Checkout failed', error);
      alert(t.checkoutFailed);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-full gap-6">
      {/* Main Product Area */}
      <div className="flex-1 flex flex-col bg-black/5 dark:bg-white/5 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-3xl p-4 lg:p-6 shadow-2xl overflow-hidden relative min-h-[500px]">
        <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />
        
        {/* Header & Search */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 relative z-10">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{t.posTitle}</h1>
            <p className="text-slate-500 dark:text-white/60 text-sm">{t.posSubtitle}</p>
          </div>
          
          <div className="flex flex-wrap gap-4 w-full md:w-auto">
            <button
              onClick={fetchShiftSummary}
              className="flex items-center gap-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              <LogOut className="w-4 h-4" />
              {t.closeShift}
            </button>
            <div className="relative flex-1 md:flex-none">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40" />
              <input 
                type="text" 
                placeholder={t.searchMenu} 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-black/10 dark:bg-white/10 border border-black/20 dark:border-white/20 text-slate-900 dark:text-white placeholder-white/40 rounded-xl pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/50 w-full md:w-64 transition-all"
              />
            </div>
            
            <div className="flex bg-black/10 dark:bg-white/10 rounded-xl p-1 border border-black/10 dark:border-white/10 w-full md:w-auto">
              {['Dine-in', 'Online'].map(c => (
                <button
                  key={c}
                  onClick={() => setChannel(c)}
                  className={clsx(
                    'flex-1 md:flex-none px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
                    channel === c ? 'bg-amber-500 text-white shadow-md' : 'text-slate-500 dark:text-white/60 hover:text-slate-900 dark:text-white'
                  )}
                >
                  {c === 'Dine-in' ? t.dineIn : t.online}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-4 relative z-10 no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={clsx(
                'px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border',
                selectedCategory === cat 
                  ? 'bg-black/20 dark:bg-white/20 text-slate-900 dark:text-white border-black/30 dark:border-white/30 shadow-lg' 
                  : 'bg-black/5 dark:bg-white/5 text-slate-500 dark:text-white/60 border-black/5 dark:border-white/5 hover:bg-black/10 dark:bg-white/10 hover:text-slate-900 dark:text-white'
              )}
            >
              {cat === 'All' ? t.all : cat}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto relative z-10 pr-2 custom-scrollbar">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map(product => {
              const productVariants = variants.filter(v => v.product_id === product.id);
              const displayPrice = productVariants.length > 0 
                ? Math.min(...productVariants.map(v => channel === 'Online' ? v.online_price : v.dine_in_price))
                : 0;
              
              return (
                <motion.div 
                  key={product.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl p-4 hover:bg-black/10 dark:bg-white/10 transition-all cursor-pointer group flex flex-col"
                >
                  <div className="w-full aspect-square rounded-xl bg-gradient-to-br from-white/5 to-white/10 mb-4 flex items-center justify-center border border-black/5 dark:border-white/5 group-hover:border-amber-500/30 transition-colors">
                    <Coffee className="w-12 h-12 text-slate-300 dark:text-white/20 group-hover:text-amber-400/50 transition-colors" />
                  </div>
                  <h3 className="text-slate-900 dark:text-white font-semibold mb-1 truncate">{product.name}</h3>
                  <p className="text-amber-400 font-mono text-sm mb-3">{formatCurrency(displayPrice)}</p>
                  
                  <div className="mt-auto flex flex-wrap gap-2">
                    {productVariants.length > 0 ? (
                      productVariants.map(v => (
                        <button
                          key={v.id}
                          onClick={() => addToCart(product, v)}
                          className="flex-1 bg-black/10 dark:bg-white/10 hover:bg-amber-500/80 text-white text-xs py-1.5 px-2 rounded-lg transition-colors border border-black/10 dark:border-white/10 text-center truncate"
                        >
                          {v.name}
                        </button>
                      ))
                    ) : (
                      <button
                        onClick={() => addToCart(product, { id: `default-${product.id}`, name: 'Regular', dine_in_price: 0, online_price: 0 })}
                        className="w-full bg-black/10 dark:bg-white/10 hover:bg-amber-500/80 text-white text-xs py-2 rounded-lg transition-colors border border-black/10 dark:border-white/10"
                      >
                        {t.addToCart}
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Cart Sidebar */}
      <div className="w-full lg:w-[380px] bg-black/5 dark:bg-white/5 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden relative min-h-[400px]">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="p-6 border-b border-black/10 dark:border-white/10 relative z-10">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            {t.currentOrder}
          </h2>
          
          <div className="mt-4 relative">
            {customer ? (
              <div className="bg-black/10 dark:bg-white/10 border border-black/20 dark:border-white/20 rounded-xl p-3 flex justify-between items-center">
                <div>
                  <p className="text-slate-900 dark:text-white font-medium text-sm">{customer.name}</p>
                  {customer.phone && <p className="text-slate-500 dark:text-white/40 text-xs">{customer.phone}</p>}
                  <p className="text-amber-400 text-xs">{customer.loyalty_visits} {t.visits}</p>
                </div>
                <button onClick={() => { setCustomer(null); setIsRedeeming(false); }} className="text-slate-400 dark:text-white/40 hover:text-slate-900 dark:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-2 relative">
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40" />
                  <input 
                    type="text" 
                    placeholder={t.searchOrAddCustomer} 
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-slate-900 dark:text-white placeholder-white/40 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-amber-500/50 transition-colors"
                  />
                </div>
                <div className="relative">
                  <CreditCard className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40" />
                  <input 
                    type="text" 
                    placeholder="Phone Number" 
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-slate-900 dark:text-white placeholder-white/40 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-amber-500/50 transition-colors"
                  />
                </div>
                
                {customerResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-black/10 dark:border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
                    {customerResults.map(c => (
                      <button key={c.id} onClick={() => selectCustomer(c)} className="w-full text-left px-4 py-2 text-sm text-slate-900 dark:text-white hover:bg-black/10 dark:bg-white/10">
                        <div className="flex justify-between items-center">
                          <span>{c.name}</span>
                          <span className="text-slate-400 dark:text-white/40 text-xs">{c.phone}</span>
                        </div>
                        <span className="text-slate-400 dark:text-white/40 text-xs">({c.loyalty_visits} {t.visits})</span>
                      </button>
                    ))}
                    {(customerSearch.length > 2 || customerPhone.length > 2) && (
                      <button onClick={createCustomer} className="w-full text-left px-4 py-2 text-sm text-amber-400 hover:bg-black/10 dark:bg-white/10 border-t border-black/10 dark:border-white/10">
                        + {t.create} "{customerSearch || customerPhone}"
                      </button>
                    )}
                  </div>
                )}
                {(customerSearch.length > 2 || customerPhone.length > 2) && customerResults.length === 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-black/10 dark:border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
                    <button onClick={createCustomer} className="w-full text-left px-4 py-2 text-sm text-amber-400 hover:bg-black/10 dark:bg-white/10">
                      + {t.create} "{customerSearch || customerPhone}"
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {customer && customer.loyalty_visits >= 10 && (
            <div className="mt-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl p-3 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 text-xs font-medium">{t.eligibleForFreeItem}</span>
              </div>
              <button 
                onClick={() => setIsRedeeming(!isRedeeming)}
                className={clsx(
                  "text-xs px-2 py-1 rounded-lg font-medium transition-colors",
                  isRedeeming ? "bg-emerald-500 text-white" : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                )}
              >
                {isRedeeming ? t.redeeming : t.redeem}
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 relative z-10 custom-scrollbar">
          <AnimatePresence>
            {cart.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-white/30"
              >
                <ShoppingCart className="w-12 h-12 mb-4 opacity-20" />
                <p>{t.cartIsEmpty}</p>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {cart.map((item, idx) => (
                  <motion.div 
                    key={`${item.variant.id}-${idx}`}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex items-center gap-3 bg-black/5 dark:bg-white/5 p-3 rounded-2xl border border-black/5 dark:border-white/5"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="text-slate-900 dark:text-white font-medium text-sm truncate">{item.product.name}</h4>
                      <p className="text-slate-500 dark:text-white/50 text-xs">{item.variant.name}</p>
                      <p className="text-amber-400 font-mono text-xs mt-1">{formatCurrency(item.price)}</p>
                    </div>
                    
                    <div className="flex items-center gap-2 bg-black/10 dark:bg-white/10 rounded-xl p-1">
                      <button onClick={() => updateQty(item.variant.id, -1)} className="p-1 hover:bg-black/20 dark:bg-white/20 rounded-lg text-slate-900 dark:text-white transition-colors">
                        {item.qty === 1 ? <Trash2 className="w-3 h-3 text-rose-400" /> : <Minus className="w-3 h-3" />}
                      </button>
                      <span className="text-slate-900 dark:text-white text-sm font-medium w-4 text-center">{item.qty}</span>
                      <button onClick={() => updateQty(item.variant.id, 1)} className="p-1 hover:bg-black/20 dark:bg-white/20 rounded-lg text-slate-900 dark:text-white transition-colors">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-6 bg-black/5 dark:bg-white/5 border-t border-black/10 dark:border-white/10 relative z-10">
          <div className="space-y-2 mb-6">
            <div className="flex justify-between text-slate-500 dark:text-white/60 text-sm">
              <span>{t.subtotal}</span>
              <span className="font-mono">{formatCurrency(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-400 text-sm">
                <span>{t.loyaltyDiscount}</span>
                <span className="font-mono">-{formatCurrency(discount)}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-slate-500 dark:text-white/60 text-sm">
              <label className="flex items-center gap-2 cursor-pointer hover:text-slate-900 dark:text-white transition-colors">
                <input 
                  type="checkbox" 
                  checked={isTaxApplied} 
                  onChange={(e) => setIsTaxApplied(e.target.checked)}
                  className="rounded border-black/20 dark:border-white/20 bg-black/5 dark:bg-white/5 text-amber-500 focus:ring-amber-500/50 accent-amber-500 w-4 h-4 cursor-pointer"
                />
                <span>{t.tax}</span>
              </label>
              <span className="font-mono">{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between text-slate-900 dark:text-white font-bold text-lg pt-2 border-t border-black/10 dark:border-white/10">
              <span>{t.total}</span>
              <span className="font-mono text-amber-400">{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <button
              onClick={() => togglePaymentMethod('Cash')}
              className={clsx(
                'flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all border',
                paymentMethods.includes('Cash') 
                  ? 'bg-black/20 dark:bg-white/20 text-slate-900 dark:text-white border-black/30 dark:border-white/30 shadow-md' 
                  : 'bg-black/5 dark:bg-white/5 text-slate-500 dark:text-white/60 border-black/10 dark:border-white/10 hover:bg-black/10 dark:bg-white/10 hover:text-slate-900 dark:text-white'
              )}
            >
              <Banknote className="w-4 h-4" /> {t.cash}
            </button>
            <button
              onClick={() => togglePaymentMethod('QRIS')}
              className={clsx(
                'flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all border',
                paymentMethods.includes('QRIS') 
                  ? 'bg-black/20 dark:bg-white/20 text-slate-900 dark:text-white border-black/30 dark:border-white/30 shadow-md' 
                  : 'bg-black/5 dark:bg-white/5 text-slate-500 dark:text-white/60 border-black/10 dark:border-white/10 hover:bg-black/10 dark:bg-white/10 hover:text-slate-900 dark:text-white'
              )}
            >
              <CreditCard className="w-4 h-4" /> {t.qris}
            </button>
            <button
              onClick={() => {
                setPaymentMethods(['Complementary']);
              }}
              className={clsx(
                'flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all border',
                paymentMethods.includes('Complementary') 
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/30 shadow-md' 
                  : 'bg-black/5 dark:bg-white/5 text-slate-500 dark:text-white/60 border-black/10 dark:border-white/10 hover:bg-black/10 dark:bg-white/10 hover:text-slate-900 dark:text-white'
              )}
            >
              <Gift className="w-4 h-4" /> {t.free}
            </button>
          </div>

          {paymentMethods.includes('QRIS') && (
            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-500 dark:text-white/60 mb-1">{t.uploadPaymentProof}</label>
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => setPaymentProof(e.target.files?.[0] || null)}
                className="w-full text-sm text-slate-500 dark:text-white/60 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-black/10 dark:bg-white/10 file:text-slate-900 dark:text-white hover:file:bg-black/20 dark:bg-white/20 transition-all"
              />
            </div>
          )}

          <button
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-900 dark:text-white font-bold py-4 rounded-2xl shadow-lg shadow-amber-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]"
          >
            {paymentMethods.includes('Complementary') ? t.processComplementary : `${t.charge} ${formatCurrency(total)}`}
          </button>
        </div>
      </div>

      {/* Shift Closing Modal */}
      <AnimatePresence>
        {showClosingModal && shiftSummary && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-900/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-800 border border-black/10 dark:border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t.shiftSummary}</h2>
                <button onClick={() => setShowClosingModal(false)} className="text-slate-400 dark:text-white/40 hover:text-slate-900 dark:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 mb-8">
                <div className="bg-black/5 dark:bg-white/5 rounded-2xl p-4 border border-black/5 dark:border-white/5">
                  <p className="text-slate-500 dark:text-white/60 text-sm mb-1">{t.totalTransactions}</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{shiftSummary.total_transactions}</p>
                </div>
                
                <div className="bg-black/5 dark:bg-white/5 rounded-2xl p-4 border border-black/5 dark:border-white/5">
                  <p className="text-slate-500 dark:text-white/60 text-sm mb-1">{t.totalRevenue}</p>
                  <p className="text-2xl font-bold text-amber-400 font-mono">{formatCurrency(shiftSummary.total_revenue || 0)}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black/5 dark:bg-white/5 rounded-2xl p-4 border border-black/5 dark:border-white/5">
                    <p className="text-slate-500 dark:text-white/60 text-sm mb-1">{t.cash}</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white font-mono">{formatCurrency(shiftSummary.cash_revenue || 0)}</p>
                  </div>
                  <div className="bg-black/5 dark:bg-white/5 rounded-2xl p-4 border border-black/5 dark:border-white/5">
                    <p className="text-slate-500 dark:text-white/60 text-sm mb-1">{t.qris}</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white font-mono">{formatCurrency(shiftSummary.qris_revenue || 0)}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowClosingModal(false)}
                  className="flex-1 bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:bg-white/20 text-slate-900 dark:text-white font-medium py-3 rounded-xl transition-colors"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={handleCloseShift}
                  className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-medium py-3 rounded-xl transition-colors shadow-lg shadow-rose-500/25"
                >
                  {t.confirmClose}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
