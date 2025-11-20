import React, { useEffect, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import colors from '../../lib/colors';
import { useTransactionsStore } from '../../store/useTransactionsStore';
import { listBudgets } from '../../services/budgets';
import { listCategories } from '../../services/categories';
import { expandRecurringTransactionsForRange } from '../../services/transactions';
import { Budget, Category, Transaction } from '../../lib/types';
import { startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';


const AlertsScreen: React.FC = () => {
  const [monthlyLimitAlert, setMonthlyLimitAlert] = useState(true);
  const [categoryLimitAlert, setCategoryLimitAlert] = useState(true);
  const [dailyOverspendAlert, setDailyOverspendAlert] = useState(false);

  // ---- NEW: budgets + categories + transactions ----
  const transactions = useTransactionsStore((s) => s.transactions);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [budgetRows, categoryRows] = await Promise.all([
          listBudgets({ activeOnly: true }),
          listCategories(),
        ]);
        setBudgets(budgetRows);
        setCategories(categoryRows);
      } catch (e) {
        console.error('Failed to load budgets/categories for alerts', e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  // Expand recurring & filter to this month, expenses only
  const monthlyExpenses = useMemo(() => {
    const expanded = expandRecurringTransactionsForRange(
      transactions,
      monthStart,
      monthEnd
    );

    return expanded.filter((tx) => {
      if (tx.type !== 'expense') return false;
      try {
        const d = parseISO(tx.date);
        return isWithinInterval(d, { start: monthStart, end: monthEnd });
      } catch {
        return false;
      }
    });
  }, [transactions, monthStart, monthEnd]);

  // Spend per category
  const spendByCategory = useMemo(() => {
    const map = new Map<string | null, number>();
    monthlyExpenses.forEach((tx) => {
      const key = tx.categoryId ?? null;
      map.set(key, (map.get(key) || 0) + tx.amount);
    });
    return map;
  }, [monthlyExpenses]);

  type AlertStatus = 'on_track' | 'near' | 'over';

  type BudgetAlert = {
    id: string;
    categoryId: string | null;
    categoryName: string;
    color: string;
    spent: number;
    limit: number;
    thresholdPercent: number;
    usagePercent: number;
    status: AlertStatus;
  };

  const budgetAlerts: BudgetAlert[] = useMemo(() => {
    return budgets
      .filter((b) => b.limitAmount > 0)
      .map((b) => {
        const spent = spendByCategory.get(b.categoryId ?? null) || 0;
        const usagePercent = (spent / b.limitAmount) * 100;

        let status: AlertStatus = 'on_track';
        if (usagePercent >= 100) {
          status = 'over';
        } else if (usagePercent >= b.alertThresholdPercent) {
          status = 'near';
        }

        const cat =
          b.categoryId !== null ? categoryMap.get(b.categoryId) ?? null : null;

        return {
          id: b.id,
          categoryId: b.categoryId ?? null,
          categoryName: cat?.name ?? (b.categoryId ? 'Category' : 'Overall'),
          color: cat?.colorHex ?? colors.primary,
          spent,
          limit: b.limitAmount,
          thresholdPercent: b.alertThresholdPercent,
          usagePercent,
          status,
        };
      });
  }, [budgets, spendByCategory, categoryMap]);

  const navigation = useNavigation();
  const handleBack = () => navigation.goBack();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backIcon}>{'‹'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Alerts & Notifications</Text>
        </View>

        <Text style={styles.headerSubtitle}>
          Smart reminders to help you stay within your budget
        </Text>

        {/* AI card */}
        <View style={styles.aiCard}>
          <View style={styles.aiIconCircle}>
            <Text style={styles.aiIcon}>🤖</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.aiTitle}>AI-enhanced alerts</Text>
            <Text style={styles.aiSubtitle}>
              Alerts are generated locally without sending data outside
            </Text>
          </View>
        </View>

        {/* Alert settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alert Types</Text>
          <Text style={styles.sectionSubtitle}>
            Choose the types of alerts you want
          </Text>

          <View style={styles.card}>
            <SettingsSwitchRow
              title="Monthly budget limit"
              subtitle="Alert when your total spend crosses 80% of monthly budget"
              value={monthlyLimitAlert}
              onValueChange={setMonthlyLimitAlert}
            />
            <View style={styles.divider} />

            <SettingsSwitchRow
              title="Category budget limit"
              subtitle="Alert when any category crosses its threshold"
              value={categoryLimitAlert}
              onValueChange={setCategoryLimitAlert}
            />
            <View style={styles.divider} />

            <SettingsSwitchRow
              title="Daily overspending"
              subtitle="Smart detection of unusual spending spikes"
              value={dailyOverspendAlert}
              onValueChange={setDailyOverspendAlert}
            />
          </View>
        </View>

                {/* Current alerts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current status</Text>
          <Text style={styles.sectionSubtitle}>
            How close you are to each budget
          </Text>

          <View style={styles.card}>
            {loading ? (
              <Text style={styles.rowSubtitle}>Loading…</Text>
            ) : budgetAlerts.length === 0 ? (
              <Text style={styles.rowSubtitle}>
                No budgets set up yet. Create a budget to see alerts here.
              </Text>
            ) : (
              budgetAlerts.map((alert) => (
                <View key={alert.id} style={styles.alertRow}>
                  <View style={styles.alertLeft}>
                    <View
                      style={[
                        styles.alertColorDot,
                        { backgroundColor: alert.color },
                      ]}
                    />
                    <View>
                      <Text style={styles.rowTitle}>
                        {alert.categoryName}
                      </Text>
                      <Text style={styles.rowSubtitle}>
                        ₹{alert.spent.toLocaleString()} of ₹
                        {alert.limit.toLocaleString()} • Alert at{' '}
                        {alert.thresholdPercent}%
                      </Text>
                    </View>
                  </View>

                  <View style={styles.alertRight}>
                    <View
                      style={[
                        styles.statusPill,
                        alert.status === 'over'
                          ? styles.statusPillOver
                          : alert.status === 'near'
                          ? styles.statusPillNear
                          : styles.statusPillOk,
                      ]}
                    >
                      <Text style={styles.statusPillText}>
                        {alert.status === 'over'
                          ? 'Over'
                          : alert.status === 'near'
                          ? 'Near limit'
                          : 'On track'}
                      </Text>
                    </View>
                    <Text style={styles.alertUsageText}>
                      {alert.usagePercent.toFixed(0)}%
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>


        {/* Quiet hours */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quiet Hours</Text>
          <Text style={styles.sectionSubtitle}>
            Muted notifications during specific hours
          </Text>

          <View style={styles.card}>
            <View style={styles.quietRow}>
              <Text style={styles.quietTitle}>Do not disturb</Text>
              <Text style={styles.quietValue}>10 PM – 7 AM</Text>
            </View>

            <View style={styles.quietDescriptionRow}>
              <Text style={styles.quietDescription}>
                Notifications will be muted during these hours
              </Text>
              <Text style={styles.chevron}>{'›'}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

type SettingsSwitchRowProps = {
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
};

const SettingsSwitchRow: React.FC<SettingsSwitchRowProps> = ({
  title,
  subtitle,
  value,
  onValueChange,
}) => (
  <View style={styles.row}>
    <View style={styles.rowTextContainer}>
      <Text style={styles.rowTitle}>{title}</Text>
      {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: '#E5E7EB', true: '#BFDBFE' }}
      thumbColor={value ? colors.primary : '#FFFFFF'}
    />
  </View>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  backIcon: {
    fontSize: 26,
    color: colors.textPrimary,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 16,
  },
  aiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 20,
  },
  aiIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  aiIcon: {
    fontSize: 19,
  },
  aiTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  aiSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  section: {
    marginTop: 4,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 8,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  rowTextContainer: {
    flex: 1,
    paddingRight: 12,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  rowSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  quietRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  quietTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  quietValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  quietDescriptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  quietDescription: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
  },
  chevron: {
    fontSize: 20,
    color: colors.textSecondary,
  },
    alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  alertLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 12,
  },
  alertColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  alertRight: {
    alignItems: 'flex-end',
  },
  alertUsageText: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textSecondary,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusPillOver: {
    backgroundColor: '#EF4444',
  },
  statusPillNear: {
    backgroundColor: '#F97316',
  },
  statusPillOk: {
    backgroundColor: '#22C55E',
  },
});

export default AlertsScreen;
