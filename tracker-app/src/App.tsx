import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { LayoutGrid, List as ListIcon, PieChart, Plus, Wallet, Eye, EyeOff, Settings, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useStore } from './store';
import { getIcon } from './lib/icons';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import './index.css';
import './App.css';

import AddTransaction from './pages/AddTransaction';
import History from './pages/History';
import Accounts from './pages/Accounts';
import Analytics from './pages/Analytics';
import AccountDetails from './pages/AccountDetails';
import Categories from './pages/Categories';
import Login from './pages/Login';
import SettingsSidebar from './components/SettingsSidebar';

// Formatter function
const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('ru-RU').format(amount) + ' ' + currency;
};

const Dashboard = () => {
  const { accounts, transactions, categories, updateTransaction } = useStore();
  const [hideBalance, setHideBalance] = useState(() => localStorage.getItem('hideBalance') === 'true');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  useEffect(() => {
    localStorage.setItem('hideBalance', hideBalance.toString());
  }, [hideBalance]);

  const activeAccounts = accounts.filter(a => !a.excludeFromTotal);
  const totalBalanceUZS = activeAccounts.reduce((acc, a) => acc + (a.currency !== 'USD' ? a.balanceUZS : 0), 0);
  const totalBalanceUSD = activeAccounts.reduce((acc, a) => acc + (a.currency === 'USD' ? a.balanceUSD : 0), 0);

  // Get last 5 transactions
  const recentTransactions = transactions.slice(0, 5);

  return (
    <div className="page-content animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Главная</h2>
        <button onClick={() => setIsSettingsOpen(true)} style={{ color: 'var(--text-primary)' }}>
          <Settings size={24} />
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'var(--accent-primary)', opacity: '0.1', borderRadius: '50%', filter: 'blur(20px)', pointerEvents: 'none' }}></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', zIndex: 2, position: 'relative' }}>
          <p className="text-muted" style={{ margin: 0 }}>Общий баланс</p>
          <button onClick={() => setHideBalance(!hideBalance)} style={{ color: 'var(--text-muted)' }}>
            {hideBalance ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        <h3 className="text-gradient" style={{ fontSize: '32px', fontWeight: '700', marginBottom: '4px' }}>
          {hideBalance ? '*** UZS' : formatCurrency(totalBalanceUZS, 'UZS')}
        </h3>
        {totalBalanceUSD > 0 && !hideBalance && (
          <h4 style={{ fontSize: '20px', opacity: 0.8 }}>
            {formatCurrency(totalBalanceUSD, 'USD')}
          </h4>
        )}
        {totalBalanceUSD > 0 && hideBalance && (
          <h4 style={{ fontSize: '20px', opacity: 0.8 }}>*** USD</h4>
        )}
      </div>

      <div style={{ marginTop: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Последние операции</h3>
          <Link to="/history" style={{ fontSize: '14px', color: 'var(--accent-primary)' }}>Все</Link>
        </div>
        
        <div className="glass-panel" style={{ padding: '8px 16px' }}>
          {recentTransactions.length === 0 ? (
            <p className="text-muted" style={{ padding: '16px 0', textAlign: 'center' }}>Нет операций</p>
          ) : (
            recentTransactions.map((t, idx) => {
              const category = categories.find(c => c.id === t.categoryId);
              const isTransfer = t.type === 'transfer';
              const isIncome = t.type === 'income';
              
              // For transfers, we can use a generic icon if category is missing
              const IconComp = isTransfer ? Wallet : getIcon(category?.iconName || '');
              const color = isTransfer ? '#8b5cf6' : (category?.color || '#94a3b8');
              const name = isTransfer ? 'Перевод' : (category?.name || 'Неизвестно');

              return (
                <Link key={t.id} to={`/edit/${t.id}`} style={{ 
                  display: 'flex', alignItems: 'center', padding: '12px 0', 
                  borderBottom: idx < recentTransactions.length - 1 ? '1px solid var(--border-color)' : 'none',
                  textDecoration: 'none', color: 'inherit'
                }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: 'var(--radius-md)',
                    background: `${color}20`, color: color,
                    display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: '16px'
                  }}>
                    <IconComp size={20} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontSize: '16px', fontWeight: 500, marginBottom: '2px' }}>{name}</h4>
                    <p className="text-muted" style={{ fontSize: '12px' }}>
                      {format(new Date(t.date), 'd MMM', { locale: ru })} {t.note && `• ${t.note}`}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <p style={{ 
                      fontSize: '16px', fontWeight: 600, 
                      color: isIncome ? 'var(--success)' : (isTransfer ? 'var(--text-primary)' : 'var(--text-primary)') 
                    }}>
                      {isIncome ? '+' : (isTransfer ? '' : '-')}{formatCurrency(t.amount, t.currency)}
                    </p>
                    
                    {!isTransfer && (
                      <button 
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          await updateTransaction(t.id, { excludeFromStats: !t.excludeFromStats });
                        }}
                        style={{ color: t.excludeFromStats ? 'var(--text-muted)' : 'var(--accent-primary)', padding: '4px' }}
                        title={t.excludeFromStats ? "Показывать в статистике" : "Скрыть из статистики"}
                      >
                        {t.excludeFromStats ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    )}
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
      <SettingsSidebar isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
};

const BottomNav = () => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="bottom-nav">
      <Link to="/" className={`nav-item ${isActive('/') ? 'active' : ''}`}>
        <LayoutGrid size={24} strokeWidth={isActive('/') ? 2.5 : 2} />
        <span>Главная</span>
      </Link>
      <Link to="/history" className={`nav-item ${isActive('/history') ? 'active' : ''}`}>
        <ListIcon size={24} strokeWidth={isActive('/history') ? 2.5 : 2} />
        <span>История</span>
      </Link>
      
      <div className="nav-item-fab-container">
        <Link to="/add" className="fab">
          <Plus size={32} strokeWidth={2.5} />
        </Link>
      </div>

      <Link to="/analytics" className={`nav-item ${isActive('/analytics') ? 'active' : ''}`}>
        <PieChart size={24} strokeWidth={isActive('/analytics') ? 2.5 : 2} />
        <span>Статистика</span>
      </Link>
      <Link to="/accounts" className={`nav-item ${isActive('/accounts') ? 'active' : ''}`}>
        <Wallet size={24} strokeWidth={isActive('/accounts') ? 2.5 : 2} />
        <span>Счета</span>
      </Link>
    </div>
  );
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentUser, authChecked } = useStore();
  
  if (!authChecked) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100dvh', background: 'var(--bg-primary)' }}>
        <Loader2 size={40} className="animate-spin text-accent" style={{ color: 'var(--accent-primary)' }} />
      </div>
    );
  }
  
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <main className="main-content">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/*" element={
              <ProtectedRoute>
                <div style={{ paddingBottom: '120px' }}>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/history" element={<History />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/accounts" element={<Accounts />} />
                    <Route path="/account/:id" element={<AccountDetails />} />
                    <Route path="/add" element={<AddTransaction />} />
                    <Route path="/edit/:id" element={<AddTransaction />} />
                    <Route path="/categories" element={<Categories />} />
                  </Routes>
                  <BottomNav />
                </div>
              </ProtectedRoute>
            } />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
