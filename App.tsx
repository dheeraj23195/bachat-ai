// App.tsx

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import { initDatabase } from './src/services/db';
import { useTransactionsStore } from './src/store/useTransactionsStore';
import { listTransactions } from './src/services/transactions';

export default function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadTransactions = useTransactionsStore((s) => s.loadTransactions);


  useEffect(() => {
    (async () => {
      try {
        await initDatabase();
        await loadTransactions();  
        setReady(true);
      } catch (e: any) {
        console.error('DB init error', e);
        setError('Failed to initialize local database');
      }
    })();
  }, []);

  if (!ready) {
    return (
      <SafeAreaProvider>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <ActivityIndicator />
          <Text style={{ marginTop: 12 }}>Preparing your local vault…</Text>
          {error && (
            <Text style={{ marginTop: 8, color: 'red', paddingHorizontal: 20, textAlign: 'center' }}>
              {error}
            </Text>
          )}
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
