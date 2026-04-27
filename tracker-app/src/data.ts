import { Account, Transaction } from './types';
export { DEFAULT_CATEGORIES as CATEGORIES } from './categories';

export const INITIAL_ACCOUNTS: Account[] = [
  { id: 'a1', name: 'Касса (в Суммах)', balanceUZS: 350, balanceUSD: 0 },
  { id: 'a2', name: 'Остаток на карте', balanceUZS: 0, balanceUSD: 0 },
];

export const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: 't1',
    amount: 120000,
    currency: 'UZS',
    categoryId: 'food',
    accountId: 'a2',
    date: new Date().toISOString(),
    type: 'expense',
    note: 'Корзинка'
  },
  {
    id: 't2',
    amount: 4500000,
    currency: 'UZS',
    categoryId: 'salary',
    accountId: 'a2',
    date: new Date(Date.now() - 86400000).toISOString(),
    type: 'income',
    note: 'Зарплата за Сентябрь'
  },
  {
    id: 't3',
    amount: 50000,
    currency: 'UZS',
    categoryId: 'transport',
    accountId: 'a1',
    date: new Date(Date.now() - 86400000 * 2).toISOString(),
    type: 'expense',
    note: 'Такси на работу'
  }
];
