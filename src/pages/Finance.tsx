import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { DollarSign, Plus, Trash2, Calendar, FileText, Download, X, ChevronRight, MessageSquare } from 'lucide-react';
import { clsx } from 'clsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from 'recharts';
import { useLanguage } from '../i18n';

export default function Finance() {
  const { t } = useLanguage();
  const [costs, setCosts] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCost, setNewCost] = useState({ name: '', type: 'Fixed', amount: '', period: 'Monthly' });
  const [deletingCostId, setDeletingCostId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'expenses' | 'sales' | 'daily' | 'cashiers' | 'shifts' | 'suppliers'>('sales');

  // Sales Report State
  const [salesReport, setSalesReport] = useState<any[]>([]);
  const [cashierPerformance, setCashierPerformance] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [supplierReports, setSupplierReports] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedCashier, setSelectedCashier] = useState<any>(null);
  const [dateDetails, setDateDetails] = useState<any[]>([]);
  const [cashierDetails, setCashierDetails] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [loadingCashierDetails, setLoadingCashierDetails] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchCosts();
    fetchSalesReport();
    fetchCashierPerformance();
    fetchShifts();
    fetchSupplierReports();
  }, [dateRange]);

  const fetchShifts = async () => {
    try {
      const res = await fetch(`/api/shifts?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
      if (res.ok) setShifts(await res.json());
    } catch (error) {
      console.error('Error fetching shifts:', error);
    }
  };

  const fetchSupplierReports = async () => {
    // This could be a summary of purchases or just the supplier list for now
    try {
      const res = await fetch('/api/suppliers');
      if (res.ok) setSupplierReports(await res.json());
    } catch (error) {
      console.error('Error fetching supplier reports:', error);
    }
  };

  const fetchCashierPerformance = async () => {
    try {
      const res = await fetch(`/api/cashier-performance?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
      if (!res.ok) throw new Error('Failed to fetch cashier performance');
      const data = await res.json();
      setCashierPerformance(data);
    } catch (error) {
      console.error('Error fetching cashier performance:', error);
    }
  };

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

  const fetchDateDetails = async (date: string) => {
    setSelectedDate(date);
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/sales-report/details?date=${date}`);
      if (!res.ok) throw new Error('Failed to fetch details');
      const data = await res.json();
      setDateDetails(data);
    } catch (error) {
      console.error('Error fetching date details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const fetchCashierDetails = async (cashier: any) => {
    setSelectedCashier(cashier);
    setLoadingCashierDetails(true);
    try {
      const res = await fetch(`/api/cashier-performance/details?userId=${cashier.id}&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
      if (!res.ok) throw new Error('Failed to fetch cashier details');
      const data = await res.json();
      setCashierDetails(data);
    } catch (error) {
      console.error('Error fetching cashier details:', error);
    } finally {
      setLoadingCashierDetails(false);
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
    await fetch(`/api/overhead/${id}`, { method: 'DELETE' });
    fetchCosts();
    setDeletingCostId(null);
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
  const totalTax = salesReport.reduce((sum, r) => sum + (r.tax || 0), 0);
  const totalDiscount = salesReport.reduce((sum, r) => sum + (r.discount || 0), 0);

  const exportPDF = async () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      const title = activeTab === 'sales' ? t.salesReport : t.dailySalesReport;
      doc.text(title, 14, 15);
      doc.text(`${t.dateRange}: ${dateRange.startDate} - ${dateRange.endDate}`, 14, 25);
      
      if (activeTab === 'sales') {
        const head = [[t.date, t.transactions, t.revenue, 'Tax', 'Discount', t.hpp, t.profit]];
        const body = salesReport.map(r => [
          r.date,
          r.transactions,
          formatCurrency(r.revenue),
          formatCurrency(r.tax || 0),
          formatCurrency(r.discount || 0),
          formatCurrency(r.total_hpp),
          formatCurrency(r.profit)
        ]);
        const foot = [[
          t.total, 
          totalTransactions, 
          formatCurrency(totalRevenue), 
          formatCurrency(totalTax),
          formatCurrency(totalDiscount),
          formatCurrency(totalHPP), 
          formatCurrency(totalProfit)
        ]];

        autoTable(doc, {
          startY: 30,
          head: head,
          body: body,
          foot: foot,
        });
      } else {
        // Detailed Transaction Export for Daily Tab
        const res = await fetch(`/api/sales-report/full-export?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
        const transactions = await res.json();

        const head = [['ID', t.date, t.cashier, 'Customer', 'Items', t.revenue, 'Payment']];
        const body = transactions.map((tx: any) => [
          tx.id,
          new Date(tx.created_at).toLocaleString(),
          tx.cashier,
          tx.customer_name || '-',
          tx.items.map((i: any) => `${i.product_name} (x${i.qty})`).join(', '),
          formatCurrency(tx.final_amount),
          tx.payment_method
        ]);

        autoTable(doc, {
          startY: 30,
          head: head,
          body: body,
          styles: { fontSize: 8 },
          columnStyles: {
            4: { cellWidth: 60 } // Items column width
          }
        });
      }

      const fileName = activeTab === 'sales' ? 'sales-summary' : 'transaction-details';
      doc.save(`${fileName}-${dateRange.startDate}-to-${dateRange.endDate}.pdf`);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const exportExcel = async () => {
    setIsExporting(true);
    try {
      let wsData;
      let fileName;
      if (activeTab === 'sales') {
        wsData = [
          [t.date, t.transactions, t.revenue, 'Tax', 'Discount', t.hpp, t.profit],
          ...salesReport.map(r => [r.date, r.transactions, r.revenue, r.tax || 0, r.discount || 0, r.total_hpp, r.profit]),
          [t.total, totalTransactions, totalRevenue, totalTax, totalDiscount, totalHPP, totalProfit]
        ];
        fileName = 'sales-summary';
      } else {
        const res = await fetch(`/api/sales-report/full-export?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
        const transactions = await res.json();
        
        wsData = [
          ['ID', 'Date Time', 'Cashier', 'Customer', 'Items', 'Total Amount', 'Tax', 'Discount', 'Final Amount', 'Payment Method', 'Channel'],
          ...transactions.map((tx: any) => [
            tx.id,
            new Date(tx.created_at).toLocaleString(),
            tx.cashier,
            tx.customer_name || '-',
            tx.items.map((i: any) => `${i.product_name} (x${i.qty})`).join(', '),
            tx.total_amount,
            tx.tax_amount,
            tx.discount_amount,
            tx.final_amount,
            tx.payment_method,
            tx.channel
          ])
        ];
        fileName = 'transaction-details';
      }
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Report');
      XLSX.writeFile(wb, `${fileName}-${dateRange.startDate}-to-${dateRange.endDate}.xlsx`);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const exportCSV = async () => {
    setIsExporting(true);
    try {
      let wsData;
      let fileName;
      if (activeTab === 'sales') {
        wsData = [
          [t.date, t.transactions, t.revenue, t.hpp, t.profit],
          ...salesReport.map(r => [r.date, r.transactions, r.revenue, r.total_hpp, r.profit]),
          [t.total, totalTransactions, totalRevenue, totalHPP, totalProfit]
        ];
        fileName = 'sales-summary';
      } else {
        const res = await fetch(`/api/sales-report/full-export?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
        const transactions = await res.json();
        
        wsData = [
          ['ID', 'Date Time', 'Cashier', 'Customer', 'Items', 'Final Amount', 'Payment Method'],
          ...transactions.map((tx: any) => [
            tx.id,
            new Date(tx.created_at).toLocaleString(),
            tx.cashier,
            tx.customer_name || '-',
            tx.items.map((i: any) => `${i.product_name} (x${i.qty})`).join(', '),
            tx.final_amount,
            tx.payment_method
          ])
        ];
        fileName = 'transaction-details';
      }
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${fileName}-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
      link.click();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
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
        {['sales', 'daily', 'cashiers', 'shifts', 'expenses'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={clsx(
              'px-6 py-3 text-sm font-medium capitalize transition-all whitespace-nowrap border-b-2',
              activeTab === tab ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-400 dark:text-white/40 hover:text-slate-600 dark:text-white/80 hover:border-black/20 dark:border-white/20'
            )}
          >
            {tab === 'sales' ? t.salesReport : tab === 'daily' ? t.dailySalesReport : tab === 'cashiers' ? (t.cashierPerformance || "Cashier Performance") : tab === 'shifts' ? "Shift Reports" : t.overheadExpenses}
          </button>
        ))}
      </div>

      {activeTab === 'suppliers' && (
        <div className="flex-1 flex flex-col gap-6">
          <div className="bg-black/5 dark:bg-white/5 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-3xl p-6 shadow-2xl overflow-hidden flex flex-col min-h-0">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Supplier Directory & Reports</h2>
            <div className="flex-1 overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="text-slate-400 dark:text-white/40 text-sm border-b border-black/10 dark:border-white/10">
                    <th className="pb-3 font-medium">Supplier Name</th>
                    <th className="pb-3 font-medium">Contact Person</th>
                    <th className="pb-3 font-medium">Phone</th>
                    <th className="pb-3 font-medium">Email</th>
                    <th className="pb-3 font-medium">Address</th>
                  </tr>
                </thead>
                <tbody className="text-slate-900 dark:text-white/80 text-sm">
                  {supplierReports.map((supplier, idx) => (
                    <tr key={idx} className="border-b border-black/5 dark:border-white/5 hover:bg-black/5 dark:bg-white/5 transition-colors">
                      <td className="py-4 font-medium text-slate-900 dark:text-white">{supplier.name}</td>
                      <td className="py-4 text-slate-500 dark:text-white/60">{supplier.contact_person}</td>
                      <td className="py-4 text-slate-500 dark:text-white/60">{supplier.phone}</td>
                      <td className="py-4 text-slate-500 dark:text-white/60">{supplier.email}</td>
                      <td className="py-4 text-slate-500 dark:text-white/60">{supplier.address}</td>
                    </tr>
                  ))}
                  {supplierReports.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500 dark:text-white/40">No supplier data found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'shifts' && (
        <div className="flex-1 flex flex-col gap-6">
          <div className="bg-black/5 dark:bg-white/5 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-3xl p-6 shadow-2xl overflow-hidden flex flex-col min-h-0">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Shift Accountability Reports</h2>
            <div className="flex-1 overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="text-slate-400 dark:text-white/40 text-sm border-b border-black/10 dark:border-white/10">
                    <th className="pb-3 font-medium">Cashier</th>
                    <th className="pb-3 font-medium">Start Time</th>
                    <th className="pb-3 font-medium">End Time</th>
                    <th className="pb-3 font-medium text-right">Expected Cash</th>
                    <th className="pb-3 font-medium text-right">Actual Cash</th>
                    <th className="pb-3 font-medium text-right">Difference</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="text-slate-900 dark:text-white/80 text-sm">
                  {shifts.map((shift, idx) => {
                    const diff = shift.ending_cash_actual - shift.ending_cash_expected;
                    return (
                      <tr key={idx} className="border-b border-black/5 dark:border-white/5 hover:bg-black/5 dark:bg-white/5 transition-colors">
                        <td className="py-4 font-medium text-slate-900 dark:text-white">{shift.username}</td>
                        <td className="py-4 text-slate-500 dark:text-white/60">{new Date(shift.start_time).toLocaleString()}</td>
                        <td className="py-4 text-slate-500 dark:text-white/60">{shift.end_time ? new Date(shift.end_time).toLocaleString() : 'Active'}</td>
                        <td className="py-4 text-right font-mono text-slate-900 dark:text-white">{formatCurrency(shift.ending_cash_expected || 0)}</td>
                        <td className="py-4 text-right font-mono text-slate-900 dark:text-white">{formatCurrency(shift.ending_cash_actual || 0)}</td>
                        <td className="py-4 text-right font-mono">
                          {shift.end_time ? (
                            <span className={diff === 0 ? 'text-emerald-400' : 'text-rose-400 font-bold'}>
                              {diff > 0 ? '+' : ''}{formatCurrency(diff)}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="py-4">
                          {shift.end_time ? (
                            <span className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs">Closed</span>
                          ) : (
                            <span className="px-2 py-1 rounded-lg bg-amber-500/20 text-amber-400 text-xs animate-pulse">Active</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {shifts.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500 dark:text-white/40">No shift data found for this period.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

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
                      cost.type === 'Fixed' ? "bg-rose-500/20 text-rose-500 dark:text-rose-400" : "bg-orange-500/20 text-orange-500 dark:text-orange-400"
                    )}>
                      {cost.type === 'Fixed' ? t.fixed : t.variable}
                    </span>
                  </td>
                  <td className="py-4 text-slate-900 dark:text-white">
                    {cost.period === 'Monthly' ? t.monthly : 
                     cost.period === 'Weekly' ? t.weekly : 
                     cost.period === 'Daily' ? t.daily : t.yearly}
                  </td>
                  <td className="py-4 text-right font-mono text-amber-500 dark:text-amber-400">{formatCurrency(cost.amount)}</td>
                  <td className="py-4 text-right">
                    <button 
                      onClick={() => setDeletingCostId(cost.id)}
                      className="p-2 hover:bg-rose-500/20 text-rose-500 dark:text-rose-400 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {costs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 dark:text-white/40">{t.noExpensesRecorded}</td>
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
              <button 
                onClick={exportPDF} 
                disabled={isExporting}
                className="flex-1 md:flex-none bg-rose-500/20 hover:bg-rose-500/30 disabled:opacity-50 text-rose-400 px-4 py-2 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 text-sm border border-rose-500/20"
              >
                <Download className={clsx("w-4 h-4", isExporting && "animate-bounce")} /> PDF
              </button>
              <button 
                onClick={exportExcel} 
                disabled={isExporting}
                className="flex-1 md:flex-none bg-emerald-500/20 hover:bg-emerald-500/30 disabled:opacity-50 text-emerald-400 px-4 py-2 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 text-sm border border-emerald-500/20"
              >
                <Download className={clsx("w-4 h-4", isExporting && "animate-bounce")} /> Excel
              </button>
              <button 
                onClick={exportCSV} 
                disabled={isExporting}
                className="flex-1 md:flex-none bg-indigo-500/20 hover:bg-indigo-500/30 disabled:opacity-50 text-indigo-400 px-4 py-2 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 text-sm border border-indigo-500/20"
              >
                <Download className={clsx("w-4 h-4", isExporting && "animate-bounce")} /> CSV
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

          <div className="bg-black/5 dark:bg-white/5 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-3xl p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">{t.revenueTrend}</h2>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[...salesReport].reverse()}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#94a3b8" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `Rp ${value.toLocaleString()}`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(value: any) => formatCurrency(value)}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="revenue" name={t.revenue} stroke="#f59e0b" fillOpacity={1} fill="url(#colorRevenue)" />
                  <Area type="monotone" dataKey="profit" name={t.profit} stroke="#10b981" fillOpacity={1} fill="url(#colorProfit)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'daily' && (
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
              <button 
                onClick={exportPDF} 
                disabled={isExporting}
                className="flex-1 md:flex-none bg-rose-500/20 hover:bg-rose-500/30 disabled:opacity-50 text-rose-400 px-4 py-2 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 text-sm border border-rose-500/20"
              >
                <Download className={clsx("w-4 h-4", isExporting && "animate-bounce")} /> PDF
              </button>
              <button 
                onClick={exportExcel} 
                disabled={isExporting}
                className="flex-1 md:flex-none bg-emerald-500/20 hover:bg-emerald-500/30 disabled:opacity-50 text-emerald-400 px-4 py-2 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 text-sm border border-emerald-500/20"
              >
                <Download className={clsx("w-4 h-4", isExporting && "animate-bounce")} /> Excel
              </button>
              <button 
                onClick={exportCSV} 
                disabled={isExporting}
                className="flex-1 md:flex-none bg-indigo-500/20 hover:bg-indigo-500/30 disabled:opacity-50 text-indigo-400 px-4 py-2 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 text-sm border border-indigo-500/20"
              >
                <Download className={clsx("w-4 h-4", isExporting && "animate-bounce")} /> CSV
              </button>
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
                <tbody className="text-slate-900 dark:text-white/80 text-sm">
                  {salesReport.map((report, idx) => (
                    <tr 
                      key={idx} 
                      onClick={() => fetchDateDetails(report.date)}
                      className="border-b border-black/5 dark:border-white/5 hover:bg-black/5 dark:bg-white/5 transition-colors cursor-pointer group"
                    >
                      <td className="py-4 font-medium text-slate-900 dark:text-white flex items-center gap-2">
                        {report.date}
                        <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-amber-500" />
                      </td>
                      <td className="py-4 text-right font-mono text-slate-900 dark:text-white">{report.transactions}</td>
                      <td className="py-4 text-right font-mono text-amber-500 dark:text-amber-400">{formatCurrency(report.revenue)}</td>
                      <td className="py-4 text-right font-mono text-rose-500 dark:text-rose-400">{formatCurrency(report.total_hpp)}</td>
                      <td className="py-4 text-right font-mono text-emerald-500 dark:text-emerald-400">{formatCurrency(report.profit)}</td>
                    </tr>
                  ))}
                  {salesReport.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500 dark:text-white/40">{t.noSalesData}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'cashiers' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 flex-1 flex flex-col min-h-0">
          <div className="bg-black/5 dark:bg-white/5 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-3xl p-6 shadow-2xl overflow-hidden flex flex-col min-h-0">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">{t.cashierPerformance || "Cashier Performance"}</h2>
            <div className="flex-1 overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="text-slate-400 dark:text-white/40 text-sm border-b border-black/10 dark:border-white/10">
                    <th className="pb-3 font-medium">{t.cashier}</th>
                    <th className="pb-3 font-medium text-right">{t.transactions}</th>
                    <th className="pb-3 font-medium text-right">{t.revenue}</th>
                    <th className="pb-3 font-medium text-right">{t.avgTransaction || "Avg. Transaction"}</th>
                  </tr>
                </thead>
                <tbody className="text-slate-900 dark:text-white/80 text-sm">
                  {cashierPerformance.map((perf, idx) => (
                    <tr 
                      key={idx} 
                      onClick={() => fetchCashierDetails(perf)}
                      className="border-b border-black/5 dark:border-white/5 hover:bg-black/5 dark:bg-white/5 transition-colors cursor-pointer group"
                    >
                      <td className="py-4 font-medium text-slate-900 dark:text-white flex items-center gap-2">
                        {perf.username}
                        <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-amber-500" />
                      </td>
                      <td className="py-4 text-right font-mono text-slate-900 dark:text-white">{perf.total_transactions}</td>
                      <td className="py-4 text-right font-mono text-emerald-500 dark:text-emerald-400">{formatCurrency(perf.total_revenue)}</td>
                      <td className="py-4 text-right font-mono text-slate-900 dark:text-white">
                        {formatCurrency(perf.total_revenue / perf.total_transactions)}
                      </td>
                    </tr>
                  ))}
                  {cashierPerformance.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-500 dark:text-white/40">{t.noDataFound}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="h-80 bg-black/5 dark:bg-white/5 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-3xl p-6 shadow-2xl shrink-0">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">{t.revenueByCashier || "Revenue by Cashier"}</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashierPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="username" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `Rp ${value.toLocaleString()}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }}
                  formatter={(value: number) => [formatCurrency(value), t.revenue]}
                />
                <Bar dataKey="total_revenue" fill="#f59e0b" radius={[10, 10, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 border border-black/10 dark:border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl"
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
                  className="w-full bg-slate-100 dark:bg-slate-800 border-0 text-slate-900 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  placeholder="e.g. Electricity, Rent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-white/60 mb-1">{t.type}</label>
                  <select
                    value={newCost.type}
                    onChange={e => setNewCost({...newCost, type: e.target.value})}
                    className="w-full bg-slate-100 dark:bg-slate-800 border-0 text-slate-900 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/50 [&>option]:bg-white dark:bg-slate-800"
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
                    className="w-full bg-slate-100 dark:bg-slate-800 border-0 text-slate-900 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/50 [&>option]:bg-white dark:bg-slate-800"
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
                  className="w-full bg-slate-100 dark:bg-slate-800 border-0 text-slate-900 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
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

      {selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 border border-black/10 dark:border-white/10 rounded-3xl p-6 w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col"
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t.dailySalesReport}</h2>
                <p className="text-slate-500 dark:text-white/60">{selectedDate}</p>
              </div>
              <button 
                onClick={() => setSelectedDate(null)}
                className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-slate-500 dark:text-white/60" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
              {loadingDetails ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                </div>
              ) : (
                <div className="space-y-6">
                  {dateDetails.map((tx) => (
                    <div key={tx.id} className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl p-6">
                      <div className="flex flex-wrap justify-between items-start gap-4 mb-4 pb-4 border-b border-black/10 dark:border-white/10">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-2">
                          <div>
                            <p className="text-xs text-slate-500 dark:text-white/40 uppercase tracking-wider font-semibold">{t.id}</p>
                            <p className="text-sm font-mono text-slate-900 dark:text-white">#{tx.id}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 dark:text-white/40 uppercase tracking-wider font-semibold">{t.time}</p>
                            <p className="text-sm text-slate-900 dark:text-white">{new Date(tx.created_at).toLocaleTimeString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 dark:text-white/40 uppercase tracking-wider font-semibold">{t.cashier}</p>
                            <p className="text-sm text-slate-900 dark:text-white">{tx.cashier}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 dark:text-white/40 uppercase tracking-wider font-semibold">{t.method}</p>
                            <p className="text-sm text-slate-900 dark:text-white">{tx.payment_method}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500 dark:text-white/40 uppercase tracking-wider font-semibold">{t.total}</p>
                          <p className="text-xl font-bold text-amber-500 dark:text-amber-400 font-mono">{formatCurrency(tx.final_amount)}</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {tx.items.map((item: any, i: number) => {
                          const modifiers = item.modifiers ? JSON.parse(item.modifiers) : {};
                          return (
                            <div key={i} className="flex justify-between items-start text-sm">
                              <div className="flex items-start gap-3">
                                <div className="w-8 h-8 bg-amber-500/10 text-amber-500 rounded-lg flex items-center justify-center font-bold text-xs mt-1">
                                  {item.qty}x
                                </div>
                                <div>
                                  <p className="font-medium text-slate-900 dark:text-white">{item.product_name}</p>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {Object.entries(modifiers).map(([key, value]) => (
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
                                  <p className="text-xs text-slate-500 dark:text-white/40 mt-1">HPP: {formatCurrency(item.hpp_snapshot)}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-mono text-slate-900 dark:text-white">{formatCurrency(item.unit_price * item.qty)}</p>
                                <p className="text-xs text-emerald-500 dark:text-emerald-400 font-mono">
                                  Profit: {formatCurrency((item.unit_price - item.hpp_snapshot) * item.qty)}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  {dateDetails.length === 0 && (
                    <div className="text-center py-12 text-slate-500 dark:text-white/40">
                      {t.noSalesData}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {deletingCostId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-md p-6"
          >
            <div className="flex items-center gap-3 text-rose-500 mb-4">
              <Trash2 className="w-6 h-6" />
              <h3 className="text-xl font-bold">{t.confirmDeleteCost}</h3>
            </div>
            <p className="text-slate-600 dark:text-white/70 mb-6">
              {t.deleteCostWarning || "Are you sure you want to delete this cost entry? This action cannot be undone."}
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeletingCostId(null)}
                className="flex-1 px-4 py-2 rounded-xl font-medium text-slate-500 dark:text-white/60 hover:text-slate-900 dark:text-white hover:bg-black/5 dark:bg-white/5 transition-colors"
              >
                {t.cancel}
              </button>
              <button 
                onClick={() => handleDeleteCost(deletingCostId)}
                className="flex-1 px-4 py-2 rounded-xl font-medium bg-rose-500 hover:bg-rose-400 text-white transition-colors shadow-lg shadow-rose-500/20"
              >
                {t.delete}
              </button>
            </div>
          </motion.div>
        </div>
      )}
      {/* Cashier Details Modal */}
      {selectedCashier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 border border-black/10 dark:border-white/10 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="p-6 border-b border-black/10 dark:border-white/10 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedCashier.username} - {t.cashierPerformance}</h2>
                <p className="text-slate-500 dark:text-white/60 mt-1">{dateRange.startDate} - {dateRange.endDate}</p>
              </div>
              <button onClick={() => setSelectedCashier(null)} className="text-slate-400 dark:text-white/40 hover:text-slate-900 dark:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              {loadingCashierDetails ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  {cashierDetails.length === 0 ? (
                    <p className="text-center py-12 text-slate-500 dark:text-white/40">{t.noTransactionsFound || 'No transactions found for this cashier in the selected range.'}</p>
                  ) : (
                    <div className="space-y-4">
                      {cashierDetails.map((tx: any) => (
                        <div key={tx.id} className="bg-slate-50 dark:bg-white/5 rounded-2xl p-4 border border-black/5 dark:border-white/5">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="text-sm font-bold text-slate-900 dark:text-white">#{tx.id}</p>
                              <p className="text-xs text-slate-500 dark:text-white/40">{new Date(tx.created_at).toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-amber-500">Rp {tx.final_amount.toLocaleString()}</p>
                              <p className="text-[10px] uppercase tracking-wider text-slate-400">{tx.payment_method} • {tx.channel}</p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {tx.items.map((item: any, idx: number) => (
                              <div key={idx} className="flex justify-between text-sm">
                                <div className="flex gap-2">
                                  <span className="text-slate-400">{item.qty}x</span>
                                  <span className="text-slate-700 dark:text-white/80">{item.product_name}</span>
                                </div>
                                <span className="text-slate-900 dark:text-white font-medium">Rp {(item.qty * item.unit_price).toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
