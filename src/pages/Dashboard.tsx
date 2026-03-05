import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, Package, AlertCircle, DollarSign, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n';

const data = [
  { name: 'Mon', sales: 4000 },
  { name: 'Tue', sales: 3000 },
  { name: 'Wed', sales: 2000 },
  { name: 'Thu', sales: 2780 },
  { name: 'Fri', sales: 1890 },
  { name: 'Sat', sales: 2390 },
  { name: 'Sun', sales: 3490 },
];

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const navigate = useNavigate();
  const { t, lang } = useLanguage();

  useEffect(() => {
    fetch('/api/dashboard')
      .then(async res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => setStats(data))
      .catch(err => console.error('Failed to fetch dashboard stats:', err));
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{t.executiveDashboard}</h1>
          <p className="text-slate-500 dark:text-white/60 mt-1">{t.realTimePerformance}</p>
        </div>
        <div className="bg-black/10 dark:bg-white/10 backdrop-blur-md border border-black/20 dark:border-white/20 rounded-xl px-4 py-2 text-slate-700 dark:text-white/90 text-sm font-medium w-full md:w-auto text-center">
          {new Date().toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </header>

      <AnimatePresence>
        {stats?.lowStock?.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="overflow-hidden"
          >
            <button
              onClick={() => navigate('/inventory#low-stock-section')}
              className="w-full bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-2xl p-4 flex items-center justify-between transition-colors group text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-500/20 rounded-xl">
                  <AlertCircle className="w-6 h-6 text-rose-400" />
                </div>
                <div>
                  <h3 className="text-rose-400 font-semibold text-lg">{t.lowStockAlert}</h3>
                  <p className="text-rose-400/80 text-sm">{stats.lowStock.length} {t.ingredientsBelowThreshold}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-rose-400/50 group-hover:text-rose-400 transition-colors" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title={t.totalOmzet} 
          value={formatCurrency(stats?.omzet || 0)} 
          icon={DollarSign} 
          trend="+12.5%" 
          color="from-emerald-500 to-teal-400" 
        />
        <StatCard 
          title={t.netProfit} 
          value={formatCurrency(stats?.netProfit || 0)} 
          icon={TrendingUp} 
          trend="+8.2%" 
          color="from-blue-500 to-indigo-400" 
        />
        <StatCard 
          title={t.transactions} 
          value={stats?.totalTransactions || 0} 
          icon={Users} 
          trend="+5.1%" 
          color="from-amber-500 to-orange-400" 
        />
        <StatCard 
          title={t.lowStockItems} 
          value={stats?.lowStock?.length || 0} 
          icon={AlertCircle} 
          trend={t.actionNeeded} 
          color="from-rose-500 to-red-400" 
          trendColor="text-rose-400"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        {/* Chart */}
        <div className="lg:col-span-2 bg-black/5 dark:bg-white/5 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-3xl p-6 shadow-2xl">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">{t.revenueTrend}</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" tick={{fill: 'rgba(255,255,255,0.5)'}} axisLine={false} tickLine={false} />
                <YAxis stroke="rgba(255,255,255,0.5)" tick={{fill: 'rgba(255,255,255,0.5)'}} axisLine={false} tickLine={false} tickFormatter={(value) => `${value / 1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                  itemStyle={{ color: '#f59e0b' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="sales" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-black/5 dark:bg-white/5 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{t.topProducts}</h2>
            <Package className="w-5 h-5 text-slate-500 dark:text-white/50" />
          </div>
          
          <div className="space-y-4 flex-1">
            {stats?.topProducts?.length > 0 ? (
              stats.topProducts.map((product: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10 transition-colors border border-black/5 dark:border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-sm">
                      {idx + 1}
                    </div>
                    <span className="text-slate-900 dark:text-white font-medium">{product.name}</span>
                  </div>
                  <span className="text-slate-600 dark:text-white/70 font-mono">{product.total_qty}x</span>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center min-h-full lg:h-full text-slate-400 dark:text-white/40">
                <Package className="w-12 h-12 mb-2 opacity-20" />
                <p>{t.noSalesData}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-black/5 dark:bg-white/5 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-3xl p-6 shadow-2xl mt-8">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">{t.recentTransactions}</h2>
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="text-slate-400 dark:text-white/40 text-sm border-b border-black/10 dark:border-white/10">
                <th className="pb-3 font-medium">{t.id}</th>
                <th className="pb-3 font-medium">{t.time}</th>
                <th className="pb-3 font-medium">{t.type}</th>
                <th className="pb-3 font-medium">{t.method}</th>
                <th className="pb-3 font-medium text-right">{t.amount}</th>
                <th className="pb-3 font-medium text-center">{t.status}</th>
                <th className="pb-3 font-medium text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="text-slate-900 dark:text-white/80 text-sm">
              {stats?.recentTransactions?.map((tx: any) => (
                <tr key={tx.id} className="border-b border-black/5 dark:border-white/5 hover:bg-black/5 dark:bg-white/5 transition-colors">
                  <td className="py-4 font-mono text-amber-500 dark:text-amber-400">#{tx.id}</td>
                  <td className="py-4 text-slate-900 dark:text-white">{new Date(tx.created_at).toLocaleTimeString()}</td>
                  <td className="py-4 capitalize text-slate-900 dark:text-white">
                    {tx.type === 'paid' ? t.paid : tx.type === 'complementary' ? t.complementary : tx.type}
                  </td>
                  <td className="py-4 text-slate-900 dark:text-white">
                    {tx.payment_method.split(', ').map((m: string) => {
                      if (m === 'Cash') return t.cash;
                      if (m === 'QRIS') return t.qris;
                      if (m === 'Complementary') return t.complementary;
                      return m;
                    }).join(', ')}
                  </td>
                  <td className="py-4 text-right font-mono text-slate-900 dark:text-white">{formatCurrency(tx.final_amount)}</td>
                  <td className="py-4 text-center">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${tx.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                      {tx.status === 'completed' ? t.completed : tx.status === 'voided' ? t.voided : tx.status}
                    </span>
                  </td>
                  <td className="py-4 text-right">
                    {tx.status === 'completed' && (
                      <button 
                        onClick={async () => {
                          if (confirm(t.confirmVoid)) {
                            await fetch(`/api/transactions/${tx.id}/void`, { method: 'POST' });
                            fetch('/api/dashboard').then(res => res.json()).then(data => setStats(data));
                          }
                        }}
                        className="text-rose-400 hover:text-rose-300 text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        {t.void}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!stats?.recentTransactions?.length && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 dark:text-white/40">{t.noRecentTransactions}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({ title, value, icon: Icon, trend, color, trendColor = "text-emerald-400" }: any) {
  return (
    <div className="bg-black/5 dark:bg-white/5 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden group">
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${color} rounded-full blur-[60px] opacity-20 group-hover:opacity-40 transition-opacity duration-500`} />
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="p-3 rounded-2xl bg-black/10 dark:bg-white/10 border border-black/10 dark:border-white/10">
          <Icon className="w-6 h-6 text-slate-900 dark:text-white" />
        </div>
        <span className={`text-sm font-medium ${trendColor} bg-black/5 dark:bg-white/5 px-2 py-1 rounded-lg border border-black/5 dark:border-white/5`}>
          {trend}
        </span>
      </div>
      
      <div className="relative z-10">
        <h3 className="text-slate-500 dark:text-white/60 text-sm font-medium mb-1">{title}</h3>
        <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{value}</p>
      </div>
    </div>
  );
}
