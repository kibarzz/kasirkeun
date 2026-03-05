import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Coffee, LayoutDashboard, Package, Receipt, Users, Settings, LogOut, DollarSign, Menu as MenuIcon, X, Moon, Sun, Tag } from 'lucide-react';
import { clsx } from 'clsx';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Inventory from './pages/Inventory';
import Menu from './pages/Menu';
import Login from './pages/Login';
import Finance from './pages/Finance';
import Promotions from './pages/Promotions';
import SettingsPage from './pages/Settings';
import Customers from './pages/Customers';
import { useLanguage } from './i18n';

function Sidebar({ user, onLogout, isOpen, setIsOpen, isDarkMode, toggleTheme }: { user: any, onLogout: () => void, isOpen: boolean, setIsOpen: (val: boolean) => void, isDarkMode: boolean, toggleTheme: () => void }) {
  const location = useLocation();
  const { t } = useLanguage();
  
  const allLinks = [
    { to: '/', icon: LayoutDashboard, label: t.dashboard, roles: ['owner'] },
    { to: '/pos', icon: Receipt, label: t.pointOfSale, roles: ['owner', 'cashier'] },
    { to: '/inventory', icon: Package, label: t.inventory, roles: ['owner'] },
    { to: '/menu', icon: Coffee, label: t.menuRecipes, roles: ['owner'] },
    { to: '/promotions', icon: Tag, label: t.promotions, roles: ['owner'] },
    { to: '/finance', icon: DollarSign, label: t.finance, roles: ['owner'] },
    { to: '/customers', icon: Users, label: t.customers, roles: ['owner', 'cashier'] },
  ];

  const links = allLinks.filter(link => link.roles.includes(user.role));

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      <div className={clsx(
        "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-50 dark:bg-slate-900 lg:bg-black/10 dark:bg-white/10 lg:backdrop-blur-lg border-r border-black/20 dark:border-white/20 h-screen flex flex-col p-4 text-slate-900 dark:text-white transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="flex items-center justify-between px-2 mb-8 mt-4 lg:mt-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-lg">
              <Coffee className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-xl tracking-tight">Kedai M46</h1>
              <p className="text-xs text-slate-500 dark:text-white/60 capitalize">{user.role === 'owner' ? t.owner : t.cashier} {t.portal}</p>
            </div>
          </div>
          <button className="lg:hidden text-slate-500 dark:text-white/60 hover:text-slate-900 dark:text-white" onClick={() => setIsOpen(false)}>
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="flex-1 space-y-2 overflow-y-auto custom-scrollbar">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setIsOpen(false)}
                className={clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                  isActive 
                    ? 'bg-black/20 dark:bg-white/20 text-slate-900 dark:text-white shadow-sm border border-black/10 dark:border-white/10' 
                    : 'text-slate-600 dark:text-white/70 hover:bg-black/10 dark:bg-white/10 hover:text-slate-900 dark:text-white'
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{link.label}</span>
              </Link>
            );
          })}
        </nav>
        
        <div className="mt-auto pt-4 border-t border-black/10 dark:border-white/10 space-y-2">
          {/* Theme Toggle */}
          <div className="flex items-center justify-between px-4 py-3 rounded-xl text-slate-600 dark:text-white/70 hover:bg-black/10 dark:bg-white/10 transition-colors">
            <div className="flex items-center gap-3 font-medium">
              {isDarkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              <span>{isDarkMode ? t.darkMode : t.lightMode}</span>
            </div>
            <button 
              onClick={toggleTheme}
              className={clsx(
                "w-11 h-6 rounded-full transition-colors relative",
                isDarkMode ? "bg-amber-500" : "bg-slate-300"
              )}
            >
              <div className={clsx(
                "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform duration-200",
                isDarkMode ? "left-6" : "left-1"
              )} />
            </button>
          </div>

          <Link to="/settings" onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 dark:text-white/70 hover:bg-black/10 dark:bg-white/10 transition-colors cursor-pointer">
            <Settings className="w-5 h-5" />
            <span className="font-medium">{t.settings}</span>
          </Link>
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-400/70 hover:bg-rose-500/10 hover:text-rose-400 transition-colors cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">{t.signOut}</span>
          </button>
        </div>
      </div>
    </>
  );
}

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const handleLogin = (userData: any) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <BrowserRouter>
      <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden font-sans selection:bg-amber-500/30 transition-colors duration-300">
        {/* Abstract background blobs for glassmorphism effect */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/20 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-amber-600/20 blur-[120px] pointer-events-none" />
        
        <Sidebar user={user} onLogout={handleLogout} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
        
        <main className="flex-1 relative z-10 flex flex-col min-w-0">
          {/* Mobile Header */}
          <div className="lg:hidden flex items-center justify-between p-4 border-b border-black/10 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-md sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-lg">
                <Coffee className="w-4 h-4 text-white" />
              </div>
              <h1 className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">Kedai M46</h1>
            </div>
            <button onClick={() => setIsSidebarOpen(true)} className="text-slate-600 dark:text-white/80 hover:text-slate-900 dark:text-white p-2">
              <MenuIcon className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 p-4 lg:p-8 overflow-y-auto custom-scrollbar">
            <Routes>
              {user.role === 'owner' && <Route path="/" element={<Dashboard />} />}
              {user.role === 'cashier' && <Route path="/" element={<Navigate to="/pos" replace />} />}
              
              <Route path="/pos" element={<POS />} />
              
              {user.role === 'owner' && <Route path="/inventory" element={<Inventory />} />}
              {user.role === 'owner' && <Route path="/menu" element={<Menu />} />}
              {user.role === 'owner' && <Route path="/promotions" element={<Promotions />} />}
              {user.role === 'owner' && <Route path="/finance" element={<Finance />} />}
              {user.role === 'owner' && <Route path="/settings" element={<SettingsPage />} />}
              
              <Route path="/customers" element={<Customers />} />
              
              {/* Fallback route */}
              <Route path="*" element={<Navigate to={user.role === 'owner' ? '/' : '/pos'} replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  );
}
