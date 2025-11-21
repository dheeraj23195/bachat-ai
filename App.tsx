// App.tsx

import React, { useEffect, useState } from 'react';
import { initMLTables } from "./src/ml/db";
import { ActivityIndicator, View, Text, AppState } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator, { RootStackParamList } from './src/navigation/RootNavigator';
import { initDatabase } from './src/services/db';
import { useTransactionsStore } from './src/store/useTransactionsStore';
import { listTransactions } from './src/services/transactions';
import { ensureDefaultCategories } from './src/services/categories';
import { hasPin } from './src/lib/pin';

const navigationRef = createNavigationContainerRef<RootStackParamList>();


export default function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadTransactions = useTransactionsStore((s) => s.loadTransactions);


  useEffect(() => {
    (async () => {
      try {
        await initDatabase();
        await initMLTables();
        await ensureDefaultCategories(); 
        await loadTransactions();  
        setReady(true);
      } catch (e: any) {
        console.error('DB init error', e);
        setError('Failed to initialize local database');
      }
    })();
  }, []);

    useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        // Navigator might not be ready yet on cold start
        if (!navigationRef.isReady()) {
          return;
        }

        (async () => {
          const pinExists = await hasPin();
          const currentRoute = navigationRef.getCurrentRoute()?.name;

          if (pinExists && currentRoute !== 'Lock') {
            navigationRef.reset({
              index: 0,
              routes: [{ name: 'Lock' }],
            });
          }
        })();
      }
    });

    return () => {
      subscription.remove();
    };
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
      <NavigationContainer ref={navigationRef}>
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

