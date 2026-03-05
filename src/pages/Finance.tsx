import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { DollarSign, Plus, Trash2, Calendar, FileText, Download } from 'lucide-react';
import { clsx } from 'clsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useLanguage } from '../i18n';

export default function Finance() {
  const { t } = useLanguage();
  const [costs, setCosts] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCost, setNewCost] = useState({ name: '', type: 'Fixed', amount: '', period: 'Monthly' });
  const [activeTab, setActiveTab] = useState<'expenses' | 'sales'>('sales');

  // Sales Report State
  const [salesReport, setSalesReport] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchCosts();
    fetchSalesReport();
  }, [dateRange]);

  const fetchSalesReport = async () => {
    try {
      const res = await fetch(`/api/sales-report?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setSalesReport(data);
    } catch (error) {
      console.error('Failed to fetch sales report:', error);
    }
  };

  const fetchCosts = async () => {
    try {
      const res = await fetch('/api/overhead');
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setCosts(data);
    } catch (error) {
      console.error('Failed to fetch costs:', error);
    }
  };

  const handleAddCost = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/overhead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newCost,
        amount: parseFloat(newCost.amount)
      })
    });
    setShowAddModal(false);
    setNewCost({ name: '', type: 'Fixed', amount: '', period: 'Monthly' });
    fetchCosts();
  };

  const handleDeleteCost = async (id: number) => {
    if (confirm(t.confirmDeleteCost)) {
      await fetch(`/api/overhead/${id}`, { method: 'DELETE' });
      fetchCosts();
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
  };

  const totalFixed = costs.filter(c => c.type === 'Fixed').reduce((sum, c) => sum + c.amount, 0);
  const totalVariable = costs.filter(c => c.type === 'Variable').reduce((sum, c) => sum + c.amount, 0);

  const totalRevenue = salesReport.reduce((sum, r) => sum + r.revenue, 0);
  const totalHPP = salesReport.reduce((sum, r) => sum + r.total_hpp, 0);
  const totalProfit = salesReport.reduce((sum, r) => sum + r.profit, 0);
  const totalTransactions = salesReport.reduce((sum, r) => sum + r.transactions, 0);

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text(t.salesReport, 14, 15);
    doc.text(`${t.dateRange}: ${dateRange.startDate} - ${dateRange.endDate}`, 14, 25);
    
    const tableData = salesReport.map(r => [
      r.date,
      r.transactions,
      formatCurrency(r.revenue),
      formatCurrency(r.total_hpp),
      formatCurrency(r.profit)
    ]);

    autoTable(doc, {
      startY: 30,
      head: [[t.date, t.transactions, t.revenue, t.hpp, t.profit]],
      body: tableData,
      foot: [[t.total, totalTransactions, formatCurrency(totalRevenue), formatCurrency(totalHPP), formatCurrency(totalProfit)]],
    });

    doc.save(`sales-report-${dateRange.startDate}-to-${dateRange.endDate}.pdf`);
  };

  const exportExcel = () => {
    const wsData = [
      [t.date, t.transactions, t.revenue, t.hpp, t.profit],
      ...salesReport.map(r => [r.date, r.transactions, r.revenue, r.total_hpp, r.profit]),
      [t.total, totalTransactions, totalRevenue, totalHPP, totalProfit]
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, t.salesReport);
    XLSX.writeFile(wb, `sales-report-${dateRange.startDate}-to-${dateRange.endDate}.xlsx`);
  };

  const exportCSV = () => {
    const wsData = [
      [t.date, t.transactions, t.revenue, t.hpp, t.profit],
      ...salesReport.map(r => [r.date, r.transactions, r.revenue, r.total_hpp, r.profit]),
      [t.total, totalTransactions, totalRevenue, totalHPP, totalProfit]
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `sales-report-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
    link.click();
  };

  return (
    <div className="min-h-full lg:h-full flex flex-col gap-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{t.financeTitle}</h1>
          <p className="text-slate-500 dark:text-white/60 mt-1">{t.financeSubtitle}</p>
        </div>
        {activeTab === 'expenses' && (
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2 shadow-lg shadow-amber-500/20 w-full md:w-auto justify-center"
          >
            <Plus className="w-5 h-5" /> {t.addExpense}
          </button>
        )}
      </div>

      <div className="flex border-b border-black/10 dark:border-white/10 w-full overflow-x-auto no-scrollbar">
        {['sales', 'expenses'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={clsx(
              'px-6 py-3 text-sm font-medium capitalize transition-all whitespace-nowrap border-b-2',
              activeTab === tab ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-400 dark:text-white/40 hover:text-slate-600 dark:text-white/80 hover:border-black/20 dark:border-white/20'
            )}
          >
            {tab === 'sales' ? t.salesReport : t.overheadExpenses}
          </button>
        ))}
      </div>

      {activeTab === 'expenses' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-black/5 dark:bg-white/5 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-[40px] pointer-events-none" />
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 flex items-center justify-center border border-rose-500/30">
              <DollarSign className="w-6 h-6 text-rose-400" />
            </div>
            <div>
              <p className="text-slate-500 dark:text-white/60 text-sm">{t.totalFixedCosts}</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white font-mono">{formatCurrency(totalFixed)}</h3>
            </div>
          </div>
        </div>

        <div className="bg-black/5 dark:bg-white/5 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-[40px] pointer-events-none" />
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/20 flex items-center justify-center border border-orange-500/30">
              <DollarSign className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <p className="text-slate-500 dark:text-white/60 text-sm">{t.totalVariableCosts}</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white font-mono">{formatCurrency(totalVariable)}</h3>
            </div>
          </div>
        </div>

        <div className="bg-black/5 dark:bg-white/5 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[40px] pointer-events-none" />
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
              <FileText className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <p className="text-slate-500 dark:text-white/60 text-sm">{t.totalExpenses}</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white font-mono">{formatCurrency(totalFixed + totalVariable)}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-black/5 dark:bg-white/5 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-3xl p-6 shadow-2xl overflow-hidden flex flex-col min-h-0">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">{t.expenseList}</h2>
        <div className="flex-1 overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="text-slate-400 dark:text-white/40 text-sm border-b border-black/10 dark:border-white/10">
                <th className="pb-3 font-medium">{t.name}</th>
                <th className="pb-3 font-medium">{t.type}</th>
                <th className="pb-3 font-medium">{t.period}</th>
                <th className="pb-3 font-medium text-right">{t.amount}</th>
                <th className="pb-3 font-medium text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="text-slate-600 dark:text-white/80 text-sm">
              {costs.map((cost) => (
                <tr key={cost.id} className="border-b border-black/5 dark:border-white/5 hover:bg-black/5 dark:bg-white/5 transition-colors">
                  <td className="py-4 font-medium text-slate-900 dark:text-white">{cost.name}</td>
                  <td className="py-4">
                    <span className={clsx(
                      "px-2 py-1 rounded-lg text-xs font-medium",
                      cost.type === 'Fixed' ? "bg-rose-500/20 text-rose-400" : "bg-orange-500/20 text-orange-400"
                    )}>
                      {cost.type === 'Fixed' ? t.fixed : t.variable}
                    </span>
                  </td>
                  <td className="py-4">
                    {cost.period === 'Monthly' ? t.monthly : 
                     cost.period === 'Weekly' ? t.weekly : 
                     cost.period === 'Daily' ? t.daily : t.yearly}
                  </td>
                  <td className="py-4 text-right font-mono text-amber-400">{formatCurrency(cost.amount)}</td>
                  <td className="py-4 text-right">
                    <button 
                      onClick={() => handleDeleteCost(cost.id)}
                      className="p-2 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {costs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 dark:text-white/40">{t.noExpensesRecorded}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {activeTab === 'sales' && (
        <div className="flex-1 flex flex-col gap-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-black/5 dark:bg-white/5 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-3xl p-4 shadow-lg">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-slate-500 dark:text-white/60" />
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                  className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-slate-900 dark:text-white rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500/50 text-sm"
                />
              </div>
              <span className="text-slate-400 dark:text-white/40">{t.to}</span>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                  className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-slate-900 dark:text-white rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500/50 text-sm"
                />
              </div>
            </div>
            
            <div className="flex gap-2 w-full md:w-auto">
              <button onClick={exportPDF} className="flex-1 md:flex-none bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 px-4 py-2 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 text-sm border border-rose-500/20">
                <Download className="w-4 h-4" /> PDF
              </button>
              <button onClick={exportExcel} className="flex-1 md:flex-none bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 px-4 py-2 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 text-sm border border-emerald-500/20">
                <Download className="w-4 h-4" /> Excel
              </button>
              <button onClick={exportCSV} className="flex-1 md:flex-none bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 px-4 py-2 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 text-sm border border-indigo-500/20">
                <Download className="w-4 h-4" /> CSV
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-black/5 dark:bg-white/5 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-[40px] pointer-events-none" />
              <p className="text-slate-500 dark:text-white/60 text-sm mb-1">{t.totalRevenue}</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white font-mono">{formatCurrency(totalRevenue)}</h3>
            </div>
            <div className="bg-black/5 dark:bg-white/5 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-[40px] pointer-events-none" />
              <p className="text-slate-500 dark:text-white/60 text-sm mb-1">{t.totalHPP}</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white font-mono">{formatCurrency(totalHPP)}</h3>
            </div>
            <div className="bg-black/5 dark:bg-white/5 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[40px] pointer-events-none" />
              <p className="text-slate-500 dark:text-white/60 text-sm mb-1">{t.grossProfit}</p>
              <h3 className="text-2xl font-bold text-emerald-400 font-mono">{formatCurrency(totalProfit)}</h3>
            </div>
            <div className="bg-black/5 dark:bg-white/5 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[40px] pointer-events-none" />
              <p className="text-slate-500 dark:text-white/60 text-sm mb-1">{t.transactions}</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white font-mono">{totalTransactions}</h3>
            </div>
          </div>

          <div className="flex-1 bg-black/5 dark:bg-white/5 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-3xl p-6 shadow-2xl overflow-hidden flex flex-col min-h-0">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">{t.dailyBreakdown}</h2>
            <div className="flex-1 overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="text-slate-400 dark:text-white/40 text-sm border-b border-black/10 dark:border-white/10">
                    <th className="pb-3 font-medium">{t.date}</th>
                    <th className="pb-3 font-medium text-right">{t.transactions}</th>
                    <th className="pb-3 font-medium text-right">{t.revenue}</th>
                    <th className="pb-3 font-medium text-right">{t.hpp}</th>
                    <th className="pb-3 font-medium text-right">{t.profit}</th>
                  </tr>
                </thead>
                <tbody className="text-slate-600 dark:text-white/80 text-sm">
                  {salesReport.map((report, idx) => (
                    <tr key={idx} className="border-b border-black/5 dark:border-white/5 hover:bg-black/5 dark:bg-white/5 transition-colors">
                      <td className="py-4 font-medium text-slate-900 dark:text-white">{report.date}</td>
                      <td className="py-4 text-right font-mono">{report.transactions}</td>
                      <td className="py-4 text-right font-mono text-amber-400">{formatCurrency(report.revenue)}</td>
                      <td className="py-4 text-right font-mono text-rose-400">{formatCurrency(report.total_hpp)}</td>
                      <td className="py-4 text-right font-mono text-emerald-400">{formatCurrency(report.profit)}</td>
                    </tr>
                  ))}
                  {salesReport.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 dark:text-white/40">{t.noSalesData}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-900/80 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-800 border border-black/10 dark:border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl"
          >
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">{t.addExpense}</h2>
            <form onSubmit={handleAddCost} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-white/60 mb-1">{t.expenseName}</label>
                <input
                  type="text"
                  required
                  value={newCost.name}
                  onChange={e => setNewCost({...newCost, name: e.target.value})}
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-slate-900 dark:text-white rounded-xl px-4 py-2 focus:outline-none focus:border-amber-500/50"
                  placeholder="e.g. Electricity, Rent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-white/60 mb-1">{t.type}</label>
                  <select
                    value={newCost.type}
                    onChange={e => setNewCost({...newCost, type: e.target.value})}
                    className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-slate-900 dark:text-white rounded-xl px-4 py-2 focus:outline-none focus:border-amber-500/50 [&>option]:bg-white dark:bg-slate-800"
                  >
                    <option value="Fixed">{t.fixed}</option>
                    <option value="Variable">{t.variable}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-white/60 mb-1">{t.period}</label>
                  <select
                    value={newCost.period}
                    onChange={e => setNewCost({...newCost, period: e.target.value})}
                    className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-slate-900 dark:text-white rounded-xl px-4 py-2 focus:outline-none focus:border-amber-500/50 [&>option]:bg-white dark:bg-slate-800"
                  >
                    <option value="Monthly">{t.monthly}</option>
                    <option value="Weekly">{t.weekly}</option>
                    <option value="Daily">{t.daily}</option>
                    <option value="Yearly">{t.yearly}</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-white/60 mb-1">{t.amount} (IDR)</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={newCost.amount}
                  onChange={e => setNewCost({...newCost, amount: e.target.value})}
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-slate-900 dark:text-white rounded-xl px-4 py-2 focus:outline-none focus:border-amber-500/50"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:bg-white/20 text-slate-900 dark:text-white font-medium py-2.5 rounded-xl transition-colors"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-medium py-2.5 rounded-xl transition-colors shadow-lg shadow-amber-500/25"
                >
                  {t.saveExpense}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
