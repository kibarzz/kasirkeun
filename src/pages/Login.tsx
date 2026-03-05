import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Coffee, Lock, User, ArrowRight, AlertCircle } from 'lucide-react';
import { useLanguage } from '../i18n';

export default function Login({ onLogin }: { onLogin: (user: any) => void }) {
  const { t } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        onLogin(data.user);
      } else {
        setError(data.message || t.loginFailed);
      }
    } catch (err) {
      setError(t.networkError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-900 overflow-hidden font-sans selection:bg-amber-500/30 relative">
      {/* Abstract background blobs for glassmorphism effect */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-600/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-amber-600/20 blur-[120px] pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10 px-4"
      >
        <div className="bg-black/10 dark:bg-white/10 backdrop-blur-2xl border border-black/20 dark:border-white/20 rounded-3xl shadow-2xl overflow-hidden">
          <div className="p-8">
            <div className="flex justify-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Coffee className="w-8 h-8 text-slate-900 dark:text-white" />
              </div>
            </div>
            
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">{t.welcomeTitle}</h1>
              <p className="text-slate-500 dark:text-white/60 text-sm">{t.welcomeSubtitle}</p>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-6 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex items-center gap-3 text-rose-400 text-sm"
              >
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{error}</p>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-600 dark:text-white/80 pl-1">{t.username}</label>
                <div className="relative">
                  <User className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40" />
                  <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={t.usernamePlaceholder}
                    className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/30 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-amber-500/50 focus:bg-black/10 dark:bg-white/10 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-600 dark:text-white/80 pl-1">{t.password}</label>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40" />
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t.passwordPlaceholder}
                    className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/30 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-amber-500/50 focus:bg-black/10 dark:bg-white/10 transition-all"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-900 dark:text-white font-bold py-3.5 rounded-xl shadow-lg shadow-amber-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98] flex items-center justify-center gap-2 mt-4"
              >
                {loading ? t.signingIn : t.signIn}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          </div>
          
          <div className="bg-black/5 dark:bg-white/5 border-t border-black/10 dark:border-white/10 p-4 text-center">
            <p className="text-xs text-slate-400 dark:text-white/40">
              {t.demoAccounts}: <br/>
              {t.owner}: <strong>admin / admin</strong> | {t.cashier}: <strong>kasir / kasir</strong>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
