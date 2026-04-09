import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, User, CreditCard, Banknote, Search, Plus, Minus, Trash2, Coffee, X, Gift, LogOut, MessageSquare, Settings2, Download, Image as ImageIcon } from 'lucide-react';
import { toPng } from 'html-to-image';
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

  // Shift Management State
  const [currentShift, setCurrentShift] = useState<any>(null);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [startingCash, setStartingCash] = useState('');
  const [endingCash, setEndingCash] = useState('');
  const [shiftNotes, setShiftNotes] = useState('');
  const [isStartingShift, setIsStartingShift] = useState(false);

  // Customer Loyalty State
  const [customer, setCustomer] = useState<any>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerResults, setCustomerResults] = useState<any[]>([]);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [loyaltySettings, setLoyaltySettings] = useState({ points_per_amount: 10000, redeem_value_per_point: 100 });
  const [paymentProof, setPaymentProof] = useState<File | null>(null);

  // Transaction Success State
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<any>(null);

  // Shift Closing State
  const [showClosingModal, setShowClosingModal] = useState(false);
  const [shiftSummary, setShiftSummary] = useState<any>(null);
  const [customizingItem, setCustomizingItem] = useState<any>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const { t } = useLanguage();
  const receiptRef = useRef<HTMLDivElement>(null);

  const downloadReceiptImage = async () => {
    if (receiptRef.current === null) return;
    try {
      const dataUrl = await toPng(receiptRef.current, {
        pixelRatio: 4, // Increased resolution for professional look
        cacheBust: true,
        backgroundColor: '#ffffff',
        style: {
          borderRadius: '0'
        }
      });
      const link = document.createElement('a');
      link.download = `receipt-${lastTransaction?.id || 'order'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to generate receipt image', err);
    }
  };

  const shareReceipt = async () => {
    if (receiptRef.current === null || !lastTransaction) return;
    try {
      const dataUrl = await toPng(receiptRef.current, {
        pixelRatio: 4,
        cacheBust: true,
        backgroundColor: '#ffffff',
      });
      
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `receipt-${lastTransaction.id}.png`, { type: 'image/png' });
      
      const shareData = {
        files: [file],
        title: 'Kedai M46 Receipt',
        text: `Digital Receipt for Order #${lastTransaction.id} at Kedai M46. Thank you!`,
      };

      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        // Fallback to clipboard for desktop
        try {
          const item = new ClipboardItem({ "image/png": blob });
          await navigator.clipboard.write([item]);
          alert("Receipt image copied to clipboard! You can now paste (Ctrl+V) it directly into WhatsApp.");
        } catch (clipboardErr) {
          downloadReceiptImage();
        }
      }
    } catch (err) {
      console.error('Error sharing receipt', err);
      downloadReceiptImage();
    }
  };

  const MODIFIER_OPTIONS = {
    temp: ['Hot', 'Ice'],
    size: ['Regular', 'Large'],
    sugar: ['Normal', 'Less', 'No'],
    iceLevel: ['Normal', 'Less', 'No']
  };

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

    // Fetch Loyalty Settings
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data && data.points_per_amount) {
          setLoyaltySettings({
            points_per_amount: Number(data.points_per_amount),
            redeem_value_per_point: Number(data.redeem_value_per_point)
          });
        }
      });

    // Check current shift
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.id) {
      fetch(`/api/shifts/current?userId=${user.id}`)
        .then(res => res.json())
        .then(data => {
          if (data) {
            setCurrentShift(data);
          } else {
            setShowShiftModal(true);
            setIsStartingShift(true);
          }
        });
    }
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

    setCustomizingItem({
      cartId: Date.now(),
      product,
      variant,
      qty: 1,
      price: finalPrice,
      notes: '',
      modifiers: {
        temp: 'Ice',
        size: 'Regular',
        sugar: 'Normal',
        iceLevel: 'Normal'
      }
    });
  };

  const confirmAddToCart = (item: any) => {
    const existingIndex = cart.findIndex(i => 
      i.variant.id === item.variant.id && 
      i.notes === item.notes && 
      JSON.stringify(i.modifiers) === JSON.stringify(item.modifiers)
    );

    if (existingIndex > -1) {
      const newCart = [...cart];
      newCart[existingIndex].qty += item.qty;
      setCart(newCart);
    } else {
      setCart([...cart, item]);
    }
    setCustomizingItem(null);
  };

  const updateCartItem = (item: any) => {
    const newCart = cart.map(i => i.cartId === item.cartId ? item : i);
    setCart(newCart);
    setCustomizingItem(null);
  };

  const updateQty = (cartId: number, delta: number) => {
    setCart(prevCart => prevCart.map(item => {
      if (item.cartId === cartId) {
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

    let finalCustomerId = customer?.id || null;

    // Auto-create customer if name or phone is provided but no customer is selected
    if (!finalCustomerId && (customerSearch || customerPhone)) {
      try {
        const res = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            name: customerSearch || `Customer ${customerPhone}`, 
            phone: customerPhone, 
            preferences: '' 
          })
        });
        if (res.ok) {
          const data = await res.json();
          finalCustomerId = data.id;
        }
      } catch (e) {
        console.error('Failed to auto-create customer', e);
      }
    }

    const pointsEarned = Math.floor(total / loyaltySettings.points_per_amount);
    const pointsRedeemed = isRedeeming ? Math.min(customer?.points || 0, Math.floor(discount / loyaltySettings.redeem_value_per_point)) : 0;

    const payload = {
      customer_id: finalCustomerId,
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
      shift_id: currentShift?.id,
      points_earned: pointsEarned,
      points_redeemed: pointsRedeemed,
      items: cart.map(item => ({
        product_variant_id: item.variant.id,
        qty: item.qty,
        unit_price: item.price,
        hpp_snapshot: 0, // Server will calculate this
        notes: item.notes,
        modifiers: item.modifiers
      }))
    };

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        const data = await res.json();
        setLastTransaction({ 
          ...payload, 
          id: data.id, 
          created_at: new Date().toISOString(),
          customerName: customer?.name || customerSearch || (customerPhone ? `Customer ${customerPhone}` : 'Guest'),
          customerPhone: customer?.phone || customerPhone,
          fullItems: cart.map(item => ({
            name: item.product.name,
            variant: item.variant.name,
            qty: item.qty,
            price: item.price,
            modifiers: item.modifiers,
            notes: item.notes
          }))
        });
        setShowSuccessModal(true);
        setCart([]);
        setCustomer(null);
        setCustomerSearch('');
        setCustomerPhone('');
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
              onClick={() => {
                setIsStartingShift(false);
                setShowShiftModal(true);
              }}
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
                className="bg-black/10 dark:bg-white/10 border border-black/20 dark:border-white/20 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-white/40 rounded-xl pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/50 w-full md:w-64 transition-all"
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
              
              const hasPromo = promotions.some(promo => promo.product_ids.includes(product.id));
              
              return (
                <motion.div 
                  key={product.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={clsx(
                    "rounded-2xl p-4 transition-all cursor-pointer group flex flex-col relative overflow-hidden border",
                    hasPromo 
                      ? "bg-amber-500/5 border-amber-500/30 hover:bg-amber-500/10" 
                      : "bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 hover:bg-black/10 dark:bg-white/10"
                  )}
                >
                  {hasPromo && (
                    <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg flex items-center gap-1 shadow-lg z-10">
                      <Gift className="w-3 h-3" />
                      PROMO
                    </div>
                  )}
                  <div className={clsx(
                    "w-full aspect-square rounded-xl mb-4 flex items-center justify-center border transition-colors overflow-hidden",
                    hasPromo
                      ? "bg-amber-500/10 border-amber-500/20 group-hover:border-amber-500/50"
                      : "bg-gradient-to-br from-white/5 to-white/10 border-black/5 dark:border-white/5 group-hover:border-amber-500/30"
                  )}>
                    {product.image_url && !failedImages[product.id] ? (
                      <img 
                        src={product.image_url} 
                        alt={product.name} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={() => setFailedImages(prev => ({ ...prev, [product.id]: true }))}
                      />
                    ) : (
                      <Coffee className={clsx(
                        "w-12 h-12 transition-colors",
                        hasPromo ? "text-amber-500/50 group-hover:text-amber-400" : "text-slate-300 dark:text-white/20 group-hover:text-amber-400/50"
                      )} />
                    )}
                  </div>
                  <h3 className="text-slate-900 dark:text-white font-semibold mb-1 truncate">{product.name}</h3>
                  <p className="text-amber-400 font-mono text-sm mb-3">{formatCurrency(displayPrice)}</p>
                  
                  <div className="mt-auto flex flex-wrap gap-2">
                    {productVariants.length > 0 ? (
                      productVariants.map(v => (
                        <button
                          key={v.id}
                          onClick={() => addToCart(product, v)}
                          className="flex-1 bg-black/10 dark:bg-white/10 hover:bg-amber-500/80 text-slate-900 dark:text-white text-xs py-1.5 px-2 rounded-lg transition-colors border border-black/10 dark:border-white/10 text-center truncate"
                        >
                          {v.name}
                        </button>
                      ))
                    ) : (
                      <button
                        onClick={() => addToCart(product, { id: `default-${product.id}`, name: 'Regular', dine_in_price: 0, online_price: 0 })}
                        className="w-full bg-black/10 dark:bg-white/10 hover:bg-amber-500/80 text-slate-900 dark:text-white text-xs py-2 rounded-lg transition-colors border border-black/10 dark:border-white/10"
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
        
        <div className="p-6 border-b border-black/10 dark:border-white/10 relative z-30">
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
                  <p className="text-amber-400 text-xs">{customer.points || 0} Points • {customer.loyalty_visits} {t.visits}</p>
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
                    className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-white/40 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-amber-500/50 transition-colors"
                  />
                </div>
                <div className="relative">
                  <CreditCard className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40" />
                  <input 
                    type="text" 
                    placeholder="Phone Number" 
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-white/40 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-amber-500/50 transition-colors"
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
                    key={item.cartId}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex flex-col gap-2 bg-black/5 dark:bg-white/5 p-3 rounded-2xl border border-black/5 dark:border-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="flex-1 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setCustomizingItem(item)}
                      >
                        <h4 className="text-slate-900 dark:text-white font-medium text-sm truncate">{item.product.name}</h4>
                        <p className="text-slate-500 dark:text-white/50 text-xs">{item.variant.name}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Object.entries(item.modifiers).map(([key, value]) => (
                            <span key={key} className="text-[10px] bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded text-slate-500 dark:text-white/40">
                              {t[key]}: {t[String(value).toLowerCase()]}
                            </span>
                          ))}
                        </div>
                        {item.notes && (
                          <p className="text-[10px] text-amber-500/80 italic mt-1 flex items-center gap-1">
                            <MessageSquare className="w-2.5 h-2.5" /> {item.notes}
                          </p>
                        )}
                        <p className="text-amber-400 font-mono text-xs mt-1">{formatCurrency(item.price)}</p>
                      </div>
                      
                      <div className="flex items-center gap-2 bg-black/10 dark:bg-white/10 rounded-xl p-1">
                        <button onClick={() => updateQty(item.cartId, -1)} className="p-1 hover:bg-black/20 dark:bg-white/20 rounded-lg text-slate-900 dark:text-white transition-colors">
                          {item.qty === 1 ? <Trash2 className="w-3 h-3 text-rose-400" /> : <Minus className="w-3 h-3" />}
                        </button>
                        <span className="text-slate-900 dark:text-white text-sm font-medium w-4 text-center">{item.qty}</span>
                        <button onClick={() => updateQty(item.cartId, 1)} className="p-1 hover:bg-black/20 dark:bg-white/20 rounded-lg text-slate-900 dark:text-white transition-colors">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
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

      {/* Customization Modal */}
      <AnimatePresence>
        {customizingItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-black/10 dark:border-white/10 rounded-3xl p-6 w-full max-w-lg shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t.customize}</h2>
                  <p className="text-slate-500 dark:text-white/60 text-sm">{customizingItem.product.name} - {customizingItem.variant.name}</p>
                </div>
                <button onClick={() => setCustomizingItem(null)} className="text-slate-400 dark:text-white/40 hover:text-slate-900 dark:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6 mb-8 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {Object.entries(MODIFIER_OPTIONS).map(([category, options]) => {
                  // Hide ice level if temperature is Hot
                  if (category === 'iceLevel' && customizingItem.modifiers.temp === 'Hot') {
                    return null;
                  }

                  return (
                    <div key={category}>
                      <label className="block text-sm font-medium text-slate-500 dark:text-white/60 mb-3 capitalize flex items-center gap-2">
                        <Settings2 className="w-4 h-4" /> {t[category]}
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {options.map(option => (
                          <button
                            key={option}
                            onClick={() => {
                              const newModifiers = { ...customizingItem.modifiers, [category]: option };
                              // If switching to Hot, remove iceLevel from modifiers if you want, 
                              // but keeping it in state is fine as long as it's hidden and not used.
                              // The user said "remove the ice level", so let's ensure it's handled.
                              if (category === 'temp' && option === 'Hot') {
                                delete newModifiers.iceLevel;
                              } else if (category === 'temp' && option === 'Ice') {
                                newModifiers.iceLevel = 'Normal';
                              }
                              
                              setCustomizingItem({
                                ...customizingItem,
                                modifiers: newModifiers
                              });
                            }}
                            className={clsx(
                              'py-2 px-3 rounded-xl text-xs font-medium transition-all border',
                              customizingItem.modifiers[category] === option
                                ? 'bg-amber-500 text-white border-amber-600 shadow-md'
                                : 'bg-black/5 dark:bg-white/5 text-slate-500 dark:text-white/60 border-black/10 dark:border-white/10 hover:bg-black/10 dark:bg-white/10'
                            )}
                          >
                            {t[option.toLowerCase()] || option}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}

                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-white/60 mb-3 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" /> {t.notes}
                  </label>
                  <textarea
                    value={customizingItem.notes}
                    onChange={(e) => setCustomizingItem({ ...customizingItem, notes: e.target.value })}
                    placeholder={t.addNote}
                    className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-white/40 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 min-h-[100px] transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setCustomizingItem(null)}
                  className="flex-1 bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:bg-white/20 text-slate-900 dark:text-white font-medium py-3 rounded-xl transition-colors"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={() => {
                    const isNew = !cart.some(i => i.cartId === customizingItem.cartId);
                    if (isNew) {
                      confirmAddToCart(customizingItem);
                    } else {
                      updateCartItem(customizingItem);
                    }
                  }}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-medium py-3 rounded-xl transition-colors shadow-lg shadow-amber-500/25"
                >
                  {t.saveCustomization}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shift Closing Modal */}
      <AnimatePresence>
        {showClosingModal && shiftSummary && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-black/10 dark:border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl"
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
      {/* Shift Modal */}
      <AnimatePresence>
        {showShiftModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white dark:bg-slate-900 border border-black/10 dark:border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl"
            >
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                {isStartingShift ? 'Start Shift' : 'Close Shift'}
              </h2>
              <p className="text-slate-500 dark:text-white/60 mb-6">
                {isStartingShift 
                  ? 'Please enter the starting cash in the drawer to begin your shift.' 
                  : 'Please enter the actual cash in the drawer to close your shift.'}
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-white/70 mb-1">
                    {isStartingShift ? 'Starting Cash' : 'Ending Cash (Actual)'}
                  </label>
                  <div className="relative">
                    <Banknote className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="number"
                      value={isStartingShift ? startingCash : endingCash}
                      onChange={(e) => isStartingShift ? setStartingCash(e.target.value) : setEndingCash(e.target.value)}
                      className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl pl-10 pr-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500/50 outline-none"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-white/70 mb-1">Notes (Optional)</label>
                  <textarea
                    value={shiftNotes}
                    onChange={(e) => setShiftNotes(e.target.value)}
                    className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500/50 outline-none h-24 resize-none"
                    placeholder="Any observations or issues..."
                  />
                </div>

                <button
                  onClick={async () => {
                    const user = JSON.parse(localStorage.getItem('user') || '{}');
                    if (isStartingShift) {
                      const res = await fetch('/api/shifts/start', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          user_id: user.id,
                          starting_cash: Number(startingCash),
                          notes: shiftNotes
                        })
                      });
                      if (res.ok) {
                        const data = await res.json();
                        setCurrentShift({ id: data.id, starting_cash: Number(startingCash) });
                        setShowShiftModal(false);
                        setStartingCash('');
                        setShiftNotes('');
                      }
                    } else {
                      const res = await fetch('/api/shifts/end', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          id: currentShift.id,
                          ending_cash_actual: Number(endingCash),
                          notes: shiftNotes
                        })
                      });
                      if (res.ok) {
                        const data = await res.json();
                        alert(`Shift closed. Expected cash: ${formatCurrency(data.expectedCash)}. Actual: ${formatCurrency(Number(endingCash))}`);
                        setCurrentShift(null);
                        setShowShiftModal(false);
                        setEndingCash('');
                        setShiftNotes('');
                        // Force re-open start shift modal
                        setShowShiftModal(true);
                        setIsStartingShift(true);
                      }
                    }
                  }}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-white font-bold py-3 rounded-xl shadow-lg transition-all"
                >
                  {isStartingShift ? 'Start Shift' : 'Close Shift'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transaction Success Modal */}
      <AnimatePresence>
        {showSuccessModal && lastTransaction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white dark:bg-slate-900 border border-black/10 dark:border-white/10 rounded-3xl p-6 w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Gift className="w-8 h-8 text-emerald-500" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1 text-center">{t.transactionSuccessful}</h2>
                <p className="text-slate-500 dark:text-white/60 mb-6 text-center text-sm">Order #{lastTransaction.id} has been processed.</p>

                {/* Professional Receipt Preview */}
                <div className="flex justify-center mb-6">
                  <div 
                    ref={receiptRef}
                    className="bg-white text-slate-900 p-10 shadow-sm border border-slate-100 w-full max-w-[340px] font-mono text-[11px] leading-relaxed"
                  >
                    <div className="text-center mb-8">
                      <div className="flex justify-center mb-2">
                        <div className="w-12 h-12 border-2 border-slate-900 rounded-xl flex items-center justify-center">
                          <Coffee className="w-7 h-7" />
                        </div>
                      </div>
                      <h3 className="text-xl font-bold uppercase tracking-[0.2em] mb-1">Kedai M46</h3>
                      <p className="text-[9px] text-slate-500 uppercase tracking-wider">Premium Coffee & Roastery</p>
                      <div className="flex items-center justify-center gap-2 mt-2">
                        <div className="h-[1px] w-8 bg-slate-200" />
                        <p className="text-[8px] text-slate-400">EST. 2024</p>
                        <div className="h-[1px] w-8 bg-slate-200" />
                      </div>
                    </div>

                    <div className="space-y-1.5 mb-6 text-[10px]">
                      <div className="flex justify-between">
                        <span className="text-slate-400">ORDER ID</span>
                        <span className="font-bold">#{lastTransaction.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">DATE</span>
                        <span>{new Date(lastTransaction.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">TIME</span>
                        <span>{new Date(lastTransaction.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">CUSTOMER</span>
                        <span className="font-bold truncate ml-4">{lastTransaction.customerName}</span>
                      </div>
                    </div>

                    <div className="border-t border-b border-dashed border-slate-300 py-4 mb-6">
                      <table className="w-full">
                        <thead>
                          <tr className="text-left text-[9px] text-slate-400 uppercase tracking-wider">
                            <th className="pb-2 font-normal">Description</th>
                            <th className="pb-2 text-right font-normal">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-dashed divide-slate-100">
                          {lastTransaction.fullItems.map((item: any, idx: number) => (
                            <tr key={idx} className="align-top">
                              <td className="py-2 pr-4">
                                <div className="font-bold uppercase text-slate-800">{item.name}</div>
                                <div className="text-[9px] text-slate-500 mt-0.5">{item.variant} × {item.qty}</div>
                                {Object.entries(item.modifiers).map(([key, val]) => (
                                  <div key={key} className="text-[8px] text-slate-400 italic mt-0.5">
                                    ↳ {t[key] || key}: {t[String(val).toLowerCase()] || val}
                                  </div>
                                ))}
                                {item.notes && (
                                  <div className="text-[8px] text-amber-600 italic mt-0.5">
                                    Note: {item.notes}
                                  </div>
                                )}
                              </td>
                              <td className="text-right py-2 font-bold text-slate-800">
                                {formatCurrency(item.price * item.qty)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="space-y-2 mb-8">
                      <div className="flex justify-between text-slate-500">
                        <span>SUBTOTAL</span>
                        <span>{formatCurrency(lastTransaction.total_amount + lastTransaction.discount_amount)}</span>
                      </div>
                      {lastTransaction.discount_amount > 0 && (
                        <div className="flex justify-between text-rose-500">
                          <span>DISCOUNT</span>
                          <span>-{formatCurrency(lastTransaction.discount_amount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-slate-500">
                        <span>TAX (PB1 10%)</span>
                        <span>{formatCurrency(lastTransaction.tax_amount)}</span>
                      </div>
                      <div className="flex justify-between text-base font-bold pt-3 border-t-2 border-slate-900 mt-2">
                        <span>TOTAL</span>
                        <span>{formatCurrency(lastTransaction.final_amount)}</span>
                      </div>
                    </div>

                    <div className="text-center space-y-4">
                      <div className="flex justify-center gap-1">
                        {[...Array(20)].map((_, i) => (
                          <div key={i} className="w-1 h-1 bg-slate-200 rounded-full" />
                        ))}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold tracking-[0.3em] uppercase">Terima Kasih</p>
                        <p className="text-[8px] text-slate-400 mt-1 uppercase tracking-widest">Visit us again soon</p>
                      </div>
                      <div className="flex justify-center pt-2">
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                           <div className="w-16 h-4 bg-slate-200 rounded flex items-center justify-center overflow-hidden">
                              <div className="flex gap-0.5">
                                {[...Array(10)].map((_, i) => (
                                  <div key={i} className="w-[2px] h-3 bg-slate-400" />
                                ))}
                              </div>
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                <button
                  onClick={shareReceipt}
                  className="flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white py-3 rounded-xl font-bold transition-all text-sm shadow-lg shadow-indigo-500/20"
                >
                  <MessageSquare className="w-4 h-4" /> Share Receipt
                </button>
                <button
                  onClick={downloadReceiptImage}
                  className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-bold transition-all text-sm shadow-lg shadow-slate-800/20"
                >
                  <Download className="w-4 h-4" /> Download PNG
                </button>
                <button
                  onClick={() => {
                    const itemsText = lastTransaction.fullItems.map((item: any) => {
                      let modText = Object.entries(item.modifiers)
                        .map(([key, value]) => `${t[key] || key}: ${t[String(value).toLowerCase()] || value}`)
                        .join(', ');
                      return `☕ *${item.name}* (${item.variant})\n` +
                             `   ${item.qty} x ${formatCurrency(item.price)}` +
                             `${modText ? `\n   _Options: ${modText}_` : ''}` +
                             `${item.notes ? `\n   _Note: ${item.notes}_` : ''}`;
                    }).join('\n\n');

                    const text = `*KEDAI M46 - DIGITAL RECEIPT*\n` +
                      `================================\n` +
                      `🆔 *Order:* #${lastTransaction.id}\n` +
                      `📅 *Date:* ${new Date(lastTransaction.created_at).toLocaleString('id-ID')}\n` +
                      `👤 *Customer:* ${lastTransaction.customerName}\n` +
                      `================================\n\n` +
                      `${itemsText}\n\n` +
                      `================================\n` +
                      `Subtotal: ${formatCurrency(lastTransaction.total_amount + lastTransaction.discount_amount)}\n` +
                      `Discount: -${formatCurrency(lastTransaction.discount_amount)}\n` +
                      `Tax (PB1): ${formatCurrency(lastTransaction.tax_amount)}\n` +
                      `--------------------------------\n` +
                      `*TOTAL: ${formatCurrency(lastTransaction.final_amount)}*\n` +
                      `================================\n\n` +
                      `Terima kasih telah berkunjung ke *Kedai M46*! 🙏✨\n` +
                      `_Semoga harimu menyenangkan!_`;
                    
                    let phone = lastTransaction.customerPhone?.replace(/\D/g, '') || '';
                    if (phone.startsWith('0')) {
                      phone = '62' + phone.substring(1);
                    }
                    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
                  }}
                  className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white py-3 rounded-xl font-bold transition-all text-sm shadow-lg shadow-emerald-500/20"
                >
                  <MessageSquare className="w-4 h-4" /> WhatsApp Text
                </button>
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-900 dark:text-white py-3 rounded-xl font-bold transition-all text-sm"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
