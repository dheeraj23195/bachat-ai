import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  startOfMonth,
  endOfMonth,
  parseISO,
  isWithinInterval,
} from 'date-fns';

import { AppTabParamList } from '../../navigation/AppTabs';
import { RootStackParamList } from '../../navigation/RootNavigator';
import colors from '../../lib/colors';
import { useTransactionsStore } from '../../store/useTransactionsStore';
import { listBudgets, deleteBudget } from '../../services/budgets';
import { Budget } from '../../lib/types';

type Props = BottomTabScreenProps<AppTabParamList, 'Budget'>;

// Mapping from categoryId -> display name
const CATEGORY_LABELS: Record<string, string> = {
  food: 'Food & Dining',
  transport: 'Transport',
  shopping: 'Shopping',
  subscriptions: 'Subscriptions',
  bills: 'Bills & Utilities',
  other: 'Other',
};

// Mapping from categoryId -> color
const CATEGORY_COLORS: Record<string, string> = {
  food: '#F97316',
  transport: '#6366F1',
  shopping: '#EC4899',
  bills: '#22C55E',
  subscriptions: '#A855F7',
  other: '#6B7280',
};

type CategoryBudget = {
  budgetId: string;
  categoryId: string;
  name: string;
  spent: number;
  limit: number;
  color: string;
};

const BudgetScreen: React.FC<Props> = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();

  const transactions = useTransactionsStore((s) => s.transactions);

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loadingBudgets, setLoadingBudgets] = useState(false);

  const handleAlerts = () => navigation.navigate('Alerts');
  const handleAddBudget = () => navigation.navigate('AddBudget');

  // ---- Monthly expenses from real transactions ----
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const monthlyExpenses = useMemo(
    () =>
      transactions.filter((tx) => {
        if (tx.type !== 'expense') return false;
        try {
          const d = parseISO(tx.date);
          return isWithinInterval(d, { start: monthStart, end: monthEnd });
        } catch {
          return false;
        }
      }),
    [transactions, monthStart, monthEnd]
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

  // ---- Load budgets from DB ----
  const loadBudgets = async () => {
    setLoadingBudgets(true);
    try {
      const rows = await listBudgets({ activeOnly: true });
      setBudgets(rows);
    } catch (e) {
      console.error('Failed to load budgets', e);
    } finally {
      setLoadingBudgets(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      loadBudgets();
    }
  }, [isFocused]);

  // Overall total budget = sum of all active monthly budgets
  const totalBudget = useMemo(
    () =>
      budgets
        .filter((b) => b.period === 'monthly')
        .reduce((sum, b) => sum + b.limitAmount, 0),
    [budgets]
  );

  const totalRemaining = Math.max(0, totalBudget - totalSpent);
  const totalPercent =
    totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  // Build per-category budget cards from DB budgets
  const categoryBudgets: CategoryBudget[] = useMemo(() => {
    const list: CategoryBudget[] = budgets
      .filter((b) => b.period === 'monthly' && b.categoryId !== null)
      .map((b) => {
        const catId = b.categoryId as string;
        const spent = spendByCategory.get(catId) || 0;
        const name = CATEGORY_LABELS[catId] ?? catId;
        const color = CATEGORY_COLORS[catId] ?? colors.primary;

        return {
          budgetId: b.id,
          categoryId: catId,
          name,
          spent,
          limit: b.limitAmount,
          color,
        };
      });

    // Sort by spent descending
    list.sort((a, b) => b.spent - a.spent);

    return list;
  }, [budgets, spendByCategory]);

  const handleOpenAllTransactions = () => {
    navigation.navigate('TransactionsList', {
      categoryId: null,
      title: 'All expenses (this month)',
    });
  };

  const handleOpenCategoryTransactions = (categoryId: string, name: string) => {
    navigation.navigate('TransactionsList', {
      categoryId,
      title: `${name} (this month)`,
    });
  };

  const handleEditBudget = (budgetId: string) => {
    navigation.navigate('EditBudget', { budgetId });
  };

  const handleDeleteBudget = (budgetId: string, name: string) => {
    Alert.alert(
      'Delete budget',
      `Are you sure you want to delete the budget for "${name}"? This will not delete any transactions.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteBudget(budgetId);
              await loadBudgets();
            } catch (e) {
              console.error('Failed to delete budget', e);
              Alert.alert(
                'Error',
                'Something went wrong while deleting the budget.'
              );
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Budgets</Text>
            <Text style={styles.headerSubtitle}>Monthly overview</Text>
          </View>

          <TouchableOpacity
            style={styles.headerAction}
            activeOpacity={0.8}
            onPress={handleAddBudget}
          >
            <Text style={styles.headerActionIcon}>＋</Text>
          </TouchableOpacity>
        </View>

        {/* Overall budget card (clickable) */}
        <TouchableOpacity
          style={styles.overallCard}
          activeOpacity={0.85}
          onPress={handleOpenAllTransactions}
        >
          <View style={styles.overallRowTop}>
            <View>
              <Text style={styles.overallLabel}>Total Budget</Text>
              <Text style={styles.overallAmount}>
                ₹{totalBudget.toLocaleString()}
              </Text>
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
              Spent ₹{totalSpent.toLocaleString()} this month
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

          {/* Alerts chip */}
          <TouchableOpacity
            style={styles.alertsChip}
            activeOpacity={0.8}
            onPress={handleAlerts}
          >
            <View style={styles.alertsChipIconCircle}>
              <Text style={styles.alertsChipIcon}>⏰</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.alertsChipTitle}>Budget alerts</Text>
              <Text style={styles.alertsChipSubtitle}>
                Get notified when you&apos;re close to overspending
              </Text>
            </View>
            <Text style={styles.alertsChipLink}>Manage</Text>
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Per-category budgets */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category Budgets</Text>
          <Text style={styles.sectionSubtitle}>
            Track how you&apos;re spending across key categories
          </Text>

          {loadingBudgets && categoryBudgets.length === 0 ? (
            <Text style={styles.sectionSubtitle}>Loading budgets…</Text>
          ) : categoryBudgets.length === 0 ? (
            <Text style={styles.sectionSubtitle}>
              You haven&apos;t created any budgets yet. Tap + to add one.
            </Text>
          ) : (
            categoryBudgets.map((b) => (
              <CategoryBudgetCard
                key={b.budgetId}
                budget={b}
                onPress={() =>
                  handleOpenCategoryTransactions(b.categoryId, b.name)
                }
                onEdit={() => handleEditBudget(b.budgetId)}
                onDelete={() => handleDeleteBudget(b.budgetId, b.name)}
              />
            ))
          )}
        </View>
      </ScrollView>
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

  const remaining = limit - spent;
  const percent = limit > 0 ? (spent / limit) * 100 : 0;
  const isOverspent = spent > limit;
  const statusLabel = isOverspent
    ? 'Overspent'
    : percent > 80
    ? 'Almost there'
    : 'On track';

  const statusColor = isOverspent ? '#EF4444' : percent > 80 ? '#F97316' : '#16A34A';

  const handleLongPress = () => {
    setShowActions((prev) => !prev);
  };

  return (
    <TouchableOpacity
      style={styles.categoryCard}
      activeOpacity={0.85}
      onPress={onPress}
      onLongPress={handleLongPress}
    >
      <View style={styles.categoryRowTop}>
        <View style={styles.categoryLeft}>
          <View
            style={[
              styles.categoryColorDot,
              { backgroundColor: color },
            ]}
          />
          <View>
            <Text style={styles.categoryName}>{name}</Text>
            <Text style={styles.categoryLimit}>
              Budget ₹{limit.toLocaleString()}
            </Text>
          </View>
        </View>

        <View style={styles.categoryRight}>
          <Text style={styles.categorySpent}>
            ₹{spent.toLocaleString()}
          </Text>
          <Text style={styles.categorySpentLabel}>spent</Text>
        </View>
      </View>

      <View style={styles.categoryRowMiddle}>
        <Text style={styles.categoryRemaining}>
          ₹
          {remaining >= 0
            ? remaining.toLocaleString()
            : Math.abs(remaining).toLocaleString()}{' '}
          {remaining >= 0 ? 'left' : 'over'}
        </Text>
        <View style={styles.statusPill}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: statusColor },
            ]}
          />
          <Text style={styles.statusText}>{statusLabel}</Text>
        </View>
      </View>

      <View style={styles.categoryProgressBackground}>
        <View
          style={[
            styles.categoryProgressFill,
            {
              width: `${Math.min(percent, 110)}%`,
              backgroundColor: color,
            },
          ]}
        />
      </View>

      {showActions && (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            onPress={onEdit}
            style={styles.actionButton}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onDelete}
            style={[styles.actionButton, styles.actionButtonDanger]}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
};

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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: colors.textSecondary,
  },
  headerAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerActionIcon: {
    fontSize: 22,
    color: colors.primary,
  },
  overallCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  overallRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  overallLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  overallAmount: {
    marginTop: 4,
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  overallRight: {
    alignItems: 'flex-end',
  },
  overallRemainingLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  overallRemainingAmount: {
    marginTop: 2,
    fontSize: 16,
    fontWeight: '600',
    color: '#16A34A',
  },
  overallRowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 8,
  },
  overallSpentText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  overallPercentText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  overallProgressBackground: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  overallProgressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  alertsChip: {
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertsChipIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  alertsChipIcon: {
    fontSize: 16,
  },
  alertsChipTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  alertsChipSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  alertsChipLink: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  section: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  categoryCard: {
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: colors.surface,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryColorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 10,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  categoryLimit: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  categoryRight: {
    alignItems: 'flex-end',
  },
  categorySpent: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  categorySpentLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  categoryRowMiddle: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryRemaining: {
    fontSize: 12,
    color: colors.textSecondary,
  },
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
  statusText: {
    fontSize: 12,
    color: colors.textPrimary,
  },
  categoryProgressBackground: {
    marginTop: 10,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  categoryProgressFill: {
    height: '100%',
    borderRadius: 999,
  },
  actionsRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
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
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textPrimary,
  },
});

export default BudgetScreen;
