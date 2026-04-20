// src/screens/Budget/BudgetScreen.tsx

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { expandRecurringTransactionsForRange } from '../../services/transactions';

import {
  startOfMonth,
  endOfMonth,
  parseISO,
  isWithinInterval,
  format,
  addMonths,
  subMonths,
} from 'date-fns';

import { AppTabParamList } from '../../navigation/AppTabs';
import { RootStackParamList } from '../../navigation/RootNavigator';

import colors from '../../lib/colors';
import { useTransactionsStore } from '../../store/useTransactionsStore';

import { listBudgets, deleteBudget } from '../../services/budgets';
import { listCategories } from '../../services/categories';

import { Budget, Category } from '../../lib/types';

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function getYearOptions(currentYear: number): number[] {
  const years: number[] = [];
  for (let y = currentYear - 3; y <= currentYear + 3; y++) {
    years.push(y);
  }
  return years;
}

type Props = BottomTabScreenProps<AppTabParamList, 'Budget'>;

type CategoryBudget = {
  budgetId: string | null; // null if no budget exists yet
  categoryId: string;
  name: string;
  spent: number;
  limit: number | null;
  color: string;
};

const BudgetScreen: React.FC<Props> = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();

  const transactions = useTransactionsStore((s) => s.transactions);

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const monthStart = useMemo(
    () => startOfMonth(currentMonthDate),
    [currentMonthDate]
  );
  const monthEnd = useMemo(
    () => endOfMonth(currentMonthDate),
    [currentMonthDate]
  );
  const expandedMonthlyTransactions = useMemo(
    () => expandRecurringTransactionsForRange(transactions, monthStart, monthEnd),
    [transactions, monthStart, monthEnd]
  );


  // -------------------------------------------
  // Load categories + budgets from DB
  // -------------------------------------------
  const loadData = async () => {
    try {
      setLoading(true);

      const [catRows, budgetRows] = await Promise.all([
        listCategories(),
        listBudgets({ activeOnly: true }),
      ]);

      setCategories(catRows);
      setBudgets(budgetRows);
    } catch (e) {
      console.error('Failed to load budgets/categories', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      const fetchData = async () => {
        try {
          const fetchedCategories = await listCategories();  // <-- Fetch categories
          const fetchedBudgets = await listBudgets({ activeOnly: true });
          setCategories(fetchedCategories); // <-- Set categories state
          setBudgets(fetchedBudgets); // <-- Set budgets state
        } catch (e) {
          console.error('Failed to load categories/budgets', e);
        }
      };

      fetchData();
    }
  }, [isFocused]);  // <-- Trigger on screen focus


  // -------------------------------------------
  // Monthly expenses
  // -------------------------------------------


// 2) Keep only expenses from that expanded list
  const monthlyExpenses = useMemo(
    () => expandedMonthlyTransactions.filter((tx) => tx.type === 'expense'),
    [expandedMonthlyTransactions]
  );

  const totalSpent = useMemo(
    () => monthlyExpenses.reduce((sum, tx) => sum + tx.amount, 0),
    [monthlyExpenses]
  );

  const spendByCategory = useMemo(() => {
    const map = new Map<string, number>();
    monthlyExpenses.forEach((tx) => {
      const key = tx.categoryId ?? 'uncategorized';
      map.set(key, (map.get(key) || 0) + tx.amount);
    });
    return map;
  }, [monthlyExpenses]);

  // -------------------------------------------
  // Build categoryBudgets from DB categories + DB budgets + actual spending
  // -------------------------------------------
  const categoryBudgets: CategoryBudget[] = useMemo(() => {
    return categories.map((cat) => {
      const budget = budgets.find((b) => b.categoryId === cat.id) || null;
      const spent = spendByCategory.get(cat.id) || 0;

      return {
        budgetId: budget?.id ?? null,
        categoryId: cat.id,
        name: cat.name,
        spent,
        limit: budget?.limitAmount ?? null,
        color: cat.colorHex ?? colors.primary,
      };
    }).sort((a, b) => b.spent - a.spent);
  }, [budgets, categories, spendByCategory]);

  // -------------------------------------------
  // Total Budget = sum of all monthly budgets
  // -------------------------------------------
  const totalBudget = budgets.reduce((sum, b) => sum + b.limitAmount, 0);
  const totalRemaining = Math.max(0, totalBudget - totalSpent);
  const totalPercent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  // -------------------------------------------
  // Navigation actions
  // -------------------------------------------
  const handleOpenAllTransactions = () => {
    navigation.navigate('TransactionsList', {
      categoryId: null,
      title: `All expenses (${format(currentMonthDate, 'MMM yyyy')})`,
      startDate: monthStart.toISOString(),
      endDate: monthEnd.toISOString(),
    });
  };


  const handleOpenCategoryTransactions = (categoryId: string, name: string) => {
    navigation.navigate('TransactionsList', {
      categoryId,
      title: `${name} (${format(currentMonthDate, 'MMM yyyy')})`,
      startDate: monthStart.toISOString(),
      endDate: monthEnd.toISOString(),
    });
  };


  const handleEditBudget = (budgetId: string) => {
    navigation.navigate('EditBudgetCategory', { budgetId });
  };
  const handlePrevMonth = () => {
    setCurrentMonthDate(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(prev => addMonths(prev, 1));
  };


  const handleDeleteBudget = (budgetId: string, name: string) => {
    Alert.alert(
      'Delete budget',
      `Delete budget for "${name}"? This does NOT delete transactions.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteBudget(budgetId);
            await loadData();
          },
        },
      ]
    );
  };

  const handleAddBudget = () => navigation.navigate('AddBudget');
  const handleAlerts = () => navigation.navigate('Alerts');

  // -------------------------------------------
  // UI
  // -------------------------------------------
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Budgets</Text>
            <Text style={styles.headerSubtitle}>Monthly overview</Text>
          </View>
          <TouchableOpacity
            style={styles.headerAction}
            onPress={handleAddBudget}
          >
            <Text style={styles.headerActionIcon}>＋</Text>
          </TouchableOpacity>
        </View>

        {/* Month selector */}
        <View style={styles.monthSelectorRow}>
          <TouchableOpacity style={styles.monthArrow} onPress={handlePrevMonth}>
            <Text style={styles.monthArrowText}>‹</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.monthLabelButton}
            onPress={() => setShowMonthPicker(true)}
          >
            <Text style={styles.monthLabel}>
              {format(currentMonthDate, 'MMMM yyyy')} ▼
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.monthArrow} onPress={handleNextMonth}>
            <Text style={styles.monthArrowText}>›</Text>
          </TouchableOpacity>
        </View>


        {/* Total Budget Card */}
        <TouchableOpacity
          style={styles.overallCard}
          onPress={handleOpenAllTransactions}
        >
          <View style={styles.overallRowTop}>
            <View>
              <Text style={styles.overallLabel}>Total Budget</Text>
              <Text style={styles.overallAmount}>₹{totalBudget.toLocaleString()}</Text>
            </View>
            <View style={styles.overallRight}>
              <Text style={styles.overallRemainingLabel}>Remaining</Text>
              <Text style={styles.overallRemainingAmount}>
                ₹{totalRemaining.toLocaleString()}
              </Text>
            </View>
          </View>

          <View style={styles.overallRowBottom}>
            <Text style={styles.overallSpentText}>
              Spent ₹{totalSpent.toLocaleString()} in {format(currentMonthDate, 'MMM yyyy')}
            </Text>
            <Text style={styles.overallPercentText}>
              {totalPercent.toFixed(0)}% used
            </Text>
          </View>

          <View style={styles.overallProgressBackground}>
            <View
              style={[
                styles.overallProgressFill,
                { width: `${Math.min(totalPercent, 100)}%` },
              ]}
            />
          </View>

          {/* Alerts */}
          <TouchableOpacity style={styles.alertsChip} onPress={handleAlerts}>
            <View style={styles.alertsChipIconCircle}>
              <Text style={styles.alertsChipIcon}>⏰</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.alertsChipTitle}>Budget alerts</Text>
              <Text style={styles.alertsChipSubtitle}>
                Get notified when you’re close to overspending
              </Text>
            </View>
            <Text style={styles.alertsChipLink}>Manage</Text>
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Category Budgets */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category Budgets</Text>
          <Text style={styles.sectionSubtitle}>
            Track how you're spending across categories
          </Text>

          {loading ? (
            <Text style={styles.sectionSubtitle}>Loading…</Text>
          ) : (
            categoryBudgets.map((b) => (
              <CategoryBudgetCard
                key={b.categoryId}
                budget={b}
                onPress={() => handleOpenCategoryTransactions(b.categoryId, b.name)}
                onEdit={() => b.budgetId && handleEditBudget(b.budgetId)}
                onDelete={() =>
                  b.budgetId && handleDeleteBudget(b.budgetId, b.name)
                }
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* Month/year picker modal */}
      {showMonthPicker && (
        <Modal
          transparent
          animationType="fade"
          onRequestClose={() => setShowMonthPicker(false)}
        >
          <View style={styles.monthPickerOverlay}>
            <View style={styles.monthPickerCard}>
              <Text style={styles.monthPickerTitle}>Select month</Text>

              {/* Years row */}
              <View style={styles.yearRow}>
                {getYearOptions(currentMonthDate.getFullYear()).map((year) => (
                  <TouchableOpacity
                    key={year}
                    style={[
                      styles.yearChip,
                      year === currentMonthDate.getFullYear() &&
                        styles.yearChipActive,
                    ]}
                    onPress={() => {
                      const newDate = new Date(
                        year,
                        currentMonthDate.getMonth(),
                        1
                      );
                      setCurrentMonthDate(newDate);
                    }}
                  >
                    <Text
                      style={[
                        styles.yearChipText,
                        year === currentMonthDate.getFullYear() &&
                          styles.yearChipTextActive,
                      ]}
                    >
                      {year}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Months grid */}
              <View style={styles.monthGrid}>
                {MONTH_NAMES.map((label, index) => (
                  <TouchableOpacity
                    key={label}
                    style={[
                      styles.monthChip,
                      index === currentMonthDate.getMonth() &&
                        styles.monthChipActive,
                    ]}
                    onPress={() => {
                      const newDate = new Date(
                        currentMonthDate.getFullYear(),
                        index,
                        1
                      );
                      setCurrentMonthDate(newDate);
                      setShowMonthPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.monthChipText,
                        index === currentMonthDate.getMonth() &&
                          styles.monthChipTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.monthPickerClose}
                onPress={() => setShowMonthPicker(false)}
              >
                <Text style={styles.monthPickerCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

    </SafeAreaView>
  );
};

type CategoryBudgetCardProps = {
  budget: CategoryBudget;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

const CategoryBudgetCard: React.FC<CategoryBudgetCardProps> = ({
  budget,
  onPress,
  onEdit,
  onDelete,
}) => {
  const { name, spent, limit, color } = budget;
  const [showActions, setShowActions] = useState(false);

  const remaining = limit ? limit - spent : 0;
  const percent = limit ? (spent / limit) * 100 : 0;

  const isOverspent = limit !== null && spent > limit;
  const status =
    limit === null
      ? 'No budget'
      : isOverspent
      ? 'Overspent'
      : percent > 80
      ? 'Almost there'
      : 'On track';

  const statusColor =
    limit === null
      ? '#6B7280'
      : isOverspent
      ? '#EF4444'
      : percent > 80
      ? '#F97316'
      : '#16A34A';

  return (
    <TouchableOpacity
      style={styles.categoryCard}
      onPress={onPress}
      onLongPress={() => setShowActions((p) => !p)}
    >
      <View style={styles.categoryRowTop}>
        <View style={styles.categoryLeft}>
          <View style={[styles.categoryColorDot, { backgroundColor: color }]} />
          <View>
            <Text style={styles.categoryName}>{name}</Text>
            {limit ? (
              <Text style={styles.categoryLimit}>
                Budget ₹{limit.toLocaleString()}
              </Text>
            ) : (
              <Text style={styles.categoryLimit}>No budget set</Text>
            )}
          </View>
        </View>

        <View style={styles.categoryRight}>
          <Text style={styles.categorySpent}>₹{spent.toLocaleString()}</Text>
          <Text style={styles.categorySpentLabel}>spent</Text>
        </View>
      </View>

      {/* Remaining + status */}
      <View style={styles.categoryRowMiddle}>
        {limit !== null ? (
          <Text style={styles.categoryRemaining}>
            ₹{Math.abs(remaining).toLocaleString()} {remaining >= 0 ? 'left' : 'over'}
          </Text>
        ) : (
          <Text style={styles.categoryRemaining}>—</Text>
        )}

        <View style={styles.statusPill}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={styles.statusText}>{status}</Text>
        </View>
      </View>

      {/* Bar */}
      <View style={styles.categoryProgressBackground}>
        <View
          style={[
            styles.categoryProgressFill,
            { width: `${Math.min(percent, 110)}%`, backgroundColor: color },
          ]}
        />
      </View>

      {/* Long-press actions */}
      {showActions && budget.limit !== null && (
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionButton} onPress={onEdit}>
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonDanger]}
            onPress={onDelete}
          >
            <Text style={styles.actionButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  headerSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  headerAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActionIcon: { fontSize: 22, color: colors.primary },

  // Total budget card
  overallCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
  },
  overallRowTop: { flexDirection: 'row', justifyContent: 'space-between' },
  overallLabel: { fontSize: 13, color: colors.textSecondary },
  overallAmount: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  overallRight: { alignItems: 'flex-end' },
  overallRemainingLabel: { fontSize: 12, color: colors.textSecondary },
  overallRemainingAmount: { fontSize: 16, fontWeight: '600', color: '#16A34A' },
  overallRowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 8,
  },
  overallSpentText: { fontSize: 13, color: colors.textSecondary },
  overallPercentText: { fontSize: 13, color: colors.textPrimary },
  overallProgressBackground: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  overallProgressFill: { height: '100%', backgroundColor: colors.primary },

  alertsChip: {
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertsChipIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  alertsChipIcon: { fontSize: 16 },
  alertsChipTitle: { fontSize: 13, fontWeight: '600' },
  alertsChipSubtitle: { fontSize: 12, color: colors.textSecondary },
  alertsChipLink: { fontSize: 13, fontWeight: '600', color: colors.primary },

  section: { marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  sectionSubtitle: { fontSize: 13, color: colors.textSecondary },

  categoryCard: {
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 12,
  },
  categoryRowTop: { flexDirection: 'row', justifyContent: 'space-between' },
  categoryLeft: { flexDirection: 'row', alignItems: 'center' },
  categoryColorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 10,
  },
  categoryName: { fontSize: 14, fontWeight: '600' },
  categoryLimit: { fontSize: 12, color: colors.textSecondary },
  categoryRight: { alignItems: 'flex-end' },
  categorySpent: { fontSize: 14, fontWeight: '600' },
  categorySpentLabel: { fontSize: 12, color: colors.textSecondary },

  categoryRowMiddle: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  categoryRemaining: { fontSize: 12, color: colors.textSecondary },

  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: { fontSize: 12 },

  categoryProgressBackground: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 999,
    marginTop: 10,
    overflow: 'hidden',
  },
  categoryProgressFill: { height: '100%', borderRadius: 999 },

  actionsRow: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
  actionButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
  },
  actionButtonDanger: {
    backgroundColor: '#FEE2E2',
  },

    monthLabelButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  monthSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 12,
  } as any,
  monthArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  monthArrowText: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  monthLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },

  monthPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  monthPickerCard: {
    width: '100%',
    borderRadius: 18,
    backgroundColor: colors.surface,
    padding: 16,
  },
  monthPickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  yearRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 12,
  },
  yearChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: 4,
    marginVertical: 4,
  },
  yearChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  yearChipText: {
    fontSize: 12,
    color: colors.textPrimary,
  },
  yearChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  monthChip: {
    width: '30%',
    paddingVertical: 8,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  monthChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  monthChipText: {
    fontSize: 13,
    color: colors.textPrimary,
  },
  monthChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  monthPickerClose: {
    marginTop: 10,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surface,
  },
  monthPickerCloseText: {
    fontSize: 13,
    color: colors.textSecondary,
  },


  actionButtonText: { fontSize: 12, fontWeight: '500' },
});

export default BudgetScreen;
