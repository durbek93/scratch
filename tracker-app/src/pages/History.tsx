import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { getIcon } from '../lib/icons';
import { format, isSameDay, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Wallet, Download, FileSpreadsheet, FileText, Table, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { Transaction } from '../types';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { exportToCSV, exportToXLSX, exportToPDF } from '../lib/exportUtils';

// Formatter function
const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('ru-RU').format(amount) + ' ' + currency;
};

// Helper to group transactions by date
const groupTransactionsByDate = (transactions: Transaction[]) => {
  const groups: { date: Date; transactions: Transaction[] }[] = [];

  // Sort from newest to oldest
  const sorted = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  sorted.forEach(t => {
    const tDate = new Date(t.date);
    const existingGroup = groups.find(g => isSameDay(g.date, tDate));
    if (existingGroup) {
      existingGroup.transactions.push(t);
    } else {
      groups.push({ date: tDate, transactions: [t] });
    }
  });

  return groups;
};

export default function History() {
  const { transactions, categories, accounts, updateTransaction } = useStore();
  const location = useLocation();
  const navigate = useNavigate();

  const queryParams = new URLSearchParams(location.search);
  const selectedCategoryId = queryParams.get('category');
  const typeParam = queryParams.get('type');
  const currencyParam = queryParams.get('currency');
  const addToExpensesParam = queryParams.get('addToExpenses');
  const poolParam = queryParams.get('pool');
  const hasFilterParams = Boolean(typeParam || currencyParam || addToExpensesParam || selectedCategoryId || poolParam);

  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredTransactions = transactions.filter(t => {
    const tDate = new Date(t.date);
    if (startDate && tDate < startOfDay(new Date(startDate))) return false;
    if (endDate && tDate > endOfDay(new Date(endDate))) return false;
    if (selectedCategoryId && t.categoryId !== selectedCategoryId) return false;
    
    if (poolParam === 'true') {
      const isPoolIncoming = t.type === 'transfer' && t.addToExpenses === true && t.currency === 'UZS';
      const isPoolOutgoing = (t.type === 'expense' && t.currency === 'USD') || (t.type === 'transfer' && t.currency === 'USD');
      if (!isPoolIncoming && !isPoolOutgoing) return false;
    } else {
      if (typeParam && t.type !== typeParam) return false;
      if (currencyParam && t.currency !== currencyParam) return false;
      if (addToExpensesParam === 'true' && t.addToExpenses !== true) return false;
    }
    
    return true;
  });

  const grouped = groupTransactionsByDate(filteredTransactions);

  const dateRangeLabel = {
    from: startDate ? format(new Date(startDate), 'dd.MM.yyyy') : '—',
    to: endDate ? format(new Date(endDate), 'dd.MM.yyyy') : '—',
  };
  const filenameBase = `transactions_${dateRangeLabel.from}_${dateRangeLabel.to}`.replace(/\./g, '-');

  const handleExport = (fmt: 'csv' | 'xlsx' | 'pdf') => {
    setExportOpen(false);
    if (fmt === 'csv') exportToCSV(filteredTransactions, categories, accounts, filenameBase);
    if (fmt === 'xlsx') exportToXLSX(filteredTransactions, categories, accounts, filenameBase);
    if (fmt === 'pdf') exportToPDF(filteredTransactions, categories, accounts, dateRangeLabel, filenameBase);
  };

  return (
    <div className="page-content animate-fade-in">
      <div className="page-header" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {hasFilterParams && (
            <button onClick={() => navigate(-1)} style={{ color: 'var(--text-primary)', marginLeft: '-8px' }}>
              <ArrowLeft size={24} />
            </button>
          )}
          <h2>История операций</h2>
        </div>

        {/* Export button */}
        <div ref={exportRef} style={{ position: 'relative' }}>
          <button
            id="export-btn"
            onClick={() => setExportOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '38px', height: '38px', borderRadius: 'var(--radius-md)',
              background: 'var(--accent-primary)', color: '#fff',
              cursor: 'pointer', border: 'none', outline: 'none',
              boxShadow: '0 2px 8px rgba(79,70,229,0.25)',
              transition: 'opacity 0.2s',
            }}
            aria-label="Экспорт данных"
          >
            <Download size={18} />
          </button>

          {exportOpen && (
            <div className="export-dropdown">
              <button className="export-dropdown-item" onClick={() => handleExport('xlsx')} id="export-xlsx">
                <FileSpreadsheet size={16} />
                XLSX (Excel)
              </button>
              <button className="export-dropdown-item" onClick={() => handleExport('pdf')} id="export-pdf">
                <FileText size={16} />
                PDF
              </button>
              <button className="export-dropdown-item" onClick={() => handleExport('csv')} id="export-csv">
                <Table size={16} />
                CSV (Google Sheets)
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '16px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label className="text-muted" style={{ display: 'block', fontSize: '14px', marginBottom: '8px' }}>С даты</label>
            <input
              type="date"
              className="date-time-input"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-muted" style={{ display: 'block', fontSize: '14px', marginBottom: '8px' }}>По дату</label>
            <input
              type="date"
              className="date-time-input"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>
        </div>
        {(startDate || endDate || selectedCategoryId) && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {selectedCategoryId ? (
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', padding: '4px 8px', borderRadius: '4px' }}>
                Категория: {categories.find(c => c.id === selectedCategoryId)?.name || 'Неизвестно'}
              </div>
            ) : <div />}
            <button
              onClick={() => { setStartDate(''); setEndDate(''); navigate('/history'); }}
              style={{ color: 'var(--accent-primary)', fontSize: '14px', fontWeight: 500 }}
            >
              Сбросить фильтр
            </button>
          </div>
        )}
      </div>

      {grouped.length === 0 ? (
        <div className="glass-panel" style={{ padding: '32px', textAlign: 'center' }}>
          <p className="text-muted">Список транзакций пуст</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {grouped.map((group, groupIdx) => {
            const dateLabel = format(group.date, 'd MMMM, yyyy', { locale: ru });
            // Calculate daily total
            const dailyTotalExpenseUZS = group.transactions
              .filter(t => t.type === 'expense' && t.currency === 'UZS')
              .reduce((acc, t) => acc + t.amount, 0);

            return (
              <div key={groupIdx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', padding: '0 4px' }}>
                  <span className="text-muted" style={{ fontSize: '14px', fontWeight: 500 }}>{dateLabel}</span>
                  {dailyTotalExpenseUZS > 0 && (
                    <span className="text-muted" style={{ fontSize: '14px' }}>
                      -{formatCurrency(dailyTotalExpenseUZS, 'UZS')}
                    </span>
                  )}
                </div>

                <div className="glass-panel" style={{ padding: '8px 16px' }}>
                  {group.transactions.map((t, idx) => {
                    const category = categories.find(c => c.id === t.categoryId);
                    const isTransfer = t.type === 'transfer';
                    const isIncome = t.type === 'income';

                    const IconComp = isTransfer ? Wallet : getIcon(category?.iconName || '');
                    const color = isTransfer ? '#8b5cf6' : (category?.color || '#94a3b8');
                    const name = isTransfer ? 'Перевод' : (category?.name || 'Неизвестно');

                    return (
                      <Link key={t.id} to={`/edit/${t.id}`} style={{
                        display: 'flex', alignItems: 'center', padding: '12px 0',
                        borderBottom: idx < group.transactions.length - 1 ? '1px solid var(--border-color)' : 'none',
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
                          {t.note && (
                            <p className="text-muted" style={{ fontSize: '13px' }}>{t.note}</p>
                          )}
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
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
