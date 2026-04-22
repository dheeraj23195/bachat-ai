import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';

export type AlertMessage = {
  id: string;
  type: 'budget' | 'reminder' | 'system';
  title: string;
  body: string;
  date: string; // ISO string
  read: boolean;
  relatedId?: string; // e.g. transactionId or budgetId
};

interface AlertsPreferences {
  monthlyLimitAlert: boolean;
  categoryLimitAlert: boolean;
  dailyOverspendAlert: boolean;
}

interface AlertsState {
  preferences: AlertsPreferences;
  history: AlertMessage[];

  // Actions
  updatePreferences: (partial: Partial<AlertsPreferences>) => void;
  addAlert: (alert: Omit<AlertMessage, 'id' | 'date' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearHistory: () => void;
}

export const useAlertsStore = create<AlertsState>()(
  persist(
    (set) => ({
      preferences: {
        monthlyLimitAlert: true,
        categoryLimitAlert: true,
        dailyOverspendAlert: false,
      },
      history: [],

      updatePreferences: (partial) =>
        set((state) => ({
          preferences: { ...state.preferences, ...partial },
        })),

      addAlert: (alertData) =>
        set((state) => {
          const newAlert: AlertMessage = {
            ...alertData,
            id: uuid.v4() as string,
            date: new Date().toISOString(),
            read: false,
          };
          // Keep only the most recent 100 alerts
          const updatedHistory = [newAlert, ...state.history].slice(0, 100);
          return { history: updatedHistory };
        }),

      markAsRead: (id) =>
        set((state) => ({
          history: state.history.map((alert) =>
            alert.id === id ? { ...alert, read: true } : alert
          ),
        })),

      markAllAsRead: () =>
        set((state) => ({
          history: state.history.map((alert) => ({ ...alert, read: true })),
        })),

      clearHistory: () => set({ history: [] }),
    }),
    {
      name: 'alert-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
