import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Tag, Plus, Trash2, Edit2, Clock, Package, X } from 'lucide-react';
import { clsx } from 'clsx';
import { useLanguage } from '../i18n';

export default function Promotions() {
  const { t } = useLanguage();
  const [promotions, setPromotions] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [filterType, setFilterType] = useState('all');

  const [formData, setFormData] = useState({
    name: '',
    type: 'buy_x_get_y',
    description: '',
    is_active: true,
    buy_qty: '',
    get_qty: '',
    fixed_price: '',
    days_of_week: [] as number[],
    start_time: '',
    end_time: '',
    discount_percent: '',
    discount_amount: '',
    start_date: '',
    end_date: '',
    product_ids: [] as number[]
  });

  const daysOfWeekOptions = [
    { value: 1, label: t.monday },
    { value: 2, label: t.tuesday },
    { value: 3, label: t.wednesday },
    { value: 4, label: t.thursday },
    { value: 5, label: t.friday },
    { value: 6, label: t.saturday },
    { value: 0, label: t.sunday },
  ];

  useEffect(() => {
    fetchPromotions();
    fetchProducts();
  }, []);

  const fetchPromotions = async () => {
    try {
      const res = await fetch('/api/promotions');
      const data = await res.json();
      setPromotions(data);
    } catch (error) {
      console.error('Failed to fetch promotions', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error('Failed to fetch products', error);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.type === 'buy_x_get_y' || formData.type === 'fixed_price' || formData.type === 'bundle') {
      if (formData.buy_qty) {
        if (!formData.get_qty && !formData.fixed_price) {
          alert(t.buyQtyRequiresGetQtyOrFixedPrice);
          return;
        }
      }
    }

    if (formData.type === 'time_based') {
      if (formData.discount_percent) {
        const dp = parseFloat(formData.discount_percent as string);
        if (dp < 0 || dp > 100) {
          alert(t.discountPercentInvalid);
          return;
        }
      }
      if (formData.start_time && formData.end_time) {
        if (formData.start_time >= formData.end_time) {
          alert(t.startTimeBeforeEndTime);
          return;
        }
      }
    }

    const url = editingPromo ? `/api/promotions/${editingPromo.id}` : '/api/promotions';
    const method = editingPromo ? 'PUT' : 'POST';

    const payload = {
      ...formData,
      buy_qty: formData.type === 'bogo' && !formData.buy_qty ? 1 : (formData.buy_qty ? parseInt(formData.buy_qty as string) : null),
      get_qty: formData.type === 'bogo' ? 1 : (formData.get_qty ? parseInt(formData.get_qty as string) : null),
      fixed_price: formData.fixed_price ? parseFloat(formData.fixed_price as string) : null,
      discount_percent: formData.discount_percent ? parseFloat(formData.discount_percent as string) : null,
      discount_amount: formData.discount_amount ? parseFloat(formData.discount_amount as string) : null,
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
    };

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setShowAddModal(false);
        setEditingPromo(null);
        fetchPromotions();
        resetForm();
      }
    } catch (error) {
      console.error('Failed to save promotion', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t.confirmDeletePromotion)) return;
    try {
      const res = await fetch(`/api/promotions/${id}`, { method: 'DELETE' });
      if (res.ok) fetchPromotions();
    } catch (error) {
      console.error('Failed to delete promotion', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'buy_x_get_y',
      description: '',
      is_active: true,
      buy_qty: '',
      get_qty: '',
      fixed_price: '',
      days_of_week: [],
      start_time: '',
      end_time: '',
      discount_percent: '',
      discount_amount: '',
      start_date: '',
      end_date: '',
      product_ids: []
    });
    setCurrentStep(1);
  };

  const openEditModal = (promo: any) => {
    setEditingPromo(promo);
    let type = promo.type || 'buy_x_get_y';
    if (type === 'bundle') {
      if (promo.fixed_price) type = 'fixed_price';
      else type = 'buy_x_get_y';
    }

    setFormData({
      name: promo.name || '',
      type: type,
      description: promo.description || '',
      is_active: promo.is_active === 1,
      buy_qty: promo.buy_qty?.toString() || '',
      get_qty: promo.get_qty?.toString() || '',
      fixed_price: promo.fixed_price?.toString() || '',
      days_of_week: promo.days_of_week ? JSON.parse(promo.days_of_week) : [],
      start_time: promo.start_time || '',
      end_time: promo.end_time || '',
      discount_percent: promo.discount_percent?.toString() || '',
      discount_amount: promo.discount_amount?.toString() || '',
      start_date: promo.start_date || '',
      end_date: promo.end_date || '',
      product_ids: promo.product_ids || []
    });
    setCurrentStep(1);
    setShowAddModal(true);
  };

  const toggleDay = (day: number) => {
    setFormData(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter(d => d !== day)
        : [...prev.days_of_week, day]
    }));
  };

  const toggleProduct = (productId: number) => {
    setFormData(prev => ({
      ...prev,
      product_ids: prev.product_ids.includes(productId)
        ? prev.product_ids.filter(id => id !== productId)
        : [...prev.product_ids, productId]
    }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto space-y-8"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{t.promotionsTitle}</h1>
          <p className="text-slate-500 dark:text-white/60 mt-1">{t.promotionsSubtitle}</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowAddModal(true); }}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/25"
        >
          <Plus className="w-5 h-5" />
          {t.createPromo}
        </button>
      </div>

      <div className="flex gap-2 pb-4 overflow-x-auto">
        <button
          onClick={() => setFilterType('all')}
          className={clsx(
            "px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap",
            filterType === 'all' 
              ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/25" 
              : "bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
          )}
        >
          {t.all}
        </button>
        <button
          onClick={() => setFilterType('bundle')}
          className={clsx(
            "px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap",
            filterType === 'bundle' 
              ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25" 
              : "bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
          )}
        >
          {t.bundleMultiBuy}
        </button>
        <button
          onClick={() => setFilterType('discount')}
          className={clsx(
            "px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap",
            filterType === 'discount' 
              ? "bg-amber-500 text-white shadow-lg shadow-amber-500/25" 
              : "bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
          )}
        >
          {t.discount}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {promotions.filter(p => {
          if (filterType === 'all') return true;
          if (filterType === 'bundle') return ['buy_x_get_y', 'fixed_price', 'bogo', 'bundle'].includes(p.type);
          if (filterType === 'discount') return ['percentage', 'time_based'].includes(p.type);
          return true;
        }).map((promo) => (
          <div key={promo.id} className="bg-black/5 dark:bg-white/5 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden group">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={clsx(
                  "p-3 rounded-2xl",
                  (promo.type === 'bundle' || promo.type === 'buy_x_get_y' || promo.type === 'fixed_price') ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                )}>
                  {(promo.type === 'bundle' || promo.type === 'buy_x_get_y' || promo.type === 'fixed_price') ? <Package className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{promo.name}</h3>
                  <span className={clsx(
                    "text-xs font-medium px-2 py-1 rounded-full",
                    promo.is_active ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-500/10 text-slate-500"
                  )}>
                    {promo.is_active ? t.active : t.inactive}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEditModal(promo)} className="p-2 text-slate-400 hover:text-indigo-500 transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(promo.id)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <p className="text-slate-600 dark:text-white/70 text-sm mb-4 line-clamp-2">{promo.description}</p>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-black/5 dark:bg-white/5 rounded-2xl p-3 border border-black/5 dark:border-white/5">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-white/40 mb-1">{t.redemptions}</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{promo.redemption_count || 0}</p>
              </div>
              <div className="bg-black/5 dark:bg-white/5 rounded-2xl p-3 border border-black/5 dark:border-white/5">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-white/40 mb-1">{t.type}</p>
                <p className="text-xs font-medium text-slate-900 dark:text-white truncate">
                  {promo.type === 'buy_x_get_y' ? t.buyXGetY : 
                   promo.type === 'fixed_price' ? t.fixedPriceType : 
                   promo.type === 'percentage' ? t.percentageDiscount :
                   promo.type === 'bogo' ? t.bogo : t.timeBasedMarkdown}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-sm text-slate-500 dark:text-white/60">
              {(promo.type === 'bundle' || promo.type === 'buy_x_get_y' || promo.type === 'fixed_price' || promo.type === 'bogo') ? (
                <>
                  {promo.buy_qty && <p>{t.buy}: {promo.buy_qty}</p>}
                  {promo.get_qty && <p>{t.get}: {promo.get_qty}</p>}
                  {promo.fixed_price && <p>{t.fixedPrice}: Rp {promo.fixed_price.toLocaleString()}</p>}
                </>
              ) : (
                <>
                  {promo.discount_percent && <p>{t.discount}: {promo.discount_percent}%</p>}
                  {promo.discount_amount && <p>{t.discount}: Rp {promo.discount_amount.toLocaleString()}</p>}
                </>
              )}
              
              {(promo.days_of_week || promo.start_time || promo.start_date) && (
                <div className="pt-2 mt-2 border-t border-black/5 dark:border-white/5 space-y-1">
                  {promo.days_of_week && JSON.parse(promo.days_of_week).length > 0 && (
                    <p className="text-[11px]">{t.days}: {JSON.parse(promo.days_of_week).map((d: number) => daysOfWeekOptions.find(opt => opt.value === d)?.label.substring(0, 3)).join(', ')}</p>
                  )}
                  {promo.start_time && promo.end_time && <p className="text-[11px]">{t.time}: {promo.start_time} - {promo.end_time}</p>}
                  {(promo.start_date || promo.end_date) && (
                    <p className="text-[11px]">{t.activePeriod}: {promo.start_date || '...'} {t.to} {promo.end_date || '...'}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="p-6 border-b border-black/10 dark:border-white/10 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {editingPromo ? t.editPromotion : t.createPromotion}
                </h2>
                <div className="flex items-center gap-2 mt-2">
                  {[1, 2, 3].map((step) => (
                    <div key={step} className="flex items-center">
                      <div className="flex flex-col items-center gap-1">
                        <div className={clsx(
                          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors",
                          currentStep === step ? "bg-indigo-500 text-white" : 
                          currentStep > step ? "bg-emerald-500 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                        )}>
                          {step}
                        </div>
                        <span className={clsx(
                          "text-[10px] font-medium uppercase tracking-wider",
                          currentStep === step ? "text-indigo-500" : "text-slate-400"
                        )}>
                          {step === 1 ? t.step1 : step === 2 ? t.step2 : t.step3}
                        </span>
                      </div>
                      {step < 3 && <div className={clsx("w-8 h-0.5 mx-2 -mt-4", currentStep > step ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700")} />}
                    </div>
                  ))}
                </div>
              </div>
              <button 
                onClick={() => setShowAddModal(false)} 
                className="text-slate-400 dark:text-white/40 hover:text-slate-900 dark:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              <form id="promo-form" onSubmit={handleSave} className="space-y-6">
                {currentStep === 1 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t.name}</label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={e => setFormData({ ...formData, name: e.target.value })}
                          className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                          placeholder="e.g., Weekend Special"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t.description}</label>
                        <textarea
                          value={formData.description}
                          onChange={e => setFormData({ ...formData, description: e.target.value })}
                          className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                          rows={2}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t.type}</label>
                        <select
                          value={formData.type}
                          onChange={e => setFormData({ ...formData, type: e.target.value })}
                          className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        >
                          <optgroup label={t.bundleMultiBuy}>
                            <option value="buy_x_get_y">{t.buyXGetY}</option>
                            <option value="fixed_price">{t.fixedPriceType}</option>
                            <option value="bogo">{t.bogo}</option>
                          </optgroup>
                          <optgroup label={t.timeBasedMarkdown}>
                            <option value="percentage">{t.percentageDiscount}</option>
                            <option value="time_based">{t.timeBasedMarkdown}</option>
                          </optgroup>
                        </select>
                      </div>

                      <div className="flex items-end pb-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.is_active}
                            onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                            className="w-5 h-5 rounded border-slate-300 text-indigo-500 focus:ring-indigo-500"
                          />
                          <span className="text-slate-700 dark:text-slate-300 font-medium">{t.active}</span>
                        </label>
                      </div>
                    </div>
                  </motion.div>
                )}

                {currentStep === 2 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                    {(formData.type === 'buy_x_get_y' || formData.type === 'fixed_price' || formData.type === 'bogo') && (
                      <div className="grid grid-cols-2 gap-6 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t.buyQty}</label>
                          <input
                            type="number"
                            value={formData.type === 'bogo' && !formData.buy_qty ? '1' : formData.buy_qty}
                            onChange={e => setFormData({ ...formData, buy_qty: e.target.value })}
                            className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                            placeholder="e.g., 3"
                          />
                        </div>
                        {formData.type === 'buy_x_get_y' && (
                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t.getQty}</label>
                            <input
                              type="number"
                              value={formData.get_qty}
                              onChange={e => setFormData({ ...formData, get_qty: e.target.value })}
                              className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                              placeholder="e.g., 1"
                            />
                          </div>
                        )}
                        {formData.type === 'bogo' && (
                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t.getQty}</label>
                            <input
                              type="number"
                              disabled
                              value="1"
                              className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-3 text-slate-400 dark:text-slate-500 opacity-50 cursor-not-allowed"
                            />
                          </div>
                        )}
                        {formData.type === 'fixed_price' && (
                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t.fixedPrice}</label>
                            <input
                              type="number"
                              value={formData.fixed_price}
                              onChange={e => setFormData({ ...formData, fixed_price: e.target.value })}
                              className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                              placeholder="e.g., 35000"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {(formData.type === 'time_based' || formData.type === 'percentage') && (
                      <div className="space-y-6 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t.discountPercent}</label>
                            <input
                              type="number"
                              value={formData.discount_percent}
                              onChange={e => setFormData({ ...formData, discount_percent: e.target.value })}
                              className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                              placeholder="e.g., 20"
                            />
                          </div>
                          {formData.type === 'time_based' && (
                            <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t.discountAmount}</label>
                              <input
                                type="number"
                                value={formData.discount_amount}
                                onChange={e => setFormData({ ...formData, discount_amount: e.target.value })}
                                className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                placeholder="e.g., 5000"
                              />
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">{t.applicableDays}</label>
                          <div className="flex flex-wrap gap-2">
                            {daysOfWeekOptions.map(day => (
                              <button
                                key={day.value}
                                type="button"
                                onClick={() => toggleDay(day.value)}
                                className={clsx(
                                  "px-4 py-2 rounded-xl text-sm font-medium transition-colors border",
                                  formData.days_of_week.includes(day.value)
                                    ? "bg-indigo-500 text-white border-indigo-500"
                                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-500"
                                )}
                              >
                                {day.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t.startTime}</label>
                            <input
                              type="time"
                              value={formData.start_time}
                              onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                              className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t.endTime}</label>
                            <input
                              type="time"
                              value={formData.end_time}
                              onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                              className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-6 p-6 bg-indigo-500/5 rounded-2xl border border-indigo-500/20">
                      <h4 className="text-sm font-bold text-indigo-500 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {t.scheduling}
                      </h4>
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t.startDate}</label>
                          <input
                            type="date"
                            value={formData.start_date}
                            onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                            className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t.endDate}</label>
                          <input
                            type="date"
                            value={formData.end_date}
                            onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                            className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {currentStep === 3 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t.applicableProducts}</label>
                        <button
                          type="button"
                          onClick={() => {
                            if (formData.product_ids.length === products.length) {
                              setFormData({ ...formData, product_ids: [] });
                            } else {
                              setFormData({ ...formData, product_ids: products.map(p => p.id) });
                            }
                          }}
                          className="text-sm text-indigo-500 hover:text-indigo-600 font-medium"
                        >
                          {formData.product_ids.length === products.length ? t.deselectAll : t.selectAll}
                        </button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-60 overflow-y-auto custom-scrollbar p-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                        {products.map(product => (
                          <label key={product.id} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-indigo-500 transition-colors">
                            <input
                              type="checkbox"
                              checked={formData.product_ids.includes(product.id)}
                              onChange={() => toggleProduct(product.id)}
                              className="w-4 h-4 rounded border-slate-300 text-indigo-500 focus:ring-indigo-500"
                            />
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{product.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </form>
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  if (currentStep === 1) setShowAddModal(false);
                  else setCurrentStep(prev => prev - 1);
                }}
                className="px-6 py-3 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                {currentStep === 1 ? t.cancel : t.back}
              </button>
              <div className="flex gap-3">
                {currentStep < 3 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (currentStep === 1 && !formData.name) {
                        alert(t.enterPromoName);
                        return;
                      }
                      setCurrentStep(prev => prev + 1);
                    }}
                    className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-xl transition-colors shadow-lg shadow-indigo-500/25"
                  >
                    {t.next}
                  </button>
                ) : (
                  <button
                    type="submit"
                    form="promo-form"
                    className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-xl transition-colors shadow-lg shadow-indigo-500/25"
                  >
                    {t.savePromotion}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
