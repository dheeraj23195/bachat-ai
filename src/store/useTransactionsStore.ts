import { create } from 'zustand';
import { Transaction, TransactionFilter } from '../lib/types';
import { listTransactions } from '../services/transactions';

interface TransactionsState {
  transactions: Transaction[];
  loading: boolean;

  loadTransactions: (filter?: TransactionFilter) => Promise<void>;
  addLocalTransaction: (tx: Transaction) => void;
}

export const useTransactionsStore = create<TransactionsState>((set) => ({
  transactions: [],
  loading: false,

  loadTransactions: async (filter) => {
    set({ loading: true });
    try {
      const rows = await listTransactions(filter ?? {});
      set({ transactions: rows });
    } catch (e) {
      console.error('Failed to load transactions', e);
    } finally {
      set({ loading: false });
    }
  },

  addLocalTransaction: (tx) =>
    set((state) => ({
      transactions: [tx, ...state.transactions],
    })),
}));
