import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { getIcon } from '../lib/icons';
import { PieChart, BarChart2, TrendingDown } from 'lucide-react';

const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('ru-RU').format(Math.round(amount)) + ' ' + currency;
};

// ── SVG Donut Chart ────────────────────────────────────────────────────────
interface DonutSlice { color: string; percentage: number; label: string; }

function DonutChart({ slices }: { slices: DonutSlice[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const cx = 110, cy = 110, r = 78, stroke = 26;
  const circumference = 2 * Math.PI * r;
  let cumulative = 0;

  const paths = slices.map((s, i) => {
    const offset = circumference - (s.percentage / 100) * circumference;
    const rotation = (cumulative / 100) * 360 - 90;
    cumulative += s.percentage;
    return (
      <circle key={i} cx={cx} cy={cy} r={r} fill="none"
        stroke={s.color}
        strokeWidth={hovered === i ? stroke + 4 : stroke}
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={offset}
        strokeLinecap="butt"
        style={{ transform: `rotate(${rotation}deg)`, transformOrigin: `${cx}px ${cy}px`, transition: 'stroke-width 0.2s ease', cursor: 'pointer' }}
        onMouseEnter={() => setHovered(i)}
        onMouseLeave={() => setHovered(null)}
      />
    );
  });

  const hoveredSlice = hovered !== null ? slices[hovered] : null;
  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
      <svg width={220} height={220} style={{ overflow: 'visible' }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg-tertiary)" strokeWidth={stroke} />
        {paths}
        {hoveredSlice ? (
          <>
            <text x={cx} y={cy - 10} textAnchor="middle" fill="var(--text-primary)" fontSize="13" fontWeight="600">
              {hoveredSlice.label.length > 12 ? hoveredSlice.label.slice(0, 12) + '…' : hoveredSlice.label}
            </text>
            <text x={cx} y={cy + 12} textAnchor="middle" fill={hoveredSlice.color} fontSize="20" fontWeight="700">
              {hoveredSlice.percentage.toFixed(1)}%
            </text>
          </>
        ) : (
          <text x={cx} y={cy + 7} textAnchor="middle" fill="var(--text-muted)" fontSize="13">Всего</text>
        )}
      </svg>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function Analytics() {
  const { transactions: storeTransactions, categories } = useStore();
  const navigate = useNavigate();

  // Исключаем транзакции, скрытые от статистики
  const transactions = storeTransactions.filter(t => !t.excludeFromStats);

  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [chartMode, setChartMode] = useState<'donut' | 'bar'>('donut');
  const [isExpensesExpanded, setIsExpensesExpanded] = useState(false);

  // ── Expense calculations ─────────────────────────────────────────────────
  const expenseTxs = transactions.filter(t => t.type === 'expense');

  // Regular UZS expenses (not from USD card)
  const regularUZSExpenses = expenseTxs
    .filter(t => t.currency === 'UZS')
    .reduce((acc, t) => acc + t.amount, 0);

  // USD expenses converted to UZS (Вариант А: manual exchange rate)
  const usdExpensesInUZS = expenseTxs
    .filter(t => t.currency === 'USD')
    .reduce((acc, t) => {
      return acc + (t.convertedAmount ?? 0);
    }, 0);

  // Transfers from USD to UZS cards (taking cash out of USD pool)
  const usdToUzsTransfersInUZS = transactions
    .filter(t => t.type === 'transfer' && t.currency === 'USD' && t.convertedAmount)
    .reduce((acc, t) => acc + (t.convertedAmount ?? 0), 0);
    
  const totalUsdSpentInUZS = usdExpensesInUZS + usdToUzsTransfersInUZS;

  // Total UZS expenses = regular + USD spent (in UZS equivalent)
  const totalUZSExpenses = regularUZSExpenses + usdExpensesInUZS;

  // Currency purchase pool: UZS→USD transfers with addToExpenses flag
  const usdPurchasePoolTotal = transactions
    .filter(t => t.type === 'transfer' && t.addToExpenses === true && t.currency === 'UZS')
    .reduce((acc, t) => acc + t.amount, 0);

  // Remaining pool = purchased - already spent from USD (including transfers back to UZS)
  const usdPoolRemaining = Math.max(0, usdPurchasePoolTotal - totalUsdSpentInUZS);

  const hasUsdPool = usdPurchasePoolTotal > 0;

  // Grand total
  const grandTotal = totalUZSExpenses + usdPoolRemaining;

  // ── Category analytics ────────────────────────────────────────────────────
  const filteredTx = transactions.filter(t => t.type === type);
  const totalAmount = filteredTx.reduce((acc, t) => {
    const amountInUZS = t.currency === 'UZS' ? t.amount : (t.convertedAmount || 0);
    return acc + amountInUZS;
  }, 0);

  const categoryTotals: Record<string, number> = {};
  filteredTx.forEach(t => {
    const amountInUZS = t.currency === 'UZS' ? t.amount : (t.convertedAmount || 0);
    categoryTotals[t.categoryId] = (categoryTotals[t.categoryId] || 0) + amountInUZS;
  });

  const sortedCategories = Object.entries(categoryTotals)
    .map(([id, amount]) => ({
      category: categories.find(c => c.id === id),
      amount,
      percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const donutSlices: DonutSlice[] = sortedCategories.map(item => ({
    color: item.category?.color || 'var(--accent-primary)',
    percentage: item.percentage,
    label: item.category?.name || 'Неизвестно',
  }));

  return (
    <div className="page-content animate-fade-in">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2>Статистика</h2>
        <div style={{ display: 'flex', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '3px', gap: '2px' }}>
          <button id="chart-donut-btn" onClick={() => setChartMode('donut')} title="Круговая диаграмма"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px', borderRadius: 'var(--radius-sm)', background: chartMode === 'donut' ? 'var(--accent-primary)' : 'transparent', color: chartMode === 'donut' ? '#fff' : 'var(--text-muted)', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}>
            <PieChart size={16} />
          </button>
          <button id="chart-bar-btn" onClick={() => setChartMode('bar')} title="Прямые полосы"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px', borderRadius: 'var(--radius-sm)', background: chartMode === 'bar' ? 'var(--accent-primary)' : 'transparent', color: chartMode === 'bar' ? '#fff' : 'var(--text-muted)', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}>
            <BarChart2 size={16} />
          </button>
        </div>
      </div>

      {/* Expense / Income toggle */}
      <div style={{ display: 'flex', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '4px', marginBottom: '16px' }}>
        <button onClick={() => setType('expense')}
          style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-sm)', background: type === 'expense' ? 'var(--bg-secondary)' : 'transparent', color: type === 'expense' ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: type === 'expense' ? 600 : 400, boxShadow: type === 'expense' ? 'var(--shadow-sm)' : 'none' }}>
          Расходы
        </button>
        <button onClick={() => setType('income')}
          style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-sm)', background: type === 'income' ? 'var(--bg-secondary)' : 'transparent', color: type === 'income' ? 'var(--success)' : 'var(--text-muted)', fontWeight: type === 'income' ? 600 : 400, boxShadow: type === 'income' ? 'var(--shadow-sm)' : 'none' }}>
          Доходы
        </button>
      </div>

      {/* ── Expense summary cards (only when "Расходы" tab active) ── */}
      {type === 'expense' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          
          {/* Main Card: Grand total (always visible) */}
          <div 
            className="glass-panel" 
            onClick={() => hasUsdPool && setIsExpensesExpanded(!isExpensesExpanded)}
            style={{ 
              padding: '18px 20px', 
              background: hasUsdPool ? 'rgba(79,70,229,0.05)' : 'var(--glass-bg)',
              cursor: hasUsdPool ? 'pointer' : 'default',
              transition: 'background 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingDown size={16} style={{ color: 'var(--danger)' }} />
                <p className="text-muted" style={{ fontSize: '13px' }}>Общие расходы</p>
              </div>
              {hasUsdPool && (
                <span className="text-muted" style={{ fontSize: '12px', background: 'var(--bg-tertiary)', padding: '2px 8px', borderRadius: '10px' }}>
                  {isExpensesExpanded ? 'Скрыть детали ↑' : 'Показать детали ↓'}
                </span>
              )}
            </div>
            <h3 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {formatCurrency(grandTotal, 'UZS')}
            </h3>
            {hasUsdPool && (
              <p className="text-muted" style={{ fontSize: '12px', marginTop: '4px' }}>
                UZS {formatCurrency(totalUZSExpenses, '')} + Пул USD {formatCurrency(usdPoolRemaining, '')}
              </p>
            )}
          </div>

          {/* Collapsible details wrapper */}
          <div style={{ 
            display: 'flex', flexDirection: 'column', gap: '10px',
            overflow: 'hidden', padding: isExpensesExpanded ? '2px' : '0 2px',
            transition: 'max-height 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease',
            maxHeight: isExpensesExpanded ? '500px' : '0px',
            opacity: isExpensesExpanded ? 1 : 0
          }}>
            {/* Detailed Card 1: UZS expenses */}
            <div 
              onClick={() => navigate('/history?type=expense&currency=UZS')}
              style={{ 
                padding: '16px 20px', borderLeft: '4px solid var(--accent-primary)',
                background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)',
                cursor: 'pointer', borderTop: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)'
              }}
            >
              <p className="text-muted" style={{ fontSize: '13px', marginBottom: '4px' }}>Обычные расходы (UZS)</p>
              <h3 style={{ fontSize: '22px', fontWeight: 700 }}>
                {formatCurrency(totalUZSExpenses, 'UZS')}
              </h3>
              {usdExpensesInUZS > 0 && (
                <p className="text-muted" style={{ fontSize: '12px', marginTop: '4px' }}>
                  в т.ч. оплачено с USD-счетов: {formatCurrency(usdExpensesInUZS, 'UZS')}
                </p>
              )}
            </div>

            {/* Detailed Card 2: USD pool (shown only if any transfer with addToExpenses) */}
            {hasUsdPool && (
              <div 
                onClick={() => navigate('/history?pool=true')}
                style={{ 
                  padding: '16px 20px', borderLeft: '4px solid #8b5cf6',
                  background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)',
                  cursor: 'pointer', borderTop: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)'
                }}
              >
                <p className="text-muted" style={{ fontSize: '13px', marginBottom: '4px' }}>
                  💱 Пул: Конвертировано в USD
                </p>
                <h3 style={{ fontSize: '22px', fontWeight: 700, color: '#8b5cf6' }}>
                  {formatCurrency(usdPoolRemaining, 'UZS')}
                </h3>
                <div style={{ display: 'flex', gap: '16px', marginTop: '6px' }}>
                  <p className="text-muted" style={{ fontSize: '12px' }}>
                    Всего обменяно: {formatCurrency(usdPurchasePoolTotal, 'UZS')}
                  </p>
                  {totalUsdSpentInUZS > 0 && (
                    <p className="text-muted" style={{ fontSize: '12px' }}>
                      Потрачено: {formatCurrency(totalUsdSpentInUZS, 'UZS')}
                    </p>
                  )}
                </div>
                {/* Mini progress bar: how much spent from pool */}
                <div style={{ marginTop: '10px', width: '100%', height: '4px', background: 'var(--bg-tertiary)', borderRadius: '2px' }}>
                  <div style={{
                    width: `${usdPurchasePoolTotal > 0 ? Math.min(100, (totalUsdSpentInUZS / usdPurchasePoolTotal) * 100) : 0}%`,
                    height: '100%', background: '#8b5cf6', borderRadius: '2px',
                    transition: 'width 0.5s ease',
                  }} />
                </div>
              </div>
            )}
          </div>


          {/* Card: income total (no USD pool block) */}
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', marginBottom: '20px' }}>
          <p className="text-muted" style={{ marginBottom: '4px' }}>Всего доходов (UZS)</p>
          <h3 className="text-gradient" style={{ fontSize: '32px', fontWeight: 700 }}>
            {formatCurrency(totalAmount, 'UZS')}
          </h3>
        </div>
      )}

      {/* Categories section */}
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>
          {type === 'expense' ? 'Траты' : 'Сумма'} по категориям
        </h3>

        {sortedCategories.length === 0 ? (
          <div className="glass-panel" style={{ padding: '32px', textAlign: 'center' }}>
            <p className="text-muted">Нет данных</p>
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: '16px' }}>
            {chartMode === 'donut' && <DonutChart slices={donutSlices} />}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {sortedCategories.map(item => {
                const IconComp = getIcon(item.category?.iconName || '');
                const color = item.category?.color || 'var(--accent-primary)';
                return (
                  <div key={item.category?.id || Math.random()}
                    onClick={() => { if (item.category?.id) navigate(`/history?category=${item.category.id}`); }}
                    style={{ cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {IconComp && <IconComp size={16} color={color} />}
                        <span style={{ fontWeight: 500, fontSize: '14px' }}>{item.category?.name || 'Неизвестно'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 600, fontSize: '14px' }}>{formatCurrency(item.amount, 'UZS')}</span>
                        <span style={{ fontSize: '12px', fontWeight: 600, padding: '2px 6px', borderRadius: '10px', background: `${color}22`, color, minWidth: '42px', textAlign: 'center' }}>
                          {item.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${item.percentage}%`, height: '100%', background: color, borderRadius: '3px', transition: 'width 0.5s cubic-bezier(0.16, 1, 0.3, 1)' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
