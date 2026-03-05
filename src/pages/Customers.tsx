import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Phone, Award, History, X, ChevronRight, ShoppingBag, Calendar, Search, Filter, ArrowUpDown, Heart, Save } from 'lucide-react';
import { clsx } from 'clsx';
import { useLanguage } from '../i18n';

export default function Customers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerHistory, setCustomerHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name_asc');
  const [segmentFilter, setSegmentFilter] = useState('all');
  const [editingPreferences, setEditingPreferences] = useState(false);
  const [prefValue, setPrefValue] = useState('');
  const { t, lang } = useLanguage();

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/customers');
      const data = await res.json();
      setCustomers(data);
    } catch (error) {
      console.error('Failed to fetch customers', error);
    }
  };

  const fetchHistory = async (id: number) => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/customers/${id}/history`);
      const data = await res.json();
      setCustomerHistory(data);
    } catch (error) {
      console.error('Failed to fetch customer history', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const openCustomerDetails = (customer: any) => {
    setSelectedCustomer(customer);
    setPrefValue(customer.preferences || '');
    setEditingPreferences(false);
    fetchHistory(customer.id);
  };

  const handleSavePreferences = async () => {
    if (!selectedCustomer) return;
    try {
      const res = await fetch(`/api/customers/${selectedCustomer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...selectedCustomer,
          preferences: prefValue
        })
      });
      if (res.ok) {
        setEditingPreferences(false);
        setSelectedCustomer({ ...selectedCustomer, preferences: prefValue });
        fetchCustomers();
      }
    } catch (error) {
      console.error('Failed to save preferences', error);
    }
  };

  const getLoyaltyBadge = (visits: number) => {
    if (visits >= 21) return { name: t.platinum, color: 'bg-indigo-400 text-indigo-900 border-indigo-500', rank: 4 };
    if (visits >= 11) return { name: t.gold, color: 'bg-amber-400 text-amber-900 border-amber-500', rank: 3 };
    if (visits >= 6) return { name: t.silver, color: 'bg-slate-300 text-slate-800 border-slate-400', rank: 2 };
    if (visits >= 1) return { name: t.bronze, color: 'bg-orange-300 text-orange-900 border-orange-400', rank: 1 };
    return { name: 'None', color: 'bg-slate-100 text-slate-500 border-slate-200', rank: 0 };
  };

  const filteredAndSortedCustomers = useMemo(() => {
    let result = [...customers];

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.name.toLowerCase().includes(q) || 
        (c.phone && c.phone.includes(q))
      );
    }

    // Segment Filter
    if (segmentFilter !== 'all') {
      result = result.filter(c => {
        const visits = c.total_visits || 0;
        if (segmentFilter === 'high_value') return visits >= 20;
        if (segmentFilter === 'new_customers') return visits <= 2;
        if (segmentFilter === 'loyal') return visits >= 10;
        return true;
      });
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name_desc') return b.name.localeCompare(a.name);
      if (sortBy === 'visits_desc') return (b.total_visits || 0) - (a.total_visits || 0);
      if (sortBy === 'visits_asc') return (a.total_visits || 0) - (b.total_visits || 0);
      if (sortBy === 'badge_desc') return getLoyaltyBadge(b.loyalty_visits || 0).rank - getLoyaltyBadge(a.loyalty_visits || 0).rank;
      return 0;
    });

    return result;
  }, [customers, searchQuery, sortBy, segmentFilter, t]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto space-y-8"
    >
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{t.customersTitle}</h1>
        <p className="text-slate-500 dark:text-white/60 mt-1">{t.customersSubtitle}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder={t.searchCustomers}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          />
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2">
          <ArrowUpDown className="w-5 h-5 text-slate-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-transparent border-none focus:ring-0 text-slate-700 dark:text-slate-200 text-sm w-full"
          >
            <option value="name_asc">{t.nameAZ}</option>
            <option value="name_desc">{t.nameZA}</option>
            <option value="visits_desc">{t.mostVisits}</option>
            <option value="visits_asc">{t.leastVisits}</option>
            <option value="badge_desc">{t.highestBadge}</option>
          </select>
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2">
          <Filter className="w-5 h-5 text-slate-400" />
          <select
            value={segmentFilter}
            onChange={(e) => setSegmentFilter(e.target.value)}
            className="bg-transparent border-none focus:ring-0 text-slate-700 dark:text-slate-200 text-sm w-full"
          >
            <option value="all">{t.all} {t.segments}</option>
            <option value="high_value">{t.highValue}</option>
            <option value="new_customers">{t.newCustomers}</option>
            <option value="loyal">{t.loyalCustomers}</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="py-4 px-4 text-sm font-semibold text-slate-600 dark:text-slate-300">{t.customer}</th>
                <th className="py-4 px-4 text-sm font-semibold text-slate-600 dark:text-slate-300">{t.contact}</th>
                <th className="py-4 px-4 text-sm font-semibold text-slate-600 dark:text-slate-300">{t.totalVisits}</th>
                <th className="py-4 px-4 text-sm font-semibold text-slate-600 dark:text-slate-300">{t.loyaltyVisits}</th>
                <th className="py-4 px-4 text-sm font-semibold text-slate-600 dark:text-slate-300">{t.loyaltyBadge}</th>
                <th className="py-4 px-4 text-sm font-semibold text-slate-600 dark:text-slate-300 text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedCustomers.map(customer => {
                const badge = getLoyaltyBadge(customer.loyalty_visits || 0);
                return (
                  <tr key={customer.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-slate-900 dark:text-white font-medium">{customer.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <Phone className="w-4 h-4" />
                        <span>{customer.phone || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-slate-900 dark:text-white font-medium">
                      {customer.total_visits || 0}
                    </td>
                    <td className="py-4 px-4 text-slate-500 dark:text-slate-400 text-sm">
                      {customer.loyalty_visits || 0}
                    </td>
                    <td className="py-4 px-4">
                      <span className={clsx(
                        "px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1 w-max",
                        badge.color
                      )}>
                        <Award className="w-3 h-3" />
                        {badge.name}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => openCustomerDetails(customer)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl font-medium transition-colors"
                      >
                        <History className="w-4 h-4" />
                        {t.viewHistory}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredAndSortedCustomers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 dark:text-slate-400">
                    {t.noCustomersFound}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Details Modal */}
      <AnimatePresence>
        {selectedCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-start bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-2xl">
                    {selectedCustomer.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedCustomer.name}</h2>
                    <div className="flex items-center gap-4 mt-1 text-sm text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1"><Phone className="w-4 h-4" /> {selectedCustomer.phone || 'N/A'}</span>
                      <span className="flex items-center gap-1"><History className="w-4 h-4" /> {selectedCustomer.total_visits || 0} {t.visits}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedCustomer(null)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/50 dark:bg-slate-900">
                {/* Preferences Section */}
                <div className="mb-8 bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Heart className="w-5 h-5 text-rose-500" />
                      {t.preferences}
                    </h3>
                    {!editingPreferences ? (
                      <button 
                        onClick={() => setEditingPreferences(true)}
                        className="text-indigo-500 hover:text-indigo-600 text-sm font-medium"
                      >
                        {t.edit}
                      </button>
                    ) : (
                      <button 
                        onClick={handleSavePreferences}
                        className="flex items-center gap-1 bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        {t.savePreferences}
                      </button>
                    )}
                  </div>
                  
                  {editingPreferences ? (
                    <textarea
                      value={prefValue}
                      onChange={(e) => setPrefValue(e.target.value)}
                      placeholder={t.preferencesPlaceholder}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
                    />
                  ) : (
                    <p className="text-slate-600 dark:text-slate-300 italic">
                      {selectedCustomer.preferences || t.noPurchaseHistory.replace(t.purchaseHistory, t.preferences)}
                    </p>
                  )}
                </div>

                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-indigo-500" />
                  {t.purchaseHistory}
                </h3>

                {loadingHistory ? (
                  <div className="flex justify-center py-8">
                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : customerHistory.length > 0 ? (
                  <div className="space-y-4">
                    {customerHistory.map((tx) => (
                      <div key={tx.id} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-100 dark:border-slate-700">
                          <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                            <Calendar className="w-4 h-4" />
                            <span className="font-medium">{new Date(tx.created_at).toLocaleString(lang === 'id' ? 'id-ID' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm text-slate-500 dark:text-slate-400 block">{t.total}</span>
                            <span className="font-bold text-slate-900 dark:text-white">Rp {tx.total_amount.toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {tx.items.map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center text-sm">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-medium text-slate-600 dark:text-slate-300">
                                  {item.qty}x
                                </span>
                                <span className="text-slate-700 dark:text-slate-200">{item.product_name}</span>
                              </div>
                              <span className="text-slate-600 dark:text-slate-400">Rp {(item.qty * item.unit_price).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                    {t.noPurchaseHistory}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
