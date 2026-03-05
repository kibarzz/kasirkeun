import { useState, useEffect, FormEvent } from 'react';
import { motion } from 'motion/react';
import { Package, Plus, AlertTriangle, RefreshCw, Trash2, Search, X } from 'lucide-react';
import { clsx } from 'clsx';
import { useLanguage } from '../i18n';

export default function Inventory() {
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('list'); // list, opname, waste
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newIngredient, setNewIngredient] = useState({
    name: '',
    unit: '',
    stock: '',
    min_stock: '',
    unit_cost: '',
    priority: 'Medium'
  });
  const [formError, setFormError] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  // Opname state
  const [opnameData, setOpnameData] = useState<Record<number, { actual: string, difference: number }>>({});
  const [isSubmittingOpname, setIsSubmittingOpname] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<any>(null);
  const [editIngredient, setEditIngredient] = useState({
    name: '',
    unit: '',
    stock: '',
    min_stock: '',
    unit_cost: '',
    priority: 'Medium'
  });

  // Waste state
  const [wasteForm, setWasteForm] = useState({
    ingredient_id: '',
    qty: '',
    reason: ''
  });
  const [wasteReasonType, setWasteReasonType] = useState('');
  const [wasteError, setWasteError] = useState('');
  const [isSubmittingWaste, setIsSubmittingWaste] = useState(false);

  // Adjust Stock state
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustForm, setAdjustForm] = useState({
    type: 'add',
    qty: '',
    reason: '',
    unit_cost: ''
  });
  const [adjustError, setAdjustError] = useState('');
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    fetchIngredients();
  }, []);

  useEffect(() => {
    if (window.location.hash === '#low-stock-section') {
      const element = document.getElementById('low-stock-section');
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }
  }, [ingredients]);

  const fetchIngredients = () => {
    fetch('/api/ingredients')
      .then(res => res.json())
      .then(data => setIngredients(data));
  };

  const filteredIngredients = ingredients.filter(i => 
    i.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const priorityOrder: Record<string, number> = { 'High': 3, 'Medium': 2, 'Low': 1 };

  const sortedIngredients = [...filteredIngredients].sort((a, b) => {
    if (sortConfig !== null) {
      if (sortConfig.key === 'priority') {
        const aVal = priorityOrder[a.priority || 'Medium'] || 0;
        const bVal = priorityOrder[b.priority || 'Medium'] || 0;
        if (aVal < bVal) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aVal > bVal) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      } else if (sortConfig.key === 'name') {
        const aVal = a.name.toLowerCase();
        const bVal = b.name.toLowerCase();
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      } else if (sortConfig.key === 'stock') {
        if (a.stock < b.stock) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a.stock > b.stock) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      } else if (sortConfig.key === 'unit_cost') {
        if (a.unit_cost < b.unit_cost) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a.unit_cost > b.unit_cost) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      }
    }
    return 0;
  });

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handlePriorityChange = (id: number, newPriority: string) => {
    setIngredients(ingredients.map(item => 
      item.id === id ? { ...item, priority: newPriority } : item
    ));
  };

  const handleOpnameChange = (id: number, actualStr: string, expected: number) => {
    const actual = parseFloat(actualStr);
    const difference = isNaN(actual) ? 0 : actual - expected;
    
    setOpnameData(prev => ({
      ...prev,
      [id]: { actual: actualStr, difference }
    }));
  };

  const submitOpname = async (id: number, expected: number) => {
    const data = opnameData[id];
    if (!data || data.actual === '') return;

    const actual = parseFloat(data.actual);
    if (isNaN(actual)) return;

    setIsSubmittingOpname(true);
    try {
      const response = await fetch('/api/opname', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ingredient_id: id,
          expected_qty: expected,
          actual_qty: actual
        }),
      });

      if (response.ok) {
        // Update local state
        setIngredients(ingredients.map(item => 
          item.id === id ? { ...item, stock: actual } : item
        ));
        // Clear opname input for this item
        const newOpnameData = { ...opnameData };
        delete newOpnameData[id];
        setOpnameData(newOpnameData);
      } else {
        console.error('Failed to submit opname');
      }
    } catch (error) {
      console.error('Error submitting opname:', error);
    } finally {
      setIsSubmittingOpname(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
  };

  const handleAddIngredient = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!newIngredient.name || !newIngredient.unit || !newIngredient.stock || !newIngredient.min_stock || !newIngredient.unit_cost) {
      setFormError(t.allFieldsRequired);
      return;
    }

    const stock = parseFloat(newIngredient.stock);
    const min_stock = parseFloat(newIngredient.min_stock);
    const unit_cost = parseFloat(newIngredient.unit_cost);

    if (isNaN(stock) || isNaN(min_stock) || isNaN(unit_cost)) {
      setFormError(t.invalidNumbers);
      return;
    }

    try {
      const response = await fetch('/api/ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newIngredient.name,
          unit: newIngredient.unit,
          stock,
          min_stock,
          unit_cost,
          priority: newIngredient.priority
        })
      });

      if (response.ok) {
        fetchIngredients();
        setIsAddModalOpen(false);
        setNewIngredient({ name: '', unit: '', stock: '', min_stock: '', unit_cost: '', priority: 'Medium' });
      } else {
        setFormError(t.failedToAdd);
      }
    } catch (err) {
      setFormError(t.errorOccurred);
    }
  };

  const handleEditIngredient = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!editIngredient.name || !editIngredient.unit || !editIngredient.stock || !editIngredient.min_stock || !editIngredient.unit_cost) {
      setFormError(t.allFieldsRequired);
      return;
    }

    const stock = parseFloat(editIngredient.stock);
    const min_stock = parseFloat(editIngredient.min_stock);
    const unit_cost = parseFloat(editIngredient.unit_cost);

    if (isNaN(stock) || isNaN(min_stock) || isNaN(unit_cost)) {
      setFormError(t.invalidNumbers);
      return;
    }

    try {
      const response = await fetch(`/api/ingredients/${selectedIngredient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editIngredient.name,
          unit: editIngredient.unit,
          stock,
          min_stock,
          unit_cost,
          priority: editIngredient.priority
        })
      });

      if (response.ok) {
        fetchIngredients();
        setIsEditModalOpen(false);
      } else {
        setFormError(t.failedToUpdate);
      }
    } catch (err) {
      setFormError(t.errorOccurred);
    }
  };

  const handleLogWaste = async (e: FormEvent) => {
    e.preventDefault();
    setWasteError('');

    if (!wasteForm.ingredient_id || !wasteForm.qty || !wasteForm.reason) {
      setWasteError(t.allFieldsRequired);
      return;
    }

    const qty = parseFloat(wasteForm.qty);
    if (isNaN(qty) || qty <= 0) {
      setWasteError(t.invalidQuantity);
      return;
    }

    setIsSubmittingWaste(true);
    try {
      const response = await fetch('/api/waste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredient_id: parseInt(wasteForm.ingredient_id),
          qty,
          reason: wasteForm.reason
        })
      });

      if (response.ok) {
        fetchIngredients();
        setWasteForm({ ingredient_id: '', qty: '', reason: '' });
        setWasteReasonType('');
        // Show success message or just clear form
      } else {
        setWasteError(t.failedToLogWaste);
      }
    } catch (err) {
      setWasteError(t.errorOccurred);
    } finally {
      setIsSubmittingWaste(false);
    }
  };

  const handleAdjustStock = async (e: FormEvent) => {
    e.preventDefault();
    setAdjustError('');

    if (!adjustForm.qty || !adjustForm.reason) {
      setAdjustError(t.allFieldsRequired);
      return;
    }

    const qty = parseFloat(adjustForm.qty);
    if (isNaN(qty) || qty <= 0) {
      setAdjustError(t.invalidQuantity);
      return;
    }

    if (adjustForm.type === 'remove' && qty > selectedIngredient.stock) {
      setAdjustError(t.cannotRemoveMore);
      return;
    }

    setIsSubmittingAdjust(true);
    try {
      const response = await fetch('/api/adjust-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredient_id: selectedIngredient.id,
          type: adjustForm.type,
          qty,
          reason: adjustForm.reason,
          unit_cost: adjustForm.type === 'add' ? parseFloat(adjustForm.unit_cost) : undefined
        })
      });

      if (response.ok) {
        fetchIngredients();
        setIsAdjustModalOpen(false);
        setAdjustForm({ type: 'add', qty: '', reason: '', unit_cost: '' });
      } else {
        setAdjustError(t.failedToAdjust);
      }
    } catch (err) {
      setAdjustError(t.errorOccurred);
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
    setNewIngredient({ name: '', unit: '', stock: '', min_stock: '', unit_cost: '', priority: 'Medium' });
    setFormError('');
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditIngredient({ name: '', unit: '', stock: '', min_stock: '', unit_cost: '', priority: 'Medium' });
    setFormError('');
  };

  const closeAdjustModal = () => {
    setIsAdjustModalOpen(false);
    setAdjustForm({ type: 'add', qty: '', reason: '', unit_cost: '' });
    setAdjustError('');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 min-h-full lg:h-full flex flex-col"
    >
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{t.inventoryTitle}</h1>
        <p className="text-slate-500 dark:text-white/60 mt-1">{t.inventorySubtitle}</p>
      </header>

      {ingredients.filter(i => i.stock <= i.min_stock).length > 0 && (
        <div id="low-stock-section" className="mb-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 lg:p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            <h2 className="text-lg font-semibold text-rose-400">{t.lowStockAlerts}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ingredients.filter(i => i.stock <= i.min_stock).map(item => (
              <div key={item.id} className="bg-rose-500/5 border border-rose-500/10 rounded-xl p-4 flex justify-between items-center">
                <div>
                  <h3 className="text-slate-900 dark:text-white font-medium">{item.name}</h3>
                  <p className="text-slate-500 dark:text-white/60 text-sm mt-1">{t.min}: {item.min_stock} {item.unit}</p>
                </div>
                <div className="text-right">
                  <span className="text-rose-400 font-bold text-lg">{item.stock}</span>
                  <span className="text-slate-400 dark:text-white/40 text-sm ml-1">{item.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex border-b border-black/10 dark:border-white/10 w-full overflow-x-auto no-scrollbar mb-6">
        {['list', 'opname', 'waste'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={clsx(
              'px-6 py-3 text-sm font-medium capitalize transition-all whitespace-nowrap border-b-2',
              activeTab === tab ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 dark:text-white/40 hover:text-slate-600 dark:text-white/80 hover:border-black/20 dark:border-white/20'
            )}
          >
            {tab === 'list' ? t.list : tab === 'opname' ? t.opname : t.waste}
          </button>
        ))}
      </div>

      <div className="flex-1 bg-black/5 dark:bg-white/5 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-3xl p-4 lg:p-6 shadow-2xl flex flex-col overflow-hidden relative min-h-0">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />
        
        {activeTab === 'list' && (
          <>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 relative z-10">
              <div className="relative w-full md:w-auto">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40" />
                <input 
                  type="text" 
                  placeholder={t.searchIngredients} 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-100 dark:bg-slate-800 border-0 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 w-full md:w-64 transition-all"
                />
              </div>
              
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="w-full md:w-auto justify-center bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-lg shadow-emerald-500/20"
              >
                <Plus className="w-4 h-4" /> {t.addIngredient}
              </button>
            </div>

            <div className="flex-1 overflow-auto relative z-10 custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="border-b border-black/10 dark:border-white/10 text-slate-500 dark:text-white/50 text-sm uppercase tracking-wider">
                    <th 
                      className="pb-3 font-medium pl-4 cursor-pointer hover:text-slate-900 dark:text-white transition-colors"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-1">
                        {t.name}
                        {sortConfig?.key === 'name' && (
                          <span className="text-emerald-400">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="pb-3 font-medium cursor-pointer hover:text-slate-900 dark:text-white transition-colors"
                      onClick={() => handleSort('stock')}
                    >
                      <div className="flex items-center gap-1">
                        {t.stock}
                        {sortConfig?.key === 'stock' && (
                          <span className="text-emerald-400">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th className="pb-3 font-medium">{t.unit}</th>
                    <th 
                      className="pb-3 font-medium cursor-pointer hover:text-slate-900 dark:text-white transition-colors"
                      onClick={() => handleSort('unit_cost')}
                    >
                      <div className="flex items-center gap-1">
                        {t.unitCost}
                        {sortConfig?.key === 'unit_cost' && (
                          <span className="text-emerald-400">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th className="pb-3 font-medium">{t.status}</th>
                    <th 
                      className="pb-3 font-medium cursor-pointer hover:text-slate-900 dark:text-white transition-colors"
                      onClick={() => handleSort('priority')}
                    >
                      <div className="flex items-center gap-1">
                        {t.priority}
                        {sortConfig?.key === 'priority' && (
                          <span className="text-emerald-400">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th className="pb-3 font-medium text-right pr-4">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="text-slate-900 dark:text-white/90">
                  {sortedIngredients.map(item => (
                    <tr key={item.id} className="border-b border-black/5 dark:border-white/5 hover:bg-black/5 dark:bg-white/5 transition-colors group">
                      <td className="py-4 pl-4 font-medium text-slate-900 dark:text-white">{item.name}</td>
                      <td className="py-4 font-mono text-slate-900 dark:text-white">
                        <span className={item.stock <= item.min_stock ? 'text-rose-500 font-bold' : ''}>
                          {item.stock}
                        </span>
                      </td>
                      <td className="py-4 text-slate-500 dark:text-white/60">{item.unit}</td>
                      <td className="py-4 font-mono text-emerald-500 dark:text-emerald-400">{formatCurrency(item.unit_cost)}</td>
                      <td className="py-4">
                        {item.stock <= item.min_stock ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-rose-500/20 text-rose-500 dark:text-rose-400 text-xs font-medium border border-rose-500/20">
                            <AlertTriangle className="w-3 h-3" /> {t.lowStock}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 text-xs font-medium border border-emerald-500/20">
                            {t.good}
                          </span>
                        )}
                      </td>
                      <td className="py-4">
                        <select 
                          value={item.priority || 'Medium'}
                          onChange={(e) => handlePriorityChange(item.id, e.target.value)}
                          className={clsx(
                            "bg-slate-100 dark:bg-slate-800 border-0 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-colors cursor-pointer",
                            (item.priority || 'Medium') === 'High' ? 'text-rose-400' : 
                            (item.priority || 'Medium') === 'Medium' ? 'text-amber-400' : 
                            'text-emerald-400'
                          )}
                        >
                          <option value="Low" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{t.low}</option>
                          <option value="Medium" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{t.medium}</option>
                          <option value="High" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{t.high}</option>
                        </select>
                      </td>
                      <td className="py-4 text-right pr-4">
                        <button 
                          onClick={() => {
                            setSelectedIngredient(item);
                            setIsAdjustModalOpen(true);
                          }}
                          className="text-slate-400 dark:text-white/40 hover:text-slate-900 dark:text-white transition-colors p-2 mr-2"
                        >
                          {t.adjust}
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedIngredient(item);
                            setEditIngredient({
                              name: item.name,
                              unit: item.unit,
                              stock: item.stock.toString(),
                              min_stock: item.min_stock.toString(),
                              unit_cost: item.unit_cost.toString(),
                              priority: item.priority || 'Medium'
                            });
                            setIsEditModalOpen(true);
                          }}
                          className="text-slate-400 dark:text-white/40 hover:text-slate-900 dark:text-white transition-colors p-2"
                        >
                          {t.edit}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'opname' && (
          <div className="flex-1 overflow-auto relative z-10 custom-scrollbar">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">{t.stockOpname}</h2>
              <p className="text-slate-500 dark:text-white/60 max-w-2xl">
                {t.stockOpnameDesc}
              </p>
            </div>
            
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-black/10 dark:border-white/10 text-slate-500 dark:text-white/50 text-sm uppercase tracking-wider">
                  <th className="pb-3 font-medium pl-4">{t.ingredient}</th>
                  <th className="pb-3 font-medium">{t.expectedSystem}</th>
                  <th className="pb-3 font-medium">{t.actualPhysical}</th>
                  <th className="pb-3 font-medium">{t.difference}</th>
                  <th className="pb-3 font-medium text-right pr-4">{t.action}</th>
                </tr>
              </thead>
              <tbody className="text-slate-900 dark:text-white/90">
                {filteredIngredients.map(item => {
                  const data = opnameData[item.id];
                  const hasInput = data && data.actual !== '';
                  
                  return (
                    <tr key={item.id} className="border-b border-black/5 dark:border-white/5 hover:bg-black/5 dark:bg-white/5 transition-colors group">
                      <td className="py-4 pl-4 font-medium text-slate-900 dark:text-white">{item.name}</td>
                      <td className="py-4 font-mono text-slate-500 dark:text-white/60">
                        {item.stock} {item.unit}
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <input 
                            type="number"
                            step="any"
                            value={data?.actual ?? ''}
                            onChange={(e) => handleOpnameChange(item.id, e.target.value, item.stock)}
                            placeholder="0"
                            className="w-24 bg-slate-100 dark:bg-slate-800 border-0 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-mono"
                          />
                          <span className="text-slate-400 dark:text-white/40 text-sm">{item.unit}</span>
                        </div>
                      </td>
                      <td className="py-4 font-mono">
                        {hasInput ? (
                          <span className={clsx(
                            data.difference > 0 ? 'text-emerald-400' : 
                            data.difference < 0 ? 'text-rose-400' : 
                            'text-slate-400 dark:text-white/40'
                          )}>
                            {data.difference > 0 ? '+' : ''}{data.difference}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-white/20">-</span>
                        )}
                      </td>
                      <td className="py-4 text-right pr-4">
                        <button 
                          onClick={() => submitOpname(item.id, item.stock)}
                          disabled={!hasInput || isSubmittingOpname}
                          className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-black/5 dark:bg-white/5 disabled:text-slate-300 dark:text-white/20 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
                        >
                          {t.adjustStockButton}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'waste' && (
          <div className="flex-1 overflow-auto relative z-10 custom-scrollbar">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">{t.wasteLogging}</h2>
              <p className="text-slate-500 dark:text-white/60 max-w-2xl">
                {t.wasteLoggingDesc}
              </p>
            </div>
            
            <div className="max-w-xl">
              <form onSubmit={handleLogWaste} className="space-y-4 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 p-6 rounded-2xl">
                {wasteError && (
                  <div className="p-3 rounded-lg bg-rose-500/20 border border-rose-500/20 text-rose-400 text-sm">
                    {wasteError}
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-white/60 mb-1">{t.ingredient}</label>
                  <select 
                    value={wasteForm.ingredient_id}
                    onChange={e => setWasteForm({...wasteForm, ingredient_id: e.target.value})}
                    className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                  >
                    <option value="" className="bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400">{t.selectIngredient}</option>
                    {ingredients.map(ing => (
                      <option key={ing.id} value={ing.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                        {ing.name} ({t.stock}: {ing.stock} {ing.unit})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-white/60 mb-1">{t.quantityWasted}</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="number" 
                      step="any"
                      value={wasteForm.qty}
                      onChange={e => setWasteForm({...wasteForm, qty: e.target.value})}
                      className="flex-1 bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50 font-mono"
                      placeholder="0"
                    />
                    <span className="text-slate-400 dark:text-white/40 w-12">
                      {wasteForm.ingredient_id ? ingredients.find(i => i.id.toString() === wasteForm.ingredient_id)?.unit : '-'}
                    </span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-white/60 mb-1">{t.reason}</label>
                  <div className="space-y-3">
                    <select 
                      value={wasteReasonType}
                      onChange={e => {
                        setWasteReasonType(e.target.value);
                        if (e.target.value !== 'Other') {
                          setWasteForm({...wasteForm, reason: e.target.value});
                        } else {
                          setWasteForm({...wasteForm, reason: ''});
                        }
                      }}
                      className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                    >
                      <option value="" className="bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400">{t.selectReason}</option>
                      <option value="Spilled" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{t.spilled}</option>
                      <option value="Expired" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{t.expired}</option>
                      <option value="Burnt" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{t.burnt}</option>
                      <option value="Quality Issue" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{t.qualityIssue}</option>
                      <option value="Other" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{t.other}</option>
                    </select>
                    {wasteReasonType === 'Other' && (
                      <input 
                        type="text" 
                        value={wasteForm.reason}
                        onChange={e => setWasteForm({...wasteForm, reason: e.target.value})}
                        className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                        placeholder={t.pleaseSpecify}
                      />
                    )}
                  </div>
                </div>
                
                <div className="pt-4">
                  <button 
                    type="submit"
                    disabled={isSubmittingWaste}
                    className="w-full bg-rose-500 hover:bg-rose-400 disabled:bg-rose-500/50 text-white px-4 py-2 rounded-xl font-medium transition-colors shadow-lg shadow-rose-500/20 flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" /> {t.logWaste}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="flex justify-between items-center p-6 border-b border-black/10 dark:border-white/10">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{t.addNewIngredient}</h2>
              <button 
                onClick={closeAddModal}
                className="text-slate-400 dark:text-white/40 hover:text-slate-900 dark:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddIngredient} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-500/20 border border-rose-500/20 text-rose-400 text-sm">
                  {formError}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-white/60 mb-1">{t.name}</label>
                <input 
                  type="text" 
                  value={newIngredient.name}
                  onChange={e => setNewIngredient({...newIngredient, name: e.target.value})}
                  className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  placeholder="e.g. Espresso Beans"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-white/60 mb-1">{t.unit}</label>
                <input 
                  type="text" 
                  value={newIngredient.unit}
                  onChange={e => setNewIngredient({...newIngredient, unit: e.target.value})}
                  className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  placeholder="e.g. kg, liters, pcs"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-white/60 mb-1">{t.initialStock}</label>
                  <input 
                    type="number" 
                    step="any"
                    value={newIngredient.stock}
                    onChange={e => setNewIngredient({...newIngredient, stock: e.target.value})}
                    className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-white/60 mb-1">{t.minStock}</label>
                  <input 
                    type="number" 
                    step="any"
                    value={newIngredient.min_stock}
                    onChange={e => setNewIngredient({...newIngredient, min_stock: e.target.value})}
                    className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    placeholder="0"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-white/60 mb-1">{t.unitCost} (IDR)</label>
                <input 
                  type="number" 
                  step="any"
                  value={newIngredient.unit_cost}
                  onChange={e => setNewIngredient({...newIngredient, unit_cost: e.target.value})}
                  className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-white/60 mb-1">{t.priority}</label>
                <select 
                  value={newIngredient.priority}
                  onChange={e => setNewIngredient({...newIngredient, priority: e.target.value})}
                  className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option value="Low" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{t.low}</option>
                  <option value="Medium" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{t.medium}</option>
                  <option value="High" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{t.high}</option>
                </select>
              </div>
              
              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={closeAddModal}
                  className="flex-1 px-4 py-2 rounded-xl font-medium text-slate-500 dark:text-white/60 hover:text-slate-900 dark:text-white hover:bg-black/5 dark:bg-white/5 transition-colors"
                >
                  {t.cancel}
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded-xl font-medium transition-colors shadow-lg shadow-emerald-500/20"
                >
                  {t.saveIngredient}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      {isEditModalOpen && selectedIngredient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="flex justify-between items-center p-6 border-b border-black/10 dark:border-white/10">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{t.editIngredient}</h2>
              <button 
                onClick={closeEditModal}
                className="text-slate-400 dark:text-white/40 hover:text-slate-900 dark:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleEditIngredient} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-500/20 border border-rose-500/20 text-rose-400 text-sm">
                  {formError}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-white/60 mb-1">{t.name}</label>
                <input 
                  type="text" 
                  value={editIngredient.name}
                  onChange={e => setEditIngredient({...editIngredient, name: e.target.value})}
                  className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  placeholder="e.g. Espresso Beans"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-white/60 mb-1">{t.unit}</label>
                <input 
                  type="text" 
                  value={editIngredient.unit}
                  onChange={e => setEditIngredient({...editIngredient, unit: e.target.value})}
                  className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  placeholder="e.g. kg, liters, pcs"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-white/60 mb-1">{t.stock}</label>
                  <input 
                    type="number" 
                    step="any"
                    value={editIngredient.stock}
                    onChange={e => setEditIngredient({...editIngredient, stock: e.target.value})}
                    className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-white/60 mb-1">{t.minStock}</label>
                  <input 
                    type="number" 
                    step="any"
                    value={editIngredient.min_stock}
                    onChange={e => setEditIngredient({...editIngredient, min_stock: e.target.value})}
                    className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    placeholder="0"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-white/60 mb-1">{t.unitCost} (IDR)</label>
                <input 
                  type="number" 
                  step="any"
                  value={editIngredient.unit_cost}
                  onChange={e => setEditIngredient({...editIngredient, unit_cost: e.target.value})}
                  className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-white/60 mb-1">{t.priority}</label>
                <select 
                  value={editIngredient.priority}
                  onChange={e => setEditIngredient({...editIngredient, priority: e.target.value})}
                  className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option value="Low" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{t.low}</option>
                  <option value="Medium" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{t.medium}</option>
                  <option value="High" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{t.high}</option>
                </select>
              </div>
              
              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={closeEditModal}
                  className="flex-1 px-4 py-2 rounded-xl font-medium text-slate-500 dark:text-white/60 hover:text-slate-900 dark:text-white hover:bg-black/5 dark:bg-white/5 transition-colors"
                >
                  {t.cancel}
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded-xl font-medium transition-colors shadow-lg shadow-emerald-500/20"
                >
                  {t.saveChanges}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      {isAdjustModalOpen && selectedIngredient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="flex justify-between items-center p-6 border-b border-black/10 dark:border-white/10">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{t.adjustStockTitle}: {selectedIngredient.name}</h2>
              <button 
                onClick={closeAdjustModal}
                className="text-slate-400 dark:text-white/40 hover:text-slate-900 dark:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAdjustStock} className="p-6 space-y-4">
              {adjustError && (
                <div className="p-3 rounded-lg bg-rose-500/20 border border-rose-500/20 text-rose-400 text-sm">
                  {adjustError}
                </div>
              )}
              
              <div className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl p-4 mb-4">
                <div className="text-sm text-slate-500 dark:text-white/60 mb-1">{t.currentStock}</div>
                <div className="text-2xl font-mono text-slate-900 dark:text-white">{selectedIngredient.stock} <span className="text-lg text-slate-400 dark:text-white/40">{selectedIngredient.unit}</span></div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-white/60 mb-1">{t.adjustmentType}</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAdjustForm({...adjustForm, type: 'add'})}
                    className={clsx(
                      "px-4 py-2 rounded-xl font-medium transition-colors border",
                      adjustForm.type === 'add' 
                        ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" 
                        : "bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-slate-500 dark:text-white/60 hover:text-slate-900 dark:text-white"
                    )}
                  >
                    {t.addStock}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustForm({...adjustForm, type: 'remove'})}
                    className={clsx(
                      "px-4 py-2 rounded-xl font-medium transition-colors border",
                      adjustForm.type === 'remove' 
                        ? "bg-rose-500/20 border-rose-500/50 text-rose-400" 
                        : "bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-slate-500 dark:text-white/60 hover:text-slate-900 dark:text-white"
                    )}
                  >
                    {t.removeStock}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-white/60 mb-1">{adjustForm.type === 'add' ? t.quantityToAdd : t.quantityToRemove}</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="number" 
                    step="any"
                    value={adjustForm.qty}
                    onChange={e => setAdjustForm({...adjustForm, qty: e.target.value})}
                    className="flex-1 bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-mono"
                    placeholder="0"
                  />
                  <span className="text-slate-400 dark:text-white/40 w-12">{selectedIngredient.unit}</span>
                </div>
              </div>

              {adjustForm.type === 'add' && (
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-white/60 mb-1">{t.unitCost} (IDR)</label>
                  <input 
                    type="number" 
                    step="any"
                    value={adjustForm.unit_cost}
                    onChange={e => setAdjustForm({...adjustForm, unit_cost: e.target.value})}
                    className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-mono"
                    placeholder={selectedIngredient.unit_cost.toString()}
                  />
                  <p className="text-xs text-slate-500 dark:text-white/40 mt-1">
                    {t.unitCost} {t.per} {selectedIngredient.unit}
                  </p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-white/60 mb-1">{t.reason}</label>
                <input 
                  type="text" 
                  value={adjustForm.reason}
                  onChange={e => setAdjustForm({...adjustForm, reason: e.target.value})}
                  className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  placeholder="e.g. Received new shipment, Found extra stock"
                />
              </div>
              
              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={closeAdjustModal}
                  className="flex-1 px-4 py-2 rounded-xl font-medium text-slate-500 dark:text-white/60 hover:text-slate-900 dark:text-white hover:bg-black/5 dark:bg-white/5 transition-colors"
                >
                  {t.cancel}
                </button>
                <button 
                  type="submit"
                  disabled={isSubmittingAdjust}
                  className={clsx(
                    "flex-1 text-slate-900 dark:text-white px-4 py-2 rounded-xl font-medium transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed",
                    adjustForm.type === 'add' 
                      ? "bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/20" 
                      : "bg-rose-500 hover:bg-rose-400 shadow-rose-500/20"
                  )}
                >
                  {t.confirmAdjustment}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
