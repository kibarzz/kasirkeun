import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Shield, Globe, Save, Plus, Trash2, Edit2 } from 'lucide-react';
import { clsx } from 'clsx';
import { useLanguage } from '../i18n';

export default function Settings() {
  const { lang, setLang, t } = useLanguage();

  const [users, setUsers] = useState<any[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userForm, setUserForm] = useState({ username: '', password: '', role: 'cashier' });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(data);
    } catch (error) {
      console.error('Failed to fetch users', error);
    }
  };

  const handleLanguageChange = (newLang: 'en' | 'id') => {
    setLang(newLang);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
    const method = editingUser ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userForm)
      });
      if (res.ok) {
        setShowUserModal(false);
        setEditingUser(null);
        setUserForm({ username: '', password: '', role: 'cashier' });
        fetchUsers();
      }
    } catch (error) {
      console.error('Failed to save user', error);
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) fetchUsers();
    } catch (error) {
      console.error('Failed to delete user', error);
    }
  };

  const openEditModal = (user: any) => {
    setEditingUser(user);
    setUserForm({ username: user.username, password: '', role: user.role });
    setShowUserModal(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-8"
    >
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{t.settingsTitle}</h1>
        <p className="text-slate-500 dark:text-white/60 mt-1">{t.settingsSubtitle}</p>
      </div>

      <div className="space-y-6">
        {/* Language Settings */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-black/10 dark:border-white/10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-2xl">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t.language}</h2>
              <p className="text-sm text-slate-500 dark:text-white/60">{t.languageDesc}</p>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => handleLanguageChange('en')}
              className={clsx(
                "flex-1 py-3 px-4 rounded-xl font-medium transition-all border",
                lang === 'en' 
                  ? "bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/25" 
                  : "bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-500"
              )}
            >
              {t.english}
            </button>
            <button
              onClick={() => handleLanguageChange('id')}
              className={clsx(
                "flex-1 py-3 px-4 rounded-xl font-medium transition-all border",
                lang === 'id' 
                  ? "bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/25" 
                  : "bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-500"
              )}
            >
              {t.indonesian}
            </button>
          </div>
        </div>

        {/* RBAC Settings */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-black/10 dark:border-white/10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t.rbac}</h2>
                <p className="text-sm text-slate-500 dark:text-white/60">{t.rbacDesc}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setEditingUser(null);
                setUserForm({ username: '', password: '', role: 'cashier' });
                setShowUserModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/25"
            >
              <Plus className="w-4 h-4" />
              {t.addUser}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-black/10 dark:border-white/10">
                  <th className="py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-300">{t.username}</th>
                  <th className="py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-300">{t.role}</th>
                  <th className="py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-300 text-right">{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-black/5 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4 text-slate-900 dark:text-white font-medium">{u.username}</td>
                    <td className="py-3 px-4">
                      <span className={clsx(
                        "px-2 py-1 rounded-full text-xs font-medium capitalize",
                        u.role === 'owner' ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500"
                      )}>
                        {u.role === 'owner' ? t.owner : t.cashier}
                      </span>
                    </td>
                    <td className="py-3 px-4 flex justify-end gap-2">
                      <button onClick={() => openEditModal(u)} className="p-2 text-slate-400 hover:text-indigo-500 transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteUser(u.id)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 border border-black/10 dark:border-white/10 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="p-6 border-b border-black/10 dark:border-white/10 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {editingUser ? t.editUser : t.addUser}
              </h2>
            </div>
            
            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t.username}</label>
                <input
                  type="text"
                  required
                  value={userForm.username}
                  onChange={e => setUserForm({ ...userForm, username: e.target.value })}
                  className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t.password}
                  {editingUser && <span className="text-xs text-slate-500 ml-2 font-normal">({t.passwordDesc})</span>}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={userForm.password}
                  onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                  className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t.role}</label>
                <select
                  value={userForm.role}
                  onChange={e => setUserForm({ ...userForm, role: e.target.value })}
                  className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="cashier">{t.cashier}</option>
                  <option value="owner">{t.owner}</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-xl transition-colors shadow-lg shadow-indigo-500/25"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
