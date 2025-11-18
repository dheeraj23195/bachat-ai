import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { format, parseISO } from 'date-fns';

import { RootStackParamList } from '../../navigation/RootNavigator';
import colors from '../../lib/colors';
import { useTransactionsStore } from '../../store/useTransactionsStore';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

type Props = NativeStackScreenProps<RootStackParamList, 'TransactionsList'>;

const TransactionsListScreen: React.FC<Props> = ({ route }) => {
  const { categoryId, title } = route.params || {};
  const transactions = useTransactionsStore((s) => s.transactions);

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const filtered = useMemo(
    () =>
      transactions.filter((tx) => {
        if (tx.type !== 'expense') return false;

        try {
          const d = parseISO(tx.date);
          if (!isWithinInterval(d, { start: monthStart, end: monthEnd })) {
            return false;
          }
        } catch {
          return false;
        }

        if (categoryId === null || categoryId === undefined) {
          return true;
        }
        return tx.categoryId === categoryId;
      }),
    [transactions, categoryId, monthStart, monthEnd]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {title || 'Transactions'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {categoryId
              ? 'Filtered by category'
              : 'All expenses this month'}
          </Text>
        </View>

        {filtered.length === 0 ? (
          <Text style={styles.emptyText}>
            No matching expenses found.
          </Text>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              let dateLabel = '';
              try {
                dateLabel = format(parseISO(item.date), 'dd MMM');
              } catch {
                dateLabel = item.date;
              }

              return (
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>
                      {item.encryptedNote || 'Expense'}
                    </Text>
                    <Text style={styles.rowSubtitle}>{dateLabel}</Text>
                  </View>
                  <Text style={styles.rowAmount}>
                    ₹{item.amount.toFixed(0)}
                  </Text>
                </View>
              );
            }}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textSecondary,
  },
  emptyText: {
    marginTop: 20,
    fontSize: 14,
    color: colors.textSecondary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  rowSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  rowAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: 12,
  },
});

export default TransactionsListScreen;
