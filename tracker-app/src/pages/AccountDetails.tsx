import { useParams, useNavigate, Link } from 'react-router-dom';
import { useStore } from '../store';
import { getIcon } from '../lib/icons';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ArrowLeft, Wallet, Trash2 } from 'lucide-react';
import { isAccountProtected } from '../types';

const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('ru-RU').format(amount) + ' ' + currency;
};

export default function AccountDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { accounts, transactions, categories, deleteAccount } = useStore();
  
  const account = accounts.find(a => a.id === id);
  
  if (!account) return <div style={{ padding: '20px' }}>Счет не найден</div>;
  
  const isProtected = isAccountProtected(account);
  
  const accountTransactions = transactions.filter(t => t.accountId === id || t.toAccountId === id);
  
  // Apply sorting implicitly assuming store returns sorted transactions (which it does via Firestore 'desc')
  
  const currency = account.currency || 'UZS';
  const balance = currency === 'UZS' ? account.balanceUZS : account.balanceUSD;

  return (
    <div className="page-content animate-fade-in">
      <div className="page-header" style={{ marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <button onClick={() => navigate(-1)} style={{ padding: '8px', marginLeft: '-8px' }}>
          <ArrowLeft size={24} />
        </button>
        <h2 style={{ margin: 0, paddingBottom: '3px', flex: 1 }}>История карты</h2>
        {!isProtected && (
          <button 
            onClick={() => {
              if (confirm(`Вы уверены, что хотите удалить счет "${account.name}"?`)) {
                deleteAccount(account.id);
                navigate('/accounts', { replace: true });
              }
            }}
            style={{ padding: '8px', color: 'var(--danger)', marginRight: '-8px' }}
          >
            <Trash2 size={24} />
          </button>
        )}
      </div>

      <div className="glass-panel" style={{ padding: '24px', background: 'linear-gradient(135deg, var(--accent-primary) 0%, #8b5cf6 100%)', color: 'white', border: 'none', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '4px' }}>{account.name}</h3>
        <p style={{ opacity: 0.9, marginBottom: '12px', fontSize: '14px' }}>{currency} Счет</p>
        <h2 style={{ fontSize: '32px', fontWeight: 700 }}>
          {formatCurrency(balance, currency)}
        </h2>
      </div>

      <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>Транзакции</h3>
      <div className="glass-panel" style={{ padding: '8px 16px' }}>
        {accountTransactions.length === 0 ? (
          <p className="text-muted" style={{ padding: '16px 0', textAlign: 'center' }}>Нет операций</p>
        ) : (
          accountTransactions.map((t, idx) => {
            const category = categories.find(c => c.id === t.categoryId);
            const isTransfer = t.type === 'transfer';
            const isIncomeForThisCard = isTransfer ? t.toAccountId === account.id : t.type === 'income';
            
            const IconComp = isTransfer ? Wallet : getIcon(category?.iconName || '');
            const color = isTransfer ? '#8b5cf6' : (category?.color || '#94a3b8');
            const name = isTransfer ? (isIncomeForThisCard ? 'Входящий перевод' : 'Исходящий перевод') : (category?.name || 'Неизвестно');
            
            const displayAmount = isTransfer && isIncomeForThisCard && t.convertedAmount ? t.convertedAmount : t.amount;
            const displayCurrency = isTransfer && isIncomeForThisCard ? (account.currency || 'UZS') : t.currency;

            return (
              <Link key={t.id} to={`/edit/${t.id}`} style={{ 
                display: 'flex', alignItems: 'center', padding: '12px 0', 
                borderBottom: idx < accountTransactions.length - 1 ? '1px solid var(--border-color)' : 'none',
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
                    {format(new Date(t.date), 'd MMM y', { locale: ru })} {t.note && `• ${t.note}`}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ 
                    fontSize: '16px', fontWeight: 600, 
                    color: isIncomeForThisCard ? 'var(--success)' : 'var(--text-primary)' 
                  }}>
                    {isIncomeForThisCard ? '+' : '-'}{formatCurrency(displayAmount, displayCurrency)}
                  </p>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
